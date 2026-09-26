# 1F 洗面 vanity — Piara-inspired Path B

Reference photos: `docs/refs/images/washing-1.jpg` (assembled), `washing-2.jpg` (ミラーキャビネット MAR3-753TXJU), `washing-3.jpg` (化粧台本体 AR3H-755SY / VP1H).  
Catalog: https://www.lixil.co.jp/lineup/powderroom/piara/  
**No trademarks on the mesh.** Plan walls **locked**.  
Ethos: [`DESIGN.md`](../DESIGN.md) §1 · Path B bake: [`cinematic-path-b.md`](./cinematic-path-b.md)

---

## 1F (this hang-point)

75 cm white 引出化粧台 + 3-panel full-storage mirror cabinet, inspired by AR3H-755SY + MAR3-753TXJU.

```
[ 3 mirror leaves, CubeCamera glass, slim LED ]
        │ click to swing; storage + trays inside
        ▼
[ ceramic backsplash + wall mixer ]
        │ click faucet → stream
        ▼
[ ひろびろ bowl + left drain-board slats ]
        ▼
[ left two drawers / right door + inner cup ]
```

| Layer | Ship rule |
|-------|-----------|
| Body | W **0.75** × D **0.50** × bowl **0.80** / overall **1.90**. White VP1H-like laminate. |
| Bowl | Boolean ceramic cavity (Path B). Drain-board slats on the left. |
| Storage | Drawers pull **−Z** (into the room). Right door hinge east, swing **−Y**. |
| Mirror | Three leaves **0.158** deep, **0.95** tall. L/C hinge west (**+Y**), R hinge east (**−Y**). |
| Glass | Same CubeCamera contract as before: probe in plan space under `plan-mirror`; indoor cube fallback; no planar FBO. |
| Brands | No LIXIL / ピアラ / logos. |

Runtime: `SenmenPiara.tsx` + `public/models/hero/senmen-piara.glb`.  
West rattan basket and east washer stay in `SenmenDisplay.tsx`.

---

## 2F wash (unchanged)

`Wash2FDisplay` still reuses `PROP_1F_SENMEN.vanity` + `SenmenVanity.tsx` (Path B porcelain vessel on a hollow pale-hinoki cabinet, click doors, P-trap). Do **not** change `vanity.w/d/h/vessel` when editing the 1F Piara block.

---

## Agent commands

```bash
npm run bake:senmen-piara
npm run test:senmen-piara
npm run test:mirror
npx tsc --noEmit
# /japanese-house-3d/?pose=senmen
# /japanese-house-3d/?pose=senmen-cab&cabOpen=1
# /japanese-house-3d/?pose=senmen&mirrorOpen=1
```

2F basin (separate asset):

```bash
npm run bake:senmen-basin
npm run test:basin
```

Do not change `SENMEN_1F` / UB. Do not add CSG or physics libraries.
