# TASKS — Japanese House 3D

> **Single source of truth** for goals, phase status, milestones, acceptance criteria (DoD), and suggested Grok Build prompts.  
> Product overview → `README.md` · Visual aesthetics → `DESIGN.md` · Agent coding rules → `AGENTS.md`

---

## How to use this file

| Who | Use |
|-----|-----|
| Human PM / owner | Track status; mark tasks `done` / `in_progress` / `todo` / `blocked` |
| Grok / agents | Read **current phase**, open **in_progress** or next `todo`, implement to **DoD**, update status here |
| Review | Run each task’s **Verify** steps before closing |

**Status legend:** `done` · `in_progress` · `todo` · `deferred` · `cancelled`

**Grok Build:** paste the **Prompt** under a task (or `@TASKS.md` + task id). Prefer plan-first if the task says so.

---

## Product goal (stable)

Interactive **first-person** 3D walkthrough of a Japanese house from three floor plans (1F / 2F / PH).

**In scope (product):**

- Accurate architectural shell: walls, floors, stairs, door/window openings
- First-person walk (keyboard; plan-aligned coordinates)
- Multi-level navigation via real stair geometry (Y stacking)
- Later: materials, furniture, polish, static deploy (e.g. GitHub Pages)

**Explicitly out of product scope for now:**

- ~~Top-down overview camera / mode switch UI~~ (**cancelled** — do not implement)
- Physics engine / collision (rapier)
- Full PBR materials, post-processing, mobile-first UX (later phases)

---

## Design direction (agreed)

Decisions locked in from plan reviews and “照建議” implementations. Change only with explicit owner approval.

### Coordinates & units

| Rule | Value |
|------|--------|
| Unit | meters |
| Plan origin | SW outer of LDK |
| Axes | +X east, +Z north, +Y up |
| Display | House mirrored in X so north view matches PDF (LDK left, genkan right) — see `src/lib/coords.ts` |
| Dimension source of truth | `src/data/dimensions.ts` |
| Floor tops | 1F walk ≈ 0.5 (raised interior); story base 2F = 2.7, PH = 5.4 |
| Wall height | 2.5 m per story shell |
| Eye height | 1.5 m above feet |

### Controls (current)

| Action | Binding |
|--------|---------|
| Move | W / S (or ↑↓) — `moveSpeed` forward/back |
| Turn | A / D (or ←→) — ±`turnDegrees` (10°) per keypress |
| Look | Click empty space → Pointer Lock; mouse look; Esc unlock |
| Doors | Click leaf → open/close only (raycast priority; no lock on door hit) |
| Position | HUD: plan X / Z / eye Y |

### 1F architecture

- South façade chain: 2.175 + 4.195 + 1.520 (genkan) + 1.210 (SCL) + 1.820 (UB) = **10.92**
- Genkan/SCL 南 **z=2.83** (= 洗面南 4.55 − NS 1.72); UB 南仍 **2.72**; genkan door + steps → sill **0.5**
- **SCL**: EW **1.21** × NS **1.72**; 北貼／共用洗面南 (東段); 南與玄関切齊; 東貼 UB 西; 西牆通道 **0.9**（無門）; 無中隔
- **玄関**: 同南北帶 z 2.83–4.55 (NS 1.72); 北牆 @4.55 有通道
- Interior 0.91 module grid (CL / stairs / rooms)
- L-stair **0.91 + 0.91** (1F→2F & 2F→PH): straight + **90° winders**; **2f-stair-deck** Y=2.7 over well (x4.55–6.37, z4.55–6.37) joins corridor + NE room
- LDK door @ genkanW **z 4.55–5.46** (0.91), abut toilet west wall south
- 1F トイレ: **1.82×0.91** @ x 6.37–8.19, z 5.46–6.37; sit toilet west half facing east; south wall + east **0.7** passage with **double curtains** (no door)
- 1F 洗面: **EW 2.73** @ x 8.19–10.92 (abut toilet); NS 1.82; west wall south **0.91** door (hinge S, handle N, open +X)
- 1F ceiling soffit Y=2.5 over indoor envelope; **stair well open**

### Stairs 1F → 2F

- U-turn at north: lower 6×0.20 north → mid landing Y=1.7 → upper 5×0.20 south → 2F
- Tread 0.22; **5 cm overlap** landing ↔ flights (no void gap)
- **Stair well NS 1.82** (z 4.55–6.37): open hole option **A** — lower spur may enter LDK; do not force entire U into 1.82
- 2F exit bridge only mid → upper south end (do not slab over rising upper treads)

### 2F NE 洋室 6.5 (current focus room)

| Element | Spec |
|---------|------|
| West wall | x = 6.37 (stair \| room); door in **0.91** hall band (z 3.64–4.55); hinge S / handle N; open into room (+X) |
| North / East | Solid exterior |
| South G2 | Floor-to-ceiling glass **4.55 m** = 2.73 + 1.82, z = mid (3.64), west 6.37 → east **10.92** (meets east wall) |
| Balcony | **Two rects** south of NE G2: west **2.73×1.11** (z 2.53–3.64), east **1.82×0.91** (z 2.73–3.64); west overhangs genkan **0.30 m**; warm-grey slab + soffit; 3 downlights + door-east sconce; **no parapet**; **no door** (T-202 deferred) |
| 2F NS total | **2.73 + 0.91 + 2.73 = 6.37** (rooms + corridor + north wing); stair well NS 1.82 → corridor = 2.73−1.82 |
| South wing | X 2.73/0.91/2.73; room NS **2.73**; doors @ **clN (3.64)** → corridor; SW door east-tight to CL, SC west-tight; open opposite |
| Corridor | z **3.64–4.55**, x **1.82–6.37** (west jog 0.91), slab Y=2.7; SW door → indoors |
| NW jog | x 1.82–2.73, NS **1.365** (clN→nwJogN); solid wall to トイレ (no door); sink prop on north |
| CL openings | 南 CL: only **east** → 東房; 北 CL: only **west** → 西房 |
| トイレ | North of corridor; door @ **corrN (4.55)** from corridor |
| 2F ceiling | Soffit **Y=5.2** (2.7+2.5); indoor slabs only; balcony + stair well open |
| PH hall | 1.82×2.73 @ x 4.55–6.37, z 3.64–6.37; 4 walls + ceiling; south door → roof |
| PH layout | **廊 0.91** + **ph-stair-deck** (z 4.55–6.37) + L-stair; continuous Y=5.4 walk |
| PH stair | Same L as 1F→2F; exit onto deck → corr → balcony |
| PH balcony | x 0–6.37, z **0–3.64**, Y=5.4; parapet **1.4 m** (N only west of hall) |
| Plan CL between stair\|NE | **Not built** (locked: stair\|room direct @ x=6.37) |

### Height sampling (`src/lib/height.ts`)

- Sample walkable slabs + stair treads
- Ignore 2F slabs while feetY &lt; 2.0 (avoid snap under balcony / mid-climb)
- maxStepUp ≈ 0.55 (genkan grade → 0.5, risers)

### Plans

- Source: `docs/2d-floors/{First,Second,Third}Floor.jpeg` (private; keep gitignored if sensitive)

---

## Milestone map

| ID | Milestone | Status | Summary |
|----|-----------|--------|---------|
| **M0** | Project bootstrap | `done` | Next.js + R3F scene, dims, first-person player |
| **M1** | 1F shell + genkan | `done` | Exterior, parking recess, steps, raised floors, genkan door |
| **M2** | 1F interior + doors | `done` | Partitions, swing doors, 0.91 grid |
| **M3** | U-stair + height | `done` | Climbable 1F→2F, landing overlaps, corridors A/B |
| **M4** | 2F shell + NE room | `done` | Floors/walls, stair well 1.82, NE G2 4.55, balcony slab |
| **M5** | 2F complete shell | `in_progress` | South wing + トイレ done; balcony access deferred |
| **M6** | PH / roof | `done` | 2F→PH stair, hall, roof balcony + parapet 1.4 |
| **M7** | Materials + light | `done` | L1 façade: ivory stucco maps + genkan yaki-sugi; fills (T-301→L1) |
| **M8** | Furniture | `todo` | Sparse props from plan |
| **M9** | Ship static site | `todo` | GitHub Pages (or static host), polish |

**Current milestone:** **M7 done** (basic materials + lighting). Next: T-401 furniture, or T-501 deploy. T-202 balcony remains deferred.

---

## Phase framing (for agents)

Phases map to milestones; **do not skip ahead** without owner request.

| Phase | Milestones | Intent |
|-------|------------|--------|
| **Phase 1** (current) | M0–M5 | Accurate geometry + walkable first-person; no top-down |
| **Phase 2** | M5 residual / stair UX polish | Natural multi-floor circulation (mostly done via M3) |
| **Phase 3** | M7 | Materials + lighting |
| **Phase 4** | M8 | Furniture |
| **Phase 5** | M9 | Deploy + mobile/UI polish |

---

## Backlog & tasks

### Done (archive — do not re-open without regression)

#### T-101 · 1F exterior + genkan · `done` · M1

- DoD: South chain matches dims; genkan click door; steps 0.25×2; interior walk Y=0.5; HUD plan coords.
- Verify: spawn south of genkan, enter, stand in LDK eye ≈ 2.0.

#### T-102 · 1F interior partitions + swings · `done` · M2

- DoD: Rooms from plan; swing doors 90°; LDK–genkan north door hinge/handle; stair open to LDK.
- Verify: walk rooms; click doors; no false wall south of stair.

#### T-103 · U-stair climb · `done` · M3

- DoD: Continuous lower → landing → upper → 2F; no fall-through; mid landing 5 cm overlap.
- Verify: climb to eye Y ≈ 4.2 on 2F deck without soft-lock.

#### T-104 · 1F ceilings · `done` · M3

- DoD: Indoor soffit 2.5; stair well open; no sky through living areas.
- Verify: look up in LDK / genkan; open above stair.

#### T-105 · 2F NE 洋室 + G2 4.55 · `done` · M4

- DoD: West door in 0.91 band; N/E solid; south glass **6.37→10.92**; balcony slab no door/parapet; stair well NS 1.82.
- Verify: enter NE via stair door; glass meets east wall; no balcony swing.

#### T-201 · 2F remaining partitions (south wing + CL) · `done` · M5

- DoD: South wing 2.73/0.91/2.73; mid-wall doors (西・中央洋室); stacked CL + bedroom passages; トイレ west of well; NE G2 4.55 unchanged.
- Note: plan CL between stair|NE **not** added (T-105 lock: direct stair|room @ x=6.37).
- Verify: climb 2F → hall → south rooms + トイレ; NE regression; no slab over upper flight.

---

### Active / next

#### T-202 · 2F balcony access (optional) · `deferred` · M5

**Goal:** Walk from NE room onto balcony.

**Status note (owner):** **暫緩** — do not implement until unblocked.

**DoD (when unblocked)**

- [ ] Opening + swing (or sliding) on G2; open onto balcony (−Z)
- [ ] Continuous floor through opening; no auto-snap bugs
- [ ] Parapet only if owner requests (currently none)

**Grok Build prompt**

```text
@TASKS.md implement T-202 balcony access from NE G2. Keep glass otherwise; hinge/open per plan. No parapet unless asked.
```

---

#### T-203 · PH / roof massing · `done` · M6

- Stair hall 1.82×2.73; **well NS 1.82** + **door corridor 0.91** (like 2F)
- U-stair 2F→PH in well only: 12×0.225 m; mid Y=4.05; exit onto PH corr
- ルーフバルコニー x 0–6.37, z 0–3.64, Y=5.4; parapet **1.4 m**
- height: ignore PH slabs while feetY &lt; 4.0

---

#### T-301 · Basic materials + lighting · `done` · M7

**DoD:** Distinct floor/wall/stair materials; readable interior light; still simple (no heavy post).

- [x] Palette + `MATERIAL_PRESETS` / `LIGHTING` in `dimensions.ts`
- [x] Floors: indoor wood / outdoor concrete / stair deck
- [x] Walls: interior vs exterior (fixed exterior detection)
- [x] Stairs, ceilings, doors, glass, ground
- [x] Sun + hemi + soft interior point fills; ACES tone mapping
- [x] No new deps; geometry unchanged

**Grok Build prompt**

```text
@TASKS.md implement T-301 basic materials and lighting. No new major deps. Keep Phase 1 geometry.
```

---

#### T-401 · Furniture sparse set · `todo` · M8

**DoD:** Key rooms have simple placeholder furniture aligned to plan; no collision required.

---

#### T-501 · Static export / GitHub Pages · `todo` · M9

**DoD:** `output: "export"` (+ basePath if needed); `npm run build` produces `out/`; documented in README.

**Grok Build prompt**

```text
@TASKS.md implement T-501 GitHub Pages static export. Update README deploy section with exact basePath steps.
```

---

### Cancelled

| ID | Item | Reason |
|----|------|--------|
| T-X01 | Top-down camera + mode switch | Owner cancelled; first-person + HUD only |
| ~~T-X02~~ | ~~Remove pointer-lock~~ | **Superseded**: pointer lock kept; A/D are discrete turn (not strafe); doors after Esc |

---

## Definition of Done (global)

Every task also satisfies:

1. **Geometry** changes go through `src/data/dimensions.ts` first when possible  
2. **No top-down** / mode-switch UI  
3. **No new major dependencies** unless owner asked  
4. **Runnable:** `npm install && npm run dev`  
5. **Typecheck:** `npx tsc --noEmit`  
6. **Explain** what changed + next logical task id  
7. **Update this file** (status / checkboxes) when closing a task  
8. Static-export friendly (no server-only APIs) if touching app config  

---

## Suggested agent workflow

```text
1. Read TASKS.md (current milestone + next todo)
2. Read AGENTS.md conventions
3. If materials / light / façade: read DESIGN.md
4. If geometry: open Second/First floor plan + dimensions.ts
5. Plan if task says so → wait for owner if ambiguous
6. Implement → tsc → manual verify DoD (+ DESIGN cues if look work)
7. Mark task done in TASKS.md; update DESIGN.md if aesthetics/hang-points changed
```

**One-shot “what next?” prompt**

```text
@TASKS.md @AGENTS.md What is the next todo task? Summarize DoD and wait for me to say implement.
```

---

## Changelog (docs / PM)

| Date | Note |
|------|------|
| 2026-08-01 | TASKS.md created; task content moved from README/AGENTS; top-down cancelled; NE G2 4.55 recorded |
| 2026-08-01 | M0–M4 marked done from implemented Phase 1 work |
| 2026-08-01 | T-201 done: 2F south wing partitions + トイレ; M5 in progress (balcony deferred) |
| 2026-08-01 | South-wing NS 3.64 (CL 2.73 + pocket 0.91); CL one-side openings; doors → corridor |
| 2026-08-01 | Fix: corridor 0.91 restored (rooms 2.73); doors @ clN; トイレ @ corrN; SW door east to CL |
| 2026-08-01 | NW jog: west wall @1.82, NS 1.365; solid to toilet; Phase-1 sink prop |
| 2026-08-01 | 2F ceilings: soffit 5.2; indoor blocks; no balcony/stair-well slab |
| 2026-08-01 | 1F stair screen: east wall mid→north + 南東灣; west bay open to LDK |
| 2026-08-01 | T-203 PH: 2F→PH U-stair, hall, roof balcony z0–3.64 parapet 1.4m |
| 2026-08-01 | PH stair well NS 1.82 + door corridor 0.91 (align 1F→2F / 2F corr) |
| 2026-08-01 | 1F toilet 1.82×0.91; east-facing sit toilet; south wall + 0.7 double curtains |
| 2026-08-01 | 1F 洗面 EW 2.73 abut toilet; west door south 0.91 hinge S open in |
| 2026-08-01 | Stair 0.91 module U + LDK door z4.55–5.46; 1F→2F & 2F→PH same pattern |
| 2026-08-01 | L-stair: straight 0.91 + 90° winders 0.91 (no 180°); 1F→2F & 2F→PH |
| 2026-08-01 | Fix L-join: pivot≈5.15, startAngle WNW, rInner 0.05, straight/winder overlap |
| 2026-08-01 | 2f-stair-deck full well so post-climb walk (e.g. 5.63,5.23) stays Y=2.7 |
| 2026-08-01 | ph-stair-deck full well so post-climb (e.g. 5.92,4.8) stays Y=5.4 |
| 2026-08-01 | Controls: Pointer Lock look + WASD/arrows strafe (same moveSpeed); Esc then click doors |
| 2026-08-01 | Controls: A/D (←→) back to ±10° turn; W/S move only; mouse look kept |
| 2026-08-01 | T-202 remains deferred (owner 暫緩); T-301 materials + lighting done (M7) |
| 2026-08-01 | Door click priority: raycast door → no pointer lock; empty click locks |
| 2026-08-01 | 1F SCL: west wall+passage 0.7; merge east with UB; NS≈0.885 (not 1.82) |
| 2026-08-01 | SCL+玄関 NS **1.72** (z 2.83–4.55); 北貼洗面南; EW 1.21; 西通道 0.9; wetS=stairS=4.55 |
| 2026-08-01 | L1 façade: procedural ivory stucco (albedo/normal/rough) + yaki-sugi on `1f-jog-ldk-east` only |
| 2026-08-01 | DESIGN.md added (aesthetics); AGENTS/README/TASKS point agents to it for look work |
| 2026-08-01 | Genkan: flush yaki-sugi door+portal (L/R/top), matte-black vertical handle; plan walls unchanged |
| 2026-08-01 | 2F NE balcony dual slabs (W 2.73×1.11 / E 1.82×0.91); soffit 3× downlight + genkan-east sconce |
| 2026-08-01 | Interior finishes: oat main / warm-gray secondary / charcoal accent; shadow-gaps; wood endscape |
| 2026-08-01 | Fix genkan north block: passage 1.15 m center; no full-width wood panel sealing view |
| 2026-08-01 | Door-click priority: any raycast door hit skips lock; frames marked interactable |
| 2026-08-01 | Genkan 落塵: slate genkan+SCL; N/S cove; flat sconce on east wall near door |
