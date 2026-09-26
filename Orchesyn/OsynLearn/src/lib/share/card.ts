/**
 * Shareable proof cards.
 *
 * Renders a 1080x1350 (4:5, ideal for WhatsApp/Instagram) PNG entirely on-device
 * with the Canvas API — no network, no library, no server. Every finished
 * session can become a shareable win, which is the app's organic growth loop.
 */

export interface ShareCardData {
  name: string;
  headline: string; // e.g. "Scored 78 · Est. band 7.0"
  subtitle?: string; // e.g. topic title
  dims: { label: string; value: number }[]; // 0..100
  streak?: number;
  footer?: string;
}

const W = 1080;
const H = 1350;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderShareCard(data: ShareCardData): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no canvas'));

      /* background */
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#0B0B14');
      bg.addColorStop(1, '#14102A');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      /* brand glow blobs */
      const glow = (cx: number, cy: number, r: number, color: string) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      };
      glow(140, 120, 340, 'rgba(124,92,255,0.35)');
      glow(960, 1180, 380, 'rgba(46,230,168,0.22)');

      /* waveform motif */
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      const bars = [0.3, 0.55, 0.9, 0.6, 1.0, 0.7, 0.45, 0.8, 0.5, 0.35];
      bars.forEach((b, i) => {
        const bh = 40 + b * 90;
        roundRect(ctx, 90 + i * 26, 200 - bh / 2, 12, bh, 6);
        ctx.fill();
      });

      /* app mark */
      ctx.font = '700 34px Manrope, Inter, sans-serif';
      ctx.fillStyle = '#F4F4F8';
      ctx.fillText('OsynLearn', 850, 120);
      ctx.font = '600 20px Inter, sans-serif';
      ctx.fillStyle = 'rgba(244,244,248,0.55)';
      ctx.fillText('AI speaking coach', 850, 152);

      /* learner */
      ctx.font = '600 30px Inter, sans-serif';
      ctx.fillStyle = 'rgba(244,244,248,0.7)';
      ctx.fillText(data.name, 90, 330);

      /* headline */
      ctx.font = '800 88px Manrope, Inter, sans-serif';
      const grad = ctx.createLinearGradient(90, 380, 900, 500);
      grad.addColorStop(0, '#7C5CFF');
      grad.addColorStop(0.6, '#A85CFF');
      grad.addColorStop(1, '#2EE6A8');
      ctx.fillStyle = grad;
      wrapText(ctx, data.headline, 90, 430, W - 180, 96);

      if (data.subtitle) {
        ctx.font = '500 30px Inter, sans-serif';
        ctx.fillStyle = 'rgba(244,244,248,0.6)';
        wrapText(ctx, data.subtitle, 90, 560, W - 180, 40);
      }

      /* dimension bars */
      const top = 660;
      const rowH = 88;
      data.dims.slice(0, 6).forEach((d, i) => {
        const y = top + i * rowH;
        ctx.font = '600 26px Inter, sans-serif';
        ctx.fillStyle = 'rgba(244,244,248,0.75)';
        ctx.fillText(d.label, 90, y + 8);
        ctx.font = '800 28px Manrope, Inter, sans-serif';
        ctx.fillStyle = '#F4F4F8';
        ctx.fillText(String(Math.round(d.value)), 930, y + 8);
        /* track */
        roundRect(ctx, 90, y + 26, 900, 16, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();
        /* fill */
        const pct = Math.max(0, Math.min(100, d.value)) / 100;
        if (pct > 0) {
          roundRect(ctx, 90, y + 26, 900 * pct, 16, 8);
          const barGrad = ctx.createLinearGradient(90, 0, 990, 0);
          barGrad.addColorStop(0, '#7C5CFF');
          barGrad.addColorStop(1, '#2EE6A8');
          ctx.fillStyle = barGrad;
          ctx.fill();
        }
      });

      /* streak pill */
      if (data.streak !== undefined && data.streak > 0) {
        const y = top + Math.min(data.dims.length, 6) * rowH + 30;
        roundRect(ctx, 90, y, 340, 66, 33);
        ctx.fillStyle = 'rgba(245,165,36,0.15)';
        ctx.fill();
        ctx.font = '700 28px Inter, sans-serif';
        ctx.fillStyle = '#F5A524';
        ctx.fillText(`🔥 ${data.streak}-day streak`, 122, y + 43);
      }

      /* footer */
      ctx.font = '600 24px Inter, sans-serif';
      ctx.fillStyle = 'rgba(244,244,248,0.45)';
      ctx.fillText(data.footer ?? 'OsynLearn — Learn more. Become more.', 90, H - 70);

      resolve(canvas.toDataURL('image/png'));
    } catch (err) {
      reject(err instanceof Error ? err : new Error('render failed'));
    }
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY);
      line = w;
      curY += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}

/** Share via the native sheet when available (WhatsApp etc.), else download the PNG. */
export async function shareCard(dataUrl: string, filename: string, title: string): Promise<'shared' | 'downloaded'> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: { files: File[]; title: string }) => Promise<void> };
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      await nav.share({ files: [file], title });
      return 'shared';
    }
  } catch {
    // fall through to download (also covers user dismissing the sheet)
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
  return 'downloaded';
}
