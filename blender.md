# blender.md — 現行策略：Vite／R3F 主體 + 英雄道具 GLB

最後更新：2026-09-28（R3F 預設；英雄 overlay：玄關大門 + UB Type-M + kitchen + Piara + Amage toilet + 2F 洗手 + Standard Label 室內門）

本文件是 [japanese-house-3d](https://github.com/neojou/japanese-house-3d) 的視覺升級規範。  
**Grok Build 必須遵守本檔「現行策略」，不要再整棟用 GLB 換掉 R3F 牆與門。**

開始前必讀：本檔、`src/data/dimensions.ts`、`DESIGN.md`、`AGENTS.md`。尺寸衝突以 `dimensions.ts` 為準。

---

## 0. 現行策略（必讀）

第一次整棟 GLB 換皮已驗證：**擠盒 + bevel 的 house.glb 在網頁上大門／牆壁往往比原本 R3F 差**（材質與光影被 glTF 預設蓋掉）；KMP Desktop 自畫三角也無法修好走路。

因此改為：

| 做 | 不做 |
|----|------|
| 牆、樓板、天花、樓梯、大多數門：**保留並加強現有 R3F**（`houseMaterials.ts`、燈光、ACES） | 不要讓 `HouseGltf` 預設取代整棟結構 |
| Blender 只做**少數英雄道具** GLB（近看會輸的物件） | 不要再匯出整棟 `house.glb` 當主場景 |
| **保留既有 Blender／bpy／glb 檔**，可之後用 Blender 開啟 | 不要刪 `tools/dcc/`、`.blend`、舊 `house.glb` |
| KMP 維持平行實驗，**本輪不接 Filament、不改走路** | 不要為品質去動 `./gradlew :composeApp:run` 的移動邏輯 |

英雄道具優先順序（有尺寸與 DESIGN.md 依據才做，沒有就跳過）：

1. 玄關大門＋門框（Giesta 2 inspired）— **done** `public/models/hero/genkan-door.glb`  
2. 1F UB Type-M 內襯＋エプロン浴槽 — **done** `public/models/hero/ub-bath.glb`  
3. 1F LDK Noct 壁付 I 型 — **done** `public/models/hero/kitchen-noct.glb`  
4. 1F 洗面 Piara-inspired 75 cm 化粧台＋3面鏡 — **done** `public/models/hero/senmen-piara.glb`  
5. 1F/2F Amage シャワートイレ inspired 坐便 — **done** `public/models/hero/amage-toilet.glb`  
6. 2F 壁掛洗手櫃（どこでも手洗 inspired）— **done** `public/models/hero/dokodemo-wash.glb`  
7. 室內門 Standard Label inspired（LD／PA／DC／TA／PH）— **done** `public/models/hero/standard-label-doors.glb`  
8. tokonoma-card 其他近看物件（senmen basin 仍在 `public/props/`）

結構網格繼續用 R3F；GLB 當 overlay，對齊同一套公尺座標與既有 X 鏡像。

---

## 1. 專案現況

| 軌道 | 路徑 | 本輪角色 |
|------|------|----------|
| 主產品 | Vite + React 19 + R3F + drei + three | **唯一要加強的顯示路徑** |
| KMP | `shared/` + `composeApp/` | 不動走路；不接 Filament；舊 glb 資源可留著 |

- 原點西南角；+X 東、+Z 北、+Y 上；顯示有 X 鏡像  
- 1F 樓板 Y = 0.50 m；玄關階 0.25 m × 2；尺寸不得改  

---

## 2. 既有 Blender 資產（必須保留）

本輪**禁止刪除或覆寫到無法用 Blender 重開**的檔案。若要改腳本，另存新檔或加參數，不要清掉舊版。

請搜尋並保留（有就留，沒有不捏造）：

- `tools/dcc/**`（含 `build_house.py`）
- `*.blend` / `*.blend1`
- `public/models/house.glb` 以及任何 `house_1f.glb` 等
- KMP 資源裡複製過的同一份 glb

建議：

- 舊整棟 glb 改名歸檔，例如 `public/models/archive/house-full-box-bevel.glb`
- 新英雄道具用獨立檔名：`public/models/hero/genkan-door.glb`、`public/models/hero/ub-bath.glb` 等
- `build_house.py` 可留作之後在 Blender 重開／重匯出整棟的來源，本輪不要用它覆蓋主場景

Vite 預設場景：**R3F 結構 + 英雄 GLB overlay**。可用 query 或旗標預覽舊整棟 glb，預設關閉。

---

## 3. 光影分層（不要跟英雄 GLB 混成一句）

對齊 `DESIGN.md`。日光仍是主光；ACES 保留。

### A. 幾何

- 牆、樓板、天花、樓梯、大多數門：維持並加強現有 R3F。
- Blender 只做英雄 overlay（清單見 §0）。**不再設 2–3 件上限**；也不要把整棟 `house.glb` 當預設。
- 舊 `.blend` / bpy / glb 只歸檔不刪。

### B. PBR（R3F 與英雄 GLB 同一套物理）

- 灰泥、燒杉、木材：`MeshStandard`，metallic 接近 0，靠 roughness + normal 去掉塑膠感。
- 電介質不要填 metallic 0.3–0.6。真金屬（鉻、把手、門框鋼）用 0.75 以上。
- 建築面優先進場套 `houseMaterials`。
- 陶瓷、鉻、LED、clearcoat（廚房、洗面、馬桶、浴缸）保留 glTF metallic-roughness：嵌入貼圖、不含燈光。進場關掉 glTF lights，讓日光／玄關補光／ACES 主導。
- 色空間：baseColor／emissive = sRGB；roughness／metalness／normal／AO = linear。

### C. HDR 環境光（場景級，不是 GLB 內建）

- `drei` `<Environment>` + `public/env/house-ibl.hdr`（腳本 `scripts/build-house-ibl.mjs`）。不要用 preset CDN。
- `background={false}`。天空仍是 `LIGHTING.background`，不要換成碼頭或夕陽。
- `environmentIntensity` 從 **0.35** 起（現況曾是 0.28）。上限約 0.6。日光仍是主光。
- 調完後外牆ベルアート AC-2166、燕麥灰泥、yaki-sugi 色溫仍對齊 `DESIGN.md`。

### D. Bloom（後期，預設關）

- 不要為 Bloom 換 WebGPU，不要加 `@react-three/postprocessing`，不要升 three。
- 白天第一人稱預設關閉。`LIGHTING.bloom.enabled` 為 false；`?bloom=1` 才掛上 pass。
- **關閉時不可註冊 `useFrame` priority > 0。** R3F 只要 `internal.priority > 0` 就不再呼叫 `gl.render`，畫面會停在初始黑緩衝。
- 開的時候只用 three 內建 WebGL `EffectComposer` + `UnrealBloomPass`：高 threshold、低 strength，只讓燈具／障子 emissive 滲光。由該 priority callback 負責 `composer.render()`。
- 禁止整面牆發霧。若和 ACES 或洗面 CubeCamera 打架，保 ACES、關 Bloom。

---

## 4. 英雄 GLB 規範

- 單位公尺；軸向與房屋一致；匯出 `.glb` 嵌入貼圖  
- 物件名稱穩定，例如 `Hero_GenkanDoor`、`Hero_GenkanFrame`  
- 門扇若做成英雄道具：鉸鏈軸正確，開合仍走現有 store／點擊邏輯  
- 不要為了道具移動牆或改門洞尺寸  
- 匯出 `export_lights=False`。材質遵守 §3.B

### 驗收（`npm run dev`）

- 玄關大門與門套近看不塑膠，至少不差於純 R3F，目標優於整棟 bevel GLB。
- 金屬小零件有環境反射；灰泥仍是霧面電介質。
- 1F→2F→PH 可走、門可點、尺寸不變。
- KMP／Filament／走路邏輯不動。  

---

## 5. 本輪工作範圍（一次做完，中間不停）

1. 盤點並歸檔既有 blend／bpy／整棟 glb（保留可開）。  
2. 預設顯示改回（或維持）R3F 牆／樓板／門；整棟 `HouseGltf` 不得當預設。  
3. 加強大門與玄關附近 R3F 材質與光影。  
4. 英雄 GLB 是 overlay（清單見 §0），不是整棟換皮。新件要有尺寸與 DESIGN 依據。  
5. 確認第一人稱仍可 1F→2F→PH、門可點、HUD 公尺不變。  
6. **不要**接 Filament、不要修 KMP 走路、不要上 Unreal／Twinmotion、不要引入 Next.js。  

結束時只交一份說明：改了哪些檔、舊資產新路徑、如何 `npm run dev`、英雄道具清單、未做項。

---

## 6. 明確不要做的事

- 不要整棟 GLB 換皮當預設  
- 不要刪 Blender 檔、bpy、舊 house.glb  
- 不要改 dimensions／樓梯幾何／樓高  
- 不要為網頁品質去改 Gradle 行走  
- 不要中途停下來等人確認  

---

## 7. 使用者驗收（agent 做完後由人執行）

```bash
npm run dev
# http://localhost:5173/japanese-house-3d/
```

對照：玄關大門與牆應至少不差於、目標是優於整棟 GLB 換皮那一版；舊 Blender 資產仍在 repo 裡。

KMP `./gradlew :composeApp:run` 本輪不作為驗收項。

---

## 8. Grok Build 指令（整段複製）

在 `japanese-house-3d` 專案根目錄貼給 Grok Build：

```text
讀取並嚴格遵守 blender.md（docs/blender.md 或根目錄）、src/data/dimensions.ts、DESIGN.md、AGENTS.md，以及現有 house / materials / lights / door / player 原始碼。

現行策略（不要再用整棟 house.glb 換掉 R3F 結構）：
- 主體留在 Vite + React Three Fiber：加強材質與光影（對齊 DESIGN.md）。
- Blender 只做少數英雄道具 GLB overlay（優先玄關大門／門框／燒杉），牆、樓板、樓梯、大多數門繼續用現有 R3F。
- 既有 Blender 檔、tools/dcc、舊 house.glb 全部保留，必要時改名歸檔到 public/models/archive/，我之後還要用 Blender 開啟。禁止刪除。
- 本輪不要接 Filament、不要改 KMP 走路、不要動 ./gradlew :composeApp:run 的移動邏輯、不要 Unreal/Twinmotion、不要 Next.js。
- 尺寸、樓高、樓梯幾何完全不變。

執行模式：連續一次做完，中間不要停下來問我確認。做完只給最終交付說明，由我自行 npm run dev。

必須完成：
1. 盤點並保留／歸檔現有 .blend、bpy、house.glb。
2. 預設場景改為 R3F 結構；整棟 GLB 若仍可切換，預設關閉。
3. 加強玄關大門與附近牆壁的 R3F 材質光影（減少塑膠感，吃現有日光／玄關補光／ACES）。
4. 若能產出英雄 GLB：獨立檔名放 public/models/hero/，用 useGLTF overlay，開合仍走現有門 store。沒有 Blender CLI 就留下腳本與路徑約定，不要覆蓋舊資產。
5. 確認仍可走 1F→2F→PH、門可點。

完成後列出：變更檔案、舊資產新路徑、npm run dev 方式、英雄道具清單、已知限制。現在直接做到結束。
```

---

## 附錄：已放棄的整棟換皮（僅供背景）

先前 Phase A–C 曾要求整棟 glb + KMP 載入 + 門對齊。實測：GLB 仍是 dimensions 擠盒 + bevel；Vite 大門／牆可能變差；Desktop 無 Filament、自畫三角；Wasm glb 載入失敗；KMP 門不能點。  
那條路的檔案要**留著**，但不再當預設產品路徑。
