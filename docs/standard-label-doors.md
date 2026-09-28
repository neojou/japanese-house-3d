# Interior doors — Standard Label Path B

Catalog: https://sumai.panasonic.jp/interior/door/standard/  
Photos: `docs/refs/images/door-LD.jpg`, `door-PA.jpg`, `door-DC.jpg`, `door-TA.jpg`, `door-PH.jpg`  
**No trademarks on the mesh.** Greige oak (グレージュオーク) from those photos.  
Ethos: [`DESIGN.md`](../DESIGN.md) §1 · Path B: [`cinematic-path-b.md`](./cinematic-path-b.md)

---

## Leaves

One GLB, five roots. Origin at the leaf centre. +X is the free edge (lever), −X is the hinge, +Y up, +Z is the face. Runtime `scale.x` mirrors the lever onto the free edge.

| Root | Design | Operation in this house |
|------|--------|-------------------------|
| `Leaf_LD` | Wide vertical frosted acrylic | 片開き — 1F LDK (`swing-ldk-genkan`). Hinge north, handle south, 85° west. The hinge stays south of the under-stair closet door. |
| `Leaf_PA` | Flush veneer, lever | 引き戸 — 1F 西北洋室 (`slide-1f-yoshitsu-pa`). 片開き — 2F 三室. 東北室 (`swing-2f-ne`): hinge south, handle north, 85° east into the room. |
| `Leaf_DC` | Small frosted slot, upper third | 片引き — 1F 洗面 (`slide-1f-senmen-dc`), slides north on the room face |
| `Leaf_TA` | Smaller, higher frosted slot | 片開き — 1F and 2F トイレ (`swing-ta-1f`, `swing-ta-2f`) in the existing 0.7 m east passage |
| `Leaf_PH` | Flush, no lever, one panel of a pair | 折れ戸 — closets below |

Canon swing leaf **0.78 × 1.95 × 0.036**. PH panel **0.40** wide. Runtime scales X/Y to the opening. Thickness stays 36 mm.

Wood is a dielectric (metalness 0.02) with a packed vertical grain and a normal map, plus a light clearcoat so the scene HDR (`house-ibl.hdr`, intensity 0.35) rakes the veneer. The lever is chrome (metalness 1). The slot is frosted acrylic (`KHR_materials_transmission`). No lights in the file. No `useFrame` priority above 0.

## Closet bifolds

Two equal panels. The outer pin stays in the wall plane (`foldPin` / `bifoldBRel = −2α`). Open angle stops at 78° (68° on the shallow 2F 物入) so the pin does not land on the hinge.

| Id | Opening | Folds toward |
|----|---------|----------------|
| `fold-1f-scl` | SCL west passage 0.9 m | into the SCL |
| `fold-1f-ldk-mono` | LDK 物入 west face (no wall) | into the LDK — the closet is only ~0.38 m deep |
| `fold-2f-mono` | 2F 物入 east face | into the 物入 |
| `fold-2f-cl-s` | south CL east face, x 2.73–3.64, z 0–1.365 (洋室6帖). Walls on west, south, north | into the CL |
| `fold-2f-cl-n` | north CL west face, same x, z 1.365–2.73 (洋室6.5南西). Walls on east, south, north | into the CL |
| `fold-2f-ne-cl` | NE CL east face (no east wall). Hinge on the north | into the 洋室; open stack sits on the north |
| `fold-1f-stair-mono` | Under-stair 物入 south face, x 5.46–6.37, z 5.46–6.37 | into the closet (north) |

1F 洗面物入 is on the catalog sheet and is **not** a plan volume. No leaf was added there.
The under-stair closet is the bay under the winders. West wall is the stair screen, east wall is the toilet, north is the exterior wall. The floor slab is `1f-stair-mono`. The stair treads stay above it.

Café curtains stay on the toilet passages, on the room side of the TA leaf.

## Left as they were

Exterior glass sliders (LDK east / north, 洋室 west, NE balcony), UB shower screen, genkan hero door, 1F 洗面 east grid door, PH balcony door. Those are not Standard Label interior leaves.

---

## Agent commands

```bash
npm run bake:standard-label-doors
npm run test:standard-label-doors
npx tsc --noEmit
```

Do not move the plan walls to fit a leaf. Click still toggles `useViewerStore.doorOpen`.
