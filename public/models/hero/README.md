# Hero GLB overlays

R3F keeps walls / slabs / stairs / most doors. These files overlay **one** close-up object.

| File | Object names | Role |
|------|----------------|------|
| `genkan-door.glb` | `Hero_GenkanDoor*`, `Hero_GenkanFrame*`, glass, handles | 玄關大門 — Giesta 2 防火戸 *inspired*（無商標）。鉸鏈西、把手東；扇 +X；外 −Z |

Bake:

```bash
npm run bake:genkan-door
```

Runtime keeps baked PBR (glass → MeshPhysical). Open/close: `useViewerStore` id `genkan`. Opens toward parking (西南) **85°**. Reference: `docs/refs/images/main_door.jpg`, LIXIL ジエスタ2（造型參考，不貼品牌）。
