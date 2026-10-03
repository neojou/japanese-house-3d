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
   (`?cabOpen=1` / `?mirrorOpen=1` open the 1F Piara leaves)
   (`?pose=` is an agent gate, not a user camera mode)
7. Update TASKS.md changelog + DESIGN hang-point status
```

1F Piara vanity (same idea; Blender required):

```text
1. Edit PROP_1F_SENMEN.piara in dimensions.ts (leave vanity.* for 2F)
2. Keep tools/dcc/build_senmen_piara.py numbers in sync
3. npm run bake:senmen-piara
4. npm run test:senmen-piara && npm run test:mirror
5. npx tsc --noEmit
6. Visual gate: /japanese-house-3d/?pose=senmen
```

1F/2F Amage toilet (same idea; Blender required):

```text
1. Edit SIT_TOILET in dimensions.ts (1F/2F share the envelope)
2. Keep tools/dcc/build_amage_toilet.py numbers in sync
3. npm run bake:amage-toilet
4. npm run test:toilet
5. npx tsc --noEmit
6. Visual gate: /japanese-house-3d/?pose=toilet  and  ?pose=toilet2f&lidOpen=1
```

UB Type-M liner (same idea):

```text
1. Edit UB_BATH / PROP_1F_UB_TUB / UB_EAST_WINDOW in dimensions.ts
2. Keep tools/dcc/build_ub_bath.py numbers in sync
3. npm run bake:ub-bath
4. npm run test:ub-bath && npm run test:tub
5. npx tsc --noEmit
6. Visual gate: /japanese-house-3d/?pose=tub
```

UB east 目隠し可動ルーバー (same idea; Blender required):

```text
1. Edit PROP_1F_UB_LOUVER / UB_EAST_WINDOW in dimensions.ts
2. Keep tools/dcc/build_ub_louver.py numbers in sync
3. npm run bake:ub-louver
4. npm run test:ub-louver
5. npx tsc --noEmit
6. Visual gate: /japanese-house-3d/?pose=ub-window  and  ?pose=ub-window-out&louver=open
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
| `npm run bake:ub-bath` | Type-M UB liner + Minamo apron + chrome → `public/models/hero/ub-bath.glb` |
| `npm run bake:kitchen` | Noct-inspired wall-I kitchen (Blender boolean sink) → `public/models/hero/kitchen-noct.glb` |
| `npm run test:kitchen` | GLB node names + fin wall + no west-wall fridge stack |
| `npm run bake:senmen-piara` | Piara-inspired 75 cm vanity + 3-panel mirror (Blender boolean bowl) → `public/models/hero/senmen-piara.glb` |
| `npm run test:senmen-piara` | GLB names + 1F loader + CubeCamera + 2F hinoki reuse |
| `npm run bake:dokodemo-wash` | 2F wall handwash (Blender boolean vessel) → `public/models/hero/dokodemo-wash.glb` |
| `npm run test:dokodemo-wash` | GLB names + 2F loader + faucet click + no priority-1 frame |
| `npm run bake:standard-label-doors` | Interior LD/PA/DC/TA/PH leaves → `public/models/hero/standard-label-doors.glb` |
| `npm run test:standard-label-doors` | GLB names + assignment + bifold pin stays on the track |
| `npm run bake:amage-toilet` | Amage-inspired skirted sit toilet + 手洗い (Blender boolean bowl) → `public/models/hero/amage-toilet.glb` |
| `npm run test:toilet` | Envelope 760×416 + GLB names + 1F/2F loader + clickable lid |
| `npm run test:basin` | Profile + mesh + glTF + loader contracts |
| `npm run bake:ub-louver` | 目隠し可動ルーバー (Blender aluminium blades) → `public/models/hero/ub-louver.glb` |
| `npm run test:ub-louver` | 16 blades + skip generic pane + no trademarks |
| `npm run test:ub-bath` | UB GLB names + window 1.20 + push drain + overlay |
| `npm run test:tub` | Fill / drain / wet-floor contracts |
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
| `src/components/house/SenmenVanity.tsx` | 2F deck / chrome / faucet + `useGLTF` |
| `tools/dcc/build_senmen_piara.py` | 1F 75 cm 引出 + 3面鏡 Blender baker |
| `scripts/bake-senmen-piara.mjs` | Orchestrator (Blender required) |
| `public/models/hero/senmen-piara.glb` | Runtime 1F vanity |
| `src/components/house/SenmenPiara.tsx` | Drawers / doors / CubeCamera glass + `useGLTF` |
| `tools/dcc/build_ub_louver.py` | 1F UB 目隠し可動ルーバー Blender baker |
| `public/models/hero/ub-louver.glb` | Runtime east-window grille + sash |
| `src/components/house/UbLouver.tsx` | Click-open blades + `useGLTF` |
| `tools/dcc/build_amage_toilet.py` | Skirted sit toilet + 手洗い Blender baker |
| `scripts/bake-amage-toilet.mjs` | Orchestrator (Blender required) |
| `public/models/hero/amage-toilet.glb` | Runtime 1F/2F toilet |
| `tools/dcc/build_dokodemo_wash.py` | 2F 600 mm wall counter + vessel |
| `public/models/hero/dokodemo-wash.glb` | Runtime 2F wash |
| `src/components/house/DokodemoWash.tsx` | Faucet click + `useGLTF` |
| `tools/dcc/build_standard_label_doors.py` | Greige-oak interior leaves (boolean light slots) |
| `public/models/hero/standard-label-doors.glb` | Runtime LD / PA / DC / TA / PH |
| `src/components/house/StandardLabelLeaf.tsx` | Shared leaf + `useGLTF` |
| `docs/standard-label-doors.md` | Which room gets which leaf |
| `src/components/house/AmageToilet.tsx` | Lid / seat click + `useGLTF` |
| `src/lib/ubBathHero.ts` | UB Type-M layout + Node DCC |
| `scripts/bake-ub-bath.mjs` | Orchestrator (Blender preferred) |
| `tools/dcc/build_ub_bath.py` | Optional Blender boolean tub + packed maps |
| `public/models/hero/ub-bath.glb` | Runtime UB liner |
| `src/components/house/TubDisplay.tsx` | Water / click mixer / push-button + `useGLTF` |

---

## Quality gate (ship / no-ship)

Ship only if **all** are true:

1. Tests green (`test:basin`, `tsc`)
2. Inner surface is a **continuous cavity** (highlight can travel)
3. Outer still reads as a rectangular vessel (photo: `docs/S__112345090.jpg`)
4. First-person at `?pose=senmen` does **not** read as 白長方體
5. Plan room box unchanged

If (4) fails: change the **profile / bake**, do not stack another box. Re-run the loop. Do not ping the owner for modeling help.
