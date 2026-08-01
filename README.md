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
| Stairs | U-stair 1F→2F, mid-landing Y=1.7; well NS **1.82**; LDK 門側有牆遮梯（西側仍可上樓） |
| 1F トイレ | **1.82×0.91**（x 6.37–8.19, z 5.46–6.37）；西半坐便朝東；南牆東側 0.7 通道 + **雙片門簾**（無門） |
| 1F 洗面 | **EW 2.73**（x 8.19–10.92, 西貼トイレ）；NS 1.82；西牆**南側 0.91** 門（鉸鏈南／把手北，開進室內） |
| 2F NS | **2.73 (南翼) + 0.91 (廊道) + 2.73 (北翼) = 6.37**（與 1F 對齊） |
| 2F south wing | 洋室6.5 / CL×2 / 洋室6；房門 @ z=3.64 → **廊道**；兩門夾 CL、開向相對；南 CL 只東、北 CL 只西 |
| 2F 廊道 | z 3.64–4.55、**x 1.82–6.37**（西推 0.91），Y=2.7；西南門開向室內廊 |
| 2F 西北凸角 | 0.91×1.365；西牆 @1.82；與トイレ **實牆無門**；北牆簡易洗手台 |
| 2F NE 洋室 | West door @ x=6.37（廊道帶）；G2 **4.55 m** |
| 2F トイレ | 廊道北側 z=4.55 開門（井西） |
| Balcony | Slab visible; no parapet; access door deferred |
| 1F ceiling | Soffit Y=2.5; open over stair well |
| 2F ceiling | Soffit Y=5.2 over indoor rooms/corridor/toilet/NE; **no** slab on balcony or stair well |
| PH / 3F | 梯間 1.82×2.73：內 **廊 0.91 + 井 1.82**；U 梯 12×0.225 僅在井內；南門→陽台 6.37×3.64 @ Y=5.4；矮牆 **1.4 m** |
| Height | Multi-level sampling; ignore 2F while feetY &lt; 2.0；ignore PH while feetY &lt; 4.0 |

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
