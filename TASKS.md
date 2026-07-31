# TASKS — Japanese House 3D

> **Single source of truth** for goals, phase status, milestones, acceptance criteria (DoD), and suggested Grok Build prompts.  
> Product overview → `README.md` · Agent coding rules → `AGENTS.md`

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
| Move | W / S |
| Turn | A / D (±10° per press) |
| Doors | Click leaf open/close (no pointer-lock mouse look) |
| Position | HUD: plan X / Z / eye Y |

### 1F architecture

- South façade chain: 2.175 + 4.195 + 1.520 (genkan) + 1.210 (SCL) + 1.820 (UB) = **10.92**
- Parking recess 内縮 2.755; genkan door + exterior steps (0.25 × 2) → sill / interior floor **0.5**
- Interior 0.91 module grid (CL / stairs / rooms)
- U-stair open to LDK (no stair south wall)
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
| Balcony | Slab kept (visual); **no parapet**; **no door** (access deferred) |
| CL / other 2F rooms | Partial floors/walls only; full partitions later |

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
| **M5** | 2F complete shell | `todo` | Remaining 2F rooms/CL, balcony access optional |
| **M6** | PH / roof | `todo` | Third plan massing |
| **M7** | Materials + light | `todo` | Basic materials, lighting (still Phase-style) |
| **M8** | Furniture | `todo` | Sparse props from plan |
| **M9** | Ship static site | `todo` | GitHub Pages (or static host), polish |

**Current milestone:** M4 complete → next work under **M5**.

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

---

### Active / next

#### T-201 · 2F remaining partitions (south wing + CL) · `todo` · M5

**Goal:** Align south-block rooms (洋室西 / CL / 洋室6) and any north-wing leftovers with `SecondFloor.jpeg`.

**Scope**

- Interior walls + doors where plan shows
- Keep NE room + G2 as specified (do not shorten south glass)
- Stair well void unchanged unless plan correction

**Out of scope**

- Balcony walk-through (see T-202)
- PH, materials, furniture

**DoD**

- [ ] South-wing room boxes match plan widths (2.73 / 0.91 / 2.73)
- [ ] Doors clickable where plan shows leaf; hinge side sensible
- [ ] Walk path from stair hall into each south room without falling through
- [ ] `npx tsc --noEmit` clean; `npm run dev` runs
- [ ] README “Current geometry” one-liner updated if public behavior changes

**Verify**

1. Climb to 2F; enter NE room (regression).
2. Enter each south room; confirm walls vs plan screenshot.
3. No new 2F slab over rising upper flight.

**Grok Build prompt**

```text
@TASKS.md @AGENTS.md implement T-201 (2F remaining partitions).
Plan against docs/2d-floors/SecondFloor.jpeg first if geometry ambiguous; then implement.
Do not change NE G2 4.55 m or re-add top-down. Update TASKS.md status when DoD met.
```

---

#### T-202 · 2F balcony access (optional) · `deferred` · M5

**Goal:** Walk from NE room onto balcony.

**DoD (when unblocked)**

- [ ] Opening + swing (or sliding) on G2; open onto balcony (−Z)
- [ ] Continuous floor through opening; no auto-snap bugs
- [ ] Parapet only if owner requests (currently none)

**Grok Build prompt**

```text
@TASKS.md implement T-202 balcony access from NE G2. Keep glass otherwise; hinge/open per plan. No parapet unless asked.
```

---

#### T-203 · PH / roof massing · `todo` · M6

**Goal:** ThirdFloor plan as walkable or viewable roof/PH shell.

**DoD**

- [ ] Floors/walls from plan dims in `dimensions.ts`
- [ ] Access path defined (stair 2F→PH or temporary teleport — decide in plan)
- [ ] First-person can stand on PH without falling through

**Grok Build prompt**

```text
@TASKS.md implement T-203 PH/roof from docs/2d-floors/ThirdFloor.jpeg. Plan access path first, then implement. No furniture.
```

---

#### T-301 · Basic materials + lighting · `todo` · M7

**DoD:** Distinct floor/wall/stair materials; readable interior light; still simple (no heavy post).

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
| T-X02 | Pointer-lock mouse look | Interfered with door click; A/D turn kept |

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
3. If geometry: open Second/First floor plan + dimensions.ts
4. Plan if task says so → wait for owner if ambiguous
5. Implement → tsc → manual verify DoD
6. Mark task done in TASKS.md; note residual risks
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
