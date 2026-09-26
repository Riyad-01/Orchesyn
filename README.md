# Orchesyn

Parent organisation repository.

| Product | Path | Description |
|---|---|---|
| **OsynLearn** | `Orchesyn/OsynLearn/` | AI English speaking coach — IELTS/TOEFL practice, on-device feedback, PWA. *Learn more. Become more.* |
| Brand kit | `Orchesyn/brand-kit/` | Official OsynLearn logo kit: glossy masters, flat SVG fallbacks, favicons, iOS/Android launcher icons, OG images. |

## OsynLearn quick start

```bash
cd Orchesyn/OsynLearn
npm ci
npm run dev        # dev server on :3000
npm test           # 256 unit tests
npm run build      # production build
```

Static demo build (guest/local mode, no API routes):

```bash
mv src/app/api /tmp/api && BUILD_TARGET=static npm run build; mv /tmp/api src/app/api
npx surge ./out <your-domain>.surge.sh
```

Live demo: https://osynlearn-live.surge.sh
