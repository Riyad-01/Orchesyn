/**
 * Pluggable AI provider for the OsynLearn Tutor.
 *
 * - With `NEXT_PUBLIC_AI_*` env configured, it talks to any OpenAI-compatible
 *   chat-completions endpoint (OpenAI, Groq, OpenRouter, a local Ollama/vLLM
 *   server, etc.) and streams tokens back.
 * - With nothing configured, it falls back to the deterministic offline tutor so
 *   the chat is fully functional with zero API keys.
 *
 * The API key is read from a NEXT_PUBLIC_ var on purpose (this is a client-only
 * PWA build). For production you'd proxy through a server route; see README.
 */

import type { AiPersona } from './personas';
import { tutorRespond, type TutorContext, type TutorReply } from './local-tutor';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiConfig {
  cloud: boolean;
  provider: string;
  model: string;
  endpoint: string;
  key: string;
}

/* ------------------------------------------------------------------ *
 * Runtime (in-app) provider config — saved on device so the learner can
 * plug in a free key (Gemini / Groq / OpenRouter) without a redeploy.
 * ------------------------------------------------------------------ */

export type AiProviderId = 'local' | 'gemini' | 'groq' | 'openrouter' | 'openai' | 'freellm' | 'custom';

export interface RuntimeAi {
  provider: AiProviderId;
  key: string;
  model?: string;
  endpoint?: string;
}

export const PROVIDER_PRESETS: Record<Exclude<AiProviderId, 'local' | 'custom'>, { endpoint: string; model: string; freeNote: string }> = {
  gemini: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.0-flash',
    freeNote: 'Free key: aistudio.google.com → "Get API key"',
  },
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'openai/gpt-oss-120b',
    freeNote: 'Free tier: console.groq.com/keys',
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openrouter/auto',
    freeNote: 'Free models available: openrouter.ai/keys',
  },
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    freeNote: 'Paid API key: platform.openai.com',
  },
  freellm: {
    // Self-hosted community gateway (github.com/tashfeenahmed/freellmapi).
    // The learner pastes THEIR OWN gateway base URL in the custom endpoint
    // field; nothing third-party is hardcoded. Personal experimentation only.
    endpoint: 'https://YOUR-GATEWAY/v1/chat/completions',
    model: 'auto',
    freeNote: 'Self-host the free gateway, then paste its base URL below',
  },
};

const LS_AI = 'stim:ai';

export function getRuntimeAi(): RuntimeAi {
  if (typeof window === 'undefined') return { provider: 'local', key: '' };
  try {
    const raw = window.localStorage.getItem(LS_AI);
    return raw ? (JSON.parse(raw) as RuntimeAi) : { provider: 'local', key: '' };
  } catch {
    return { provider: 'local', key: '' };
  }
}

export function setRuntimeAi(cfg: RuntimeAi): void {
  try {
    window.localStorage.setItem(LS_AI, JSON.stringify(cfg));
  } catch {
    // private mode etc. — config simply won't persist
  }
}

export function aiConfig(): AiConfig {
  const rt = getRuntimeAi();
  // freellmapi gateways are self-hosted and may run without an API key
  if (rt.provider !== 'local' && (rt.key || rt.provider === 'freellm')) {
    const preset = PROVIDER_PRESETS[rt.provider as Exclude<AiProviderId, 'local' | 'custom'>];
    return {
      cloud: true,
      provider: rt.provider,
      model: rt.model || preset?.model || 'custom-model',
      endpoint: rt.endpoint || preset?.endpoint || '',
      key: rt.key,
    };
  }
  const provider = process.env.NEXT_PUBLIC_AI_PROVIDER ?? '';
  const key = process.env.NEXT_PUBLIC_AI_API_KEY ?? '';
  const envPreset = PROVIDER_PRESETS[provider as Exclude<AiProviderId, 'local' | 'custom'>];
  const endpoint = process.env.NEXT_PUBLIC_AI_ENDPOINT ?? envPreset?.endpoint ?? 'https://api.openai.com/v1/chat/completions';
  const model = process.env.NEXT_PUBLIC_AI_MODEL ?? envPreset?.model ?? 'gpt-4o-mini';
  return {
    cloud: Boolean(key && provider && provider !== 'none'),
    provider: provider || 'local',
    model,
    endpoint,
    key,
  };
}

export interface StreamOptions {
  persona: AiPersona;
  ctx: TutorContext;
  history: ChatTurn[];
  userInput: string;
  temperature?: number;
  signal?: AbortSignal;
  onToken: (token: string) => void;
}

export interface StreamResult {
  mode: 'cloud' | 'local';
  text: string;
  model: string;
  local?: TutorReply;
  error?: string;
}

function buildSystemPrompt(persona: AiPersona, ctx: TutorContext): string {
  return `${persona.system}

Learner context: name is ${ctx.name}, self-assessed CEFR level ${ctx.level}, primary goal "${ctx.goal}".
${ctx.evidence ? `Recent evidence from their ACTUAL attempts: ${ctx.evidence}\nCoach against this evidence — refer to their real weak criteria and current lesson, never generic advice.` : ''}Persona: ${persona.name}. Keep responses under ~180 words unless a longer answer is clearly needed.`;
}

/** Sleep helper for the simulated local stream. */
const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });

export async function streamChat(opts: StreamOptions): Promise<StreamResult> {
  const cfg = aiConfig();

  if (!cfg.cloud) {
    // --- offline tutor, streamed word-by-word for a natural typing feel ---
    const reply = tutorRespond(opts.userInput, opts.persona, opts.ctx);
    const tokens = reply.markdown.split(/(\s+)/);
    for (const t of tokens) {
      if (opts.signal?.aborted) break;
      if (t) opts.onToken(t);
      await wait(12, opts.signal);
    }
    return { mode: 'local', text: reply.markdown, model: 'OsynLearn Tutor (on-device)', local: reply };
  }

  // --- cloud, real streaming ---
  const messages = [
    { role: 'system', content: buildSystemPrompt(opts.persona, opts.ctx) },
    ...opts.history.slice(-12).map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: opts.userInput },
  ];

  try {
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // keyless self-hosted gateways (freellmapi) must not receive an empty Bearer header
        ...(cfg.key ? { Authorization: `Bearer ${cfg.key}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.7,
        stream: true,
      }),
      signal: opts.signal,
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => '');
      throw new Error(`${res.status} ${body.slice(0, 140)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? '';
          if (delta) {
            text += delta;
            opts.onToken(delta);
          }
        } catch {
          // ignore keep-alive / partial frames
        }
      }
    }

    return { mode: 'cloud', text, model: cfg.model };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (opts.signal?.aborted) return { mode: 'cloud', text: '', model: cfg.model, error: 'stopped' };
    // Graceful degradation: if the cloud call fails, fall back to the offline tutor.
    const reply = tutorRespond(opts.userInput, opts.persona, opts.ctx);
    opts.onToken(reply.markdown);
    return {
      mode: 'local',
      text: reply.markdown,
      model: 'OsynLearn Tutor (on-device)',
      local: reply,
      error: message,
    };
  }
}
