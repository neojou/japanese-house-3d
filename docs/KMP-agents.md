# KMP agents — roles, loop, status

> Cross-role communication board. Update when a milestone gate closes.  
> Plan: `docs/KMP-plan.md` · Run: `docs/KMP.md` · Route lock: `docs/KMP-spike-notes.md`

---

## Roles (one agent session may wear several)

| Role | Owns | Must not |
|------|------|----------|
| **PM** | KMP scope, no npm breakage | Filament, interactive doors, replacing the SPA |
| **Architect** | Korender scene + generated `HouseSpec` | A second hand-written size table |
| **Domain eng** | `shared` height/player tests against npm samples | Compose UI code in shared |
| **Graphics eng** | Korender house, lights, static heroes | Physics, bloom, mirror FBO |
| **QA** | `./gradlew` compile + unit tests + desktop smoke | Skip Desktop verify |

---

## Engineering loop (per milestone)

```
Plan (docs) → Implement → Unit tests / compile → Critique (this file §Critique) → Fix → Gate
```

| Gate | Command / check | Status |
|------|-----------------|--------|
| K-S0 | Route B locked in spike notes | **done** (superseded by K-S1) |
| K-S1 | Korender 0.7 on Desktop + Wasm | **done** (see spike notes) |
| K1 | `./gradlew :shared:jvmTest` matches npm height samples | **done** with `HouseSpec` |
| K2 | Walk outdoor→genkan→LDK | **done** on the Korender scene |
| K3–K8 | Partitions, stairs, roofs, lights, HUD, static heroes | **done** in the exporter + Korender scene |

---

## Critique log (self cross-review)

### Architect vs Graphics
- **Chose** Korender 0.7 for Desktop OpenGL and Wasm WebGL2.  
- **Rejected** Filament. `SoftRenderer` stays unused.  
- **Tradeoff:** GPU PBR and stable shadows, not a pixel copy of three.js. Shed roofs are stacked boxes. Interior doors are closed boxes, not the multi-leaf GLB.

### Domain vs npm
- `tools/kmp/export-spec.mjs` writes `HouseSpec`. Tests compare `Height.groundY` to samples taken from the TypeScript function.

### QA vs PM
- No physics/collision (matches npm). Height sampling only (slabs + grade).  
- No doors (K3). Genkan opening is a **gap** in south wall segment.
- **2026-10-06:** Apple M4 desktop context is `4.1 Metal`. Front-buffer grabs show the south façade, genkan door, LDK kitchen, and UB bath. `:shared:jvmTest` and `:composeApp:compileKotlinWasmJs` succeeded. `npm run dev` answered 200 at `/japanese-house-3d/` on `[::1]:5173`. Wasm was not opened in a browser. Keyboard walk was not re-driven; poses used `debugTeleport`.

---

## Manual walk script (K2)

1. `./gradlew :composeApp:run`  
2. Spawn south of genkan; ground under feet.  
3. W toward door; enter raised floor (~0.5 m).  
4. Look left (LDK) / right (wet side); walls visible, not black.  
5. A/D turn; mouse drag pitch/yaw if desktop.  
6. HUD shows plan X/Z and eye Y.

Wasm: `./gradlew :composeApp:wasmJsBrowserDevelopmentRun` — same keys if focus on canvas.

---

## Next after K2

See `docs/KMP-plan.md` → **K3** (partitions + genkan door). Do not start K8 props before K3–K5 unless owner overrides.
