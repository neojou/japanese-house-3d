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

| Share | Role | Application (exterior + strong interior cues) |
|------:|------|-----------------------------------------------|
| **~70%** | Main | Warm ivory / milky **stucco** shell |
| **~25%** | Secondary | **Wood / yaki-sugi** in recesses and selected inners only |
| **~5%** | Accent | Dark door leaves / frames, metal handles, thin dark edges |

Interior floors, stairs, and soft landscape ground support the same family (warm neutrals) without competing with the façade ratio.

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
| **Interior plaster** | Quieter than exterior; less normal strength so rooms stay soft. |

Implementation may use **procedural maps** (preferred for zero asset pipeline) or later hand-authored seamless maps; quality bar is the *look*, not the asset source.

### 2.5 木質掛點策略（局部、可擴）

Wood is for **warmth in shadow volumes**, not cladding the whole house.

| Priority | Location | Status |
|----------|----------|--------|
| 1 | **玄関駐車凹口** 左壁 | **Done** — `1f-jog-ldk-east` |
| 1b | **玄関大门立面**（凹口背面） | **Done** — `1f-south-genkan-door` + flush yaki leaf |
| 1c | **凹口頂 / 右頰**（portal soffit + east cheek） | **Done** — cladding in `GenkanEntry` (no plan wall change) |
| 2 | 陽台內側、屋簷／天花下緣 | Planned — add wall ids when owner approves |
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

## 3. Material system (engineering map)

| Layer | Meaning | Code |
|-------|---------|------|
| **L0** | Flat colours only | Early T-301 style (superseded for façade) |
| **L1** (current target) | Stucco albedo + normal + roughness; yaki-sugi maps on pocket walls | `src/lib/surfaceTextures.ts`, `src/lib/houseMaterials.ts`, `Walls.tsx` |
| **L2** (optional later) | Heavier env / post / real PBR packs | Only if `TASKS.md` opens it; keep static-export friendly |

**Finishes on walls:**

- `stucco` — default exterior shell  
- `yakiSugi` — listed pocket ids only  
- `interior` — partitions / indoors  

Palette & sun knobs also live in `src/data/dimensions.ts` (`COLORS`, `LIGHTING`). Geometry stays in `dimensions.ts`; **do not** hardcode mesh sizes for “look.”

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
5. Cite principles in PR / task notes when relevant (e.g. “70/25/5”, “texture over swatch”).

---

## 8. Changelog (design)

| Date | Note |
|------|------|
| 2026-08-01 | DESIGN.md created: subtractive warm-white + yaki-sugi, 70/25/5, L1 maps, genkan recess first hang-point |
| 2026-08-01 | Genkan door: flush yaki-sugi portal (3 faces + leaf), matte-black vertical bar handle |
| 2026-08-01 | Yaki readability: brighter maps, genkan lights, env micro-specular (not pure black) |

---

## 9. Related files

| File | Role |
|------|------|
| `src/lib/houseMaterials.ts` | Finish types, `FAÇADE`, `YAKI_SUGI_WALL_IDS` |
| `src/lib/surfaceTextures.ts` | Procedural stucco / yaki-sugi maps |
| `src/components/house/Walls.tsx` | Applies finishes to wall meshes |
| `src/data/dimensions.ts` | `COLORS`, `LIGHTING`, geometry |
| `src/components/Scene.tsx` | Canvas tone mapping / lights |
