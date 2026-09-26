'use client';

import { cn } from '@/lib/utils';

/**
 * OsynLearn brand mark (glossy tulip emblem from the official kit).
 * Served from /brand/mark.png — precached by the service worker so it
 * renders offline; transparent PNG composites on any background.
 */
export function Logo({ size = 32, withWord = false, className }: { size?: number; withWord?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mark.png"
        alt=""
        aria-hidden
        width={size}
        height={size}
        className="shrink-0 select-none object-contain"
        draggable={false}
      />
      {withWord ? (
        <span className="font-display text-lg font-extrabold tracking-tight text-ink">
          Osyn<span className="text-[#8b6bff]">Learn</span>
        </span>
      ) : null}
    </span>
  );
}
