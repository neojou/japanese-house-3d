# 1F UB — Lidea Type-M inspired unit bath

Plan walls **locked**. Style: tokonoma-card (DESIGN.md §2.7). Path B hero GLB.

**Inspired by** LIXIL リデア Mタイプ **BDUS-1616LBM-A+H** (no trademarks).  
**Visual lock:** [`docs/refs/images/bath_tank.jpg`](./refs/images/bath_tank.jpg), inner fill [`bath_tank-1.png`](./refs/images/bath_tank-1.png) / [`bath_tank-2.png`](./refs/images/bath_tank-2.png), + [Type-M BD21B](https://www.lixil.co.jp/lineup/bathroom/lidea/case/type-m/).

```
click chrome mixer  →  stream from north filler into the basin
        │
        ▼
[ landing splash on basin floor ]
        │
   button seated? ──yes── pool rises to the rim
        │                 if tap still on → spill over the **west apron**
        │                 wet hue spreads near→far until the whole UB floor
        no
        ▼
   tapered rivulet + beads run to the **basin-floor drain** → unseen waste
   floor fade uniformly (extent holds; no receding ring)
```

| Control | Action |
|---------|--------|
| Faucet | Click mixer on the south (charcoal) wall. On: stream from filler. Off: dry. |
| Drain | Click the **chrome push-button** on the **northwest deck** (photo lower-right). Press: bottom plug drops open, water drains. Press again: plug seats, water stores. The button does **not** lift out. |
| Fill | Rises only when **plugged and faucet on**. At the rim, extra water **spills over the west apron** onto the wash floor. |
| Floor | Wet **hue** on the beige anti-slip grid (not a shadow). Near first, then the whole floor. Dry = all fade together. |

`?pose=tub` · `?tubFaucet=1` · `?tubPlug=out` · `?tubFill=1`

## Layout (plan metres)

| Piece | Spec |
|-------|------|
| Room | UB 1.82×1.83 outer; interior faces `UB_BATH.x0…x1`, `z0…z1` (~1.60×1.68, 1616-class) |
| Tub | Apron against **east** wall. NS **1.20 m** (owner W1200). EW depth **0.70 m**. Rim **0.55 m**. Inner lip **40 mm** (~90% water fill). |
| Window | East TW-FIX **W1200×H1200 特注** (`UB_EAST_WINDOW`). Catalog labels that size on the **window**, not the tub height. Sits above the tub. White frame, clear glass. |
| Grab | Inner I-bar 600 mm (catalog 浴槽内握りバー), west inner wall. |
| Drain | Chrome control on **NW deck**; basin-floor plug at the south inner (opens when the button is pressed). |
| Floor | Beige anti-slip grid (洗い場). Square grate west of the tub. |
| Walls | Cream tile N/E/W; charcoal textured **south** shower wall (right of the east window). |
| Faucet | Chrome slide bar + handheld + thermostatic mixer on the south wall. |
| Ceiling | Unit-bath liner 2225 mm; two recessed downlights. |

Bake: `npm run bake:ub-bath` → `public/models/hero/ub-bath.glb`  
Verify: `npm run test:ub-bath` · `npm run test:tub`
