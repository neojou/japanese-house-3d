# 日本住宅 3D 導覽 (Japanese House 3D)

Interactive **first-person** 3D walkthrough of a Japanese residential house, built from three floor plans (1F / 2F / PH).

**Tasks, milestones, DoD, and Grok prompts:** see **[`TASKS.md`](./TASKS.md)**  
**Visual / material aesthetics:** see **[`DESIGN.md`](./DESIGN.md)**  
**Agent coding rules:** see **[`AGENTS.md`](./AGENTS.md)**

---

## What it is

Walk the house at eye height: walls, floors, stairs, and clickable doors match the plan (meters). Start outdoors at the genkan, climb the U-stair to 2F, and enter the northeast 洋室 through the stair-hall door.

**Not a dual-mode viewer** — there is no top-down / map camera. Position is shown on the HUD.

---

## Stack

**Vite + React 19 + TypeScript + React Three Fiber + Tailwind CSS v4 + zustand**  
(static SPA — no Next.js; output `dist/` for GitHub Pages)

---

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173/japanese-house-3d/](http://localhost:5173/japanese-house-3d/)  
(`base` is `/japanese-house-3d/` for GitHub Pages — same path in dev.)

```bash
npm run build    # → dist/
npm run preview  # serve dist locally
```

### GitHub Pages

1. `npm run build`
2. Deploy **`dist/`** contents to `gh-pages` (or Actions `peaceiris/actions-gh-pages`)
3. Site: `https://<user>.github.io/japanese-house-3d/`
4. `vite.config.ts` → `base: '/japanese-house-3d/'` (repo name)

---

### Vite migration checklist

- [ ] `npm install` succeeds (no `next` dependency)
- [ ] `npm run dev` loads LoadingScreen → 3D scene
- [ ] Pointer lock, WASD, doors, stairs still work
- [ ] `npm run build` produces `dist/index.html` + assets
- [ ] `npm run preview` works under `/japanese-house-3d/`
- [ ] No remaining `next/*` or `"use client"` in `src/`
- [ ] `@/` imports resolve (alias in vite + tsconfig)

---

## Controls

| Action | Desktop | Mobile / tablet (coarse pointer) |
|--------|---------|----------------------------------|
| Move | **W / S** (or ↑↓) | Virtual **↑↓** D-pad (bottom-left) |
| Turn | **A / D** (or ←→) ±10° per keypress | Virtual **←→** hold to turn continuously |
| Look | **Click empty** → pointer-lock; mouse; **Esc** unlock | **Single-finger drag** on canvas (no pointer lock) |
| Doors | Click leaf (open/close only; does **not** lock) | Tap leaf (same) |
| Position | Compact top-right HUD (plan X / Z / eye Y, m) | Same (no keyboard help chrome) |

On-screen chrome is minimal: **no title panel**. Desktop keeps a small bottom-left key legend; mobile shows only the virtual D-pad + coordinates.

### Mirror reflection

- **Runtime (stable):** classic `MeshStandardMaterial` + scene Environment (may look outdoor).
- **Live FBO path:** rolled back — secondary render blacked the full canvas.
- Math / offscreen helpers kept for later: `src/lib/mirrorMath.ts`, `src/lib/glOffscreen.ts`.
- Auto math check: `npm run test:mirror`.

---

## Design snapshot (current build)

High-level geometry locked with the owner; full decision log and acceptance criteria live in `TASKS.md`.

| Area | Behavior |
|------|----------|
| Units / axes | Meters; plan origin SW; +X east, +Z north, +Y up |
| Display | House X-mirrored so north view matches the PDF (LDK left) |
| 1F floor | Raised interior **0.5 m**; genkan steps 0.25 × 2 |
| 1F SCL / 玄関 | NS **1.72** (z 2.83–4.55); SCL EW **1.21** 西通道無門; 北貼洗面南 |
| Stairs | **L 形**：直線 0.91 + **90° 踢步** 0.91；轉完＝2F；**出口東橋** x5.46–6.37×z4.55–6.37（井開，可下看／下樓） |
| 1F トイレ | **1.82×0.91**（x 6.37–8.19, z 5.46–6.37）；西半坐便朝東；南牆東側 0.7 通道 + **雙片門簾**（無門） |
| 1F 洗面 | **EW 2.73**（x 8.19–10.92, 西貼トイレ）；NS 1.82；西牆**南側 0.91** 門（鉸鏈南／把手北，開進室內） |
| 2F NS | **2.73 + 0.91 + 2.73 = 6.37** from **z=0**（與 1F 南西切齊，無舊 0.91 凹槽） |
| 2F south wing | 洋室6.5 / CL×2 / 洋室6；房門 @ **clN z=2.73** → **廊道**；兩門夾 CL、開向相對；南 CL 只東、北 CL 只西 |
| 2F 廊道 | z **2.73–3.64**、**x 1.82–6.37**（西推 0.91），Y=2.7；**東端對 NE 西門**（非陽台） |
| 2F 西北凸角 | 0.91×1.365；西牆 @1.82；與トイレ **實牆無門**；北牆簡易洗手台 |
| 2F NE 洋室 | 南 = clN 2.73；West door @ x=6.37（廊道帶 z 2.73–3.64）；G2 **4.55 m** @ clN |
| 2F トイレ | 廊道北側 z=**3.64** 開門（井西） |
| Balcony | Dual slabs S of G2 @ clN: W **2.73×1.11** (z 1.62–2.73), E **1.82×0.91** (z 1.82–2.73); soffit lights + door-east sconce; no parapet/door yet |
| 1F ceiling | Soffit Y=2.5; open over stair well |
| 2F ceiling | Soffit Y=5.2 over indoor rooms/corridor/toilet/NE; **no** slab on balcony or stair well |
| PH / 3F | L 梯 + **ph-stair-deck** 蓋井 z4.55–6.37；廊 0.91→南門→陽台 6.37×3.64 @ Y=5.4；矮牆 **1.4 m** |
| Height | Multi-level sampling; ignore 2F while feetY &lt; 2.0；ignore PH while feetY &lt; 4.0 |

**Edit sizes in** `src/data/dimensions.ts` first.

---

## Materials & light (L1)

**Façade:** warm ivory **stucco**; **yaki-sugi** genkan portal + flush door (DESIGN).  

**Interior:** **70%** oat plaster (walls + ceilings), **25%** warm-gray (wet/CL/utility), **5%** charcoal (frames, 分模線, genkan 端景); micro grit normals; ceiling shadow-gaps; local light-wood accents.  

**Lighting:** raking sun, genkan fills, weak Environment, ACES.  

**Code:** `houseMaterials.ts`, `surfaceTextures.ts`, `InteriorFinishes.tsx`; see **`DESIGN.md`**.

**Hero prop style (M8):** **`tokonoma-card`** / 床の間卡 — **高貴典雅 · 細節優先** (noble elegant, detail-first): wood endscape + standoff + crafted form + weak key; not crude boxes. Spec: **DESIGN.md §2.7**. SCL vignette: trench + ivory getabako (`CoatDisplay` / `GetabakoDisplay`).

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
DESIGN.md                    # Façade aesthetics, 70/25/5, yaki-sugi hang-points
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
