# 日本住宅 3D 導覽 (Japanese House 3D)

Interactive **first-person** 3D walkthrough of a Japanese residential house, built from three floor plans (1F / 2F / PH).

**Tasks, milestones, DoD, and Grok prompts:** see **[`TASKS.md`](./TASKS.md)**  
**Agent coding rules:** see **[`AGENTS.md`](./AGENTS.md)**

---

## What it is

Walk the house at eye height: walls, floors, stairs, and clickable doors match the plan (meters). Start outdoors at the genkan, climb the U-stair to 2F, and enter the northeast 洋室 through the stair-hall door.

**Not a dual-mode viewer** — there is no top-down / map camera. Position is shown on the HUD.

---

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Controls

| Action | Control |
|--------|---------|
| Move | W / S |
| Turn | A / D (±10° per key) |
| Doors | Click leaf to open / close |
| Position | Top-right HUD (plan X east, Z north, Y eye height, m) |

---

## Design snapshot (current build)

High-level geometry locked with the owner; full decision log and acceptance criteria live in `TASKS.md`.

| Area | Behavior |
|------|----------|
| Units / axes | Meters; plan origin SW; +X east, +Z north, +Y up |
| Display | House X-mirrored so north view matches the PDF (LDK left) |
| 1F floor | Raised interior **0.5 m**; genkan steps 0.25 × 2 |
| Stairs | U-stair 1F→2F, north mid-landing Y=1.7; well NS **1.82** |
| 2F NE 洋室 | West door @ x=6.37 (0.91 hall band); N/E solid; south G2 glass **4.55 m** (2.73+1.82) to east wall |
| Balcony | Slab visible; no parapet; access door deferred |
| 1F ceiling | Soffit Y=2.5; open over stair well |
| Height | Multi-level sampling; ignore 2F slabs while feetY &lt; 2.0 |

**Edit sizes in** `src/data/dimensions.ts` first.

---

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- three / @react-three/fiber / @react-three/drei
- zustand (position / floor HUD state)

---

## Project layout

```
src/
├── app/                     # Next.js App Router
├── components/
│   ├── Scene.tsx
│   ├── Player.tsx
│   ├── cameras/             # First-person only
│   ├── house/               # Floors, walls, stairs, doors, ceilings…
│   └── ui/
├── data/dimensions.ts       # All sizes (m)
├── store/useViewerStore.ts
└── lib/                     # coords, height sampling, units
TASKS.md                     # Goals, milestones, DoD, Grok prompts
AGENTS.md                    # Rules for AI / agents
```

---

## Plans

Source drawings (often private / gitignored):

- `docs/2d-floors/FirstFloor.jpeg`
- `docs/2d-floors/SecondFloor.jpeg`
- `docs/2d-floors/ThirdFloor.jpeg`

---

## Deploy

Deferred until the ship milestone in `TASKS.md` (T-501). Intended approach: Next.js static export for GitHub Pages (`output: "export"`, `basePath`, unoptimized images).

---

## Status

See **[`TASKS.md`](./TASKS.md)** — current milestone, backlog, and definition of done.
