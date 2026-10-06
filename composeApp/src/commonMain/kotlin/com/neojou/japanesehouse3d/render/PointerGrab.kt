package com.neojou.japanesehouse3d.render

/**
 * Desktop warps the cursor with AWT Robot. Wasm has no pointer grab; drag-look stays.
 * Korender already scales touch positions by the framebuffer ratio, so grab code
 * must not scale them again.
 */
internal expect class PointerGrab() {
    val captured: Boolean
    val supported: Boolean
    fun capture(): Boolean
    fun release()
    fun warp()
    fun consumeWarp(): Boolean
    fun setHover(hand: Boolean)
}

/** Framebuffer pixels per window pixel. Look deltas are divided by this. */
internal expect fun framebufferScale(): Float
