package com.neojou.japanesehouse3d.render

import com.neojou.japanesehouse3d.domain.PlayerState
import org.lwjgl.opengl.GL11
import org.lwjgl.opengl.GL30
import org.lwjgl.opengl.awt.AWTGLCanvas
import java.awt.Component
import java.awt.Container
import java.awt.Window
import java.awt.image.BufferedImage
import java.io.File
import java.nio.ByteBuffer
import javax.imageio.ImageIO
import javax.swing.Timer
import kotlin.math.PI

/**
 * One-shot framebuffer dumps. HOUSE_CAPTURE is the png path (use {name} when
 * several poses are set). HOUSE_POSES is name:x,z,yawDeg,pitchDeg separated
 * by semicolons. Feet snap to the floor. Absent env vars do nothing.
 */
internal actual fun scheduleFrameCapture(walk: HouseWalk) {
    val base = System.getenv("HOUSE_CAPTURE") ?: return
    val poses = parsePoses(System.getenv("HOUSE_POSES"))
    var index = 0
    var armed = false
    var started = false
    var ticks = 0
    val timer = Timer(400) { event ->
        ticks += 1
        val canvas = findCanvas()
        if (canvas == null || canvas.framebufferWidth < 2) {
            if (ticks > 40) (event.source as Timer).stop()
            return@Timer
        }
        if (!started) {
            if (ticks < 8) return@Timer
            started = true
        }
        if (!armed) {
            if (index >= poses.size) {
                (event.source as Timer).stop()
                return@Timer
            }
            walk.debugTeleport(poses[index].state)
            armed = true
            return@Timer
        }
        val pose = poses[index]
        val path = base.replace("{name}", pose.name)
        val wrote = runCatching { writeFrontBuffer(canvas, path, pose.name) }.getOrElse { error ->
            println("capture ${pose.name} failed: $error")
            false
        }
        if (wrote) {
            index += 1
            armed = false
        } else if (ticks > 40) {
            (event.source as Timer).stop()
        }
    }
    timer.isRepeats = true
    timer.start()
}

private class Pose(val name: String, val state: PlayerState)

private fun parsePoses(raw: String?): List<Pose> {
    if (raw.isNullOrBlank()) {
        return listOf(Pose("view", PlayerState()))
    }
    return raw.split(";").map { item ->
        val parts = item.split(":")
        val name = parts[0]
        val nums = parts[1].split(",").map { it.toDouble() }
        val yaw = nums[2] * PI / 180.0
        val pitch = if (nums.size > 3) nums[3] * PI / 180.0 else 0.0
        Pose(name, PlayerState(x = nums[0], z = nums[1], yaw = yaw, pitch = pitch))
    }
}

private fun writeFrontBuffer(canvas: AWTGLCanvas, path: String, name: String): Boolean {
    var wrote = false
    canvas.runInContext {
        GL30.glBindFramebuffer(GL30.GL_FRAMEBUFFER, 0)
        GL11.glReadBuffer(GL11.GL_FRONT)
        val width = canvas.framebufferWidth
        val height = canvas.framebufferHeight
        val pixels = ByteBuffer.allocateDirect(width * height * 4)
        GL11.glReadPixels(0, 0, width, height, GL11.GL_RGBA, GL11.GL_UNSIGNED_BYTE, pixels)
        val image = BufferedImage(width, height, BufferedImage.TYPE_INT_RGB)
        var sum = 0.0
        for (y in 0 until height) {
            for (x in 0 until width) {
                val index = ((height - 1 - y) * width + x) * 4
                val r = pixels.get(index).toInt() and 0xff
                val g = pixels.get(index + 1).toInt() and 0xff
                val b = pixels.get(index + 2).toInt() and 0xff
                sum += r + g + b
                image.setRGB(x, y, (r shl 16) or (g shl 8) or b)
            }
        }
        val file = File(path)
        file.parentFile?.mkdirs()
        ImageIO.write(image, "png", file)
        val average = sum / (width * height * 3.0)
        println("capture $name ${width}x${height} avg=${"%.1f".format(average)} -> $path")
        wrote = true
    }
    return wrote
}

private fun findCanvas(): AWTGLCanvas? {
    for (window in Window.getWindows()) {
        findCanvas(window)?.let { return it }
    }
    return null
}

private fun findCanvas(component: Component): AWTGLCanvas? {
    if (component is AWTGLCanvas) return component
    if (component is Container) {
        for (child in component.components) {
            findCanvas(child)?.let { return it }
        }
    }
    return null
}
