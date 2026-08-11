# Kotlin Multiplatform walkthrough (through K2)

Parallel to the Vite SPA. **Does not replace** `npm run dev`.

| Doc | Purpose |
|-----|---------|
| [KMP-plan.md](./KMP-plan.md) | Milestones K-S0…K9 |
| [KMP-agents.md](./KMP-agents.md) | Roles, gates, manual walk script |
| [KMP-spike-notes.md](./KMP-spike-notes.md) | Graphics route lock (B-light) |

## Layout

```
shared/          # pure domain (coords, height, player, Shell1F)
composeApp/      # Compose UI + SoftRenderer (Desktop + Wasm)
```

## Requirements

- JDK **25**
- Network for first Gradle/Compose fetch

## Commands

```bash
# Domain unit tests (K1)
./gradlew :shared:jvmTest

# Compile both targets
./gradlew :composeApp:compileKotlinDesktop :composeApp:compileKotlinWasmJs

# Desktop — K2 first-person 1F shell
./gradlew :composeApp:run

# Wasm browser
./gradlew :composeApp:wasmJsBrowserDevelopmentRun
```

### Controls (K2)

| Key / input | Action |
|-------------|--------|
| W / ↑ | Forward |
| S / ↓ | Back |
| A / ← | Turn left 10° |
| D / → | Turn right 10° |
| Drag | Look (yaw/pitch) |

HUD: plan X / Z / eye Y (top-right).

## What K2 is / is not

**Is:** Outdoor → genkan opening → raised 1F floor; simplified outer walls; soft perspective boxes; both Desktop & Wasm compile.

**Not yet (K3+):** Full interior partitions, interactive doors, stairs/2F, materials, tokonoma props.
