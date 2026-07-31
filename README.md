# 日本住宅 3D 導覽 (Japanese House 3D)

Interactive 3D interior walkthrough of a Japanese residential house based on three floor plans (1F / 2F / PH).

## Phase 1 (current)

- Walls, floor slabs, stairs, door openings
- First-person walk (PointerLock + WASD)
- Top-down orthographic view (pan + zoom)
- Mode switch UI
- Multi-floor stacking on Y (2.7 m floor-to-floor)

**Not yet:** furniture, textures, physics, door animations, mobile touch, GitHub Pages deploy.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- three / @react-three/fiber / @react-three/drei
- zustand (viewer mode)

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Controls

| Mode | Controls |
|------|----------|
| Top-down | Drag to pan, wheel to zoom |
| First-person | Click canvas to lock pointer, WASD move, Esc unlock |

## Project layout

```
src/
├── app/                  # Next.js App Router
├── components/
│   ├── Scene.tsx
│   ├── Player.tsx
│   ├── cameras/
│   ├── house/
│   └── ui/
├── data/dimensions.ts    # All sizes in meters
├── store/useViewerStore.ts
└── lib/units.ts
```

## Units & coordinates

- World unit = **meter**
- Origin = SW corner of footprint
- X east, Z north, Y up
- Floor tops: 1F = 0, 2F = 2.7, PH = 5.4

Edit geometry in `src/data/dimensions.ts` first.

## Plans

Source drawings: `docs/2d-floors/FirstFloor.jpeg`, `SecondFloor.jpeg`, `ThirdFloor.jpeg`.

## Deploy (later)

For GitHub Pages, set in `next.config.ts`:

```ts
output: "export",
basePath: "/<repo-name>",
images: { unoptimized: true },
```

Then `npm run build` and publish the `out/` folder.
