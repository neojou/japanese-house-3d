# Kotlin Multiplatform walkthrough

Parallel to the Vite SPA. **Does not replace** `npm run dev`.

The live scene is Korender 0.7 (PBR, shadows, Bell Art, static heroes). Specs come from `tools/kmp/export-spec.mjs`, which reads the npm modules and writes `HouseSpec.kt`. Desktop loads bytes from the repo `public/` tree. Wasm copies hero GLBs and the Bell Art albedo/normal into the browser resources at build time. `SoftRenderer` remains in the tree and is not the default.

| Doc | Purpose |
|-----|---------|
| [KMP-plan.md](./KMP-plan.md) | Milestones K-S0…K9 |
| [KMP-agents.md](./KMP-agents.md) | Roles, gates, manual walk script |
| [KMP-spike-notes.md](./KMP-spike-notes.md) | Graphics route lock (B-light) |

## Layout

```
shared/          # domain: HouseSpec (generated), height, player. Sizes change only via the exporter.
composeApp/      # Korender scene, walk input, HUD. Desktop + Wasm.
tools/kmp/       # read-only exporter. Does not write src/ or public/.
```

## Requirements

- JDK **25**
- Kotlin **2.4.20**, Compose Multiplatform **1.12.1** (Korender 0.7 metadata needs Kotlin 2.4)
- Network for first Gradle/Compose fetch

## Commands

```bash
# Domain unit tests (K1)
./gradlew :shared:jvmTest

# Compile both targets
./gradlew :composeApp:compileKotlinDesktop :composeApp:compileKotlinWasmJs

# Desktop — Korender window, assets from ../public
# macOS: patchKorenderDesktop runs first and the unpatched desktop jar is
# left off the runtime classpath.
./gradlew :composeApp:run

# Wasm browser
./gradlew :composeApp:wasmJsBrowserDevelopmentRun
```

### macOS OpenGL

Korender 0.7 requests an OpenGL 3.3 compatibility profile. macOS has legacy 2.1 or core 3.2/4.1, so that request becomes 2.1 and `glBindBufferBase` aborts. `patchKorenderDesktop` copies the published desktop jar into `composeApp/build/patched/` (the Gradle cache is not written):

- null profile and major version 4, which lwjgl3-awt 0.2.4 turns into the 4.1 core pixel format
- desktop shader header `#version 410` (Apple rejects `#version 330` on a core context)
- `identity.frag` writes `fragColor` instead of `gl_FragColor`
- info-log warnings are ignored when compile and link status are already success (Apple warns that `vtex` is unread)

Wasm keeps `korender-wasm-js` and `#version 300 es`.

### Frame dumps

Optional. Feet snap to the floor. Leave the variables unset for a normal walk.

```bash
HOUSE_CAPTURE=/tmp/kmp-{name}.png \
HOUSE_POSES='genkan:7.13,-2.8,0,0;ldk:3,3,180,0' \
./gradlew :composeApp:run
```

Regenerate the spec after an npm dimension change (does not edit npm sources):

```bash
node tools/kmp/export-spec.mjs
```

### Controls

| Key / input | Action |
|-------------|--------|
| W / ↑ | Forward |
| S / ↓ | Back |
| A / ← | Turn left 10° |
| D / → | Turn right 10° |
| Drag | Look (yaw/pitch) |

HUD: plan X / Z / eye Y (top-right).

## What this build is / is not

**Is:** Full exported shell (1F, 2F, PH, stairs, winders, shed-roof slices), Bell Art triplanar stucco, yaki color, interior fills, daylight and one shadow cascade, static closed heroes, first-person walk from the genkan spawn. Doors do not open.

**Is not:** Filament, physics, a top-down view, post bloom, or a replacement for the Vite app. Wasm may drop shadow quality. Hero glass transmission is approximate.
