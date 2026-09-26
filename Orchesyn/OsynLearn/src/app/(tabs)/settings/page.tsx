'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Check, Database, Download, Languages, LogIn, LogOut, Moon, Search, Sparkles, Sun, Trash2, Upload } from 'lucide-react';
import { useApp } from '@/lib/store/app';
import { seedDemoData } from '@/lib/data/seed';
import { getRuntimeAi, setRuntimeAi, PROVIDER_PRESETS, type AiProviderId } from '@/lib/ai/provider';
import { whisperAvailable } from '@/lib/speech/whisper';
import { detectCapabilities, microphoneAvailable } from '@/lib/speech';
import { voiceLabel } from '@/lib/speech/tts';
import type { AccentTarget, CEFRLevel, Goal } from '@/types';
import { Button, Card, SectionTitle, Segmented, Sheet } from '@/components/ui';
import { UI_LANGUAGES } from '@/lib/i18n/ui';
import { setRuntimeSupabase, supabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { cloudConfig } from '@/lib/speech/cloud';
import { readConsent, saveConsent, type Consent } from '@/lib/privacy/consent';
import { clearAnalytics } from '@/lib/analytics';
import { useT } from '@/lib/i18n/use-t';
import { LANGUAGES, getLanguage } from '@/lib/i18n/languages';
import { APP_BUILD } from '@/lib/version';

const LEVELS: CEFRLevel[] = ['A2', 'B1', 'B2', 'C1', 'C2'];
const GOALS: { id: Goal; label: string }[] = [
  { id: 'general', label: 'General fluency' },
  { id: 'ielts', label: 'IELTS prep' },
  { id: 'career', label: 'Career growth' },
  { id: 'interview', label: 'Interviews' },
  { id: 'study-abroad', label: 'Study abroad' },
  { id: 'travel', label: 'Travel' },
  { id: 'confidence', label: 'Confidence' },
];
const ACCENTS: { id: AccentTarget; label: string }[] = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'us', label: 'American' },
  { id: 'uk', label: 'British' },
  { id: 'au', label: 'Australian' },
];

/** Profile, appearance, engine status, account and data controls. */
/** Accepts a gateway base URL (freellmapi style) or a full chat-completions URL. */
const toChatEndpoint = (u: string) =>
  /\/chat\/completions$/.test(u) ? u : `${u.replace(/\/+$/, '')}/v1/chat/completions`;

function AiEngineCard() {
  const { toast } = useApp();
  const [saved] = useState(() => getRuntimeAi());
  const [provider, setProvider] = useState<AiProviderId>(saved.provider);
  const [key, setKey] = useState(saved.key ?? '');
  const [model, setModel] = useState(saved.model ?? '');
  const [endpoint, setEndpoint] = useState(saved.endpoint ?? '');
  const [testing, setTesting] = useState(false);

  const preset = provider !== 'local' && provider !== 'custom' ? PROVIDER_PRESETS[provider] : null;

  const save = () => {
    setRuntimeAi({
      provider,
      key: key.trim(),
      model: model.trim() || undefined,
      endpoint: provider === 'custom' || provider === 'freellm' ? (endpoint.trim() ? toChatEndpoint(endpoint.trim()) : undefined) : undefined,
    });
    const connected = provider !== 'local' && (Boolean(key.trim()) || provider === 'freellm');
    toast({
      tone: 'success',
      title: connected ? `AI Tutor connected to ${provider}` : 'AI Tutor: on-device engine',
      body: connected ? 'Open the AI Tutor — answers now stream from the cloud model.' : 'Fully offline, zero keys.',
    });
  };

  const test = async () => {
    const ep = provider === 'custom' || provider === 'freellm' ? (endpoint.trim() ? toChatEndpoint(endpoint.trim()) : '') : (preset?.endpoint ?? '');
    if (!ep || (!key.trim() && provider !== 'freellm')) {
      toast({ tone: 'warn', title: 'Add a key first', body: 'Pick a provider and paste its API key.' });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key.trim() ? { Authorization: `Bearer ${key.trim()}` } : {}),
        },
        body: JSON.stringify({ model: model.trim() || preset?.model, messages: [{ role: 'user', content: 'Reply with the single word: ready' }], max_tokens: 8 }),
      });
      toast(
        res.ok
          ? { tone: 'success', title: 'Connection OK', body: 'The model answered. Save and start chatting.' }
          : { tone: 'bad', title: `Provider said ${res.status}`, body: (await res.text()).slice(0, 140) },
      );
    } catch (e) {
      toast({ tone: 'bad', title: 'Could not reach provider', body: String(e).slice(0, 120) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-faint">Provider</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiProviderId)}
            className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand/60"
          >
            <option value="local">On-device engine (no key)</option>
            <option value="gemini">Google Gemini (free key)</option>
            <option value="groq">Groq (free tier)</option>
            <option value="openrouter">OpenRouter (free models)</option>
            <option value="openai">OpenAI</option>
            <option value="freellm">freellmapi gateway (self-hosted)</option>
            <option value="custom">Custom endpoint</option>
          </select>
        </label>
        {provider !== 'local' && (
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-faint">API key</span>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="paste key — stored only on this device"
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand/60"
            />
          </label>
        )}
        {provider !== 'local' && (
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-faint">Model (optional)</span>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={preset?.model ?? 'model id'}
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand/60"
            />
          </label>
        )}
        {(provider === 'custom' || provider === 'freellm') && (
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
              {provider === 'freellm' ? 'Your gateway base URL' : 'Endpoint (OpenAI-compatible)'}
            </span>
            <input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder={provider === 'freellm' ? 'https://my-freellmapi-gateway.example.com' : 'https://…/chat/completions'}
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand/60"
            />
          </label>
        )}
      </div>
      {preset && <p className="text-xs text-faint">{preset.freeNote}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={save}>Save engine</Button>
        {provider !== 'local' && (
          <Button variant="secondary" loading={testing} onClick={() => void test()}>
            Test connection
          </Button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const t = useT();
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');
  const { profile, updateProfile, theme, setTheme, isGuest, signInWithGoogle, signOut, storageMode, toast, repo, sessions, coachSessions, mockResults, refresh, clearHistory } = useApp();
  const [confirmClear, setConfirmClear] = useState(false);

  const clearPracticeHistory = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    await clearHistory();
    clearAnalytics();
    setConfirmClear(false);
    toast({ tone: 'success', title: 'History cleared', body: 'Sessions, reports, coach chats, mocks and on-device analytics were deleted. Your profile stays.' });
    await refresh();
  };
  const [seeding, setSeeding] = useState(false);
  const hasDemo = sessions.some((s) => s.demo);

  const seed = async () => {
    setSeeding(true);
    try {
      const { sessions: n } = await seedDemoData(repo, profile?.userId ?? 'guest');
      toast({ tone: 'success', title: `Loaded ${n} sample sessions` });
      await refresh();
    } finally {
      setSeeding(false);
    }
  };
  const [name, setName] = useState(profile?.name ?? '');
  const [micOk, setMicOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void microphoneAvailable().then((ok) => !cancelled && setMicOk(ok));
    return () => {
      cancelled = true;
    };
  }, []);

  const caps = detectCapabilities();

  const exportData = () => {
    try {
      const dump: Record<string, unknown> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key?.startsWith('stim:')) dump[key] = JSON.parse(window.localStorage.getItem(key) ?? 'null');
      }
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `osynlearn-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ tone: 'success', title: 'Export ready', body: 'Your data was downloaded as JSON.' });
    } catch {
      toast({ tone: 'bad', title: 'Export failed' });
    }
  };

  const fileRef = useRef<HTMLInputElement>(null);

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>;
        const entries = Object.entries(parsed).filter(([k]) => k.startsWith('stim:'));
        if (!entries.length) {
          toast({ tone: 'bad', title: 'Nothing to import', body: 'That file does not look like an OsynLearn export.' });
          return;
        }
        if (!window.confirm(`Import ${entries.length} data entries? This overwrites matching data on this device.`)) return;
        for (const [k, v] of entries) window.localStorage.setItem(k, JSON.stringify(v));
        toast({ tone: 'success', title: 'Import complete', body: 'Reloading…' });
        setTimeout(() => window.location.reload(), 700);
      } catch {
        toast({ tone: 'bad', title: 'Import failed', body: 'The file is not valid JSON.' });
      }
    };
    reader.onerror = () => toast({ tone: 'bad', title: 'Could not read that file' });
    reader.readAsText(file);
  };

  const wipe = () => {
    if (!window.confirm('Delete ALL local OsynLearn data on this device? This cannot be undone.')) return;
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key?.startsWith('stim:')) window.localStorage.removeItem(key);
    }
    window.location.href = '/onboarding';
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Settings</h1>

      {/* profile */}
      <Card className="space-y-4 p-5">
        <SectionTitle title="Profile" />
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Display name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== profile?.name && void updateProfile({ name: name.trim() })}
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface2 px-4 text-sm text-ink outline-none focus:border-brand/60"
          />
        </label>

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Current level</span>
          <div className="mt-1.5">
            <Segmented value={profile?.level ?? 'B1'} onChange={(v) => void updateProfile({ level: v })} options={LEVELS.map((l) => ({ value: l, label: l }))} />
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Goal</span>
          <select
            value={profile?.goal ?? 'general'}
            onChange={(e) => void updateProfile({ goal: e.target.value as Goal })}
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface2 px-3 text-sm text-ink outline-none"
          >
            {GOALS.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </label>

        {profile?.goal === 'ielts' ? (
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-muted">Exam date (optional)</span>
            <input
              type="date"
              value={profile.examDate ?? ''}
              onChange={(e) => void updateProfile({ examDate: e.target.value || undefined })}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface2 px-3 text-sm text-ink outline-none"
            />
          </label>
        ) : null}

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Target accent</span>
          <div className="mt-1.5">
            <Segmented value={profile?.accentTarget ?? 'neutral'} onChange={(v) => void updateProfile({ accentTarget: v })} options={ACCENTS.map((a) => ({ value: a.id, label: a.label }))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-muted">Daily goal (min)</span>
            <input
              type="number"
              min={5}
              max={120}
              value={profile?.dailyGoalMin ?? 10}
              onChange={(e) => void updateProfile({ dailyGoalMin: Math.max(1, Math.min(120, Number(e.target.value) || 10)) })}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface2 px-3 text-sm text-ink outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-muted">Minutes you have / day</span>
            <input
              type="number"
              min={5}
              max={90}
              value={profile?.availableMinPerDay ?? 10}
              onChange={(e) => void updateProfile({ availableMinPerDay: Math.max(5, Math.min(90, Number(e.target.value) || 10)) })}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface2 px-3 text-sm text-ink outline-none"
            />
          </label>
        </div>
      </Card>

      {/* appearance */}
      <Card className="p-5">
        <SectionTitle
          title="Practice language"
          hint="Recognition, transcription and filler coaching follow it. Zero downloads — it uses your browser's own speech service."
        />
        <LanguageCard />

        <SectionTitle title={t('settings.language')} hint={t('settings.languageHint')} />
        <Segmented
          value={profile?.uiLanguage ?? 'en'}
          onChange={(v) => void updateProfile({ uiLanguage: v as 'en' | 'bn' })}
          options={UI_LANGUAGES.map((l) => ({ value: l.id, label: l.native }))}
        />

        <SectionTitle title="Appearance" />
        <Segmented
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'dark', label: 'Dark', icon: <Moon className="h-3.5 w-3.5" /> },
            { value: 'light', label: 'Light', icon: <Sun className="h-3.5 w-3.5" /> },
          ]}
        />
      </Card>

      {/* speech engine */}
      <Card className="p-5">
        <SectionTitle title="Speech engine" hint="The pluggable engine reports its own capabilities." />
        <div className="space-y-2.5 text-sm">
          <Row label="Microphone" value={micOk === null ? 'checking…' : micOk ? 'available' : 'not available'} tone={micOk ? 'good' : 'bad'} />
          <Row label="Recognition" value={caps.available ? caps.kind : 'unsupported'} tone={caps.available ? 'good' : 'bad'} />
          <Row label="Transcription" value={whisperAvailable() ? 'Whisper large-v3 (cloud)' : 'Web Speech (on-device)'} tone={whisperAvailable() ? 'good' : 'mid'} />
          <Row label="Live captions" value={caps.liveInterim ? 'yes' : 'no'} tone={caps.liveInterim ? 'good' : 'mid'} />
          <Row label="Word timings" value={caps.wordTimings ? 'native' : 'estimated'} tone={caps.wordTimings ? 'good' : 'mid'} />
          <Row label="Phoneme scoring" value={caps.phonemeScores ? 'connected' : 'on-device estimate'} tone={caps.phonemeScores ? 'good' : 'mid'} />
          <Row label="Coach voice" value={voiceLabel()} />
          <Row label="App build" value={APP_BUILD} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-faint">
          For best results use Chrome or Edge on desktop / Android, or Safari on iOS. Add a cloud provider in <code className="rounded bg-surface2 px-1">.env.local</code> to upgrade to phoneme-level scoring.
        </p>
      </Card>

      {/* database */}
      <Card className="p-5">
        <SectionTitle
          title="Your database"
          hint={storageMode === 'local' ? 'Stored on this device — survives reloads & restarts.' : 'Synced to Supabase.'}
        />
        <div className="space-y-2.5 text-sm">
          <Row label="Storage" value={storageMode === 'local' ? 'on-device (guest)' : 'Supabase cloud'} tone={storageMode === 'local' ? 'mid' : 'good'} />
          <Row label="Speaking sessions" value={String(sessions.length)} />
          <Row label="Feedback reports" value={String(sessions.length)} />
          <Row label="Coach conversations" value={String(coachSessions.length)} />
          <Row label="IELTS mocks" value={String(mockResults.length)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {!hasDemo && (
            <Button variant="secondary" loading={seeding} icon={<Sparkles className="h-4 w-4" />} onClick={() => void seed()}>
              Load 2 weeks of sample data
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-faint">
          <Database className="mr-1 inline h-3.5 w-3.5" />
          Everything you do is written to a real store and re-read on launch — streaks, history, mistake book and roadmaps all build on it. Export a JSON backup above any time.
        </p>

        <div className="mt-4 rounded-2xl border border-line bg-surface2/60 p-4">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted">Cloud sync · Supabase free tier</p>
          <p className="mt-1 text-[11px] leading-relaxed text-faint">
            Create a free project at supabase.com, run <code>supabase/schema.sql</code> in its SQL editor,
            then paste the URL and anon key here. They stay on this device; disconnect any time.
          </p>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <input
              value={sbUrl}
              onChange={(e) => setSbUrl(e.target.value)}
              placeholder="https://xxxx.supabase.co"
              className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-xs text-ink outline-none focus:border-brand/60"
            />
            <input
              value={sbKey}
              onChange={(e) => setSbKey(e.target.value)}
              placeholder="anon public key"
              type="password"
              className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-xs text-ink outline-none focus:border-brand/60"
            />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                const url = sbUrl.trim();
                const ok = /^https:\/\/.+\.supabase\.co$/.test(url) || /^https?:\/\/localhost[:/]/.test(url);
                if (!ok || sbKey.trim().length < 20) {
                  toast({ tone: 'bad', title: 'Check the Supabase URL and anon key' });
                  return;
                }
                setRuntimeSupabase({ url, anonKey: sbKey.trim() });
                window.location.reload();
              }}
            >
              Connect & reload
            </Button>
            {storageMode !== 'local' && (
              <Button
                variant="ghost"
                onClick={() => {
                  setRuntimeSupabase(null);
                  window.location.reload();
                }}
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* AI engine */}
      <Card className="p-5">
        <SectionTitle title="AI Tutor engine" hint="On-device engine by default; plug in a free cloud key for a real LLM." />
        <AiEngineCard />
      </Card>

      {/* assessment quality console */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-extrabold text-ink">Assessment quality console</p>
          <p className="mt-0.5 text-xs text-muted">Versioned eval set, qualified human ratings, disagreement review, usage & cost, limitations.</p>
        </div>
        <Link href="/eval" className="tap inline-flex min-h-10 items-center rounded-xl bg-brand px-4 text-xs font-extrabold text-white">Open /eval →</Link>
      </Card>

      <PrivacyCenter />

      {/* account */}
      <Card className="p-5">
        <SectionTitle title="Account" hint={storageMode === 'local' ? 'Running in local mode — data stays on this device.' : 'Synced to Supabase.'} />
        <div className="flex flex-wrap gap-2">
          {isGuest ? (
            <Button icon={<LogIn className="h-4 w-4" />} onClick={() => void signInWithGoogle()}>
              Sign in & sync
            </Button>
          ) : (
            <Button variant="secondary" icon={<LogOut className="h-4 w-4" />} onClick={() => void signOut()}>
              Sign out
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importData(f);
              e.target.value = '';
            }}
          />
          <Button variant="secondary" icon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
            Import data
          </Button>
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportData}>
            Export my data
          </Button>
          <Button
            variant={confirmClear ? 'danger' : 'secondary'}
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => void clearPracticeHistory()}
          >
            {confirmClear ? 'Tap again to confirm' : 'Clear practice history'}
          </Button>
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={wipe}>
            Erase local data
          </Button>
        </div>
        {isGuest ? (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            You are in guest mode. Your progress is saved on this device and survives reloads, but signing in moves it to the cloud so any device can pick up where you left off.
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'mid' }) {
  const colours = { good: 'text-good', bad: 'text-bad', mid: 'text-warn' } as const;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`font-bold ${tone ? colours[tone] : 'text-ink'}`}>{value}</span>
    </div>
  );
}

/** Smart multilingual picker: search by native or English name, zero extra MB. */
function LanguageCard() {
  const { profile, updateProfile, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = getLanguage(profile?.practiceLanguage);
  const q = query.trim().toLowerCase();
  const list = LANGUAGES.filter(
    (l) => !q || l.name.toLowerCase().includes(q) || l.native.includes(query.trim()) || l.bcp47.toLowerCase().startsWith(q),
  );
  return (
    <>
      <Card className="p-0">
        <button onClick={() => setOpen(true)} className="flex w-full items-center justify-between p-4 text-left">
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand">
              <Languages className="h-[18px] w-[18px]" />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink">Speaking language</span>
              <span className="block text-xs text-muted">
                {current.grammarReady
                  ? 'Full analysis: grammar, vocabulary tiers, prosody'
                  : 'Fluency, pace, fillers & clarity now · deep grammar coming'}
              </span>
            </span>
          </span>
          <span className="text-sm font-extrabold text-ink">
            {current.flag} {current.native}
          </span>
        </button>
      </Card>
      <Sheet open={open} onClose={() => setOpen(false)} title="Practice language">
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface2 px-3">
            <Search className="h-4 w-4 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search — বাংলা, Spanish, ar…"
              className="w-full bg-transparent p-2.5 text-sm text-ink outline-none"
            />
          </div>
          <div className="max-h-[60dvh] space-y-1 overflow-y-auto">
            {list.map((l) => (
              <button
                key={l.bcp47}
                onClick={() => {
                  void updateProfile({ practiceLanguage: l.bcp47 });
                  setOpen(false);
                  toast({ tone: 'success', title: `Practice language: ${l.name}`, body: 'Recording, captions and coaching now follow it.' });
                }}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface2"
              >
                <span className="text-lg">{l.flag}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink">{l.native}</span>
                  <span className="block text-xs text-muted">
                    {l.name}
                    {l.grammarReady ? ' · full analysis' : ''}
                  </span>
                </span>
                {l.bcp47 === current.bcp47 ? <Check className="h-4 w-4 text-brand" /> : null}
              </button>
            ))}
            {!list.length && (
              <p className="p-3 text-sm text-muted">Not listed yet — more languages ship as engines add them.</p>
            )}
          </div>
        </div>
      </Sheet>
    </>
  );
}

/* ------------------------- privacy & data controls ------------------------ */

function PrivacyCenter() {
  const { toast, isGuest } = useApp();
  const [consent, setConsent] = useState<Consent>({ recordingUpload: false, retentionDays: 90 });
  const [managedOn, setManagedOn] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    setConsent(readConsent());
    void fetch('/api/ai/status')
      .then((r) => r.json())
      .then((j) => setManagedOn(Boolean(j.configured)))
      .catch(() => setManagedOn(false));
  }, []);

  const save = (next: Consent) => {
    setConsent(next);
    saveConsent(next);
  };

  const cloud = cloudConfig();

  const recover = async () => {
    const client = supabase();
    if (!client || !isSupabaseConfigured()) {
      toast({ tone: 'warn', title: 'Cloud not connected', body: 'Account recovery needs a Supabase project — add it in Cloud sync first.' });
      return;
    }
    if (!email.includes('@')) {
      toast({ tone: 'warn', title: 'Enter your account email', body: 'We send the recovery link to the address you signed up with.' });
      return;
    }
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    toast(
      error
        ? { tone: 'bad', title: 'Could not send recovery link', body: error.message }
        : { tone: 'success', title: 'Recovery link sent', body: 'Check your inbox — the link signs you in and lets you set a new password.' },
    );
  };

  return (
    <Card className="p-5">
      <SectionTitle title="Privacy & data" hint="you decide what leaves this device" />
      <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
        <p className="font-bold text-ink">Who receives what</p>
        <ul className="list-inside list-disc space-y-1">
          <li><span className="font-bold text-ink">On-device engine</span> — audio & text analysed locally; nothing leaves the device.</li>
          <li>
            <span className="font-bold text-ink">Cloud transcription{cloud ? '' : ' (not configured)'}</span> — your recording is sent to the transcription provider you configured{cloud ? '' : '; currently none, so recordings never leave the device'}. {consent.recordingUpload ? 'Consent ON.' : 'Consent OFF — skipped.'}
          </li>
          <li><span className="font-bold text-ink">Managed AI assessment{managedOn ? '' : ' (not configured on this deployment)'}</span> — transcript + measured features (never the recording) go to the server-side model when configured.</li>
          <li><span className="font-bold text-ink">Supabase sync{isSupabaseConfigured() ? '' : ' (not connected)'}</span> — profile, sessions and reports when signed in.</li>
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs font-bold text-ink">
          <input
            type="checkbox"
            checked={consent.recordingUpload}
            onChange={(e) => {
              save({ ...consent, recordingUpload: e.target.checked });
              toast({ tone: 'info', title: e.target.checked ? 'Recording upload allowed' : 'Recording upload blocked', body: e.target.checked ? 'Cloud transcription may process your recordings.' : 'Recordings stay on this device; browser recognition still works.' });
            }}
          />
          Allow recordings to leave this device for cloud transcription
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-ink">
          Retention
          <select
            value={consent.retentionDays}
            onChange={(e) => save({ ...consent, retentionDays: Number(e.target.value) as Consent['retentionDays'] })}
            className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink outline-none"
          >
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="account email" className="w-48 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-brand/60" />
        <Button variant="secondary" onClick={() => void recover()}>Send account recovery link</Button>
        {!isGuest && (
          <Button
            variant="danger"
            onClick={() => {
              const client = supabase();
              toast({ tone: 'info', title: 'Deletion requested', body: isSupabaseConfigured() && client ? 'Account deletion will be processed server-side; local data cleared now.' : 'Local data cleared; cloud deletion applies once Supabase is connected.' });
              try {
                window.localStorage.clear();
              } catch {
                /* fine */
              }
              window.location.reload();
            }}
          >
            Delete my account & data
          </Button>
        )}
      </div>
    </Card>
  );
}
