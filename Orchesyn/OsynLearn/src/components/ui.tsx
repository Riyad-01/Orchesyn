'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn, scoreTone, TONE_VAR } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Button
 * ------------------------------------------------------------------ */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'gradient-brand text-white hover:brightness-110 shadow-glow',
  secondary: 'bg-surface2 text-ink border border-line hover:bg-line/60',
  ghost: 'text-muted hover:text-ink hover:bg-surface2',
  danger: 'bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25',
  accent: 'bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25',
};

const SIZES: Record<Size, string> = {
  sm: 'h-10 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-6 text-base gap-2 rounded-2xl py-3.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'tap inline-flex items-center justify-center font-semibold transition-all duration-150',
        'disabled:pointer-events-none disabled:opacity-45',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('h-4 w-4 animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */

export function Card({
  className,
  children,
  as: Tag = 'div',
  ...rest
}: { className?: string; children: ReactNode; as?: any } & Record<string, any>) {
  return (
    <Tag {...rest} className={cn('card p-4', className)}>
      {children}
    </Tag>
  );
}

export function SectionTitle({
  title,
  action,
  hint,
}: {
  title: string;
  action?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-base font-bold tracking-tight text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-line', className)} />;
}

/* ------------------------------------------------------------------ *
 * Chips & badges
 * ------------------------------------------------------------------ */

export function Chip({
  active,
  children,
  className,
  ...rest
}: { active?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        'tap inline-flex min-h-10 shrink-0 items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
        active
          ? 'border-brand/50 bg-brand/15 text-ink'
          : 'border-line bg-surface2 text-muted hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'neutral' | 'good' | 'mid' | 'bad' | 'brand';
  children: ReactNode;
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'border-line bg-surface2 text-muted',
    good: 'border-good/30 bg-good/12 text-good',
    mid: 'border-warn/30 bg-warn/12 text-warn',
    bad: 'border-bad/30 bg-bad/12 text-bad',
    brand: 'border-brand/40 bg-brand/15 text-ink',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Score visualisation
 * ------------------------------------------------------------------ */

export function ScoreRing({
  score,
  size = 120,
  stroke = 10,
  label,
  sublabel,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const tone = scoreTone(score);
  const colour = TONE_VAR[tone];
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {score < 0 ? (
          <span className="text-lg font-bold text-faint">–</span>
        ) : (
          <span className="font-display text-3xl font-extrabold leading-none" style={{ color: colour }}>
            {label ?? Math.round(score)}
          </span>
        )}
        {sublabel ? <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted">{sublabel}</span> : null}
      </div>
    </div>
  );
}

export function ScoreBar({
  label,
  score,
  hint,
  onClick,
}: {
  label: string;
  score: number;
  hint?: string;
  onClick?: () => void;
}) {
  const tone = scoreTone(score);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cn('w-full text-left', onClick && 'tap rounded-lg p-1 -m-1 hover:bg-surface2')}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-ink">{label}</span>
        <span className="text-xs font-bold tabular-nums" style={{ color: TONE_VAR[tone] }}>
          {score < 0 ? '—' : Math.round(score)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
        <motion.div
          className="h-full rounded-full"
          style={{ background: TONE_VAR[tone] }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-faint">{hint}</p> : null}
    </Tag>
  );
}

export function Stat({
  value,
  label,
  tone,
  className,
}: {
  value: ReactNode;
  label: string;
  tone?: 'good' | 'mid' | 'bad' | 'brand' | 'none';
  className?: string;
}) {
  return (
    <div className={cn('surface-inset px-3 py-2.5', className)}>
      <div
        className="font-display text-lg font-extrabold leading-none"
        style={{ color: tone ? TONE_VAR[tone] : 'rgb(var(--ink))' }}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-faint">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Feedback states
 * ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-surface2', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <div className="text-4xl">{emoji}</div>
      <h3 className="mt-3 font-display text-base font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Segmented control
 * ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn('inline-flex rounded-xl border border-line bg-surface2 p-1', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'tap relative flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
            value === opt.value ? 'text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {value === opt.value ? (
            <motion.span
              layoutId={`seg-${options.map((o) => o.value).join('')}`}
              className="absolute inset-0 rounded-lg bg-surface shadow-card"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          ) : null}
          <span className="relative z-10 flex items-center gap-1.5">
            {opt.icon}
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Sheet (bottom drawer on mobile, centred modal on desktop)
 * ------------------------------------------------------------------ */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden border border-line bg-surface',
              'rounded-t-3xl sm:max-w-lg sm:rounded-3xl',
            )}
            initial={{ y: '100%', opacity: 0.4 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-base font-bold text-ink">{title}</h2>
              <button onClick={onClose} className="tap rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-ink" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer ? <div className="border-t border-line px-5 py-3 pb-safe">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ *
 * Waveform — live mic level and stored envelopes share one component
 * ------------------------------------------------------------------ */

export function Waveform({
  levels,
  live,
  className,
  barCount = 48,
}: {
  levels: number[];
  live?: boolean;
  className?: string;
  barCount?: number;
}) {
  const slice = levels.slice(-barCount);
  const pad = Math.max(0, barCount - slice.length);
  const bars = [...new Array(pad).fill(0.04), ...slice];
  return (
    <div className={cn('flex h-16 items-center justify-center gap-[3px]', className)} aria-hidden>
      {bars.map((value, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-brand"
          animate={{
            height: `${Math.max(6, Math.min(100, value * 100))}%`,
            opacity: live ? 0.45 + value * 0.55 : 0.35 + value * 0.5,
          }}
          transition={{ duration: live ? 0.08 : 0.3, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Tooltip (lightweight, hover + focus)
 * ------------------------------------------------------------------ */

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open ? (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-ink shadow-card"
          >
            {label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Accordion
 * ------------------------------------------------------------------ */

export function Accordion({
  title,
  subtitle,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="tap flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-ink">{title}</span>
            {badge}
          </div>
          {subtitle ? <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p> : null}
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="shrink-0 text-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="border-t border-line px-4 py-3.5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Toasts — read straight from the app context so any component can fire one
 * ------------------------------------------------------------------ */

const ToastCtx = createContext<{ toasts: { id: string; title: string; body?: string; tone: string }[]; dismiss: (id: string) => void } | null>(null);

export function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: { id: string; title: string; body?: string; tone: string }[];
  dismiss: (id: string) => void;
}) {
  const tones: Record<string, string> = {
    info: 'border-line',
    success: 'border-good/40',
    warn: 'border-warn/40',
    bad: 'border-bad/40',
  };
  return (
    <ToastCtx.Provider value={{ toasts, dismiss }}>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-3 pt-safe">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface px-4 py-3 shadow-card',
                tones[t.tone] ?? tones.info,
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{t.title}</p>
                {t.body ? <p className="mt-0.5 text-xs leading-snug text-muted">{t.body}</p> : null}
              </div>
              <button onClick={() => dismiss(t.id)} className="tap text-faint hover:text-ink" aria-label="Dismiss">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToasts() {
  return useContext(ToastCtx);
}

/* ------------------------------------------------------------------ *
 * Misc
 * ------------------------------------------------------------------ */

export function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-extrabold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
    >
      {initials || 'S'}
    </span>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-surface2', className)}>
      <motion.div
        className="gradient-brand h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}

/** Hook: run a callback when the user presses a key. */
export function useHotkey(key: string, handler: () => void, enabled = true) {
  const saved = useRef(handler);
  saved.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === key && !(e.target as HTMLElement)?.matches('input, textarea')) {
        e.preventDefault();
        saved.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, enabled]);
}

export { useCallback };
