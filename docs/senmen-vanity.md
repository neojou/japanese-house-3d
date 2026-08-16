# 1F 洗面 vanity — cinematic Path B（已鎖定）

Reference: `docs/S__112345090.jpg` · **No trademarks** (no TOTO) · Plan walls / room box **locked**.  
Ethos: [`DESIGN.md`](../DESIGN.md) §1 **高品質、力求完美** · process: [`cinematic-path-b.md`](./cinematic-path-b.md)

---

## 1. Why the last mesh failed

`SenmenVanity` used two `ExtrudeGeometry` slabs (`geoOuter` + a smaller `geoInner`).  
The photo is **外方內弧**: thin lip, continuous glaze wall, flat floor, drain at the low point. A second brick cannot make a highlight travel. That construction is **forbidden**.

---

## 2. Locked path: 電影版 B

Author a hollow vessel as **glTF**, load it at runtime.

| Step | Who |
|------|-----|
| Profile + loft (or Blender boolean) | Agent, unattended |
| `public/props/senmen-basin/basin.glb` | Committed artifact |
| Deck, chrome legs, mixer, bottles | Still TS in `SenmenVanity.tsx` |
| Room / UB / 洗面 box | Untouched |

**A (live parametric only)** — rejected for this hero (owner chose B).  
**C (browser CSG)** — rejected (heavy, broken edges, new lib).

Blender is optional. If it is missing, `npm run bake:senmen-basin` uses the scripted DCC in `src/lib/vesselBasin.ts`. That is still B: the product is a file, not two extrudes.

---

## 3. Shape (photo)

```
側視（沿 −Z，沿口 → 盆底）

  沿口 ──┐  水平唇 ~15 mm
         ╰── 肩弧
              ╲ 斜壁（禁止 90° 直壁當內碗）
               ╰── 底角
                    ════ 平底 + 中央排水孔
```

- Outer: rounded-rect, **vertical** skirt, small bottom fillet.  
- Inner: shrinking rounded-rect loft; Y from Hermite profile.  
- Drain: last inner ring is a hole (`drainR`); chrome cover is still TS.  
- Mixer: stem at +Z (wall), spout −Z (bowl).  
- No brand decal.

Numbers live in `PROP_1F_SENMEN.vanity.vessel` **and** `SENMEN_VESSEL_SPEC` (test keeps them equal).

---

## 4. Light (no new post)

| 項 | Spec |
|----|------|
| Porcelain | roughness ~0.08–0.12, slight metalness, scene env |
| Inner | slightly deeper, so the cavity reads |
| Key | existing weak warm point — do not wash the house |
| Forbidden | SSR / planar FBO mirror (blacked the canvas) |

---

## 5. Agent commands (do not wait)

```bash
npm run bake:senmen-basin
npm run test:basin
npx tsc --noEmit
# optional visual gate
# open /japanese-house-3d/?pose=senmen
```

If the bowl looks like a box: edit the profile in `vesselBasin.ts`, re-bake, re-test. Do not ask the owner to model.

---

## 6. Explicitly not in this pass

- 洗面 / UB wall lines and room size  
- Trademarks  
- Live planar reflection  
- New runtime dependencies
