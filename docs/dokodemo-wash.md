# 2F wash — wall counter Path B

Reference photo: `docs/refs/images/washing2-1.jpg`  
Install sheet: https://iinavi.inax.lixil.co.jp/pdf/torikousetsu/gmb-0559-20030.pdf  
**No trademarks on the mesh.** East wall of the south bay, facing west. South of the bay stays open.  
Ethos: [`DESIGN.md`](../DESIGN.md) §1 · Path B: [`cinematic-path-b.md`](./cinematic-path-b.md)

---

## Fixture

600 mm wall counter inspired by SMA-300NT (600) with a tall single-lever (LF-SR20 inspired).

| Part | Size |
|------|------|
| Counter | W **0.60** × D **0.35** × t **0.030**, top **0.78** above the floor |
| Vessel | Round bowl sitting on the deck (boolean cavity) |
| Mixer | Tall chrome body, spout toward the bowl, top lever |
| Waste | Exposed bottle trap under the bowl, arm to the wall |
| Supply | Wall stop + rise to the mixer |
| Mirror | Slim framed pane above the counter. It samples the scene HDR. Not a CubeCamera. |

GLB local space: front edge at z=0, wall at z=0.35, floor y=0. The display rotates +π/2 so +Z meets the east wall.

Wood is a dielectric. Chrome is metalness 1 so the house IBL (`house-ibl.hdr`) shows on the mixer and trap. Click the mixer for a short stream. No `useFrame` priority above 0.

---

## Agent commands

```bash
npm run bake:dokodemo-wash
npm run test:dokodemo-wash
npx tsc --noEmit
# /japanese-house-3d/?pose=wash2f
```

Do not change `WASH_2F` walls. Do not add a post-processing package.
