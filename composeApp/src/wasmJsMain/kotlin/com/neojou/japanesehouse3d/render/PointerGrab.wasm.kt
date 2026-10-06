package com.neojou.japanesehouse3d.render

internal actual class PointerGrab actual constructor() {
    actual val captured: Boolean get() = false
    actual val supported: Boolean get() = false
    actual fun capture(): Boolean = false
    actual fun release() = Unit
    actual fun warp() = Unit
    actual fun consumeWarp(): Boolean = false
    actual fun setHover(hand: Boolean) = Unit
}

internal actual fun framebufferScale(): Float = 1f
