# KMP 重現 Three.js 導覽 — 產品／里程碑計畫（僅規劃，不實作）

> **角色：** PM / 架構規劃  
> **目標：** 說明若要以 **Kotlin Multiplatform（Desktop + Wasm）** 達到目前 **npm + Vite + React + R3F/three.js** 日本住宅 3D 導覽的**同等產品效果**，應如何切 milestone、風險與決策門檻。  
> **現況：** `composeApp` 僅 Hello World（見 `docs/KMP.md`）。npm 仍是可玩的產品真相來源（`TASKS.md` M0–M8）。  
> **本文件不授權改寫 npm 主路徑**；KMP 為**平行軌道**，直到明確「切主產品」決策。

---

## 1. 產品對齊：什麼叫「同等效果」

以現有 SPA 為 **Acceptance 基準**（摘要自 `README.md` / `TASKS.md` / `DESIGN.md`）：

| 能力域 | 現況（npm） | KMP 對等定義（DoD 層級） |
|--------|-------------|---------------------------|
| **P0 導覽核心** | 第一人稱行走；W/S 前後；A/D 轉向；指標鎖／觸控看；座標 HUD | 相同控制語意；公尺制；可進玄關、上樓、進主要房間 |
| **P0 幾何** | 1F/2F/PH 牆地板樓梯井、開口與 `dimensions.ts` 對齊 | 同 plan 座標與高度取樣規則（`height.ts` 語意） |
| **P0 互動** | 點門開合、raycast 優先於 lock | 同等門行為（可不先做所有門） |
| **P1 光照材質** | 日光、室內 fill、象牙 stucco、yaki-sugi 掛點 | 可讀的暖白建築感；掛點清單可分期 |
| **P1 HUD / 手機** | 座標、D-pad、desktop 說明 | Desktop 必做；手機／Wasm 觸控分期 |
| **P2 道具** | tokonoma-card 英雄物（SCL、洗面、浴、廚等） | 分批移植；品質條仍遵 `DESIGN.md` §2.7 |
| **P2 部署** | 靜態 `dist/` → GitHub Pages | Wasm 靜態產物或 Desktop 發佈二選一／並行 |
| **P3 進階** | 鏡子 FBO、後處理等 | **明確非 Day-1**；npm 上亦未完全穩定 |

**刻意不對等（除非另開專案）：**

- 與 three.js **API 1:1** 相容  
- 同一套 R3F 元件樹  
- 自動把 `dimensions.ts` 編譯成 Kotlin（可後期 codegen，非 M1 必須）

---

## 2. 為何這是大工程（PM 風險摘要）

| 風險 | 說明 | 影響 |
|------|------|------|
| **渲染後端分裂** | Desktop（JVM GL/Vulkan/Metal）與 Wasm（WebGL/WebGPU）沒有與 three.js 同等的「現成 R3F 生態」 | 共用 `commonMain` 的是**場景資料與模擬**，不是現成 mesh 元件 |
| **資料體量** | `dimensions.ts` + 大量 `house/*` 網格與程序紋理 | 移植成本 ≈ 重做 M0–M8 的幾何工作量（可加速但無法「免費」） |
| **雙軌維護** | npm 繼續改、KMP 若同步追 | 需定「資料單源」與凍結窗口，否則永遠追不上 |
| **Wasm 效能** | 全屋 + 陰影 + 程序貼圖在 Wasm 上可能需降級 | 每 milestone 要有「Desktop 完整 / Wasm 可降」策略 |
| **鏡子／FBO** | npm 已踩坑（見 `Architecture.md`、`docs/mirror-improve.md`） | KMP 上同樣屬後期；勿綁進早期里程碑 |

**結論：** 這不是「把 three 換 lib」的 sprint，而是 **產品重製 + 跨平台圖形架構**。必須用 **可交付切片** 證明價值，再加深。

---

## 3. 技術路線選擇（決策門檻，先選再大幹）

在寫大量場景前，必須做 **Spike（K-S0）** 並選定主線：

| 方案 | 概念 | 優點 | 缺點 | 建議 |
|------|------|------|------|------|
| **A. 共用領域 + 自研/薄 WebGL 抽象** | `commonMain`：座標、height、牆資料；`expect/actual` 畫 mesh | 最「KMP 純」；Desktop/Wasm 對稱 | 實作量最大 | 長期目標架構 |
| **B. Desktop 完整引擎 + Wasm 降級／延後** | Desktop 用成熟 JVM 3D（如 LWJGL/Filament 綁定等，Spike 選定）；Wasm 先 2.5D 或簡模 | 較快看到「可走的家」 | 雙平台體驗落差 | **務實首選** |
| **C. Wasm 綁 three.js（JS interop）** | Kotlin/Wasm 或 JS 目標呼叫 three | 最快視覺接近 npm | 非純 common 圖形；Desktop 另解 | 僅當「先要瀏覽器像」優先 |
| **D. 只做資料／工具鏈 KMP** | 把 dims、height、驗證搬到 common；渲染仍 npm | 風險低、可立刻有單元測試價值 | **達不到**「KMP 呈現同等效果」 | 可作 **K1 的副產物**，不是終局 |

**PM 建議預設：**  
**K-S0 驗證後走 B（Desktop 可走 1F 殼 → 再 Wasm）**，同時 K1 建立 **common 資料模組** 讓兩端（甚至未來回寫 npm）共用規則。  
C 僅在「Wasm 必須先看起來像 three」時啟用，且要接受架構債。

> **未在 K-S0 選定前，不開大規模牆體移植任務。**

---

## 4. 倉庫與產品策略（與 npm 共存）

```
japanese-house-3d/
├── src/ … package.json …     # 產品軌道 A：npm SPA（現行上線路徑）
├── composeApp/ … gradlew …   # 產品軌道 B：KMP（平行）
├── docs/KMP.md               # 怎麼跑 Hello World
└── docs/KMP-plan.md          # 本計畫
```

| 原則 | 說明 |
|------|------|
| **資料單源目標** | 長期：plan 尺寸與 walk 規則一份（Kotlin common 或 JSON/codegen）；短期允許 KMP 手動同步 `dimensions` 子集 |
| **npm 不阻塞** | KMP milestone 失敗不得要求改壞 SPA |
| **版本敘事** | SPA = `v` 產品；KMP = `kmp-0.x` 實驗，直到 Gate「主產品切換」 |
| **DoD 雙重** | 每 K-milestone：Gradle 編譯（desktop±wasm）+ 手動驗收清單 + 盡量單元測試（height、座標） |

---

## 5. 里程碑總覽（建議）

對齊 npm 的 M0–M9 **產品能力**，但 **重新編號 K-*** 以免與 `TASKS.md` 混淆。

| ID | 名稱 | 目標（一句話） | 粗估量級* | 依賴 |
|----|------|----------------|-----------|------|
| **K-S0** | 圖形 Spike + 路線鎖定 | 選定 Desktop/Wasm 渲染方案並跑通旋轉立方體 + 第一人稱空場景 | S | 現有 Hello World |
| **K0** | 工程骨架 | 模組切分、CI 編譯、與 npm 目錄邊界文件化 | S | K-S0 |
| **K1** | 共用領域核心 | Plan 座標、spawn、height 取樣、單元測試 | M | K0 |
| **K2** | 最小可玩 1F 殼 | 戶外→玄關→LDK 簡牆＋地板；行走＋轉向＋看 | L | K1 |
| **K3** | 1F 完整殼 + 門 | 對齊 1F 主要隔間與至少玄關門互動 | L | K2 |
| **K4** | 樓梯 + 2F 殼 | 可上 2F；井與出口橋語意正確 | L | K3 |
| **K5** | PH + 全樓可走 | 與 npm 流通線對等（無 top-down） | M–L | K4 |
| **K6** | 光照與 L1 材質 | 暖白／掛點級材質可讀 | L | K2+（可與 K4 部分並行） |
| **K7** | HUD + 輸入完整 | 座標、desktop 鍵鼠、Wasm/觸控分期 | M | K2 |
| **K8** | 道具稀疏集 | tokonoma-card 分批（先 SCL／洗面） | L | K6 |
| **K9** | 發佈 | Desktop 安裝包與／或 Wasm 靜態託管 | M | K5+K7 至少 |

\*S &lt; 1–2 週 · M 數週 · L 多週～月級（一人全職粗估；視是否外包圖形／是否 codegen）。

**並行建議：** K1 可與 K-S0 尾聲重疊；K6 材質可在 K3 殼穩定後插入，不必等 PH。

---

## 6. 各里程碑：任務切片與驗收

### K-S0 — 圖形 Spike + 路線鎖定

**目的：** 決定「怎麼畫 3D」，避免在錯誤抽象上堆整棟樓。

| Task | 內容 | DoD |
|------|------|-----|
| K-S0.1 | 調研清單：JVM 3D 選項、Wasm WebGL/WebGPU、interop three 可行性 | 1–2 頁寫入本文件附錄或 `docs/KMP-spike-notes.md` |
| K-S0.2 | Desktop：清空場景 + 第一人稱控制 + 地面網格 | `./gradlew :composeApp:run` 可繞行 |
| K-S0.3 | Wasm：同控制或降級控制的最小 3D | browser run 可動 |
| K-S0.4 | **Gate 會議**：選 A/B/C 並寫死「不選」理由 | 本文件 §3 表格打勾；再開 K0/K1 |

**不做：** 房子幾何、材質、門、道具。

---

### K0 — 工程骨架

| Task | 內容 | DoD |
|------|------|-----|
| K0.1 | 模組建議：`shared`（純 Kotlin 領域）/ `composeApp`（UI+渲染 actual） | settings 可編譯 |
| K0.2 | CI：`compileKotlinDesktop` + `compileKotlinWasmJs` | 綠 |
| K0.3 | 文件：`docs/KMP.md` 與本計畫交叉連結；**禁止** KMP 任務改壞 `src/` SPA | README 一句話 |

---

### K1 — 共用領域核心（高 ROI，建議優先）

把「房子怎麼走」從 three 抽成可測規則（與渲染無關）。

| Task | 內容 | DoD |
|------|------|-----|
| K1.1 | Plan 座標、BUILDING 寬深、floor levels 常數（手動移植子集即可） | 單元測試 |
| K1.2 | `planToWorldX` / 鏡像語意文件化 + 測試 | 與 `coords.ts` 數值對拍 |
| K1.3 | `getGroundHeight` 等價邏輯（slab + stair + maxStepUp） | 固定點測例（spawn、階梯中段、2F） |
| K1.4 | Player 狀態：位置、yaw、pitch 限制 | 純函式／狀態機測試 |

**價值：** 即使渲染未完成，已能量化「走得對不對」；未來 npm 也可選擇共用 JSON/codegen。

---

### K2 — 最小可玩 1F 殼（第一個「像產品」的里程碑）

| Task | 內容 | DoD |
|------|------|-----|
| K2.1 | 網格：外牆簡化、1F 地板、戶外地面 | 目視可辨建築體量 |
| K2.2 | 第一人稱 + K1 height | 從 spawn 走到玄關前不掉穿 |
| K2.3 | 基礎光（平行光 + ambient） | 非全黑 |
| K2.4 | Desktop 為主驗收；Wasm 可降陰影 | 兩邊都能啟動 |

**對齊 npm：** 約 M0–M1 的「能進門前」體驗，不必全南立面精度。

---

### K3 — 1F 完整殼 + 門

| Task | 內容 | DoD |
|------|------|-----|
| K3.1 | 1F 主要隔間（LDK／濕區／SCL 帶）依 plan | 對照平面圖走通 |
| K3.2 | 至少 1 扇可互動門（玄關） | 點擊／鍵開啟；不擋 walk 錯誤 |
| K3.3 | 其餘門可先靜態開口 | 文件標明 |

---

### K4 — 樓梯 + 2F

| Task | 內容 | DoD |
|------|------|-----|
| K4.1 | L 梯／井／東出口橋語意（對齊 TASKS 鎖定） | 可爬上 2F 不掉井 |
| K4.2 | 2F 樓板 + 廊 + NE 室簡殼 | 可進 NE 門口 |

---

### K5 — PH + 全樓流通

| Task | 內容 | DoD |
|------|------|-----|
| K5.1 | 2F→PH 梯與 PH 廊／露台簡模 | 走到 PH 露台 |
| K5.2 | 回歸清單：spawn→1F→2F→PH→下樓 | 手動腳本 10 分鐘 |

---

### K6 — 光照與材質（DESIGN 對齊）

| Task | 內容 | DoD |
|------|------|-----|
| K6.1 | 日光 + 室內 fill 對等（可簡化數量） | 室內可辨識 |
| K6.2 | 象牙 stucco／重點 yaki 掛點 | 對 `DESIGN.md` 抽樣 |
| K6.3 | Wasm 材質降級策略寫死 | 文件 + 可跑 |

---

### K7 — HUD 與輸入完整

| Task | 內容 | DoD |
|------|------|-----|
| K7.1 | 座標 HUD（plan X/Z/Y） | 與 height 一致 |
| K7.2 | Desktop：WASD、轉向、pointer lock 語意 | 對照 README Controls |
| K7.3 | Wasm：鍵鼠；觸控 D-pad **可**延後到 K7.b | 標狀態 |

---

### K8 — 道具（tokonoma-card 分批）

| 批次 | 建議內容 | DoD |
|------|----------|-----|
| K8.a | SCL trench + getabako 或 洗面 vignette 二選一 | 近看可辨、非「白盒堆」 |
| K8.b | 浴／廚／其他 | 同 DESIGN 品質條 |
| K8.c | 鏡子進階反射 | **獨立 spike**；不擋 K9 |

---

### K9 — 發佈

| Task | 內容 | DoD |
|------|------|-----|
| K9.1 | Desktop 發佈產物（dmg/zip 等，依平台） | 乾淨機器可開 |
| K9.2 | Wasm 靜態產物路徑與 base URL 策略 | 可託管；**可與 Pages 上 npm 站分路徑** |
| K9.3 | 主產品決策：是否取代 SPA 瀏覽器入口 | 書面 Gate |

---

## 7. 建議執行順序（第一季視角）

```text
K-S0 (選引擎)
   ↓
K0 (骨架) ──→ K1 (領域+測試) ──→ K2 (可走 1F 最小殼)  ← 第一個對外 demo
                 ↓
               K3 → K4 → K5 (樓層完整)
                 ↓
               K6 + K7 (好看 + 好操作)
                 ↓
               K8 (道具) → K9 (發佈)
```

**第一個「值得給外人看」的 Gate：** **K2 完成**（Desktop 可走 1F 殼）。  
在此之前只談工程與 spike，不談全面取代 three.js。

---

## 8. 資源與角色（示意）

| 角色 | 職責 |
|------|------|
| PM / Owner | Gate、範圍裁切、是否維持雙軌 |
| 圖形／引擎 | K-S0、渲染 actual、效能 |
| 領域／測試 | K1 height/coords；回歸腳本 |
| 內容 | 牆體資料移植、道具（K3–K8） |
| npm 維護 | SPA 繼續小步；**不與 KMP 搶同一 PR 大爆炸** |

---

## 9. 與現有文件的關係

| 文件 | 關係 |
|------|------|
| `TASKS.md` | npm 產品里程碑；KMP **不直接改其 M\*** 狀態，除非 Gate 合併 |
| `docs/KMP.md` | 如何跑目前 Hello World |
| `Architecture.md` | npm 運行時與鏡子教訓；KMP 渲染須另寫 actual 架構 |
| `DESIGN.md` | 美學仍適用於 K8/K6 |
| `docs/mirror-improve.md` | 鏡子勿納入 K2–K5 關鍵路徑 |

---

## 10. 成功指標（PM）

| 階段 | 指標 |
|------|------|
| 早期 | K-S0 選定；K1 測試綠；K2 Desktop demo 可錄影 1 分鐘 |
| 中期 | K5 流通線與 npm 對照表「可走點」≥ 90% |
| 後期 | K7 控制對等；K9 有可分享連結或安裝包 |
| 失敗可接受 | 某 milestone 超時 → **縮 Wasm 範圍** 或 **凍結道具**，不默默堆債 |

---

## 11. 明確不做（本計畫範圍外）

- 用 KMP 重寫並刪除 npm（除非 K9 Gate）  
- 在 Hello World 上直接堆整棟 `dimensions.ts`  
- 承諾與 three 像素級一致  
- 物理引擎（rapier）— 與 npm 一樣維持非目標  
- Top-down 模式 — 已取消  

---

## 12. 下一步（僅規劃建議，非本文件實作）

1. Owner 確認 **§3 路線** 傾向（建議 B）。  
2. 排程 **K-S0**（有時間盒，例如 1–2 週）。  
3. K-S0 結束開 **K0+K1** 并行。  
4. 以 **K2** 為第一個對外里程碑再評估是否加碼。

---

## 附錄 A — npm 能力 → K 里程碑對照（速查）

| npm 能力 | 最早對應 |
|----------|----------|
| 專案可跑 3D | K-S0 / K2 |
| 1F 殼 + 玄關 | K2–K3 |
| 隔間 + 門 | K3 |
| 樓梯 2F | K4 |
| PH | K5 |
| 材質燈光 | K6 |
| 控制 + HUD + 手機 | K7 |
| 家具英雄物 | K8 |
| Pages 部署 | K9（Wasm）／npm 仍可先部署 |

---

## 附錄 B — 風險登錄（活頁）

| ID | 風險 | 緩解 |
|----|------|------|
| R1 | 引擎選錯 | K-S0 時間盒 + 可丟棄原型 |
| R2 | 雙軌資料漂移 | K1 單源；定期對拍測試 |
| R3 | Wasm 效能不足 | K2 起定義降級；Desktop 保真 |
| R4 | 範圍膨脹（道具/鏡子） | P0/P1/P2 分級；鏡子獨立 |
| R5 | 無人維護 Gradle | CI 編譯門檻；文件 `docs/KMP.md` |

---

## 13. 實作狀態（更新）

| Milestone | Status | Notes |
|-----------|--------|--------|
| K-S0 | **done** | Compose Canvas soft 3D; route B-light — `docs/KMP-spike-notes.md` |
| K0 | **done** | `:shared` + `:composeApp`; npm untouched |
| K1 | **done** | coords / height / player / shell dims + `shared` jvmTest |
| K2 | **done** (code) | 1F shell boxes + FP walk; `./gradlew :composeApp:run` |
| K3+ | todo | See §6 |

*文件版本：2026-08-04 · 狀態：K2 程式完成；owner 可目視驗收 K2 腳本（`docs/KMP-agents.md`）。*
