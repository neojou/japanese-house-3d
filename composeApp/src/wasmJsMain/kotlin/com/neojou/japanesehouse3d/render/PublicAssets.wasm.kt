package com.neojou.japanesehouse3d.render

import com.zakgof.korender.KorenderException
import kotlinx.browser.window
import kotlinx.coroutines.await
import org.khronos.webgl.ArrayBuffer
import org.khronos.webgl.Int8Array
import org.khronos.webgl.get
import org.w3c.fetch.Response

@OptIn(kotlin.js.ExperimentalWasmJsInterop::class)
internal actual suspend fun loadPublicBytes(path: String): ByteArray {
    val response: Response = window.fetch(path).await()
    if (!response.ok) {
        throw KorenderException("missing $path (${response.status})")
    }
    val buffer: ArrayBuffer = response.arrayBuffer().await()
    val view = Int8Array(buffer)
    return ByteArray(view.length) { index -> view[index] }
}
