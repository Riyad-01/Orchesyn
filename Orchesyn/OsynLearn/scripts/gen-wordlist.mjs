// Regenerates src/lib/data/generated/frequency.ts from a frequency list.
// Usage: node scripts/gen-wordlist.mjs <path-to-txt>
import fs from 'node:fs';
const src = process.argv[2];
if (!src) { console.error('usage: node scripts/gen-wordlist.mjs <file.txt>'); process.exit(1); }
const words = fs.readFileSync(src, 'utf8').split(/\r?\n/).map((w) => w.trim().toLowerCase()).filter(Boolean);
const uniq = [...new Set(words)];
const out = `// AUTO-GENERATED. Do not edit by hand.
export const FREQUENCY_ORDER: string[] = \`\n${uniq.join(' ')}\n\`.trim().split(/\\s+/);
`;
fs.writeFileSync('src/lib/data/generated/frequency.ts', out);
console.log('wrote', uniq.length, 'words');
