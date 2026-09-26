# 1F / 2F sit toilet — Amage-inspired Path B

Reference photo: `docs/refs/images/toilet-1.jpg`  
Catalog: https://www.lixil.co.jp/lineup/toiletroom/amage_z_s/  
**No trademarks on the mesh.** Plan walls **locked**. Placement: west half, sit +X (tank west, bowl east).  
Ethos: [`DESIGN.md`](../DESIGN.md) §1 · Path B bake: [`cinematic-path-b.md`](./cinematic-path-b.md)

---

## Fixture

Skirted one-piece シャワートイレ with tank-top 手洗い (Z-grade 手洗付 catalog ~ **416 × 764 × 1005 mm** to the faucet).

```
[ wall remote / paper / ring ]
        │
[ 手洗い basin + small chrome spout ]
        │
[ washlet lid  — click, ~110° toward tank ]
[ washlet seat — click after lid is up ]
        │
[ skirted ceramic bowl, inner pool ]
```

| Layer | Ship rule |
|-------|-----------|
| Envelope | W **0.416** × D **0.76**. Sit **0.40**. 手洗い rim **0.80**. Shared `SIT_TOILET`. |
| Bowl | Boolean ceramic cavity (Path B). 足元スリム skirt. |
| Lid / seat | Empties `Lid` / `Seat`. Damped `rotation.z`. Closing the lid also closes the seat. |
| Brands | No LIXIL / INAX / アメージュ. |
| 1F and 2F | Same GLB. Origins from `sitToiletOriginFromWallFace`. |

Runtime: `AmageToilet.tsx` + `public/models/hero/amage-toilet.glb`.  
Wood endscape and wall kit stay in `ToiletDisplay.tsx`.

---

## Agent commands

```bash
npm run bake:amage-toilet
npm run test:toilet
npx tsc --noEmit
# /japanese-house-3d/?pose=toilet
# /japanese-house-3d/?pose=toilet2f&lidOpen=1
```

Do not change `TOILET_1F` / `TOILET_2F` room boxes. Do not add CSG or physics libraries.
