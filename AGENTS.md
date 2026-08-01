<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md – Japanese House 3D Viewer

Coding rules and conventions for AI agents working in this repo.

**Tasks / phases / DoD / milestones / Grok prompts:** **[`TASKS.md`](./TASKS.md)** (source of truth)  
**Human product overview:** **[`README.md`](./README.md)**

---

## Before you code

1. Read **`TASKS.md`**: current milestone, next task, DoD, out-of-scope.
2. Obey **cancelled** items there (notably: **no top-down camera / mode switch**).
3. If geometry is ambiguous, **plan first** and wait for owner confirmation when the task says so.
4. Prefer `@TASKS.md` + task id in Grok prompts so status stays aligned.

---

## Product context (short)

Interactive **first-person** walkthrough of a Japanese house (1F / 2F / PH plans).  
Phase work is tracked only in `TASKS.md` — do not invent a parallel roadmap here.

**Controls today:** W/S move; A/D turn 10°; click empty → Pointer Lock; click door → open only (no lock); Esc unlock.

---

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- three, @react-three/fiber, @react-three/drei
- zustand (viewer position / floor HUD)

Do **not** add major dependencies unless the owner explicitly requests them.

---

## Key conventions

| Topic | Rule |
|-------|------|
| Units | Meters everywhere |
| Dimensions | Centralize in `src/data/dimensions.ts`; change data before hardcoding mesh sizes |
| Coordinates | Plan: +X east, +Z north, +Y up; origin SW. Display may X-mirror the house (`src/lib/coords.ts`) |
| Geometry | Simple `Box` walls/floors; L1 façade via `houseMaterials` (stucco maps + yaki-sugi ids) |
| Components | Small, single-responsibility under `src/components/house/` |
| Height / walk | Use `src/lib/height.ts` + slabs/stairs in dimensions; respect stair-well voids |
| Run | Must stay runnable with `npm install && npm run dev` |
| Types | `npx tsc --noEmit` clean before claiming done |
| Deploy | Stay static-export friendly (GitHub Pages later) |

### Do not implement unless `TASKS.md` says so

- Top-down / orthographic map mode or mode-switch UI (**cancelled**)
- Physics / collision (rapier)
- Heavy materials, post-processing, mobile touch (later milestones)
- Re-adding balcony parapets or shortening NE south G2 (**4.55 m** locked)

### Design locks worth re-checking

Full table in `TASKS.md` → **Design direction**. Highlights:

- Stair well NS **1.82** (option A: lower spur may enter LDK)
- NE 洋室 west @ **x=6.37**; south G2 **6.37→10.92**
- Balcony: slab OK; **no door** until T-202
- No 2F slab over rising upper stair treads

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
3. No new major dependencies unless requested.
4. When finishing work: explain what changed, mark task status in **`TASKS.md`**, point to the next logical task id.
5. Prefer plan → implement when the owner or task asks for planning.
6. Keep GitHub Pages / static export in mind for app config.

---

## GROK.md

Repo root `GROK.md` points at this file (`@AGENTS.md`). Agents should still open **`TASKS.md`** for what to build next.
