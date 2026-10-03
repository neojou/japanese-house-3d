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
npm run bake:genkan-door    # optional hero overlay (Blender if on PATH)
npm run bake:senmen-piara  # 1F 75 cm vanity + 3-panel mirror
npm run bake:amage-toilet  # 1F/2F sit toilet + hinged lid
npm run bake:dokodemo-wash # 2F wall handwash counter
npm run bake:standard-label-doors # interior LD/PA/DC/TA/PH leaves
npm run dev
```

Open [http://localhost:5173/japanese-house-3d/](http://localhost:5173/japanese-house-3d/)  
(`base` is `/japanese-house-3d/` for GitHub Pages — same path in dev.)  
Default shell is **R3F** (walls / stairs / doors). `?houseGltf=1` previews the archived full-house GLB.

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

## Kotlin Multiplatform (parallel track — through K2)

Optional **Desktop + Wasm** first-person **1F shell** (soft 3D). Does **not** replace the Vite SPA.  
Docs: **[docs/KMP.md](./docs/KMP.md)** · plan **[docs/KMP-plan.md](./docs/KMP-plan.md)** · agents **[docs/KMP-agents.md](./docs/KMP-agents.md)**.

```bash
./gradlew :shared:jvmTest
./gradlew :composeApp:run                              # K2 walkable 1F shell
./gradlew :composeApp:wasmJsBrowserDevelopmentRun      # same on Wasm
```

## Controls

| Action | Desktop | Mobile / tablet (coarse pointer) |
|--------|---------|----------------------------------|
| Move | **W / S** (or ↑↓) | Virtual **↑↓** D-pad (bottom-left) |
| Turn | **A / D** (or ←→) ±10° per keypress | Virtual **←→** hold to turn continuously |
| Look | **Click empty** → pointer-lock; mouse; **Esc** unlock | **Single-finger drag** on canvas (no pointer lock) |
| Doors | Click leaf (open/close only; does **not** lock) | Tap leaf (same) |
| Position | Compact top-right HUD (plan X / Z / eye Y, m) | Same (no keyboard help chrome) |

On-screen chrome is minimal: **no title panel**. Desktop keeps a small bottom-left key legend; mobile shows only the virtual D-pad + coordinates.

### Mirror reflection (1F 洗面)

See **[Architecture.md](./Architecture.md)** and **[docs/mirror-improve.md](./docs/mirror-improve.md)**.

- **Current:** static **indoor cube env** on the glass (warm plaster / wood) — not city HDR, **no** per-frame FBO.
- **Not yet:** physically correct 洗面/UB reflection (`?mirrorLive=1` is off; it blacked the canvas).

Auto checks: `npm run test:mirror`

---

## Design snapshot (current build)

High-level geometry locked with the owner; full decision log and acceptance criteria live in `TASKS.md`.

| Area | Behavior |
|------|----------|
| Units / axes | Meters; plan origin SW; +X east, +Z north, +Y up |
| Display | House X-mirrored so north view matches the PDF (LDK left) |
| 1F floor | Raised interior **0.609 m**; genkan two steps |
| 1F SCL / 玄関 | NS **1.72** (z 2.83–4.55); SCL EW **1.21** 西通道無門; 北貼洗面南 |
| Stairs | **L 形**：直線 0.91 + **90° 踢步** 0.91；轉完＝2F；**出口東橋** x5.46–6.37×z4.55–6.37（井開，可下看／下樓） |
| 1F トイレ | **1.82×0.91**（x 6.37–8.19, z 5.46–6.37）；西半坐便朝東；南牆東側 0.7 通道 + **雙片門簾**；北牆直窗 **0.48×0.92** 磨砂（窗台離地坪 1.38） |
| 北立面 | 從北往南看（右＝西）。廚房北拉門 **1.64×2.15**；2F 梯間低直窗、2F トイレ高直窗、西南室北雙扇橫窗 **1.52×1.12**。洋室北／洗面北／東北室北無窗 |
| 1F LDK 廚 | 西牆廚具已移除。裝飾牆 **x=2.175**、往北 **75 cm**。壁付 I 型：南 IH＋同寬抽油煙機、中烘碗機、北水槽（抽屜可拉）。檯面高 **85 cm** |
| 西立面 | 從西往東看（左＝北）。西北洋室西雙片拉門 **1.70×2.10**；LDK 西牆北端窗 **0.72×1.10**（窗台 1.50） |
| 1F 洗面 | **EW 2.73**（x 8.19–10.92, 西貼トイレ）；NS 1.82；西牆**南側 0.91** 門（鉸鏈南／把手北，開進室內） |
| 2F NS | **3.64 + 0.91 + 1.82 = 6.37** from **z=0**（南室 3.64、廊 0.91、北翼 1.82） |
| 2F south wing | 洋室6.5 / CL×2 / 洋室6；房 NS **3.64**；北門相鄰出廊（西南 2.73–3.64、東南 3.64–4.55），南開 85° |
| 2F 廊道 | z **3.64–4.55**、**x 2.73–6.37**（EW **3.64**），Y=3.509；東端對東北室西門 |
| 2F 西北凸角 | **2F 不做室內**（所見為 1F 屋頂） |
| 2F NE 洋室 | 西 **x=7.28**；南面拉門 7.00–9.10；東牆一扇雙格窗靠南／陽台；屋頂南高北低 |
| 東立面 | 1F LDK 東雙片拉門 z **1.37–2.73**；UB 東一方窗；洗面東格子門。2F 東南室東窗北緣 z=2.685（= 東北陽台西南角）；東北室東窗靠南牆／陽台 |
| 1F LDK 物入 | x **5.915–6.37**、z **0–1.365**。東／北／南有牆，西側向 LDK 敞開。室內先空 |
| 1F 西北洋室 | 一整間 x **1.82–4.55**、z **4.55–6.37**。內部不再切儲物間，x=3.64 橫梁已移除 |
| 2F 西灣 | x **2.73–4.55**、z **4.55–6.37**。北半 **トイレ** z **5.46–6.37**（同一樓：西半坐便朝東、南牆東 0.7 門簾）。南半東洗手台、西物入 x **2.73–3.23**（東面開放）。南側無門 |
| Balcony | 北緣 z **3.64**；西 NS **0.955**（z 2.685–3.64）from **x=6.37**，東 NS **0.91**；**T-202 門 + 欄杆**（尚未實作） |
| 1F ceiling | Soffit Y=2.5; open over stair well |
| 2F ceiling | Soffit Y=5.2 over indoor rooms/corridor/toilet/NE; **no** slab on balcony or stair well |
| PH / 3F | 床 **Y=6.309**；L 梯；南陽台 + 北塊可走；欄杆 1.1 m；梯間斜頂南高北低，南牆／東西牆貼頂 |
| Height | Multi-level sampling; ignore 2F while feetY &lt; 2.0；ignore PH while feetY &lt; 4.0 |

**Edit sizes in** `src/data/dimensions.ts` first.

---

## Materials & light (L1)

**Façade:** SK Kaken Bell Art **トラバーチン** **AC-2166** (`#8e7363`); soffit and fascia share it; **yaki-sugi** stays on the genkan portal (DESIGN).  

**Interior:** **70%** oat plaster (walls + ceilings), **25%** warm-gray (wet/CL/utility), **5%** charcoal (frames, 分模線, genkan 端景); micro grit normals; ceiling shadow-gaps; local light-wood accents.  

**Lighting:** raking sun (key), genkan fills, local HDR IBL (`public/env/house-ibl.hdr`, intensity 0.35, not a sky background), ACES. Bloom stays off (`?bloom=1` only).  

**Code:** `houseMaterials.ts`, `surfaceTextures.ts`, `InteriorFinishes.tsx`; see **`DESIGN.md`**.

**Hero prop style (M8):** **`tokonoma-card`** / 床の間卡 — **高貴典雅 · 細節優先** + **cinematic / 力求完美**: wood endscape + standoff + crafted form + weak key; not crude boxes. Continuous curvature uses **Path B** glTF (`docs/cinematic-path-b.md`). Spec: **DESIGN.md §2.7**. SCL vignette: trench + ivory getabako (`CoatDisplay` / `GetabakoDisplay`). 1F 洗面: Piara-inspired 75 cm vanity + 3-panel mirror (`SenmenPiara`, `?pose=senmen`). 1F UB east: 目隠し可動ルーバー (`UbLouver`, `?pose=ub-window`).

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
