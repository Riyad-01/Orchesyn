/**
 * Role-based access control — the single source of truth for authorisation.
 * Routes call `authorize()` BEFORE touching data; queries are additionally
 * scoped by org id so a mistake in one check cannot leak another org's data.
 *
 * Roles: learner < teacher < org_admin < platform_admin.
 * Teachers act inside ONE org; org_admins manage their org; platform admins
 * cross orgs but never see learner content bodies (support view is metadata-only).
 */

export type Role = 'learner' | 'teacher' | 'org_admin' | 'platform_admin';

export interface Subject {
  userId: string;
  role: Role;
  orgId: string | null;
}

export interface Resource {
  kind:
    | 'class-progress'
    | 'submission'
    | 'feedback-override'
    | 'invite'
    | 'assign'
    | 'org-members'
    | 'content-review'
    | 'quality-monitor'
    | 'usage-controls'
    | 'billing-visibility'
    | 'support-tools'
    | 'learner-own-data';
  orgId: string | null;
  ownerId?: string;
}

export type Action = 'read' | 'write';

const ROLE_RANK: Record<Role, number> = { learner: 0, teacher: 1, org_admin: 2, platform_admin: 3 };

export class AuthzError extends Error {
  constructor(public readonly code: 'denied' | 'cross-org' | 'unauthenticated') {
    super(code);
  }
}

/** Org isolation is enforced here for every org-scoped resource. */
function sameOrg(subject: Subject, resource: Resource): boolean {
  if (subject.role === 'platform_admin') return true; // platform acts cross-org by design
  if (!subject.orgId || !resource.orgId) return false;
  return subject.orgId === resource.orgId;
}

export function authorize(subject: Subject, action: Action, resource: Resource): true {
  if (!subject.userId) throw new AuthzError('unauthenticated');

  // Learners may only touch their own data.
  if (subject.role === 'learner') {
    if (resource.kind !== 'learner-own-data') throw new AuthzError('denied');
    if (action === 'read' && resource.ownerId && resource.ownerId !== subject.userId) throw new AuthzError('denied');
    return true;
  }

  if (!sameOrg(subject, resource)) throw new AuthzError('cross-org');

  const rank = ROLE_RANK[subject.role];
  const allowed: Record<Resource['kind'], { read: number; write: number }> = {
    'class-progress': { read: 1, write: 0 },
    submission: { read: 1, write: 0 },
    'feedback-override': { read: 1, write: 1 },
    invite: { read: 1, write: 1 },
    assign: { read: 1, write: 1 },
    'org-members': { read: 2, write: 2 },
    'content-review': { read: 2, write: 2 },
    'quality-monitor': { read: 2, write: 0 },
    'usage-controls': { read: 3, write: 3 },
    'billing-visibility': { read: 2, write: 0 },
    'support-tools': { read: 3, write: 3 },
    'learner-own-data': { read: 0, write: 0 },
  };
  const need = allowed[resource.kind][action];
  if (rank < need) throw new AuthzError('denied');
  return true;
}

/** Every org-scoped query MUST pass through this: returns the org to filter by, or throws. */
export function orgScope(subject: Subject, requestedOrgId: string | null): string {
  if (subject.role === 'platform_admin') {
    if (!requestedOrgId) throw new AuthzError('denied'); // platform must name an org; no implicit dump-all
    return requestedOrgId;
  }
  if (!subject.orgId) throw new AuthzError('unauthenticated');
  if (requestedOrgId && requestedOrgId !== subject.orgId) throw new AuthzError('cross-org');
  return subject.orgId;
}
