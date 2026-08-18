# 1F 洗面 vanity — physical wet stack

Reference bowl: `docs/S__112345090.jpg` · **No trademarks** · Plan walls **locked**.  
Ethos: [`DESIGN.md`](../DESIGN.md) §1 · Path B bake: [`cinematic-path-b.md`](./cinematic-path-b.md)

---

## Why the last version looked wrong

| Symptom | Cause |
|---------|--------|
| 側面「透明」、看見櫃頂檜木 | Vessel 是單層薄殼 + 排水孔直通；櫃子又鋪了 **整片木頂**（與盆同大），從側面看成玻璃罩蓋在木板上 |
| 櫃子像實心積木 | 門只是貼在實心 box 上，裡面沒有空腔、沒有管 |

陶瓷是 **不透明實體**。櫃子存在的理由是 **遮住排水管**，不是再墊一張桌子。

---

## Physical stack (architecture)

```
[ chrome mixer, click to toggle ]
        │ stream only while on
        ▼
[ opaque porcelain vessel ]  外殼 + 內襯 + 底面；排水是貫孔接到管子
        │ grate
        ▼
[ tailpiece → P-trap → arm ]  進北牆 (+Z)
        │
[ hollow hinoki cabinet ]     側／背／底／前上軌；無整片櫃頂
        │
[ dual hinged doors ]         點擊開關（同房屋門 interactable）
```

| Layer | Ship rule |
|-------|-----------|
| Porcelain | Not transparent. Drain does not show the cabinet lid. |
| Water | Click the mixer: on → stream + pool; off → dry. Handle damps. No solver. |
| Waste | Readable P-trap when a door is open. |
| Cabinet | Hollow. Same W×D as the vessel. |
| Doors | Damped swing **out** toward the room (−Z), not into the carcass. `userData.interactable = "door"`. |

---

## Agent commands

```bash
npm run bake:senmen-basin
npm run test:basin
npx tsc --noEmit
# /japanese-house-3d/?pose=senmen
# /japanese-house-3d/?pose=senmen-cab&cabOpen=1   # doors open → P-trap
```

Do not change `SENMEN_1F` / UB. Do not add CSG or physics libraries.
