package com.neojou.japanesehouse3d.render

/**
 * Wasm: no Filament / no reliable binary classpath fetch in this shell.
 * SoftRenderer remains the walkable fallback (blender.md Phase B degrade).
 */
actual object HouseGlbAsset {
    actual fun loadOrNull(): ByteArray? = null
}
