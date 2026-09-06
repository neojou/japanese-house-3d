# Hero GLB overlays

R3F keeps walls / slabs / stairs / most doors. These files overlay **one** close-up object.

| File | Object names | Role |
|------|----------------|------|
| `genkan-door.glb` | `Hero_GenkanDoor`, `Hero_GenkanFrame` | 玄關大門扇＋門框（鉸鏈在原點） |

Bake:

```bash
npm run bake:genkan-door
```

Meters; +X east of hinge is unused (leaf extends **−X**); +Y up; exterior face **−Z**. Runtime applies `createYakiSugiMaterial` (glTF materials discarded). Open/close: `useViewerStore` id `genkan`.
