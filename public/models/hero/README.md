# Hero GLB overlays

R3F keeps walls / slabs / stairs / most doors. These files overlay **one** close-up object.

| File | Object names | Role |
|------|----------------|------|
| `genkan-door.glb` | `Hero_GenkanDoor*`, `Hero_GenkanFrame*`, glass, handles | 玄關大門 — Giesta 2 防火戸 *inspired*（無商標）。鉸鏈西、把手東；扇 +X；外 −Z |
| `ub-bath.glb` | `Hero_Ub*` | 1F UB Type-M 內襯＋エプロン浴槽 |
| `kitchen-noct.glb` | `Hero_KitchenNoct`, `Drawer_Sink_*` | LDK 壁付 I 型 |
| `senmen-piara.glb` | `Hero_SenmenPiara`, `Drawer_L*`, `CabDoor_R`, `MirrorDoor_*` | 1F 洗面 75 cm 化粧台＋3面鏡 *inspired*（無商標） |
| `amage-toilet.glb` | `Hero_AmageToilet`, `Lid`, `Seat` | 1F/2F 坐便 シャワートイレ *inspired*（無商標）。點擊掀蓋 |
| `dokodemo-wash.glb` | `Hero_DokodemoWash`, `Hero_DokodemoBowl`, `Hero_DokodemoFaucet_*` | 2F 壁掛洗手櫃 *inspired*（無商標）。點龍頭出水 |
| `standard-label-doors.glb` | `Leaf_LD`, `Leaf_PA`, `Leaf_DC`, `Leaf_TA`, `Leaf_PH` | 室內門 Standard Label *inspired*（無商標）。グレージュオーク。+X 執手側、−X 鉸鏈 |

Bake:

```bash
npm run bake:genkan-door
npm run bake:senmen-piara
npm run bake:amage-toilet
npm run bake:dokodemo-wash
npm run bake:standard-label-doors
```

Runtime keeps baked PBR (glass → MeshPhysical). Open/close: `useViewerStore` id `genkan`. Opens toward parking (西南) **85°**. Reference: `docs/refs/images/main_door.jpg`, LIXIL ジエスタ2（造型參考，不貼品牌）。
