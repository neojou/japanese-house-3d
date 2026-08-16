# Cinematic Path B — AI-unattended hero assets

Owner asked for **高品質、力求完美** and **電影版 B**. Humans do not model, do not pick mesh-vs-DCC, and do not sit in the loop. Agents bake, test, and load.

**Aesthetics:** [`DESIGN.md`](../DESIGN.md) §1 + §2.7  
**This fixture:** [`senmen-vanity.md`](./senmen-vanity.md)

---

## What Path B is

| | Runtime (A, rejected for this basin) | **Path B (locked)** |
|--|--------------------------------------|---------------------|
| Form | Stacked `ExtrudeGeometry` / live CSG | Authored continuous surface |
| File | Only TS in the component | `public/props/<id>/*.glb` |
| Who authors | Component at mount | **Scripted DCC** (Blender if present, else repo baker) |
| Resize | Edit numbers, remesh live | Edit `dimensions.ts` + `SENMEN_VESSEL_SPEC`, **re-bake** |

Runtime **loads** the glTF. It does not rebuild the bowl from two slabs.

Blender is **optional**. This machine often has none. The Node baker is still Path B: the asset is a file, the form is a lofted cavity, the quality bar is cinematic.

---

## Unattended loop (do this; do not ask)

```text
1. Read DESIGN.md §1 (cinematic / 力求完美) and §2.7
2. Edit numbers only in src/data/dimensions.ts AND src/lib/vesselBasin.ts
   (same vessel fields — verify-senmen-basin checks they match)
3. npm run bake:senmen-basin
4. npm run test:basin
5. npx tsc --noEmit
6. If a visual check is needed: npm run dev → /japanese-house-3d/?pose=senmen
   (`?pose=` is an agent gate, not a user camera mode)
7. Update TASKS.md changelog + DESIGN hang-point status
```

Do **not**:

- Wait for the owner to open Blender
- Re-open “mesh vs model”
- Ship a white box / second extrude as the inner bowl
- Change `SENMEN_1F` / UB / plan walls
- Add TOTO or other trademarks
- Add CSG libraries or a post stack
- Re-enable planar FBO mirrors

---

## Commands

| Script | Role |
|--------|------|
| `npm run bake:senmen-basin` | Blender if on `PATH` / `BLENDER` / Blender.app; else Node DCC → `public/props/senmen-basin/basin.glb` |
| `npm run test:basin` | Profile + mesh + glTF + loader contracts |
| `npm run test:mirror` | Unrelated; still required if you touch mirrors |

Bake is **not** a `dev` dependency of the walkthrough: the glTF is committed so `npm run dev` works without Blender.

---

## Files

| Path | Role |
|------|------|
| `src/lib/vesselBasin.ts` | Scripted DCC (profile + loft) |
| `scripts/bake-senmen-basin.mjs` | Orchestrator |
| `scripts/lib/writeGlb.mjs` | glTF2 writer (no new deps) |
| `tools/dcc/senmen_basin.py` | Optional Blender boolean + subdiv |
| `public/props/senmen-basin/basin.glb` | Runtime asset |
| `src/components/house/SenmenVanity.tsx` | Deck / chrome / faucet + `useGLTF` |

---

## Quality gate (ship / no-ship)

Ship only if **all** are true:

1. Tests green (`test:basin`, `tsc`)
2. Inner surface is a **continuous cavity** (highlight can travel)
3. Outer still reads as a rectangular vessel (photo: `docs/S__112345090.jpg`)
4. First-person at `?pose=senmen` does **not** read as 白長方體
5. Plan room box unchanged

If (4) fails: change the **profile / bake**, do not stack another box. Re-run the loop. Do not ping the owner for modeling help.
