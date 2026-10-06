package com.neojou.japanesehouse3d.render

import androidx.compose.ui.input.key.Key
import com.neojou.japanesehouse3d.domain.InteractMath
import com.neojou.japanesehouse3d.domain.PlayerDefaults
import com.neojou.japanesehouse3d.domain.PlayerSim
import com.neojou.japanesehouse3d.domain.PlayerState
import kotlin.concurrent.Volatile
import kotlin.math.hypot
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.TimeSource

/**
 * First-person walk. Yaw 0 looks +Z. A/D turn, W/S move.
 * A click on a door or faucet toggles it. A click on anything else grabs
 * the mouse (desktop). Drag-look still works when grab is unavailable.
 * Compose and Korender can both deliver one key; turns closer than 16 ms collapse to one.
 * Touch positions are already framebuffer pixels.
 */
class HouseWalk {
    val fixtures = HouseFixtures()
    internal val pointer = PointerGrab()

    @Volatile
    var state: PlayerState = PlayerState().withGround()
        private set

    @Volatile
    var fps: Float = 0f
        private set

    @Volatile private var heldW = false
    @Volatile private var heldS = false
    @Volatile private var heldUp = false
    @Volatile private var heldDown = false

    @Volatile var viewW: Int = 0
    @Volatile var viewH: Int = 0

    private var pressed = false
    private var dragged = false
    private var startX = 0f
    private var startY = 0f
    private var lastX = 0f
    private var lastY = 0f
    private var lastTurn = TimeSource.Monotonic.markNow()
    private var didTurn = false

    fun noteView(width: Int, height: Int) {
        viewW = width
        viewH = height
    }

    fun onKey(down: Boolean, key: Key) {
        when (key) {
            Key.W -> heldW = down
            Key.S -> heldS = down
            Key.DirectionUp -> heldUp = down
            Key.DirectionDown -> heldDown = down
            Key.Escape -> if (down) pointer.release()
            Key.A, Key.DirectionLeft -> if (down) turn(-PlayerDefaults.turnDegrees)
            Key.D, Key.DirectionRight -> if (down) turn(PlayerDefaults.turnDegrees)
            else -> Unit
        }
    }

    fun pointerDown(x: Float, y: Float) {
        if (pointer.captured) {
            pointer.release()
            pressed = false
            return
        }
        pressed = true
        dragged = false
        startX = x
        startY = y
        lastX = x
        lastY = y
    }

    fun pointerUp(x: Float, y: Float) {
        val wasPressed = pressed
        val wasDrag = dragged
        pressed = false
        if (wasPressed && !wasDrag) click(x, y)
    }

    fun pointerMove(x: Float, y: Float) {
        if (pointer.captured) {
            if (pointer.consumeWarp()) return
            val dx = x - viewW / 2f
            val dy = y - viewH / 2f
            applyLook(dx, dy)
            pointer.warp()
            return
        }
        if (!pressed) {
            hover(x, y)
            return
        }
        if (hypot((x - startX).toDouble(), (y - startY).toDouble()) > tapSlop()) dragged = true
        val dx = x - lastX
        val dy = y - lastY
        lastX = x
        lastY = y
        if (dragged) applyLook(dx, dy)
    }

    fun look(dYaw: Double, dPitch: Double) {
        if (dYaw == 0.0 && dPitch == 0.0) return
        state = PlayerSim.stepLook(state, dYaw, dPitch)
    }

    /** Verification hook. Snaps feet onto the floor under [next]. */
    fun debugTeleport(next: PlayerState) {
        state = next.withGround()
    }

    fun tick(dtSeconds: Float, fpsNow: Float) {
        fps = fpsNow
        val dt = dtSeconds.toDouble().coerceIn(0.0, 0.05)
        fixtures.step(dt)
        var forward = 0.0
        if (heldW || heldUp) forward += 1.0
        if (heldS || heldDown) forward -= 1.0
        if (forward != 0.0) {
            state = PlayerSim.stepMove(state, forward, dt)
        }
    }

    private fun click(x: Float, y: Float) {
        if (viewW < 2 || viewH < 2) return
        val ray = InteractMath.planRay(
            state.x,
            state.eyeY,
            state.z,
            state.yaw,
            state.pitch,
            x.toDouble(),
            y.toDouble(),
            viewW.toDouble(),
            viewH.toDouble(),
        )
        val hit = InteractMath.firstHit(ray, fixtures.pickVolumes())
        if (hit != null) {
            fixtures.toggle(hit)
            pointer.setHover(true)
        } else if (!pointer.capture()) {
            pointer.setHover(false)
        }
    }

    private fun hover(x: Float, y: Float) {
        if (viewW < 2 || viewH < 2) return
        val ray = InteractMath.planRay(
            state.x,
            state.eyeY,
            state.z,
            state.yaw,
            state.pitch,
            x.toDouble(),
            y.toDouble(),
            viewW.toDouble(),
            viewH.toDouble(),
        )
        pointer.setHover(InteractMath.firstHit(ray, fixtures.pickVolumes()) != null)
    }

    /** Screen-right is plan east after the render mirror, so +dx increases yaw. */
    private fun applyLook(dx: Float, dy: Float) {
        val scale = framebufferScale().toDouble().coerceAtLeast(0.5)
        val sens = PlayerDefaults.lookSensitivity
        look(dx / scale * sens, -dy / scale * sens)
    }

    private fun tapSlop(): Double = 10.0 * framebufferScale().toDouble().coerceAtLeast(1.0)

    private fun turn(degrees: Double) {
        if (didTurn && lastTurn.elapsedNow() < 16.milliseconds) return
        lastTurn = TimeSource.Monotonic.markNow()
        didTurn = true
        state = PlayerSim.turnDegrees(state, degrees)
    }
}
