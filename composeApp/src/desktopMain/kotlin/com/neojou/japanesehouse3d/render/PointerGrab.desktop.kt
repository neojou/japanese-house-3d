package com.neojou.japanesehouse3d.render

import java.awt.Cursor
import java.awt.Point
import java.awt.Robot
import java.awt.Toolkit
import java.awt.image.BufferedImage
import javax.swing.SwingUtilities

internal actual class PointerGrab actual constructor() {
    private var held = false
    private var robot: Robot? = null
    private var allow = true
    private var suppress = false
    private val blank: Cursor by lazy {
        val image = BufferedImage(1, 1, BufferedImage.TYPE_INT_ARGB)
        Toolkit.getDefaultToolkit().createCustomCursor(image, Point(0, 0), "blank")
    }

    actual val captured: Boolean get() = held

    actual val supported: Boolean get() = allow

    actual fun capture(): Boolean {
        if (!allow) return false
        val canvas = findCanvas() ?: return false
        try {
            if (robot == null) robot = Robot()
            held = true
            SwingUtilities.invokeLater { canvas.cursor = blank }
            warp()
            return true
        } catch (error: Exception) {
            allow = false
            held = false
            println("pointer grab unavailable (${error.javaClass.simpleName}: ${error.message}); drag-look stays")
            return false
        }
    }

    actual fun release() {
        if (!held) return
        held = false
        suppress = false
        SwingUtilities.invokeLater {
            findCanvas()?.cursor = Cursor.getDefaultCursor()
        }
    }

    actual fun warp() {
        val canvas = findCanvas() ?: return
        val arm = robot ?: return
        try {
            val loc = canvas.locationOnScreen
            suppress = true
            arm.mouseMove(loc.x + canvas.width / 2, loc.y + canvas.height / 2)
        } catch (error: Exception) {
            allow = false
            held = false
            suppress = false
            println("pointer warp failed (${error.message}); drag-look stays")
        }
    }

    actual fun consumeWarp(): Boolean {
        if (!suppress) return false
        suppress = false
        return true
    }

    actual fun setHover(hand: Boolean) {
        if (held) return
        SwingUtilities.invokeLater {
            val canvas = findCanvas() ?: return@invokeLater
            canvas.cursor = if (hand) {
                Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
            } else {
                Cursor.getDefaultCursor()
            }
        }
    }
}

internal actual fun framebufferScale(): Float {
    val canvas = findCanvas() ?: return 1f
    if (canvas.width < 2) return 1f
    return canvas.framebufferWidth.toFloat() / canvas.width.toFloat()
}
