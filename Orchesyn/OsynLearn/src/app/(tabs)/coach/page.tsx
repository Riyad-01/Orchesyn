'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Flag,
  Keyboard,
  Mic,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { THEMES, SCENARIOS, getTheme, getScenario } from '@/lib/data/themes';
import { useApp } from '@/lib/store/app';
import { useRecorder, formatClock } from '@/hooks/use-recorder';
import { speak, stopSpeaking, isSpeaking as ttsIsSpeaking, supported as ttsSupported } from '@/lib/speech/tts';
import { analyseSpeech } from '@/lib/scoring';
import type { ChatMessage, CoachSession, CoachTheme, FeedbackReport, Scenario } from '@/types';
import { uid, cn, formatSeconds } from '@/lib/utils';
import { Badge, Button, Card, Chip, SectionTitle, Waveform } from '@/components/ui';

type Mode = 'theme' | 'scenario';

interface ActiveChat {
  id: string;
  mode: Mode;
  theme?: CoachTheme;
  scenario?: Scenario;
  messages: ChatMessage[];
  beatIndex: number;
  reportIds: string[];
  lastReport: FeedbackReport | null;
}

/**
 * Chat with Sarah.
 * Two flavours share one engine:
 *   theme    -> open conversation; the coach asks an opener then follow-ups
 *   scenario -> a scripted role-play where each coach beat expects a user turn
 * The coach replies by TTS, the user answers by voice, and every user turn gets
 * its own mini feedback strip without breaking the conversational flow.
 */
export default function CoachPage() {
  const { profile, saveCoachSession, toast } = useApp();
  const [tab, setTab] = useState<Mode>('theme');
  const [chat, setChat] = useState<ActiveChat | null>(null);
  const [muted, setMuted] = useState(false);

  /* ---------------- start / end ---------------- */
  const startTheme = (theme: CoachTheme) => {
    const id = uid('coach');
    const next: ActiveChat = {
      id, mode: 'theme', theme,
      messages: [coachMessage(theme.starter)],
      beatIndex: 0, reportIds: [], lastReport: null,
    };
    setChat(next);
    if (!muted) void speak(theme.starter);
  };

  const startScenario = (scenario: Scenario) => {
    const id = uid('coach');
    const next: ActiveChat = {
      id, mode: 'scenario', scenario,
      messages: [
        systemMessage(scenario.setting),
        coachMessage(scenario.openingLine),
      ],
      beatIndex: 1, reportIds: [], lastReport: null,
    };
    setChat(next);
    if (!muted) void speak(scenario.openingLine);
  };

  const persist = useCallback(
    async (c: ActiveChat) => {
      const totals = c.messages
        .filter((m) => m.role === 'user' && m.feedback)
        .map((m) => m.feedback!);
      const session: CoachSession = {
        id: c.id,
        userId: profile?.userId ?? 'guest',
        themeId: c.theme?.id,
        scenarioId: c.scenario?.id,
        title: c.theme?.name ?? c.scenario?.name ?? 'Conversation',
        messages: c.messages,
        startedAt: c.messages[0]?.at ?? new Date().toISOString(),
        lastAt: new Date().toISOString(),
        totals: {
          turns: totals.length,
          spokenSec: Math.round(totals.reduce((a, f) => a + 0, 0) + c.reportIds.length * 20),
          overall: totals.length ? Math.round(totals.reduce((a, f) => a + f.overall, 0) / totals.length) : 0,
          fillers: totals.reduce((a, f) => a + f.fillers, 0),
          errors: totals.reduce((a, f) => a + f.errorCount, 0),
        },
      };
      await saveCoachSession(session);
    },
    [profile, saveCoachSession],
  );

  const endChat = useCallback(
    async (c: ActiveChat) => {
      stopSpeaking();
      await persist(c);
      toast({
        tone: 'success',
        title: 'Conversation saved',
        body: `${c.messages.filter((m) => m.role === 'user').length} turns with ${c.theme?.name ?? c.scenario?.name}.`,
      });
      setChat(null);
    },
    [persist, toast],
  );

  /* ---------------- user turn ---------------- */
  const addUserTurn = useCallback(
    async (c: ActiveChat, text: string, report: FeedbackReport, typed: boolean) => {
      const feedback = {
        overall: report.overall,
        fillers: report.metrics.fillerCount,
        wpm: report.metrics.wpm,
        errorCount: report.metrics.errorCount,
        corrections: report.grammarIssues.slice(0, 2).map((g) => `${g.quote} → ${g.correction}`),
      };
      const userMsg: ChatMessage = {
        id: uid('msg'), role: 'user', text, at: new Date().toISOString(), feedback,
      };

      // coach reply
      const followUp = nextCoachLine(c, report);
      const coachMsg = coachMessage(followUp);

      const updated: ActiveChat = {
        ...c,
        messages: [...c.messages, userMsg, coachMsg],
        lastReport: report,
        reportIds: [...c.reportIds, report.id],
        beatIndex: c.mode === 'scenario' ? c.beatIndex + 2 : c.beatIndex + 1,
      };
      setChat(updated);
      void persist(updated);
      if (!muted) void speak(followUp);
      return updated;
    },
    [muted, persist],
  );

  /* ---------------- picker ---------------- */
  if (!chat) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Chat with Sarah</h1>
          <p className="mt-1 text-sm text-muted">
            A real conversation with live feedback — {ttsSupported() ? 'she talks, you answer' : 'she prompts, you answer'}.
          </p>
        </div>

        <div className="flex gap-2">
          <Chip active={tab === 'theme'} onClick={() => setTab('theme')}>💬 Themes ({THEMES.length})</Chip>
          <Chip active={tab === 'scenario'} onClick={() => setTab('scenario')}>🎭 Real scenarios ({SCENARIOS.length})</Chip>
        </div>

        {tab === 'theme' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => startTheme(t)} className="tap card group p-4 text-left hover:border-brand/40">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{t.emoji}</span>
                  <Badge tone={t.level === 'beginner' ? 'good' : t.level === 'intermediate' ? 'mid' : 'bad'}>{t.level}</Badge>
                </div>
                <h3 className="mt-2.5 text-sm font-extrabold text-ink group-hover:text-brand">{t.name}</h3>
                <p className="mt-1 text-xs leading-snug text-muted">{t.blurb}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {SCENARIOS.map((s) => (
              <button key={s.id} onClick={() => startScenario(s)} className="tap card group p-4 text-left hover:border-brand/40">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-faint">
                    {'●'.repeat(s.difficulty)}
                    <span className="text-line">{'●'.repeat(3 - s.difficulty)}</span>
                  </span>
                </div>
                <h3 className="mt-2.5 text-sm font-extrabold text-ink group-hover:text-brand">{s.name}</h3>
                <p className="mt-1 text-xs leading-snug text-muted">{s.blurb}</p>
                <p className="mt-2 rounded-lg bg-surface2 px-2.5 py-1.5 text-[11px] font-semibold text-muted">{s.goal}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ---------------- conversation ---------------- */
  return (
    <CoachConversation
      chat={chat}
      muted={muted}
      onToggleMute={() => {
        setMuted((m) => {
          if (!m) stopSpeaking();
          return !m;
        });
      }}
      onUserTurn={(text, report, typed) => void addUserTurn(chat, text, report, typed)}
      onEnd={() => void endChat(chat)}
    />
  );
}

/* ------------------------------------------------------------------ */

function CoachConversation({
  chat,
  muted,
  onToggleMute,
  onUserTurn,
  onEnd,
}: {
  chat: ActiveChat;
  muted: boolean;
  onToggleMute: () => void;
  onUserTurn: (text: string, report: FeedbackReport, typed: boolean) => void;
  onEnd: () => void;
}) {
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [typedMode, setTypedMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const recorder = useRecorder({ maxMs: 120000 });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.messages.length, recorder.transcript]);

  const startRecord = async () => {
    setRecording(true);
    await recorder.start();
  };

  const finishRecord = async () => {
    const capture = await recorder.stop();
    setRecording(false);
    if (!capture || !capture.transcript.trim()) return;
    const report = analyseSpeech({
      sessionId: uid('sess'),
      mode: 'coach',
      capture,
      topicTitle: chat.theme?.name ?? chat.scenario?.name,
      sampleAnswer: chat.theme?.sampleAnswer,
    });
    onUserTurn(capture.transcript, report, false);
  };

  const submitTyped = () => {
    const text = input.trim();
    if (text.split(/\s+/).length < 4) return;
    const capture = recorder.submitTyped(text, 40);
    const report = analyseSpeech({
      sessionId: uid('sess'),
      mode: 'coach',
      capture,
      topicTitle: chat.theme?.name ?? chat.scenario?.name,
    });
    setInput('');
    onUserTurn(text, report, true);
  };

  const headerTitle = chat.theme?.name ?? chat.scenario?.name ?? 'Conversation';
  const turns = chat.messages.filter((m) => m.role === 'user').length;

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col lg:h-[calc(100dvh-4rem)]">
      {/* header */}
      <div className="flex items-center justify-between gap-2 pb-3">
        <button onClick={onEnd} className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" />
          end & save
        </button>
        <div className="flex items-center gap-2">
          <span className="chip">{turns} turns</span>
          <button onClick={onToggleMute} className="tap rounded-lg border border-line bg-surface2 p-2 text-muted hover:text-ink" aria-label={muted ? 'Unmute coach' : 'Mute coach'}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-line bg-surface/40 p-4">
        {chat.messages.map((m) => (
          <MessageBubble key={m.id} message={m} name={chat.theme ? 'Sarah' : chat.scenario?.name ?? 'Sarah'} />
        ))}
        {recording ? (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand/20 px-4 py-3">
              <Waveform levels={recorder.levels} live className="h-8" />
              <p className="mt-1 text-xs text-muted">{recorder.transcript || 'listening…'}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* composer */}
      <div className="border-t border-line pt-3">
        {recording ? (
          <div className="flex items-center justify-between gap-3">
            <span className="font-display text-2xl font-extrabold tabular-nums text-ink">{formatClock(recorder.elapsedMs)}</span>
            <Button variant="danger" icon={<Square className="h-4 w-4" fill="currentColor" />} onClick={() => void finishRecord()}>
              Stop & send
            </Button>
          </div>
        ) : typedMode ? (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
              placeholder="Type your reply…"
              className="h-11 flex-1 rounded-xl border border-line bg-surface2 px-4 text-sm text-ink outline-none focus:border-brand/60"
            />
            <Button icon={<Send className="h-4 w-4" />} onClick={submitTyped} />
            <Button variant="ghost" onClick={() => setTypedMode(false)}>
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" icon={<Keyboard className="h-4 w-4" />} onClick={() => setTypedMode(true)}>
              type
            </Button>
            <Button size="lg" icon={<Mic className="h-5 w-5" />} onClick={() => void startRecord()} disabled={recorder.phase === 'requesting'}>
              Hold the floor — start speaking
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message, name }: { message: ChatMessage; name: string }) {
  if (message.role === 'system') {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-surface2 px-3 py-1 text-[11px] font-semibold text-muted">{message.text}</span>
      </div>
    );
  }
  if (message.role === 'coach') {
    return (
      <div className="flex items-end gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-brand text-sm font-extrabold text-white">S</span>
        <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand">{name}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{message.text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand/15 px-4 py-3">
        <p className="text-sm leading-relaxed text-ink">{message.text}</p>
        {message.feedback ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-line/60 pt-2.5">
            <Badge tone={message.feedback.overall >= 78 ? 'good' : message.feedback.overall >= 55 ? 'mid' : 'bad'}>
              {message.feedback.overall}/100
            </Badge>
            {message.feedback.wpm > 0 ? <Badge tone="neutral">{message.feedback.wpm} wpm</Badge> : null}
            {message.feedback.fillers > 0 ? <Badge tone="mid">{message.feedback.fillers} fillers</Badge> : null}
            {message.feedback.errorCount > 0 ? <Badge tone="bad">{message.feedback.errorCount} errors</Badge> : null}
            {message.feedback.corrections.map((c) => (
              <Badge key={c} tone="mid">{c}</Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function coachMessage(text: string): ChatMessage {
  return { id: uid('msg'), role: 'coach', text, at: new Date().toISOString() };
}
function systemMessage(text: string): ChatMessage {
  return { id: uid('msg'), role: 'system', text, at: new Date().toISOString() };
}

const GENERIC_FOLLOWUPS = [
  'That is interesting — can you give me a specific example?',
  'Tell me more. What happened next?',
  'How do you feel about that, honestly?',
  'And what would you do differently if you could?',
  'Why do you think that is?',
];

/** Decide what Sarah says next, respecting scenario scripts. */
function nextCoachLine(chat: ActiveChat, report: FeedbackReport): string {
  if (chat.mode === 'scenario' && chat.scenario) {
    const next = chat.scenario.beats[chat.beatIndex + 1] ?? chat.scenario.beats[chat.beatIndex];
    if (next && next.role === 'coach') return next.text;
    return `Great work. ${scenarioDebrief(chat.scenario, report)}`;
  }
  const theme = chat.theme;
  if (!theme) return GENERIC_FOLLOWUPS[chat.beatIndex % GENERIC_FOLLOWUPS.length];
  const pool = [...theme.followUps, ...GENERIC_FOLLOWUPS];
  const next = pool[chat.beatIndex % pool.length];
  // occasionally comment on the feedback too
  const note =
    report.metrics.fillerCount >= 3
      ? 'By the way — you used a few fillers there. A silent pause works just as well. '
      : report.grammarIssues.length >= 2
        ? 'Quick tip: watch the verb endings in that last answer. '
        : '';
  return `${note}${next}`;
}

function scenarioDebrief(scenario: Scenario, report: FeedbackReport): string {
  return `On this run you scored ${report.overall}/100 with ${report.metrics.errorCount} grammar ${report.metrics.errorCount === 1 ? 'issue' : 'issues'} and ${report.metrics.fillerCount} fillers. Your goal was: ${scenario.goal}`;
}
