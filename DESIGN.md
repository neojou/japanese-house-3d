# DESIGN — Japanese House 3D 美學與材質理念

> **Visual / material design source of truth** for how the house should *look and feel*.  
> Geometry, tasks, DoD → [`TASKS.md`](./TASKS.md)  
> Agent coding rules → [`AGENTS.md`](./AGENTS.md)  
> Product overview → [`README.md`](./README.md)

Agents and humans **designing or changing materials, colours, lighting, or façade finishes** should read this file first and keep implementations aligned.

---

## 1. Product visual goal

Interactive **first-person** walkthrough that reads as a **cinematic residential still**: refined, calm, spatially clear — and **close-up perfect**. Not a gamey prototype, not a sterile CAD dump, not “good enough for a walkthrough.”

**Target emotion:** 細緻、高貴、溫暖、克制（日式極簡住宅導覽）— 0.5 m 仍像電影靜幀。

**Quality doctrine: 高品質、力求完美.**  
If a hero would be described as 組合木板 / 白長方體 / 直壁平底盒, it is **not shipped**. Prefer fewer objects done right.

Phase 1 plan geometry is locked. From L1 onward we optimise **sensory quality**. Continuous-curvature wet heroes use **Path B** (scripted DCC → `public/props/<id>/*.glb`) so form is authored, not stacked extrudes. Agents bake and test unattended; humans are optional at the first-person visual gate (`docs/cinematic-path-b.md`).

---

## 2. Core principles

### 2.1 減法美學 (Subtractive aesthetics)

- Prefer **fewer material families**, continuous large surfaces, and silence over decoration.
- Detail concentrates in **meaningful pockets**: genkan recess, future balcony inners, eaves / soffits—not scattered ornaments.
- Do **not** cover the whole shell in wood or pattern; that breaks calm and the colour ratio below.

### 2.2 色比黃金律 — 70% / 25% / 5%

**Exterior**

| Share | Role | Application |
|------:|------|-------------|
| **~70%** | Main | Bell Art **トラバーチン** shell, color **AC-2166** (`#8e7363`) |
| **~25%** | Secondary | **Yaki-sugi** in recesses / portal |
| **~5%** | Accent | Dark handles, thin metal edges |

**Interior** (all rooms — no pure hospital white)

| Share | Role | Application |
|------:|------|-------------|
| **~70%** | Main | **Oat / milk** plaster on main walls + ceilings |
| **~25%** | Secondary | **Warm gray** wet rooms, CL, utility, PH hall |
| **~5%** | Accent | **Charcoal** door frames, 分模線, genkan 端景 wall |

Floors stay warm wood tones. Code: `INTERIOR` + finish sets in `houseMaterials.ts`.

### 2.3 外牆塗料與室內暖白

The exterior shell is **SK Kaken Bell Art**, pattern **トラバーチン**, color **AC-2166**. The swatch is `docs/refs/images/outlook-paint-1.jpg`; the building read is `docs/refs/images/outlook-paint-2.jpg`. Measured sRGB of that swatch is **`#8e7363`**: warm taupe sand, matte, fine mottling, broken horizontal fissures.

- The baked albedo already is AC-2166. `FAÇADE.stuccoTint` stays `#ffffff`. Multiplying a taupe tint on top of that map would darken the wall a second time.
- Metalness **0**. Roughness map centered near **0.93** (艶消し). `envMapIntensity` **0.10**. `normalScale` **0.85**.
- One tile is **0.50 m × 0.7101 m** (1064×1511 px), so the pixels stay square on the wall.
- Soffits and fascia use the same coating (`createStuccoMaterial`).
- Interior walls and ceilings stay oat **`#f7f2e8`**. Roofs stay **`#6a6560`** / **`#5c5854`**. Yaki-sugi hang-points, glass, and doors stay as they are.
- Spec: [`docs/bellart-travertine.md`](./docs/bellart-travertine.md). Maps: `public/textures/bellart-travertine/`.

Interior plaster stays warm oat, milky, with a little yellow-grey. Large interior fields stay off pure `#FFFFFF`.

### 2.4 紋理 (Texture) 重於色票

Colour sets mood; **micro-relief sells “real building.”**

| Surface | Intent |
|---------|--------|
| **Exterior Bell Art** | トラバーチン: fine sand and broken horizontal fissures. Matte. Raking sun reads the pits. A trowel coating, with the swatch's own stratification. |
| **Yaki-sugi (燒杉)** | Fire-charred cedar: dark charcoal, vertical grain, board seams, matte variation—not flat black paint. |
| **Interior oat plaster** | 珪藻土／乳漆感：柔和 micro grit；斜射暖光出陰影 |
| **Interior warm gray** | 微水泥／大地灰：稍深、稍粗，層次不搶主牆 |
| **Interior light wood** | 樑、端景板、窗台內緣 — 呼應室外木，非整面燒杉 |

The live shell uses the photo tile in `public/textures/bellart-travertine/`. Procedural maps in `surfaceTextures.ts` run only if those files fail to load, and they use the same taupe. Yaki and interior plaster stay procedural.

### 2.4b 室內牆面規則

| Rule | Detail |
|------|--------|
| **No pure white** | Avoid `#fff` large fields; use oat / milk |
| **Texture > swatch** | Main + secondary use plaster normals |
| **Shadow gap** | Ceiling soffit perimeter 分模線 (`Ceilings.tsx`) — charcoal hairline |
| **Wood continuity** | Local panels / beams (`InteriorFinishes.tsx`), not full-room cladding |
| **Layout lock** | Never move plan walls; finishes only |
| **Never seal openings** | Decorative panels must leave door/passage clear (genkan-n wood = side stubs only) |

### 2.4c 玄関落塵區（室內焦點）

| Element | Spec |
|---------|------|
| **Floor** | Genkan **+ SCL** dark **slate grid** (one step lighter than pure yaki black) |
| **Walls / ceiling** | Oat main + grit; N-wall wood **stubs** only |
| **Cove** | **N + S only** under soffit, 2700K-ish warm, **low** intensity |
| **Sconce** | **East wall, south** (near door), **flat** matte-black iron (vs exterior lantern) |
| **Contrast** | Dark floor cuts “outside”; warm white above opens the volume |

### 2.5 木質掛點策略（局部、可擴）

Wood is for **warmth in shadow volumes**, not cladding the whole house.

| Priority | Location | Status |
|----------|----------|--------|
| 1 | **玄関駐車凹口** 左壁 | **Done** — `1f-jog-ldk-east` |
| 1b | **玄関大门立面**（凹口背面） | **Done** — Giesta 2 防火戸 inspired hero GLB（西鉸東把，無商標） |
| 1c | **凹口頂 / 右頰**（portal soffit + east cheek） | **Done** — cladding in `GenkanEntry` (no plan wall change) |
| 2 | 陽台內側、屋簷／天花下緣 | Soffit and fascia share the Bell Art coating. Yaki stays off the balcony |
| 3 | 其他凹入（門廊、局部 jog） | Only with explicit owner list |

### 2.6 玄関大门（Giesta 2 防火戸 inspired）

南面玄關：**深色豎紋木皮 + 細長採光 + 金屬框**，英雄 GLB `public/models/hero/genkan-door.glb`。  
鉸鏈**西**、長柄**東**；開啟向駐車（西南）**85°**（避免掃進 LDK 東拉門）。內側另有採光條與執手。不貼 LIXIL／ジエスタ商標。燒杉不再做門扇。

### 2.6c 室內門（Standard Label inspired）

房間門與物入門是同一套グレージュオーク木皮，英雄 GLB `public/models/hero/standard-label-doors.glb`。不貼 Panasonic 商標。木是電介質（金屬度約 0.02）加垂直木紋與法線，讓場景 HDR 側光能讀到紋理；執手是鉻；採光是磨砂壓克力（transmission）。點擊仍走既有門 store。規格：`docs/standard-label-doors.md`。

| 型 | 開法 | 用在 |
|----|------|------|
| LD | 片開き | 1F LDK |
| PA | 引き戸 | 1F 西北洋室 |
| PA | 片開き | 2F 三間洋室 |
| DC | 片引き | 1F 洗面 |
| TA | 片開き | 1F／2F トイレ（原 0.7 通道；門簾留在上方） |
| PH | 折れ戸、無執手 | SCL、LDK 物入、2F 物入、南／北 CL、東北 CL 東面 |

外牆玻璃拉門、UB 淋浴拉門、玄關大門、洗面東側格柵門、PH 陽台門不改成這套。1F 洗面物入沒有獨立空間，不加門。樓梯下物入在 x 5.46–6.37、z 5.46–6.37，南側是 PH 折門。淺物入的折門折向房間，避免門扇插進背牆。

### 2.6b 凹口燒杉（外牆口袋，不含門扇）

| Rule | Detail |
|------|--------|
| **Portal walls** | 駐車凹口側壁仍可燒杉（`1f-jog-ldk-east`） |
| **Door** | **不是**燒杉葉扇；見 §2.6 英雄 GLB |
| **Layout** | 不改平面牆線 |

**Rule:** expand yaki-sugi only by adding ids to `YAKI_SUGI_WALL_IDS` (or equivalent data), after owner confirmation—do not invent new wood fields in freeform.

---

## 2.7 Hero props — style name **「Tokonoma Card」** / `tokonoma-card`

> **Prompt keyword (use this name):**  
> `tokonoma-card` · 中文可寫 **「床の間卡」** 或 **「Tokonoma Card 風格」**  
> Example: *「在 2F 廊道掛一幅畫，照 tokonoma-card 呈現」*  
> Implies: **高貴典雅 + 細節優先** — not a crude box prop.

Not full-room furniture. A **hero prop** is a single intentional object (or deliberate paired vignette) that rewards close first-person viewing. Utility placeholders (toilet, sink, curtains) stay crude; **Tokonoma Card** items must feel **designed**, not assembled from stock lumber.

### Aesthetic ethos（精神 — 必讀）

| 原則 | 含義 |
|------|------|
| **高貴典雅 (noble · elegant)** | Calm luxury: ivory, honey wood, soft gold hairlines, refined proportion. Never loud, gamey, or “IKEA flat-pack.” |
| **細節優先 (detail-first)** | Silhouette, moldings, legs, seams, and contents must read **before** relying on a texture slap. Near view in FP should reveal craft. |
| **低調奢華 (quiet luxury)** | Ornament is sparse and intentional (corner leaves, frame-and-panel, karakusa normals) — not full gilding or brand logos. |
| **可讀輪廓 (readable form)** | From 0.5–2 m: know *what it is* (coat, getabako, stiletto). Axis-aligned brick stacks are **failure**. |
| **減法中的焦點** | One object (or one paired vignette) per zone; silence around it; still subtractive vs whole-house clutter. |

**Quality bar (acceptance):** If the owner would describe it as “組合木板／白長方體／紅色長方形,” it is **not** shipped as tokonoma-card — refine **form** first (Path B bake if the shape needs continuous curvature).

### Why this name

Like a Japanese **床の間 (tokonoma)** — a shallow niche that frames **one** object with restraint: wood backplane, quiet light, no brand noise.  
**Card** = crafted display piece (curved card, molded furniture, or small composed mesh group) — **not** a retail mannequin, loot drop, or DIY shelf.

**References**

| Role | Code |
|------|------|
| Wall-hung / curved card | `CoatDisplay.tsx` + `PROP_1F_SCL_COAT` |
| Floor furniture + contents | `GetabakoDisplay.tsx` + `PROP_1F_SCL_GETABAKO` |
| Wet fixture (porcelain) | `ToiletDisplay.tsx` + `PROP_1F_TOILET` |

### Recipe (must follow when prompt says `tokonoma-card`)

| Layer | Spec |
|-------|------|
| **0. Ethos** | **Noble, elegant, detail-first** — see table above; reject crude box assemblies |
| **1. Intent** | One focal object per zone **or** a deliberate **paired vignette** (e.g. SCL 落塵: east coat + north getabako); subtractive silence around the pair |
| **2. Endscape** | Small **wood backboard / shallow niche** (5% wood accent), optional thin charcoal reveal — **not** full-wall cladding |
| **3. Standoff** | Object **3–5 cm** off wall (or off board) so shadow / depth reads |
| **4. Form** | Prefer **curved card**, **Lathe / Extrude / moldings**, or composed low-poly with **readable silhouette** over flat billboard. Soft taper, legs, rounded corners, frame-and-panel as needed. Side-walk in room must not collapse to a paper plane or “lumber stack.” **Continuous curvature** (basin bowl, tub inner, toilet bowl) is **Path B**: scripted DCC → `public/props/<id>/*.glb` — never two stacked extrude slabs. |
| **5. Surface** | Albedo + normal / roughness when it sells lacquer, fabric, grain; 1–2k enough; alpha cutout OK; procedural or `public/props/<id>/`. **Maps support form — they never replace missing form.** |
| **6. Light** | **One** short-range warm key; weak residential; **must not** wash genkan yaki or whole room; raking light should reveal micro-detail |
| **7. Brands** | **No trademarks / logos** — generic or “inspired” only |
| **8. Data / code** | Placement in `dimensions.ts` (`PROP_*`, `style: "tokonoma-card"`); mesh under `src/components/house/`; join preload if new procedural maps; **no new major deps** |
| **9. Plan lock** | Never move plan walls; finishes + additive meshes only |
| **10. Contents** | If the story needs “something inside / on top,” those pieces must also be **recognizable** and **neatly composed** (tight alignment, intentional spacing) |

### Not Tokonoma Card (use crude props or different style)

- Utility placeholders still OK for **curtains / crude sinks** until upgraded; **toilet is no longer a two-box placeholder** once listed as hang-point  
- Remaining crude: curtain panels until tasked; **1F senmen vanity** is a Piara-inspired **75 cm 引出化粧台 + 3-panel mirror cabinet** Path B GLB (`SenmenPiara.tsx`, refs `docs/refs/images/washing-1.jpg` … `washing-3.jpg`). **2F wash** still uses Path B porcelain on a **flush hinoki floor cabinet** (`SenmenVanity.tsx`).  
- Whole-room furniture sets, physics toys, neon/game pickups  
- Flat photo posters with no standoff / no light when viewed from the side  
- **Bare multi-box carcasses** that read as “組合木板” without legs, moldings, or proportion  
- **Abstract content blobs** (e.g. “red bricks” instead of shoes) or sloppy spacing  

### Floor-furniture variant (落地端景)

When the object is a **chest / getabako / console** (not wall-hung art):

- **Readable silhouette first** — not axis-aligned board boxes only  
- Prefer **Lathe** legs (e.g. soft cabriole), **Extrude** rounded tops / sole outlines, **frame-and-panel** doors, thin aprons / beads  
- Optional **quiet gold** corner leaves or hairline accents (still restrained)  
- **Open bay or dual doors** if contents matter; contents = recognizable meshes  
- Contents layout: tight, aligned, intentional (e.g. shoe pair span ~10–12 cm)  
- Same ethos + endscape / standoff / one weak key / no brands  
- Reference: `GetabakoDisplay.tsx` + `PROP_1F_SCL_GETABAKO`

### Wall-hung / soft-goods variant (掛飾／衣物)

- Curved or tapered card; fabric/grain normals; hanger / hardware as thin metal-wood language  
- Reference: `CoatDisplay.tsx` + `PROP_1F_SCL_COAT`

### Wet-fixture variant (潔具)

When the object is a **toilet / basin** (fixed wet room fixture):

- **Placement / orientation locked** by plan unless owner says otherwise  
- **Readable porcelain form** — Lathe bowl, rounded tank, seat ring, lid, base skirt; **never** two bare boxes  
- **Continuous curvature** (basin / tub / toilet bowl): **Path B** — `npm run bake:senmen-basin` / `bake:senmen-piara` / `bake:dokodemo-wash` / `bake:ub-bath` / `bake:amage-toilet` write `public/props/…` or `public/models/hero/*.glb`; runtime `useGLTF`. Do not reconstruct the cavity from stacked `ExtrudeGeometry`. Process: `docs/cinematic-path-b.md`  
- Boutique hotel soft rounding OK; warm ivory glaze; optional thin wood endscape  
- Lid ajar optional for life; single flush button; one weak warm key  
- Reference: `ToiletDisplay.tsx` + `PROP_1F_TOILET` / `PROP_2F_TOILET`  
- **1F/2F sit toilet:** Amage シャワートイレ *inspired* (no trademarks). Path B `public/models/hero/amage-toilet.glb`. Skirted one-piece + tank-top 手洗い + washlet lid. Envelope **760 × 416 mm**, sit **400 mm**, 手洗い rim **800 mm** (faucet ~1000 mm). **Click lid / seat** to lift. Shared `SIT_TOILET`. `AmageToilet.tsx` + `docs/amage-toilet.md`. `npm run bake:amage-toilet` / `test:toilet`  
- **2F wash:** wall counter inspired by SMA-300NT (600) + tall single-lever. Path B `public/models/hero/dokodemo-wash.glb`. Wood deck (dielectric), ceramic vessel, chrome mixer / trap (metalness 1) so the scene HDR reads on the metal. Click the mixer for a stream. No brand marks. `DokodemoWash.tsx`.
- **1F senmen vanity:** Piara-inspired **75 cm** 引出化粧台 (left drawers + right door, ひろびろ ceramic bowl, wall mixer) + **3-panel full-storage mirror cabinet** (slim LED). Path B `public/models/hero/senmen-piara.glb`. **Click** drawers / cab door / three mirror leaves; **click faucet** for stream; CubeCamera glass (same contract as before). No LIXIL / ピアラ marks. `SenmenPiara.tsx` + `docs/senmen-vanity.md`. The hinoki `SenmenVanity` basin stays in the repo for that Path B asset; 2F wash no longer mounts it.  
- **1F UB unit bath:** LIXIL リデア Mタイプ / BDUS-1616LBM-A+H **inspired** (no trademarks). Path B hero `public/models/hero/ub-bath.glb`. Visual lock: `docs/refs/images/bath_tank.jpg` + inner fill `bath_tank-1.png` / `bath_tank-2.png`. Apron tub against **east** wall (NS **W1200**, depth ~700 mm, inner lip **40 mm**); **click chrome mixer**; **NW-deck chrome button** opens/closes the **bottom plug**. East **TW FIX 特注 W1200×H1200** window above the tub. `TubDisplay.tsx` + `docs/ub-tub.md`  
- **UB room finishes:** cream tile liner (N/E/W) + charcoal textured shower wall (S, right of the east window); beige **anti-slip grid** floor; white window reveal; chrome column shower + inner I-bar grab. Exterior stucco kept (liner sits inside the shell). Dropped hex-cyan / smoke-marble / goose-yellow diatom / wool mat.

### Sliding wet door variant (淋浴拉門)

When a door must **not** swing into UB / 洗面 (or other tight wet rooms):

- **Translate along the wall** only — never quarter-arc swing into the room  
- Prefer **dual bypass** panels that **stack to the side with longer wall pocket** (UB|洗面: both west)  
- Tokonoma-card look: **charcoal slim frame + frosted warm glass**, top rail, floor track + low threshold  
- Click open/close with damped slide; `userData.interactable = "door"`  
- Height may approach ceiling (within wall shell); data in `SLIDE_DOORS`  
- Reference: `slide-ub-shower` in `SLIDE_DOORS` + `SlideDoor` in `Doors.tsx`

### Current hang-points

| Id | Location | Style | Status |
|----|----------|-------|--------|
| `hero-1f-scl-trench` | 1F SCL 東牆 — 蜜金 trench | `tokonoma-card` | **Done** |
| `hero-1f-scl-getabako` | 1F SCL 北牆 — 象牙白 getabako + 紅細跟 | `tokonoma-card` (落地·細作) | **Done** |
| `hero-1f-toilet` | 1F トイレ西半 — Amage シャワートイレ inspired Path B（面東、可掀蓋） | `tokonoma-card` (潔具) | **Done** |
| `hero-2f-toilet` | 2F トイレ西半 — 同一 GLB，坐便朝東 | `tokonoma-card` (潔具) | **Done** |
| `hero-2f-toilet-curtain` | 2F トイレ南牆東側 0.7 — 粉紅短簾（左吉娃娃／右博美） | `tokonoma-card` (布藝) | **Done** |
| `hero-2f-wash` | 2F 南半東牆 — どこでも手洗 inspired 600 mm 壁掛櫃＋碗盆＋高腳龍頭（Path B GLB，朝西） | `tokonoma-card` (潔具) | **Done** |
| `hero-2f-mono` | 2F 物入 x 2.73–3.23 — 開東檜木格架 | `tokonoma-card` (收納) | **Done** |
| `slide-ub-shower` | 1F UB｜洗面 — 雙片西向疊加淋浴拉門 | `tokonoma-card` (拉門) | **Done** |
| `hero-1f-ub-tub` | 1F UB 東牆 — Type-M 大內盆＋西北角甲板鉻鈕開底部塞 | `tokonoma-card` (潔具 / Path B GLB) | **Done** |
| `ub-bath-finish` | 1F UB Type-M 內襯：奶油磁磚／炭灰淋浴牆／米色防滑地；東窗 1.20×1.20 | `tokonoma-card` (濕區) | **Done** |
| `hero-1f-ub-bathmat` | （已撤）羊毛腳踏不符 Type-M 洗い場 | — | **Retired** |
| `hero-1f-toilet-curtain` | 1F トイレ通道上 1/3 粉紅短簾（左吉娃娃／右博美） | `tokonoma-card` (布藝) | **Done** |
| `hero-1f-ldk-kitchen` | 1F LDK 壁付 I 型（x=2.175 裝飾牆 75 cm；南 IH＋抽油煙機、中烘碗機、北水槽抽屜）Path B GLB | `tokonoma-card` (廚房) | **Done** |
| `hero-1f-senmen` | 1F 洗面：Piara-inspired 75 cm 引出化粧台＋3面鏡全収納 Path B GLB；西籃＋東洗衣機。2F 洗手仍檜木盆 | `tokonoma-card` (洗面 vignette) | **Done** |

**SCL 落塵 vignette:** trench + getabako as a **paired** scene; both keys stay weak; shared **noble / detail-first** bar.

Future art / lamp / ceramic: same style name + this table row + owner OK.

---

## 3. Material system (engineering map)

| Layer | Meaning | Code |
|-------|---------|------|
| **L0** | Flat colours only | Early T-301 style (superseded for façade) |
| **L1** (current) | Bell Art albedo + normal + roughness on the shell; yaki-sugi maps on pocket walls | `public/textures/bellart-travertine/`, `src/lib/houseMaterials.ts`, `Walls.tsx`. Fallback: `src/lib/surfaceTextures.ts` |
| **L2** | Scene IBL + optional emissive bloom | Local HDR in `public/env/` (not a CDN preset). Bloom default **off** (`?bloom=1`). No new post package. |

**Finishes on walls:**

| Finish | Use |
|--------|-----|
| `stucco` | Exterior shell — Bell Art トラバーチン AC-2166 |
| `yakiSugi` | `YAKI_SUGI_WALL_IDS` |
| `interiorMain` | Default indoor walls + ceilings (~70%) |
| `interiorSecondary` | `INTERIOR_SECONDARY_WALL_IDS` (~25%) |
| `interiorAccent` | `INTERIOR_ACCENT_WALL_IDS` (~5%) |
| `interiorWood` | Optional full-wall wood (prefer panels) |

Palette: `INTERIOR` / `FAÇADE` in `houseMaterials.ts`; `COLORS`, `LIGHTING` in `dimensions.ts`. Geometry stays in `dimensions.ts`.

---

## 4. Lighting philosophy

- **Raking directional sun** so grit and grain read (lower ambient than prototype fills). Sun stays the key; IBL does not replace it.
- Soft **interior point fills** so FP walk indoors stays legible under roofs.
- **Genkan recess fill + west rake** — without these, yaki-sugi in 内縮 reads as pure black.
- **IBL:** local `public/env/house-ibl.hdr` via drei `<Environment background={false}>`. Intensity starts at **0.35** (cap about 0.6). Not a dock / sunset preset. Background colour stays `LIGHTING.background`.
- **PBR:** stucco / yaki / wood are dielectrics (`metalness` near 0). Do not park dielectrics in metalness 0.3–0.6. Real metal is 0.75+.
- Warm-ish background / fog—avoid blue hospital atmosphere.
- ACES tone mapping. Exposure stays **1.12**. The taupe shell is the finish; do not raise exposure to chase the old ivory midtone. If bloom fights ACES, keep ACES.
- **Bloom default off.** Optional `?bloom=1`: three.js WebGL `EffectComposer` only, high threshold, low strength, emissive lamps / shoji only. The pass must not mount a positive-priority `useFrame` while disabled — R3F then skips the main `gl.render` and the canvas stays black. No full-wall haze. No `@react-three/postprocessing`. Planar FBO mirrors remain forbidden.

### 4.1 Why yaki looked “flat black” (and fix)

| Cause | Fix |
|-------|-----|
| Albedo too dark × `material.color` multiply | Lift map luminance; tint near white (`#c8c0b4`) |
| Recess in shadow | Dedicated genkan fill / rake lights |
| Weak normals / large tiles | Stronger normalScale; smaller `yakiTileM`; 1024 maps |
| No env reflection | Soft local IBL for ridge sheen (`house-ibl.hdr`, intensity ~0.35) |

**Later optional:** hand-authored seamless yaki photos in `public/textures/` (still no new deps)—only if procedural remains insufficient.

---

## 5. What “good” looks like (acceptance cues)

When changing look, verify in first-person:

1. **Outside:** shell reads warm taupe sand (AC-2166): matte, fine mottling, broken horizontal fissures.  
2. **Slanted light:** the coating shows sand and fissures; the shader is not a flat fill.  
3. **Genkan recess:** yaki-sugi is clearly different material—dark, vertical, matte.  
4. **Colour balance:** large taupe shell, small yaki pockets, tiny dark metal accents. Indoors the large field stays oat.  
5. **Indoors:** calm, readable; not blown-out white or cave-black without fills.  
6. **Performance:** no major new deps; maps shared; static export still viable.  
7. **Hero close-up:** the object is what it claims to be (a basin is a basin, not a white brick).

---

## 6. Anti-patterns (do not)

- Full-building wood cladding or loud patterns.  
- Cold pure white + blue ambient “gallery” look.  
- Random accent colours (bright blue UI meshes on architecture).  
- Heavy bloom / aggressive post that washes material. (A locked-off emissive bloom is not this.)  
- Replacing dimension truth with visual hacks (fake scale, wrong wall ids).  
- Expanding yaki-sugi without updating this file’s hang-point table + owner OK.

---

## 7. How agents should use this file

1. **Before** material, colour, light, or façade work → read **this file**.  
2. Geometry / walkability / tasks → still **`TASKS.md`**.  
3. Prefer plan → owner confirm when adding new wood hang-points or L2 features.  
4. After look changes: update this file if the **principle or hang-point list** changes; update `TASKS.md` changelog for ship status; keep code constants in sync with §2–3.  
5. Cite principles in PR / task notes when relevant (e.g. “70/25/5”, “texture over swatch”, **`tokonoma-card`**, “detail-first / noble elegant”).  
6. When the owner says **tokonoma-card** / 床の間卡 → implement §2.7 **including aesthetic ethos** (高貴典雅、細節優先); do not invent a parallel hero style; do not ship crude box stacks as hero props.  
7. Continuous-curvature heroes: run **Path B** bake unattended (`docs/cinematic-path-b.md`). Do not wait for the owner to model or to re-open mesh vs DCC.

---

## 8. Changelog (design)

| Date | Note |
|------|------|
| 2026-08-01 | DESIGN.md created: subtractive warm-white + yaki-sugi, 70/25/5, L1 maps, genkan recess first hang-point |
| 2026-08-01 | Genkan door: flush yaki-sugi portal (3 faces + leaf), matte-black vertical bar handle |
| 2026-08-01 | Yaki readability: brighter maps, genkan lights, env micro-specular (not pure black) |
| 2026-08-01 | 2F NE balcony: dual rect layout; warm-grey deck; soffit ivory; 3 downlights; Euro sconce E of door |
| 2026-08-01 | Interior walls: 70/25/5 oat/warm-gray/charcoal; plaster grit; ceiling shadow-gaps; wood accents |
| 2026-08-01 | Genkan-n: clear passage 1.15 m; remove full-width wood seal; side stubs only |
| 2026-08-01 | Genkan interior: slate dust (genkan+SCL), N/S cove wash, flat iron sconce E-south |
| 2026-08-01 | Loading: real texture-step progress bar + step names; show scene when ready |
| 2026-08-01 | §2.7 Hero props; SCL honey-gold trench (curved card + wood endscape + weak key) |
| 2026-08-02 | Named style **Tokonoma Card** / `tokonoma-card` (床の間卡); prompt keyword + recipe |
| 2026-08-02 | SCL getabako: ivory lacquer + subtle karakusa; red heels; paired vignette with trench |
| 2026-08-02 | Getabako refine: cabriole legs, rounded top + gold corners, dual frame-panel doors, stiletto mesh pair |
| 2026-08-02 | tokonoma-card ethos: 高貴典雅 + 細節優先 (noble elegant, detail-first); quality bar vs 組合木板 |
| 2026-08-02 | 1F toilet tokonoma-card: boutique lathe bowl, wood endscape, lid ajar; wet-fixture variant |
| 2026-08-02 | UB\|洗面 shower slide: dual bypass west stack, frosted glass, no swing arc |
| 2026-08-02 | UB freestanding tub (east half, NS, champagne faucet, decorative water) |
| 2026-08-02 | UB bath marble: wall seamless dark, floor light tiled; split 1f-ub/1f-senmen; south/east clad |
| 2026-08-02 | UB east hex cyan patchwork; floor 0.6 m tiles; tub solid bottom + denser water + full faucet |
| 2026-08-02 | UB floor → goose-yellow seamless diatom; white wool bath mat west of tub |
| 2026-09-19 | 1F UB → Lidea Type-M inspired hero GLB (apron tub, push drain, 1200×1200 east window, beige anti-slip); hex/diatom/wool retired |
| 2026-09-19 | UB tub inner ~90% fill (40 mm lip, bath_tank-1/2); chrome button on NW deck opens basin-floor plug |
| 2026-09-19 | 2F 西灣：トイレ同一樓（西半朝東＋門簾）；南半東洗手 Path B、西物入開東 |
| 2026-09-19 | 北立面 outlook_N：廁所直窗、廚房北拉門、梯間低窗、西南室北雙扇；洋室／洗面／東北室北實牆 |
| 2026-08-02 | Toilet café curtains upper 1/3 pink; kawaii chihuahua / Pomeranian panels |
| 2026-08-02 | LDK west open kitchen 2.175 m: NS island sink, fridge S, wood+stone, bar overhang |
| 2026-09-19 | LDK kitchen → Noct-inspired wall I at x=2.175 fin (IH/hood 75, DW, sink drawers). West-wall fridge/uppers removed. `bake:kitchen` |
| 2026-09-23 | West elevation: NW room west slider 1.70×2.10; LDK west window 0.72×1.10 at the north end |
| 2026-09-23 | LDK SE closet x 5.915–6.37, z 0–1.365, open west. East slider moved to z 1.37–2.73 |
| 2026-09-23 | 1F NW room is one volume x 1.82–4.55, z 4.55–6.37; x=3.64 closet wall and lintel removed |
| 2026-09-26 | 1F senmen → Piara-inspired 75 cm Path B `senmen-piara.glb` (引出＋3面鏡 CubeCamera). 2F wash stays hinoki `SenmenVanity` |
| 2026-09-26 | 1F/2F toilet → Amage shower-toilet inspired Path B `amage-toilet.glb` (skirted, 手洗い, click lid) |
| 2026-09-26 | Light layers: local `house-ibl.hdr` IBL (0.35, background off); dielectrics out of metalness 0.3–0.6; bloom default off |
| 2026-09-26 | 2F wash → wall counter Path B `dokodemo-wash.glb` (600 mm wood deck, vessel, tall mixer, exposed trap) |
| 2026-08-02 | 1F senmen N wall: basket+laundry, vanity+vertical mirror, front-load washer |
| 2026-08-04 | Senmen washer refine: tokonoma-card porthole stack + drum + drawer + honey wood plinth/side rail |
| 2026-08-04 | Senmen washer: remove wood + door handle; large high-gloss glass; subtle controls; drum laundry |
| 2026-08-04 | Senmen washer: torus door ring face-on (XY); remove chrome drum ribs that read as handle |
| 2026-08-04 | Senmen vanity mirror: MeshReflectorMaterial planar reflection (interior), not city envMap |
| 2026-08-04 | Senmen mirror fix: custom InteriorMirror (transformDirection) — black RT under plan scale−X |
| 2026-08-04 | Senmen mirror: portal Reflector to scene root (world X via planToWorldX) |
| 2026-08-04 | Senmen mirror: revert live RT (broke main view); static glass envMapIntensity 0 |
| 2026-08-04 | Mirror Phase A+B: safe FBO (useFBO+withOffscreenRender), magenta smoke; math tests |
| 2026-08-04 | Senmen vanity: open white deck + chrome legs + rounded vessel + mixer (ref S__112345090) |
| 2026-08-17 | Quality doctrine → cinematic / 力求完美; wet curvature = Path B glTF; senmen basin baker |
| 2026-08-17 | Senmen: drop white deck/chrome legs; porcelain vessel on flush pale-hinoki cabinet |
| 2026-08-18 | Senmen wet stack: opaque ceramic, faucet stream, P-trap to wall, click cabinet doors |
| 2026-08-18 | UB tub: click faucet + lift-out plug; fill only when seated and faucet on |
| 2026-08-18 | 2F toilet: sit fixture on north wall facing south (tokonoma-card) |
| 2026-08-18 | Sit toilet: JP 組み合わせ envelope 720×380, sit 420, tank 780 (1F+2F share `SIT_TOILET`) |
| 2026-08-18 | House GLB: DESIGN 70/25/5 PBR colors in `house.glb`; Vite `HouseGltf` default |
| 2026-09-07 | R3F default again; yaki/stucco matte + genkan rake; hero genkan-door GLB overlay |
| 2026-09-13 | Genkan door: Giesta 2 fire-door inspired GLB; west hinge, east handle, swing SW; no yaki leaf |
| 2026-09-28 | Interior doors → Standard Label inspired Path B `standard-label-doors.glb` (LD/PA/DC/TA/PH, greige oak). Toilet passages gain a TA swing; closet faces gain PH bifolds |
| 2026-09-28 | 2F south-wing closets: south z 0–1.365 door on the east (6-jo room); north z 1.365–2.73 door on the west (6.5-jo SW). z 2.73–3.64 stays the SW entry |
| 2026-09-28 | Under-stair closet x 5.46–6.37, z 5.46–6.37, PH on the south. LDK door: north hinge, 85° west. 2F NE door: south hinge, 85° east. NE closet bifold stacks on the north |
| 2026-09-28 | PH balcony north leg is x 2.73–4.55, z 3.64–6.37. No PH floor on x 0–2.73, z 3.64–6.37. Sloped roofs removed from the deck. x 1.82–2.73, z 3.64–6.37 is a flat 1F roof at 2F level |
| 2026-10-02 | Exterior shell → SK Kaken Bell Art トラバーチン AC-2166 (`#8e7363`). Soffit and fascia share it. Interior oat, roofs, yaki hang-points, glass, and doors stay |

---

## 9. Related files

| File | Role |
|------|------|
| `src/lib/houseMaterials.ts` | Finish types, `FAÇADE`, `YAKI_SUGI_WALL_IDS` |
| `src/lib/surfaceTextures.ts` | Procedural yaki-sugi, interior plaster, and the Bell Art fallback |
| `public/textures/bellart-travertine/` | Exterior albedo / normal / roughness (AC-2166) |
| `tools/dcc/build_bellart_travertine.py` | Tile baker (`npm run bake:bellart`) |
| `docs/bellart-travertine.md` | Exterior coating spec |
| `src/components/house/Walls.tsx` | Applies finishes to wall meshes |
| `src/data/dimensions.ts` | `COLORS`, `LIGHTING`, geometry, `SIT_TOILET` |
| `src/lib/sitToilet.ts` | Sit-toilet envelope packing (tank back → bowl front) |
| `public/models/hero/amage-toilet.glb` | 1F/2F Amage-inspired sit toilet |
| `docs/amage-toilet.md` | Amage Path B spec |
| `src/lib/houseBake.ts` | House GLB boxes from `dimensions.ts` |
| `public/models/archive/house-full-box-bevel.glb` | Archived full-house bake (`?houseGltf=1`) |
| `public/models/hero/genkan-door.glb` | 玄關大門 overlay |
| `public/models/hero/standard-label-doors.glb` | Interior LD / PA / DC / TA / PH leaves |
| `docs/standard-label-doors.md` | Interior door assignment and bifold direction |
| `src/components/Scene.tsx` | Canvas tone mapping / lights |
| `docs/cinematic-path-b.md` | AI-unattended Path B bake / test loop |
| `docs/senmen-vanity.md` | 1F Piara Path B + 2F hinoki basin spec |
| `public/models/hero/senmen-piara.glb` | 1F 75 cm vanity + 3-panel mirror overlay |
