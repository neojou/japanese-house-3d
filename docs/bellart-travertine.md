# Exterior coating — Bell Art トラバーチン AC-2166

Product: [SK Kaken Bell Art](https://www.sk-kaken.co.jp/product/exterior-finish-materials/bellart/) (ベルアート).  
Pattern: **トラバーチン**. Color: **AC-2166**. Measured sRGB **`#8e7363`**.  
Swatch: `docs/refs/images/outlook-paint-1.jpg`. Building read: `docs/refs/images/outlook-paint-2.jpg`.  
**No brand marks on the meshes.** Ethos: [`DESIGN.md`](../DESIGN.md) §2.2–2.4.

The finish is a matte acrylic decorative coating: fine sand and broken horizontal fissures. The shipped tile keeps the swatch's own stratification. Metalness is 0.

---

## Where it goes

| Surface | Coating |
|---------|---------|
| Exterior walls, parapets, `ph-balc-*`, `ph-hall-*` shells | Bell Art, via `wallFinishForId` → `stucco` |
| 2F balcony soffit and fascia (`BalconyExterior`) | Same maps, `createStuccoMaterial(spanU, spanV)` |
| Yaki-sugi hang-points (`YAKI_SUGI_WALL_IDS`) | Stay yaki |
| Roofs | Stay `#6a6560` / `#5c5854` |
| Interior walls and ceilings | Stay oat `#f7f2e8` |
| Glass, genkan door, interior doors | Stay as they are |

`COLORS.wallExterior` and `COLORS.balconySoffit` are `#8e7363` for flat fallbacks and the archived house bake. The live material multiplies by **`#ffffff`** (`FAÇADE.stuccoTint`), because the albedo file is already AC-2166.

---

## Maps

`public/textures/bellart-travertine/`

| File | Space | Size |
|------|-------|------|
| `albedo.jpg` | sRGB, JPEG 4:4:4 | 1064×1511 |
| `normal.png` | Non-Color, tangent-space | 1064×1511 |
| `roughness.jpg` | Non-Color, 艶消し | 1064×1511 |
| `meta.json` | tile, hex, product | — |

One tile is **0.50 m × 0.7101 m** (`FAÇADE.stuccoTileU` / `stuccoTileV`). That keeps the pixels square: 1064 / 0.50 = 1511 / 0.7101. Walls use the long plan edge and the height. A horizontal soffit passes its two plan spans into `createStuccoMaterial`.

Runtime: roughness **1** with the roughness map (center about **0.93**, pits rougher, range about 0.86–0.98), metalness **0**, `envMapIntensity` **0.10**, `normalScale` **0.85**. Scene exposure stays **1.12**.

`preloadFaçadeTextures` loads the three files before the scene mounts. If a file fails, `surfaceTextures.ts` builds a taupe grit of the same median so the shell does not fall back to ivory.

---

## Bake

```
npm run bake:bellart
npm run test:bellart
```

Baker: `tools/dcc/build_bellart_travertine.py` (Blender, or Pillow if that import exists).

```
blender --background --python tools/dcc/build_bellart_travertine.py -- \
  --src docs/refs/images/outlook-paint-1.jpg \
  --out public/textures/bellart-travertine
```

The tile is the swatch with an 8 px crop. A periodic-plus-smooth step removes the border discontinuity, the residual seam is rolled to the center, and a ragged copy covers that cross. The mean is then shifted onto `#8e7363` without compressing the local contrast. A straight min-cut or a quilted grid reads as panels; do not replace this pipeline with one.
