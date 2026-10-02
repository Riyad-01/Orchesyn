'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  Check,
  Copy,
  Download,
  Mic,
  Send,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useApp } from '@/lib/store/app';
import { Button, Card, Chip, SectionTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
import { PERSONAS, getPersona, DEFAULT_PERSONA_ID } from '@/lib/ai/personas';
import { aiConfig, streamChat, type ChatTurn } from '@/lib/ai/provider';
import type { TutorReply } from '@/lib/ai/local-tutor';
import { speak, stopSpeaking, isSpeaking } from '@/lib/speech/tts';
import { useRecorder } from '@/hooks/use-recorder';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  at: string;
  meta?: TutorReply['meta'];
  chips?: string[];
  model?: string;
  mode?: 'cloud' | 'local';
  streaming?: boolean;
}

/* ------------------------------ tiny markdown ------------------------------ */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-i${i++}`;
    if (tok.startsWith('**')) out.push(<strong key={key} className="font-extrabold text-ink">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={key} className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-[0.85em] text-brand">{tok.slice(1, -1)}</code>);
    else out.push(<em key={key} className="italic text-muted">{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul${key++}`} className="my-1.5 space-y-1 pl-1">
          {list.map((li, i) => (
            <li key={i} className="flex gap-2 text-[0.92rem] leading-relaxed">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" />
              <span>{inline(li, `li${key}-${i}`)}</span>
            </li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      list.push(line.replace(/^\s*[-*]\s+/, ''));
      continue;
    }
    flushList();
    if (!line.trim()) continue;
    if (line.startsWith('### ')) blocks.push(<h4 key={key++} className="mt-2 font-display text-sm font-extrabold text-ink">{inline(line.slice(4), `h${key}`)}</h4>);
    else if (line.startsWith('## ')) blocks.push(<h3 key={key++} className="mt-2 font-display text-base font-extrabold text-ink">{inline(line.slice(3), `h${key}`)}</h3>);
    else if (line.startsWith('> ')) blocks.push(<blockquote key={key++} className="my-1.5 border-l-2 border-brand/50 pl-3 text-[0.92rem] italic text-muted">{inline(line.slice(2), `q${key}`)}</blockquote>);
    else blocks.push(<p key={key++} className="my-1 text-[0.94rem] leading-relaxed">{inline(line, `p${key}`)}</p>);
  }
  flushList();
  return <div className="space-y-0.5">{blocks}</div>;
}

/* -------------------------------- the page -------------------------------- */

export default function AiTutorPage() {
  const { profile, toast, isGuest } = useApp();
  const cfg = useMemo(() => aiConfig(), []);

  const [personaId, setPersonaId] = useState(DEFAULT_PERSONA_ID);
  const persona = getPersona(personaId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const abortRef = useRef<AbortController | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const recorder = useRecorder({ maxMs: 120000, language: 'en-US' });

  const storageKey = `osynedu:ai:${profile?.userId ?? 'guest'}:${personaId}`;

  /* load persisted conversation per persona */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setMessages(raw ? (JSON.parse(raw) as Msg[]) : []);
    } catch {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  /* persist */
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages.filter((m) => !m.streaming)));
    } catch {
      // ignore quota
    }
  }, [messages, storageKey]);

  /* autoscroll */
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  /* deep link: /ai?ask=… sends the question immediately (e.g. report explainer) */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('ask');
    if (q) void send(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ctx = useMemo(() => {
    // contextual coaching: summarise the learner's ACTUAL evidence, not vibes
    const parts: string[] = [];
    try {
      const m = JSON.parse(window.localStorage.getItem('stim:mastery') ?? '{}') as Record<string, { total: number; correct: number }>;
      const acc = (['listening', 'reading', 'writing', 'speaking'] as const)
        .filter((s) => m[s]?.total)
        .map((s) => `${s} unseen-accuracy ${Math.round((100 * m[s].correct) / m[s].total)}% over ${m[s].total} first tries`);
      if (acc.length) parts.push(acc.join('; '));
    } catch { /* fine */ }
    try {
      const lv = profile?.sectionLevels;
      if (lv && Object.keys(lv).length) parts.push(`diagnostic levels ${Object.entries(lv).map(([k, v]) => `${k} ${v}/100`).join(', ')}`);
    } catch { /* fine */ }
    try {
      const lp = JSON.parse(window.localStorage.getItem('stim:lesson-progress') ?? '{}') as Record<string, { masteredAt?: number }>;
      const inProgress = Object.keys(lp).filter((id) => !lp[id]?.masteredAt);
      const mastered = Object.keys(lp).filter((id) => lp[id]?.masteredAt);
      if (inProgress.length) parts.push(`current lesson ${inProgress[0]} (in progress)`);
      if (mastered.length) parts.push(`${mastered.length} lesson(s) mastered`);
    } catch { /* fine */ }
    return {
      level: profile?.level ?? 'B1',
      name: profile?.name ?? 'Learner',
      goal: profile?.goal ?? 'general',
      evidence: parts.length ? parts.join('. ') : undefined,
    };
  }, [profile]);

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || busy) return;
      const history: ChatTurn[] = messages
        .filter((m) => !m.streaming)
        .map((m) => ({ role: m.role, content: m.content }));

      const userMsg: Msg = { id: `u${Date.now()}`, role: 'user', content: text, at: new Date().toISOString() };
      const aiId = `a${Date.now()}`;
      const aiMsg: Msg = { id: aiId, role: 'assistant', content: '', at: new Date().toISOString(), streaming: true };
      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setInput('');
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const result = await streamChat({
        persona,
        ctx,
        history,
        userInput: text,
        temperature,
        signal: controller.signal,
        onToken: (tok) => setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: m.content + tok } : m))),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? {
                ...m,
                streaming: false,
                content: result.text || m.content || 'Sorry, I could not generate a reply.',
                meta: result.local?.meta,
                chips: result.local?.chips,
                model: result.model,
                mode: result.mode,
              }
            : m,
        ),
      );

      if (result.error && result.error !== 'stopped') {
        toast({ tone: 'warn', title: 'Cloud unavailable', body: `Fell back to the on-device tutor. (${result.error})` });
      }
      if (speakReplies && result.text) {
        void speak(result.text.replace(/[*_`>#]/g, ''), { gender: persona.voiceGender });
      }
      setBusy(false);
      abortRef.current = null;
    },
    [busy, messages, persona, ctx, temperature, speakReplies, toast],
  );

  const stop = () => {
    abortRef.current?.abort();
    stopSpeaking();
    setBusy(false);
    setMessages((prev) => prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)));
  };

  const clearChat = () => {
    setMessages([]);
    stopSpeaking();
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    toast({ tone: 'info', title: 'Conversation cleared' });
  };

  const exportChat = () => {
    const text = messages
      .map((m) => `${m.role === 'user' ? 'You' : persona.name}: ${m.content}`)
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `osynlearn-${personaId}-chat.txt`;
    a.click();
  };

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => toast({ tone: 'success', title: 'Copied' }),
      () => toast({ tone: 'bad', title: 'Copy failed' }),
    );
  };

  /* voice input -> transcript -> send */
  const [captured, setCaptured] = useState<string | null>(null);
  useEffect(() => {
    if (recorder.phase === 'done' && recorder.transcript.trim()) {
      const t = recorder.transcript.trim();
      setCaptured(t);
    }
  }, [recorder.phase, recorder.transcript]);
  useEffect(() => {
    if (captured) {
      void send(captured);
      setCaptured(null);
      recorder.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captured]);

  const toggleMic = () => {
    if (recorder.phase === 'recording') {
      void recorder.stop();
    } else if (recorder.phase === 'paused') {
      void recorder.resume();
    } else if (recorder.canRecord) {
      void recorder.start();
    } else {
      toast({ tone: 'warn', title: 'Microphone unavailable', body: 'Type your message instead, or enable mic access.' });
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-7.5rem)] w-full max-w-3xl flex-col lg:h-[calc(100dvh-5rem)]">
      {/* header */}
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-brand text-lg text-white">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-lg font-extrabold leading-tight text-ink">AI Tutor</h1>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <span className={cn('h-1.5 w-1.5 rounded-full', cfg.cloud ? 'bg-good' : 'bg-brand')} />
              {cfg.cloud ? `${cfg.provider} · ${cfg.model}` : 'On-device tutor · no API key needed'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSpeakReplies((s) => { if (s) stopSpeaking(); return !s; })}
            title="Read replies aloud"
            className={cn('tap rounded-xl border p-2.5', speakReplies ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line bg-surface text-muted')}
          >
            {speakReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setShowSettings((s) => !s)}
            title="Advanced"
            className={cn('tap rounded-xl border p-2.5', showSettings ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line bg-surface text-muted')}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* persona picker */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPersonaId(p.id)}
            className={cn(
              'tap flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-bold transition-colors',
              personaId === p.id ? 'border-transparent text-white' : 'border-line bg-surface text-muted hover:text-ink',
            )}
            style={personaId === p.id ? { background: p.color } : undefined}
          >
            {p.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span>{p.emoji}</span>
            )}
            {p.name}
          </button>
        ))}
      </div>

      {/* advanced settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card className="mb-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-[180px] flex-1">
                  <p className="text-xs font-bold text-muted">Temperature · {temperature.toFixed(1)}</p>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={temperature}
                    disabled={!cfg.cloud}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="mt-2 w-full accent-[rgb(var(--brand))] disabled:opacity-40"
                  />
                  <p className="mt-1 text-[10px] text-faint">{cfg.cloud ? 'Lower = focused, higher = creative.' : 'On-device tutor is deterministic.'}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={exportChat} disabled={!messages.length}>Export</Button>
                  <Button variant="secondary" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={clearChat} disabled={!messages.length}>Clear</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* messages */}
      <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto py-2 pr-1">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            {persona.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={persona.avatar} alt={persona.name} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-line" />
            ) : (
              <span className="text-4xl">{persona.emoji}</span>
            )}
            <h2 className="mt-3 font-display text-lg font-extrabold text-ink">{persona.name}</h2>
            <p className="mt-1 max-w-xs text-sm text-muted">{persona.tagline}. Pick a starter or type anything.</p>
            <div className="mt-5 flex w-full max-w-md flex-col gap-2">
              {persona.starters.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="tap rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm text-muted transition-colors hover:border-brand/40 hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} msg={m} persona={persona} onChip={send} onCopy={copy} />)
        )}
        {busy && messages.at(-1)?.content === '' && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-brand" /> {persona.name} is thinking…
          </div>
        )}
      </div>

      {/* live voice transcript */}
      {recorder.phase === 'recording' && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-3 py-2 text-xs text-muted">
          <span className="h-2 w-2 animate-pulse rounded-full bg-bad" />
          {recorder.interim || 'Listening… speak now'}
        </div>
      )}

      {/* input bar */}
      <div className="border-t border-line pt-3">
        <div className="flex items-end gap-2">
          <button
            onClick={toggleMic}
            disabled={busy}
            title="Voice input"
            className={cn(
              'tap flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors',
              recorder.phase === 'recording' ? 'border-bad bg-bad/15 text-bad' : 'border-line bg-surface text-muted hover:text-ink',
            )}
          >
            <Mic className="h-[18px] w-[18px]" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder={`Message ${persona.name}…`}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-brand/60"
          />
          {busy ? (
            <Button variant="secondary" className="h-11 px-4" icon={<Square className="h-4 w-4" />} onClick={stop}>Stop</Button>
          ) : (
            <Button className="h-11 px-4" icon={<Send className="h-4 w-4" />} disabled={!input.trim()} onClick={() => void send(input)}>
              Send
            </Button>
          )}
        </div>
        {isGuest && (
          <p className="mt-2 text-center text-[10px] text-faint">
            Chats are saved on this device. Sign in to sync them across devices.
          </p>
        )}
      </div>
    </div>
  );
}

function Bubble({
  msg,
  persona,
  onChip,
  onCopy,
}: {
  msg: Msg;
  persona: ReturnType<typeof getPersona>;
  onChip: (t: string) => void;
  onCopy: (t: string) => void;
}) {
  const isUser = msg.role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-2.5', isUser && 'flex-row-reverse')}>
      {!isUser && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm" style={{ background: `${persona.color}22` }}>
          {persona.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={persona.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            persona.emoji
          )}
        </span>
      )}
      <div className={cn('max-w-[80%] min-w-0', isUser && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3',
            isUser ? 'gradient-brand text-white' : 'border border-line bg-surface text-muted',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-[0.94rem] leading-relaxed">{msg.content}</p>
          ) : msg.content ? (
            <Markdown text={msg.content} />
          ) : (
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:240ms]" />
            </span>
          )}
        </div>

        {!isUser && msg.meta?.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {msg.meta.map((chip) => (
              <span
                key={chip.label}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                  chip.tone === 'good' ? 'bg-good/15 text-good'
                    : chip.tone === 'bad' ? 'bg-bad/15 text-bad'
                    : chip.tone === 'brand' ? 'bg-brand/15 text-brand'
                    : 'bg-surface2 text-muted',
                )}
              >
                {chip.label}: {chip.value}
              </span>
            ))}
          </div>
        ) : null}

        {!isUser && !msg.streaming && msg.content ? (
          <div className="mt-1.5 flex items-center gap-1">
            <button onClick={() => onCopy(msg.content)} className="tap rounded-lg p-1.5 text-faint hover:text-muted" title="Copy">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => void speak(msg.content.replace(/[*_`>#]/g, ''), { gender: persona.voiceGender })} className="tap rounded-lg p-1.5 text-faint hover:text-muted" title="Read aloud">
              <Volume2 className="h-3.5 w-3.5" />
            </button>
            {msg.model ? <span className="ml-1 text-[10px] text-faint">{msg.model}</span> : null}
          </div>
        ) : null}

        {!isUser && msg.chips?.length && !msg.streaming ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {msg.chips.map((c) => (
              <button key={c} onClick={() => onChip(c)} className="tap rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:border-brand/40 hover:text-ink">
                {c}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
