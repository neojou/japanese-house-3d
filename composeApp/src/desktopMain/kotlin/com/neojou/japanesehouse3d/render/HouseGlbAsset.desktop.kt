package com.neojou.japanesehouse3d.render

actual object HouseGlbAsset {
    actual fun loadOrNull(): ByteArray? {
        val stream =
            HouseGlbAsset::class.java.getResourceAsStream("/models/house.glb")
                ?: return null
        return stream.use { it.readBytes() }
    }
}
