# composeApp — Track B

Adds to the repo-root rules. Does not repeat them.

- Korender 0.7 is the live scene. `SoftRenderer` stays in the tree and is not the default.
- macOS desktop runs a patched `korender-desktop` jar (`tools/kmp/patch-korender-desktop.py`): OpenGL 4.1 core and `#version 410`. Do not edit the Gradle cache. Wasm still uses the published wasm jar.
- Desktop doors, faucets, louvers, and tub water are clickable. Wasm keeps drag-look. Filament, Rapier, an orthographic view, and post-processing are allowed here when they improve quality; the live scene stays Korender until a later pass. A node walk of a Korender-loaded mesh is not a replacement of Vite's loader.
- If this tree conflicts with Track A, keep `npm run dev` working.
