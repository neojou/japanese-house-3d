<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md – Japanese House 3D Viewer

Coding rules and conventions for AI agents working in this repo.

**Tasks / phases / DoD / milestones / Grok prompts:** **[`TASKS.md`](./TASKS.md)** (npm SPA source of truth)  
**Visual / material aesthetics:** **[`DESIGN.md`](./DESIGN.md)** (how the house should look and feel)  
**Runtime / mirror architecture:** **[`Architecture.md`](./Architecture.md)** (npm plan-mirror, FBO contracts)  
**KMP parallel track:** **[`docs/KMP-plan.md`](./docs/KMP-plan.md)** · status board **[`docs/KMP-agents.md`](./docs/KMP-agents.md)** · run **[`docs/KMP.md`](./docs/KMP.md)**  
**Hero object style:** **`tokonoma-card`** / 床の間卡 (**高貴典雅 · 細節優先**) → **[`DESIGN.md` §2.7](./DESIGN.md)**  
**Visual quality:** cinematic / **力求完美** — [`DESIGN.md` §1](./DESIGN.md). Continuous curvature → **Path B** [`docs/cinematic-path-b.md`](./docs/cinematic-path-b.md)  
**Human product overview:** **[`README.md`](./README.md)**

---

## Dual track (npm SPA + KMP)

| Track | Code | Roadmap |
|-------|------|---------|
| **A — product SPA** | `src/`, `package.json`, Vite | `TASKS.md` only |
| **B — KMP walkthrough** | `shared/`, `composeApp/`, Gradle | `docs/KMP-plan.md` (K-S0→K9) |

- **Do not** break `npm run dev` while doing KMP.  
- **Do not** implement K3+ KMP features unless plan says so / owner asks.  
- KMP domain lives in **`shared`** (pure Kotlin); UI/render in **`composeApp`**.

---

## Before you code

1. **npm work:** Read **`TASKS.md`**. **KMP work:** Read **`docs/KMP-plan.md`** + **`docs/KMP-agents.md`**.
2. Obey **cancelled** items there (notably: **no top-down camera / mode switch**).
3. If geometry is ambiguous, **plan first** and wait for owner confirmation when the task says so.
4. Prefer `@TASKS.md` + task id in Grok prompts so status stays aligned.
5. When changing **materials, colours, lighting, façade finishes, or wood hang-points**, read **`DESIGN.md`** first and keep 70/25/5, warm ivory, texture-over-swatch, and subtractive wood pockets.
6. When the owner asks for a close-up display object **in Tokonoma Card style**, follow **`DESIGN.md` §2.7** (`tokonoma-card` / 床の間卡): **noble elegant + detail-first** — readable form, quiet luxury, no crude lumber-box heroes. References: `CoatDisplay.tsx`, `GetabakoDisplay.tsx`, `ToiletDisplay.tsx`.
7. **Cinematic Path B** (owner lock): if the hero needs a continuous cavity / glaze arc (basin, bowl), **do not** stack extrudes and **do not** wait for a human to model. Bake `public/props/<id>/*.glb` per `docs/cinematic-path-b.md`, test, load with `useGLTF`. Human optional only at `?pose=<id>`.

---

## Product context (short)

Interactive **first-person** walkthrough of a Japanese house (1F / 2F / PH plans).  
Phase work is tracked only in `TASKS.md` — do not invent a parallel roadmap here.

**Controls today:** W/S move; A/D turn 10°; click empty → Pointer Lock; click door → open only (no lock); Esc unlock. **Mobile (coarse):** left-bottom virtual D-pad (↑↓ walk, ←→ continuous turn); single-finger drag look; no pointer lock. **HUD:** compact coords top-right; desktop key legend bottom-left only; no title overlay.

---

## Tech stack

- **Vite** + React 19 + TypeScript + Tailwind CSS v4
- three, @react-three/fiber, @react-three/drei
- zustand (viewer position / floor HUD)
- Static SPA (`dist/`); GitHub Pages `base: /japanese-house-3d/`

Do **not** add major dependencies unless the owner explicitly requests them.  
Do **not** reintroduce Next.js APIs (`next/*`, `"use client"`, App Router).

---

## Key conventions

| Topic | Rule |
|-------|------|
| Units | Meters everywhere |
| Dimensions | Centralize in `src/data/dimensions.ts`; change data before hardcoding mesh sizes |
| Coordinates | Plan: +X east, +Z north, +Y up; origin SW. Display may X-mirror the house (`src/lib/coords.ts`) |
| Geometry | Simple `Box` walls/floors; L1 façade via `houseMaterials` (stucco maps + yaki-sugi ids) |
| Look & feel | Follow **`DESIGN.md`** (cinematic / 力求完美, subtractive warm white, 70/25/5, yaki-sugi only via approved hang-points) |
| Hero props | **`tokonoma-card`** (床の間卡): 高貴典雅 + 細節優先; wood endscape + standoff + weak key + crafted form; DESIGN §2.7. **Never** ship 組合木板 / 白長方體 |
| Hero curvature | **Path B**: scripted DCC → `public/props/` glTF. No stacked-extrude bowls. `docs/cinematic-path-b.md` |
| Components | Small, single-responsibility under `src/components/house/` |
| Height / walk | Use `src/lib/height.ts` + slabs/stairs in dimensions; respect stair-well voids |
| Run | Must stay runnable with `npm install && npm run dev` |
| Types | `npx tsc --noEmit` clean before claiming done |
| Deploy | Stay static-export friendly (GitHub Pages later) |

### Do not implement unless `TASKS.md` says so

- Top-down / orthographic map mode or mode-switch UI (**cancelled**)
- Physics / collision (rapier)
- Heavy materials, post-processing, mobile touch (later milestones)
- Restoring NE south G2 to **4.55 m** (now **3.64 m**, 7.28→10.92, 2026-09-13 plan B) unless the owner reverses.

### Design locks worth re-checking

**Geometry / plan locks:** full table in `TASKS.md` → **Design direction**. Highlights:

- 1F floor **0.609**; 1F rise **2.90**; 2F rise **2.80**; PH floor **6.309**; roofs south-high / north-low
- PH hall walls follow the shed: south wall to peak; east/west walls sloped south-high north-low
- 2F NE room: south wall to shed peak; east wall sloped south-high north-low to the roof
- Stair well NS **1.82** (option A: lower spur may enter LDK)
- NE 洋室 west @ **x=7.28**（門在 x=6.37 z 3.64–4.55）；北翼 CL **x 6.37–7.28、z 4.55–6.37、無東牆**（東面 PH 折れ戸，不另加牆）；south G2 **7.28→10.92 (3.64 m)**
- 東北室入戶門：西牆 **x=6.37、z 3.64–4.55**（寬 **0.91**，PA 片開き）。鉸鏈**南**、把手**北**，向東開 **85°**。CL **無東牆**（NS **1.82** @ z 4.55–6.37）；PH 鉸鏈在北，由南往北折，開後疊在北側並折進洋室。陽台僅南面 **東西向雙片拉門**
- 2F 南翼兩室 NS **3.64**；東北室 NS **2.73**。東南室東窗北緣 **z=2.685** = 陽台西南角
- 2F 廊道 x **2.73–6.37**（z 3.64–4.55）。西南室北門 **x 2.73–3.64** 把西軸東南開 85°；東南室北門 **x 3.64–4.55** 把東軸西南開 85°
- 2F 南翼 CL x **2.73–3.64**：南櫃 z **0–1.365** 東側 PH（洋室6帖），西／南／北牆；北櫃 z **1.365–2.73** 西側 PH（洋室6.5南西），東／南／北牆。z **2.73–3.64** 是西南室入口，西側無牆
- 東北室東窗靠**南牆／陽台**，不靠北牆（`2f-win-ne-e`）
- 2F 西北凸角：**不做室內**（1F 屋頂）
- 2F 西灣 x **2.73–4.55**、z **4.55–6.37**：北半 **トイレ** z **5.46–6.37**（同一樓：西半坐便朝東、南牆東 0.7 TA 片開き＋門簾）；南半東洗手台、西物入 x **2.73–3.23**（東面 PH 折れ戸；南／北／西有牆）；洗手南側無門
- 北立面（從北往南看，圖右＝西）：1F トイレ直窗磨砂；1F 廚房北雙片拉門（z=3.64，x 0–1.82）；2F 梯間北低直窗；2F トイレ高直窗磨砂；2F 西南室北雙扇橫窗。洋室北、洗面北、東北室北實牆
- 1F LDK 廚：西牆廚具移除。裝飾牆 **x=2.175**、自南牆往北 **75 cm**。壁付 I 型在牆西側（檯面高 85 cm）：南 IH＋同寬抽油煙機、中烘碗機、北水槽抽屜
- 西立面（從西往東看，圖左＝北）：1F 西北洋室西牆雙片拉門 **1.70×2.10**（z 3.79–5.49）。緊鄰的 LDK 西牆北端一扇窗 **0.72×1.10**（窗台 1.50）
- 1F LDK 門在 x=**6.37**、z **4.55–5.46**：鉸鏈北、把手南，向西開 **85°**
- 1F 樓梯下物入：x **5.46–6.37**、z **5.46–6.37**。南側 PH 折れ戸。LDK 門向西開時停在這扇門以南
- 1F LDK 東南物入：x **5.915–6.37**、z **0–1.365**。東／南外牆、北短牆；**西側無牆**，PH 折れ戸折進 LDK。東拉門在 x=6.37、z **1.37–2.73**
- 1F 西北洋室：**一整間** x **1.82–4.55**、z **4.55–6.37**。不內切儲物間。無 x=3.64 隔牆／門樑
- Balcony: 西 NS **0.955**（z 2.685–3.64）、東 **0.91**；西塊 **x=6.37**（CL 下）；**要門（T-202）+ 欄杆**
- PH 陽台：南 x **0–6.37**、z **0–3.64**；北塊 x **2.73–4.55**、z **3.64–6.37**。x **0–2.73**、z **3.64–6.37** 無三樓地板。x **1.82–2.73**、z **3.64–6.37** 是一樓西北室的平屋頂（二樓高度）。這兩塊陽台不再加斜屋頂。梯間與東北室斜頂保留
- No 2F slab over rising upper stair treads

**Visual / material locks:** see **`DESIGN.md`**. Highlights:

- Façade ~**70%** warm ivory stucco, ~**25%** wood/yaki pockets, ~**5%** dark accent
- Texture (grit / grain) over flat swatches; raking light should read
- Yaki-sugi only on listed hang-points (`YAKI_SUGI_WALL_IDS`); expand only with owner OK + DESIGN.md update
- Hero displays: **`tokonoma-card`** only — cinematic / detail-first / noble elegant; never invent ad-hoc stacks or ship “組合木板／白長方體” as hero
- Wet curvature (basin / Type-M tub / Piara vanity / 2F wall counter / Amage toilet): Path B glTF — `npm run bake:senmen-basin` + `npm run bake:senmen-piara` + `npm run bake:dokodemo-wash` + `npm run bake:ub-bath` + `npm run bake:amage-toilet`
- Interior room doors: Standard Label inspired Path B — `npm run bake:standard-label-doors` → `public/models/hero/standard-label-doors.glb`. LD 片開き (1F LDK), PA 引き戸 (1F 西北洋室) / PA 片開き (2F 三室), DC 片引き (1F 洗面), TA 片開き (1F/2F トイレ), PH 折れ戸 (SCL / 物入 / CL). No trademarks. Exterior glass sliders, genkan, 洗面 east grid, PH balcony stay as they are. Spec: `docs/standard-label-doors.md`
- Light is layered (`blender.md` §3): R3F shell, dielectric PBR, local HDR IBL (`public/env/house-ibl.hdr`, intensity ~0.35), bloom **off** unless `?bloom=1`. A disabled bloom pass must not register `useFrame` priority > 0 (R3F then skips `gl.render` and the canvas stays black). Do not put IBL or bloom inside hero GLBs.

---

## Recommended layout

```
src/
├── app/
├── components/
│   ├── Scene.tsx
│   ├── Player.tsx
│   ├── cameras/          # First-person only
│   ├── house/
│   └── ui/
├── data/dimensions.ts
├── store/
└── lib/                  # coords, height, units
```

---

## Development rules

1. Always check **`TASKS.md` current phase / next task** before adding features.
2. Geometry edits: update **`dimensions.ts` first**.
3. Materials / light / façade / hang-points: follow **`DESIGN.md`**; expand yaki-sugi only with owner approval.
4. No new major dependencies unless requested.
5. When finishing work: explain what changed, mark task status in **`TASKS.md`**, point to the next logical task id; update **`DESIGN.md`** if aesthetics principles or hang-point lists changed.
6. Prefer plan → implement when the owner or task asks for planning.
7. Keep GitHub Pages / static export in mind for app config.

---

## GROK.md

Repo root `GROK.md` points at this file (`@AGENTS.md`). Agents should open **`TASKS.md`** for what to build next, and **`DESIGN.md`** when changing how the house looks.
