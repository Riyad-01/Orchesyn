# OsynLearn — Final Glossy Asset Kit

**Learn more. Become more.** · By Orchesyn

Start with `logos/osynlearn-tagline-light-transparent.png`. For your app header use `logos/osynlearn-header-light-720.png`. Use the corresponding dark variant on dark surfaces. The primary launcher icon is `app-icons/osynlearn-primary-1024.png`.

## Files and placement

| Folder | Contents |
|---|---|
| logos | Glossy horizontal, header and stacked logos; transparent and background versions; web-sized exports |
| wordmarks | Name without the emblem, light and dark versions |
| marks | Glossy emblem on transparent background |
| app-icons | 256, 512 and 1024px opaque square icons, in dark, white and violet backgrounds |
| web | SVG/PNG/ICO favicons, 180px Apple touch icon, 192/512px PWA icons, maskable icons, manifest, logos and CSS tokens |
| ios | Universal Xcode AppIcon.appiconset with Contents.json and marketing icon |
| android | Legacy launcher densities, round icons, adaptive foreground layers, background colour and themed monochrome vector |
| splash | Transparent emblem exports for launch screens |
| social | 1200×630 share graphics and 1024px avatar |
| vector-flat | Genuine editable SVG paths: single-colour marks and flat logo fallbacks |
| integration | React component and HTML head snippet |
| preview | Single-frame logo and full export overview |
| source | Approved reference, transparent production masters, contour data, tokens and reproducible export scripts |

## Glossy artwork versus vector artwork

The glossy liquid finish is raster artwork in PNG format. It is **not an editable 3D model or a fully vector glossy illustration**. The separate SVGs are flat silhouette fallbacks traced from the production artwork, including the wordmark, with no embedded bitmap. Use these for single-colour printing, tiny icons and other placements that cannot reproduce glossy shading.

The approved white reference is preserved unchanged in `source/artwork/approved-white-reference.png`. Transparent light and dark production variants were generated from it and may have minor rendering differences. The dark variant uses brighter lilac lettering to remain readable. The extracted emblem has 477×436 source pixels; 1024px launcher files are size-compliant resized exports and do not add native detail. For very large print signage, commission a high-resolution material/vector reconstruction or use the flat SVG.

## Brand rules

Primary violet: `#7046E8`. Ink: `#17152A`. Lilac: `#B7A4FF`. Paper: `#F7F5FF`. White: `#FFFFFF`. Cyan highlights are part of the glossy rendering, not a general text colour.

Leave clear space of at least one quarter of the emblem width around a logo. Keep proportions unchanged. Never apply extra shadows, filters, skew, outlines or gradients to the finished glossy files. Use the dark-background variant instead of inverting colours. Keep the tagline out of tiny headers and app launcher icons. Use at least 180px width for a header logo and 360px for a tagline logo; use the standalone mark in smaller placements. For favicons, prefer the supplied flat fallback.

## Web installation

1. Copy the contents of `web/` into your app's `public/brand/` directory.
2. Merge `integration/head-snippet.html` into the document head. Avoid duplicate manifest and favicon entries.
3. Set the manifest's `id`, `start_url` and `scope` to your actual deployment. The sample assumes `/`. Preserve an existing installed app's identity when replacing assets.
4. Replace the example domain in the social-image URL with your real absolute URL.
5. Use `integration/OsynLearnLogo.tsx` as an optional React component. It references `/brand/` by default.

These files do not implement a service worker, offline caching or an installation flow. Retain those features from the actual application.

## iOS and Android

Import the iOS AppIcon.appiconset into your actual Xcode asset catalogue. Icons are square and opaque with no baked-in corner radius. This is a conventional flattened PNG set, not an Icon Composer layered project. Configure any additional appearance requirements in the actual target project.

Merge the Android `res/` directory into your application resources, resolving name conflicts. Use `@mipmap/ic_launcher` and `@mipmap/ic_launcher_round` in the application manifest. v26 adaptive icons combine a raster foreground and solid background; the v33 variant adds a native vector monochrome layer. Legacy launchers use density-specific PNGs. Check supported launcher masks in Android Studio.

Splash assets are artwork only. Configure timing, background and platform launch-screen behaviour within your application. Social artwork is not an app-store screenshot; listing screenshots should come from the finished app.

## Rebuild and verification

Python dependencies: Pillow, numpy and scipy. Node dependency: sharp. Run:

```sh
python source/build_flat.py
node source/build_kit.cjs
python source/finalize.py
```

See `QA-REPORT.json` for actual file checks and `ASSET-MANIFEST.json` for dimensions and hashes. PNG readability, alpha, platform references, vector/XML parsing and icon safe areas are checked. Native projects have not been compiled or submitted to app stores. No trademark clearance is implied.
