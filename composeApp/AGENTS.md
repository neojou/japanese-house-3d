# composeApp — Track B

Adds to the repo-root rules. Does not repeat them.

- Korender 0.7 is the live scene. `SoftRenderer` stays in the tree and is not the default.
- macOS desktop runs a patched `korender-desktop` jar (`tools/kmp/patch-korender-desktop.py`): OpenGL 4.1 core and `#version 410`. Do not edit the Gradle cache. Wasm still uses the published wasm jar.
- Forbid interactive doors, Filament, and a GLB loader that replaces Vite's.
- If this tree conflicts with Track A, keep `npm run dev` working.
