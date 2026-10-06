package com.neojou.japanesehouse3d.render

/**
 * Bytes for a path under the repo `public/` tree (heroes, Bell Art).
 * Korender calls this for app assets. Paths starting with `!` stay inside Korender.
 */
internal expect suspend fun loadPublicBytes(path: String): ByteArray
