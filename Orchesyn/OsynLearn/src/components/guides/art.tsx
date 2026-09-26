'use client';

import type { GuideArticle } from '@/lib/data/guides';

/**
 * Procedural cover art + infographics — every article gets a unique vector
 * cover and a data infographic. Zero downloads, crisp on any screen, works
 * offline (matches the "minimal MB" mandate).
 */

export function GuideCover({ a, tall = false }: { a: GuideArticle; tall?: boolean }) {
  const gid = `g-${a.id}`;
  return (
    <svg viewBox={tall ? '0 0 400 240' : '0 0 400 210'} className="h-auto w-full" role="img" aria-label={a.title}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a.grad[0]} />
          <stop offset="1" stopColor={a.grad[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height={tall ? 240 : 210} rx="18" fill={`url(#${gid})`} />
      {/* decorative geometry */}
      <circle cx="345" cy="30" r="70" fill="#ffffff" opacity="0.12" />
      <circle cx="40" cy={tall ? 210 : 190} r="90" fill="#000000" opacity="0.14" />
      <path d={`M0 ${tall ? 170 : 150} Q120 ${tall ? 130 : 115} 400 ${tall ? 185 : 165} V${tall ? 240 : 210} H0 Z`} fill="#000" opacity="0.18" />
      {/* tag chip */}
      <rect x="20" y="18" rx="11" width={a.tag.length * 8 + 46} height="24" fill="#000" opacity="0.35" />
      <text x="32" y="34.5" fontSize="12" fontWeight="700" fill="#fff" letterSpacing="1.5" style={{ textTransform: 'uppercase' }}>
        {a.tag.toUpperCase()}
      </text>
      {/* icon */}
      <text x="352" y="72" fontSize="34" textAnchor="middle">
        {a.icon || '✦'}
      </text>
      {/* title (wrapped) */}
      {wrap(a.title, 26).slice(0, 3).map((line, i) => (
        <text key={i} x="20" y={tall ? 120 + i * 30 : 108 + i * 27} fontSize={tall ? 25 : 23} fontWeight="800" fill="#fff" style={{ fontFamily: 'inherit' }}>
          {line}
        </text>
      ))}
      {/* footer meta */}
      <text x="20" y={(tall ? 240 : 210) - 14} fontSize="12" fontWeight="600" fill="#fff" opacity="0.85">
        {a.minutes} min read · OsynLearn Guide Library
      </text>
    </svg>
  );
}

export function GuideInfographic({ a }: { a: GuideArticle }) {
  const gid = `gi-${a.id}`;
  return (
    <svg viewBox="0 0 640 170" className="h-auto w-full" role="img" aria-label={`${a.title} key numbers`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={a.grad[0]} />
          <stop offset="1" stopColor={a.grad[1]} />
        </linearGradient>
      </defs>
      <rect width="640" height="170" rx="16" fill={`url(#${gid})`} opacity="0.12" />
      <rect x="0" y="0" width="6" height="170" fill={`url(#${gid})`} />
      {a.stats.slice(0, 3).map((s, i) => {
        const x = 30 + i * 205;
        return (
          <g key={i}>
            <text x={x} y="72" fontSize="40" fontWeight="900" fill={a.grad[0]}>
              {s.v}
            </text>
            {/* tiny bar under the number */}
            <rect x={x} y="86" width={Math.min(150, 30 + s.v.length * 22)} height="6" rx="3" fill={a.grad[1]} />
            {wrap(s.l, 30).slice(0, 2).map((line, j) => (
              <text key={j} x={x} y={110 + j * 18} fontSize="13.5" fontWeight="600" fill="currentColor" opacity="0.75">
                {line}
              </text>
            ))}
            {i < 2 ? (
              <path d={`M${x + 170} 60 l14 10 l-14 10`} fill="none" stroke={a.grad[1]} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            ) : null}
          </g>
        );
      })}
      <text x="616" y="156" textAnchor="end" fontSize="10.5" fontWeight="700" fill="currentColor" opacity="0.45" letterSpacing="1.2">
        OSYNEDU · KEY NUMBERS
      </text>
    </svg>
  );
}

function wrap(text: string, max: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
