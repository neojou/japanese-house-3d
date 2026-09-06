package com.neojou.japanesehouse3d.render

/** Platform load of the shared `models/house.glb` (same file as Vite). */
expect object HouseGlbAsset {
    fun loadOrNull(): ByteArray?
}
