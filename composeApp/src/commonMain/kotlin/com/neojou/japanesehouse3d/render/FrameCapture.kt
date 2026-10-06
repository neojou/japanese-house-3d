package com.neojou.japanesehouse3d.render

/**
 * Desktop reads HOUSE_CAPTURE / HOUSE_POSES and writes a framebuffer PNG.
 * Wasm has nothing to grab.
 */
internal expect fun scheduleFrameCapture(walk: HouseWalk)
