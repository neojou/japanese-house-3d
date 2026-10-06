# japanese-house-3d

Grok Build is the only agent host. Plan detail stays in `TASKS.md`. Look and materials stay in `DESIGN.md`. Do not paste those files here.

## Build

- Track A: `npm install && npm run dev` (Vite, port 5173). `npm run build` runs `tsc --noEmit && vite build`. Typecheck clean before claiming done. Pages `base` is `/japanese-house-3d/` (`vite.config.ts`). Output is static `dist/`. `npm run dev` must keep working.
- Track B: `./gradlew :composeApp:run` (Desktop JVM), `./gradlew :composeApp:wasmJsBrowserDevelopmentRun` (Wasm), `./gradlew :shared:jvmTest`.

## Tracks

- A is the shippable SPA: `src/`, Vite + React 19 + TypeScript + R3F / drei / three + Tailwind v4 + zustand. Its roadmap is `TASKS.md` only.
- B is KMP in `composeApp/` + `shared/` (Desktop JVM + Wasm). It is not the shippable product. Its roadmap is `docs/KMP-plan.md`. Domain Kotlin stays in `shared`. UI and render stay in `composeApp`.
- Do not start K3+ unless that plan or the owner says so. Do not add a major dependency unless the owner asks.
- Subtree deltas: `src/AGENTS.md`, `composeApp/AGENTS.md`. Bans: `.grok/rules/`.

## Coordinates and dimensions

- Meters. Origin is the southwest corner. +X east, +Z north, +Y up.
- X-mirror the house to match the drawing (`src/lib/coords.ts`). Do not flip plan data a second time.
- Change a size only in `src/data/dimensions.ts`. Ban: `.grok/rules/dimension-lock.md`.
- Room sizes, swings, and elevations stay in `TASKS.md` (Design direction). Do not copy them here.

## Premises

- Korender 0.7 draws the KMP house. On macOS the desktop jar is patched at build time to an OpenGL 4.1 core context; Wasm stays WebGL2. `SoftRenderer` stays in the tree and is not the live path. Desktop doors, faucets, and tub water are clickable. Filament, Rapier, an orthographic view, and post-processing are allowed on KMP when they improve quality; this pass did not switch to them. The KMP glTF loader must not replace Vite's.
- Heroes use Path B: scripted DCC → `public/props/` glTF (`docs/cinematic-path-b.md`, `DESIGN.md` §2.7). Forbid stacked extrudes. Forbid a lumber stack or a white box (組合木板 / 白長方體) as a hero. The first GLB pass is still chamfered boxes; a direct material swap can look worse than the R3F material it replaces.
- Façade, materials, and yaki-sugi hang-points follow `DESIGN.md` and `YAKI_SUGI_WALL_IDS`.
- Do not build what `TASKS.md` has not reopened (`.grok/rules/cancelled-features.md`). No Next.js (`.grok/rules/no-next.md`).
