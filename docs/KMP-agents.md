# KMP agents — roles, loop, status (through K2)

> Cross-role communication board. Update when a milestone gate closes.  
> Plan: `docs/KMP-plan.md` · Run: `docs/KMP.md` · Route lock: `docs/KMP-spike-notes.md`

---

## Roles (one agent session may wear several)

| Role | Owns | Must not |
|------|------|----------|
| **PM** | Scope K-S0→K2, DoD, no npm breakage | Scope creep to K3+ doors/props |
| **Architect** | Module split, render strategy (route B light) | Native GL without spike re-open |
| **Domain eng** | `shared` coords/height/player tests | Compose UI code in shared |
| **Graphics eng** | Canvas FP renderer + 1F shell boxes | Tokonoma props, mirrors |
| **QA** | `./gradlew` compile + unit tests + manual walk script | Skip Desktop verify |

---

## Engineering loop (per milestone)

```
Plan (docs) → Implement → Unit tests / compile → Critique (this file §Critique) → Fix → Gate
```

| Gate | Command / check | Status |
|------|-----------------|--------|
| K-S0 | Route B locked in spike notes | **done** (Compose Canvas soft 3D, commonMain) |
| K0 | `:shared` + `:composeApp` compile desktop+wasm | **done** |
| K1 | `./gradlew :shared:jvmTest` (or allTests) green | **done** |
| K2 | Desktop run: walk outdoor→genkan→LDK; not black; light ok | **done** (code); owner visual optional |

---

## Critique log (self cross-review)

### Architect vs Graphics
- **Chose** pure Kotlin **perspective box renderer** on Compose `Canvas` (Desktop + Wasm same code).  
- **Rejected** LWJGL/Filament for K2 (time + Wasm gap). Fits plan route **B light**: Desktop full path = this renderer; Wasm same stack (no dual engine yet).  
- **Tradeoff:** Not three.js PBR; meets K2 “recognizable massing + walkable”.

### Domain vs npm
- K1 constants are a **subset** of `dimensions.ts` (BUILDING, floors, spawn, 1F shell rects).  
- Full wall export deferred. Tests lock numbers against TS values.

### QA vs PM
- No physics/collision (matches npm). Height sampling only (slabs + grade).  
- No doors (K3). Genkan opening is a **gap** in south wall segment.

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
