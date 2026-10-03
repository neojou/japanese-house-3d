# 1F UB east window — 目隠し可動ルーバー

Catalog: https://products.biz-lixil.com/products/CSSERESDET_777489  
Product still: [`docs/refs/images/window-lixil-shine-grey.jpg`](./refs/images/window-lixil-shine-grey.jpg) (シャイングレー)  
Bathroom read: [`docs/refs/images/window-1.jpg`](./refs/images/window-1.jpg) (全開内観 / 全閉外観)  
**No trademarks on the mesh.** Ethos: [`DESIGN.md`](../DESIGN.md) §1 · Path B: [`cinematic-path-b.md`](./cinematic-path-b.md)

LIXIL 目隠し可動ルーバー *inspired*. Satin aluminium シャイングレー, rounded barrel blades, interior 引き違い sash, operator on the south jamb (内観右側 when looking east). Metalness ~0.92 so the scene HDR (`house-ibl.hdr`, intensity 0.35) rakes the extrusion grain. No lights in the file.

---

## Layout

Opening stays **W1200 × H1200 特注** (`UB_EAST_WINDOW`) above the Type-M apron. Plan walls unchanged.

| Piece | Spec |
|-------|------|
| Opening | East wall `1f-win-ub-e`, sill 1.34, fromStart 0.125 from UB south |
| Sash | Aluminium 引き違い, two lights, centre mullion, clear glass |
| Grille | 20 mm larger each side so the frame sits on the stucco |
| Blades | 16 oval barrels, pitch ~70 mm, closed 8° rain-shed, open 88° |
| Operator | Interior south jamb. Slide up as the blades open |
| Default | Closed (bathroom privacy) |

Click the blades, frame, or lever to toggle. `?pose=ub-window` (inside) · `?pose=ub-window-out` (east yard) · `?louver=open`

Generic `WindowPanel` for `1f-win-ub-e` is skipped. The Type-M liner keeps the cream tile reveal; its white mullion is hidden.

---

## Bake

```
npm run bake:ub-louver
npm run test:ub-louver
```

Baker: `tools/dcc/build_ub_louver.py` → `public/models/hero/ub-louver.glb`  
Runtime: `src/components/house/UbLouver.tsx`
