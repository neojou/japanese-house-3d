# Coat trench (hero prop)

Current implementation uses **procedural** maps from `src/lib/surfaceTextures.ts`
(`createTrenchCoatAlbedoMap` / Normal / Roughness), preloaded with façade textures.

Optional later: drop hand-authored `albedo.png` (+ normal/rough) here and switch
`createTrenchCoatMaterial` to `useTexture` — keep **no brand marks**.
