package com.neojou.japanesehouse3d.render

import com.zakgof.korender.KorenderException
import java.io.File

internal actual suspend fun loadPublicBytes(path: String): ByteArray {
    val file = File(repoRoot(), "public").resolve(path)
    if (!file.isFile) {
        throw KorenderException("missing ${file.path}")
    }
    return file.readBytes()
}

private fun repoRoot(): File {
    var dir = File(System.getProperty("user.dir") ?: ".")
    repeat(8) {
        if (File(dir, "public/models/hero/genkan-door.glb").isFile) return dir
        dir = dir.parentFile ?: return dir
    }
    return File(System.getProperty("user.dir") ?: ".")
}
