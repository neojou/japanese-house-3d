# DESIGN — Japanese House 3D 美學與材質理念

> **Visual / material design source of truth** for how the house should *look and feel*.  
> Geometry, tasks, DoD → [`TASKS.md`](./TASKS.md)  
> Agent coding rules → [`AGENTS.md`](./AGENTS.md)  
> Product overview → [`README.md`](./README.md)

Agents and humans **designing or changing materials, colours, lighting, or façade finishes** should read this file first and keep implementations aligned.

---

## 1. Product visual goal

Interactive **first-person** walkthrough that feels like a **professional residential 3D tour**: refined, calm, and spatially clear—not a gamey prototype, not a sterile CAD dump.

**Target emotion:** 細緻、高貴、溫暖、克制（日式極簡住宅導覽）。

Phase 1 geometry is largely complete; from L1 onward we optimise for **sensory quality**, not “good enough flat colours.”

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
| **~70%** | Main | Warm ivory **stucco** shell |
| **~25%** | Secondary | **Yaki-sugi** in recesses / portal |
| **~5%** | Accent | Dark handles, thin metal edges |

**Interior** (all rooms — no pure hospital white)

| Share | Role | Application |
|------:|------|-------------|
| **~70%** | Main | **Oat / milk** plaster on main walls + ceilings |
| **~25%** | Secondary | **Warm gray** wet rooms, CL, utility, PH hall |
| **~5%** | Accent | **Charcoal** door frames, 分模線, genkan 端景 wall |

Floors stay warm wood tones. Code: `INTERIOR` + finish sets in `houseMaterials.ts`.

### 2.3 暖白，不是醫院白

Japanese minimal white is the base—but pure cold white reads clinical.

- Prefer **warm white**: ivory, milky white, slight yellow or grey in the white.
- Avoid pure `#FFFFFF` large fields and icy blue-greys on the main shell.
- Current direction: façade ivory ≈ `#f3eee4` / `#f7f2e8` (see code `FAÇADE` / `COLORS.wallExterior`).

### 2.4 紋理 (Texture) 重於色票

Colour sets mood; **micro-relief sells “real building.”**

| Surface | Intent |
|---------|--------|
| **Exterior stucco** | Elastic / sand-float paint: fine grit, soft undulation. Under **raking sun**, tiny shadows → stone-like warmth. |
| **Yaki-sugi (燒杉)** | Fire-charred cedar: dark charcoal, vertical grain, board seams, matte variation—not flat black paint. |
| **Interior oat plaster** | 珪藻土／乳漆感：柔和 micro grit；斜射暖光出陰影 |
| **Interior warm gray** | 微水泥／大地灰：稍深、稍粗，層次不搶主牆 |
| **Interior light wood** | 樑、端景板、窗台內緣 — 呼應室外木，非整面燒杉 |

Implementation may use **procedural maps** (preferred for zero asset pipeline) or later hand-authored seamless maps; quality bar is the *look*, not the asset source.

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
| 1b | **玄関大门立面**（凹口背面） | **Done** — `1f-south-genkan-door` + flush yaki leaf |
| 1c | **凹口頂 / 右頰**（portal soffit + east cheek） | **Done** — cladding in `GenkanEntry` (no plan wall change) |
| 2 | 陽台內側、屋簷／天花下緣 | Partial: NE balcony dual slab + genkan soffit lights (no yaki on balc yet) |
| 3 | 其他凹入（門廊、局部 jog） | Only with explicit owner list |

### 2.6 玄関大门（外牆即大門）

| Rule | Detail |
|------|--------|
| **Portal** | 内凹三面燒杉：左壁、右頰、頂 soffit + 背面立面 |
| **Leaf** | 與燒杉 **同材、同色、同豎紋**；無亮玻璃腰窗（減法） |
| **Seam** | 極窄 reveal；遠看門消融於黑木凹口 |
| **Handle** | **一體式垂直長條**，霧面消光黑 only；禁圓形／歐式雕花把手 |
| **Layout** | 不改平面牆線；細部可加 clad mesh |

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

**Quality bar (acceptance):** If the owner would describe it as “組合木板／紅色長方形,” it is **not** shipped as tokonoma-card — refine form first.

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
| **4. Form** | Prefer **curved card**, **Lathe / Extrude / moldings**, or composed low-poly with **readable silhouette** over flat billboard. Soft taper, legs, rounded corners, frame-and-panel as needed. Side-walk in room must not collapse to a paper plane or “lumber stack.” |
| **5. Surface** | Albedo + normal / roughness when it sells lacquer, fabric, grain; 1–2k enough; alpha cutout OK; procedural or `public/props/<id>/`. **Maps support form — they never replace missing form.** |
| **6. Light** | **One** short-range warm key; weak residential; **must not** wash genkan yaki or whole room; raking light should reveal micro-detail |
| **7. Brands** | **No trademarks / logos** — generic or “inspired” only |
| **8. Data / code** | Placement in `dimensions.ts` (`PROP_*`, `style: "tokonoma-card"`); mesh under `src/components/house/`; join preload if new procedural maps; **no new major deps** |
| **9. Plan lock** | Never move plan walls; finishes + additive meshes only |
| **10. Contents** | If the story needs “something inside / on top,” those pieces must also be **recognizable** and **neatly composed** (tight alignment, intentional spacing) |

### Not Tokonoma Card (use crude props or different style)

- Utility placeholders still OK for **curtains / crude sinks** until upgraded; **toilet is no longer a two-box placeholder** once listed as hang-point  
- Remaining crude: curtain panels, simple sink boxes until tasked  
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
- Boutique hotel soft rounding OK; warm ivory glaze; optional thin wood endscape  
- Lid ajar optional for life; single flush button; one weak warm key  
- Reference: `ToiletDisplay.tsx` + `PROP_1F_TOILET`

### Current hang-points

| Id | Location | Style | Status |
|----|----------|-------|--------|
| `hero-1f-scl-trench` | 1F SCL 東牆 — 蜜金 trench | `tokonoma-card` | **Done** |
| `hero-1f-scl-getabako` | 1F SCL 北牆 — 象牙白 getabako + 紅細跟 | `tokonoma-card` (落地·細作) | **Done** |
| `hero-1f-toilet` | 1F トイレ西半 — 精品圓潤坐便（面東） | `tokonoma-card` (潔具) | **Done** |

**SCL 落塵 vignette:** trench + getabako as a **paired** scene; both keys stay weak; shared **noble / detail-first** bar.

Future art / lamp / ceramic: same style name + this table row + owner OK.

---

## 3. Material system (engineering map)

| Layer | Meaning | Code |
|-------|---------|------|
| **L0** | Flat colours only | Early T-301 style (superseded for façade) |
| **L1** (current target) | Stucco albedo + normal + roughness; yaki-sugi maps on pocket walls | `src/lib/surfaceTextures.ts`, `src/lib/houseMaterials.ts`, `Walls.tsx` |
| **L2** (optional later) | Heavier env / post / real PBR packs | Only if `TASKS.md` opens it; keep static-export friendly |

**Finishes on walls:**

| Finish | Use |
|--------|-----|
| `stucco` | Exterior shell |
| `yakiSugi` | `YAKI_SUGI_WALL_IDS` |
| `interiorMain` | Default indoor walls + ceilings (~70%) |
| `interiorSecondary` | `INTERIOR_SECONDARY_WALL_IDS` (~25%) |
| `interiorAccent` | `INTERIOR_ACCENT_WALL_IDS` (~5%) |
| `interiorWood` | Optional full-wall wood (prefer panels) |

Palette: `INTERIOR` / `FAÇADE` in `houseMaterials.ts`; `COLORS`, `LIGHTING` in `dimensions.ts`. Geometry stays in `dimensions.ts`.

---

## 4. Lighting philosophy

- **Raking directional sun** so grit and grain read (lower ambient than prototype fills).
- Soft **interior point fills** so FP walk indoors stays legible under roofs.
- **Genkan recess fill + west rake** — without these, yaki-sugi in 内縮 reads as pure black.
- Low **Environment** intensity (drei) for micro-specular on board ridges.
- Warm-ish background / fog—avoid blue hospital atmosphere.
- ACES tone mapping; mild exposure lift for ivory midtones.
- Prefer **no heavy post stack** unless tasked (still “architectural calm,” not cinematic grade).

### 4.1 Why yaki looked “flat black” (and fix)

| Cause | Fix |
|-------|-----|
| Albedo too dark × `material.color` multiply | Lift map luminance; tint near white (`#c8c0b4`) |
| Recess in shadow | Dedicated genkan fill / rake lights |
| Weak normals / large tiles | Stronger normalScale; smaller `yakiTileM`; 1024 maps |
| No env reflection | Soft `Environment` for ridge sheen |

**Later optional:** hand-authored seamless yaki photos in `public/textures/` (still no new deps)—only if procedural remains insufficient.

---

## 5. What “good” looks like (acceptance cues)

When changing look, verify in first-person:

1. **Outside:** shell reads warm ivory, not grey mud or pure white plastic.  
2. **Slanted light:** stucco shows fine grain; not a perfectly flat shader.  
3. **Genkan recess:** yaki-sugi is clearly different material—dark, vertical, matte.  
4. **Colour balance:** large white, small wood pockets, tiny dark metal/wood accents.  
5. **Indoors:** calm, readable; not blown-out white or cave-black without fills.  
6. **Performance:** no major new deps; maps shared; static export still viable.

---

## 6. Anti-patterns (do not)

- Full-building wood cladding or loud patterns.  
- Cold pure white + blue ambient “gallery” look.  
- Random accent colours (bright blue UI meshes on architecture).  
- Heavy bloom / aggressive post that washes material.  
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

---

## 9. Related files

| File | Role |
|------|------|
| `src/lib/houseMaterials.ts` | Finish types, `FAÇADE`, `YAKI_SUGI_WALL_IDS` |
| `src/lib/surfaceTextures.ts` | Procedural stucco / yaki-sugi maps |
| `src/components/house/Walls.tsx` | Applies finishes to wall meshes |
| `src/data/dimensions.ts` | `COLORS`, `LIGHTING`, geometry |
| `src/components/Scene.tsx` | Canvas tone mapping / lights |
