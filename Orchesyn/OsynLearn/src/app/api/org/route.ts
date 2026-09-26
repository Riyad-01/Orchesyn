import { NextResponse } from 'next/server';
import { verifySandboxToken } from '@/lib/auth/sandbox';
import { authorize, orgScope, AuthzError, type Subject, type Resource } from '@/lib/rbac';
import { storeRead, storeWrite } from '@/lib/server/jsonstore';

export const dynamic = 'force-dynamic';

interface OrgFile {
  orgs: { id: string; name: string }[];
  members: { userId: string; role: Subject['role']; orgId: string }[];
  invites: { code: string; orgId: string; role: Subject['role']; by: string; at: string }[];
  assignments: { id: string; orgId: string; learnerId: string; lessonId: string; by: string; at: string }[];
  submissions: { id: string; orgId: string; learnerId: string; lessonId: string; text: string; at: string }[];
  overrides: { id: string; submissionId: string; orgId: string; teacherId: string; note: string; previousFeedback: string; at: string }[];
}

const EMPTY: OrgFile = { orgs: [], members: [], invites: [], assignments: [], submissions: [], overrides: [] };
const read = () => storeRead<OrgFile>('orgs.json', EMPTY);

const deny = (e: unknown) =>
  NextResponse.json({ ok: false, reason: e instanceof AuthzError ? e.code : 'denied' }, { status: e instanceof AuthzError && e.code === 'cross-org' ? 403 : 403 });

export async function POST(req: Request) {
  const claims = await verifySandboxToken(req.headers.get('authorization')?.replace('Bearer ', '') ?? null);
  if (!claims) return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }

  const file = read();
  const membership = file.members.find((m) => m.userId === claims.userId);
  const subject: Subject = { userId: claims.userId, role: claims.role, orgId: membership?.orgId ?? claims.orgId };
  const act = (action: 'read' | 'write', resource: Resource) => authorize(subject, action, resource);

  try {
    switch (body.action) {
      case 'ensure-org': {
        // a teacher or org_admin without an org may found one (sandbox bootstrap)
        if (subject.role !== 'teacher' && subject.role !== 'org_admin') throw new AuthzError('denied');
        if (subject.orgId) return NextResponse.json({ ok: true, orgId: subject.orgId, existing: true });
        const id = `org_${Math.random().toString(36).slice(2, 8)}`;
        file.orgs.push({ id, name: String(body.name ?? 'My class').slice(0, 60) });
        file.members.push({ userId: claims.userId, role: subject.role, orgId: id });
        storeWrite('orgs.json', file);
        return NextResponse.json({ ok: true, orgId: id });
      }

      case 'invite': {
        const orgId = orgScope(subject, typeof body.orgId === 'string' ? body.orgId : null);
        act('write', { kind: 'invite', orgId });
        const code = `join-${Math.random().toString(36).slice(2, 8)}`;
        file.invites.push({ code, orgId, role: body.role === 'teacher' ? 'teacher' : 'learner', by: claims.userId, at: new Date().toISOString() });
        storeWrite('orgs.json', file);
        return NextResponse.json({ ok: true, code });
      }

      case 'accept-invite': {
        const invite = file.invites.find((i) => i.code === String(body.code ?? ''));
        if (!invite) return NextResponse.json({ ok: false, reason: 'unknown-invite' }, { status: 404 });
        if (file.members.some((m) => m.userId === claims.userId && m.orgId === invite.orgId)) {
          return NextResponse.json({ ok: true, orgId: invite.orgId, already: true }); // idempotent
        }
        file.members.push({ userId: claims.userId, role: invite.role, orgId: invite.orgId });
        storeWrite('orgs.json', file);
        return NextResponse.json({ ok: true, orgId: invite.orgId });
      }

      case 'assign': {
        const orgId = orgScope(subject, typeof body.orgId === 'string' ? body.orgId : null);
        act('write', { kind: 'assign', orgId });
        const learnerId = String(body.learnerId ?? '');
        if (!file.members.some((m) => m.userId === learnerId && m.orgId === orgId && m.role === 'learner')) throw new AuthzError('denied');
        const a = { id: `as_${Math.random().toString(36).slice(2, 8)}`, orgId, learnerId, lessonId: String(body.lessonId ?? ''), by: claims.userId, at: new Date().toISOString() };
        file.assignments.unshift(a);
        storeWrite('orgs.json', file);
        return NextResponse.json({ ok: true, assignment: a });
      }

      case 'submit': {
        // learners submit their OWN work into their org
        if (subject.role !== 'learner' || !subject.orgId) throw new AuthzError('denied');
        act('write', { kind: 'learner-own-data', orgId: subject.orgId, ownerId: claims.userId });
        const s = { id: `sub_${Math.random().toString(36).slice(2, 8)}`, orgId: subject.orgId, learnerId: claims.userId, lessonId: String(body.lessonId ?? ''), text: String(body.text ?? '').slice(0, 20000), at: new Date().toISOString() };
        file.submissions.unshift(s);
        storeWrite('orgs.json', file);
        return NextResponse.json({ ok: true, submission: s });
      }

      case 'list-submissions': {
        const orgId = orgScope(subject, typeof body.orgId === 'string' ? body.orgId : null);
        act('read', { kind: 'submission', orgId });
        return NextResponse.json({ ok: true, submissions: file.submissions.filter((s) => s.orgId === orgId) });
      }

      case 'override-feedback': {
        const submission = file.submissions.find((s) => s.id === String(body.submissionId ?? ''));
        if (!submission) return NextResponse.json({ ok: false, reason: 'unknown-submission' }, { status: 404 });
        const orgId = orgScope(subject, submission.orgId);
        act('write', { kind: 'feedback-override', orgId });
        const o = {
          id: `ov_${Math.random().toString(36).slice(2, 8)}`,
          submissionId: submission.id,
          orgId,
          teacherId: claims.userId,
          note: String(body.note ?? '').slice(0, 2000),
          previousFeedback: String(body.previousFeedback ?? 'AI feedback'),
          at: new Date().toISOString(),
        };
        file.overrides.unshift(o); // immutable audit trail: entries are never edited or removed
        storeWrite('orgs.json', file);
        return NextResponse.json({ ok: true, override: o });
      }

      case 'class-progress': {
        const orgId = orgScope(subject, typeof body.orgId === 'string' ? body.orgId : null);
        act('read', { kind: 'class-progress', orgId });
        const learners = file.members.filter((m) => m.orgId === orgId && m.role === 'learner');
        const rows = learners.map((l) => {
          const subs = file.submissions.filter((s) => s.orgId === orgId && s.learnerId === l.userId);
          const assigned = file.assignments.filter((a) => a.orgId === orgId && a.learnerId === l.userId);
          return { learnerId: l.userId, submissions: subs.length, assigned: assigned.length, lastAt: subs[0]?.at ?? null };
        });
        return NextResponse.json({ ok: true, rows, assignments: file.assignments.filter((a) => a.orgId === orgId), overrides: file.overrides.filter((o) => o.orgId === orgId) });
      }

      default:
        return NextResponse.json({ ok: false, reason: 'unknown-action' }, { status: 400 });
    }
  } catch (e) {
    return deny(e);
  }
}
