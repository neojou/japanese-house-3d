# K-S0 Spike notes — graphics route lock

**Date:** 2026-08-04  
**Gate:** K-S0.4 closed by implementation choice below.

## Options reviewed (§3 KMP-plan)

| ID | Verdict for K2 |
|----|----------------|
| A full custom GL abstract | Deferred — too heavy for K2 |
| **B Desktop engine + Wasm degrade** | **Selected in light form** |
| C three.js interop from Wasm | Rejected for K2 (Desktop still needs another path) |
| D data-only KMP | Useful as K1 subset, not sufficient for K2 visuals |

## Selected stack (B-light)

| Layer | Choice |
|-------|--------|
| UI shell | Compose Multiplatform (existing) |
| 3D | **Software perspective mesh** in `commonMain` (boxes → projected quads on `Canvas`) |
| Domain | `shared` pure Kotlin (coords, height, player, shell dims) |
| Desktop | Same renderer + keyboard/mouse |
| Wasm | Same renderer + keyboard (touch later K7) |

**Why:** One codebase for Desktop + Wasm; no native GL binding risk; unit-testable domain; enough for “walk 1F shell” demo.

**Not selected:** LWJGL/OpenGL desktop-only for K2 (would re-open Wasm spike).

## Spike DoD

- [x] Empty-ish scene + FP control + ground  
- [x] Route locked in this file  
- [x] Documents linked from KMP-plan / agents board  

## Follow-up (post-K2)

If software renderer hits performance or quality ceiling, re-open spike for Desktop LWJGL/Filament **without** blocking K3 geometry data work.

## K-S1 — Korender (2026-10)

| Choice | Reason |
|--------|--------|
| **Korender 0.7.0** | Compose-embedded OpenGL (Desktop) and WebGL2 (Wasm). PBR, shadow cascades, glTF `Model`. Apache-2.0. macOS needs the repo patch in `tools/kmp/patch-korender-desktop.py` (4.1 core, `#version 410`); the published jar asks for 3.3 compatibility and Apple falls back to 2.1. |
| Filament | Still forbidden. |
| SoftRenderer | Kept in tree. Not the live path. |

Kotlin is **2.4.20** and Compose Multiplatform **1.12.1**, because Korender 0.7 metadata requires Kotlin 2.4. Gradle stays on the repo wrapper.

Scene data is one-way: `node tools/kmp/export-spec.mjs` reads the Vite modules and writes `HouseSpec.kt`. The renderer does not X-mirror. Camera yaw 0 looks +Z. Spawn yaw stays 0.
