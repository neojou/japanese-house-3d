# Archived full-house GLB

Kept so it can be reopened / compared. **Not** the default Vite scene.

| File | What it is |
|------|------------|
| `house-full-box-bevel.glb` | Phase A–C box-bevel house (dimensions.ts → Blender/Node). Preview: `?houseGltf=1` |

Rebuild (does not restore default scene):

```bash
npm run bake:house
```

Writes this archive path. Does not overwrite unless `FORCE_HOUSE_BAKE=1`.

KMP still has copies under `composeApp/src/*/resources/models/house.glb` (walking unchanged this round).

Sources: `tools/dcc/build_house.py`, `tools/dcc/house_geom.json`, `src/lib/houseBake.ts`.
