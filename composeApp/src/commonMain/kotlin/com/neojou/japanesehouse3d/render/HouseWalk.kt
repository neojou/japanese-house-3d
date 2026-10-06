package com.neojou.japanesehouse3d.render

import androidx.compose.ui.input.key.Key
import com.neojou.japanesehouse3d.domain.PlayerDefaults
import com.neojou.japanesehouse3d.domain.PlayerSim
import com.neojou.japanesehouse3d.domain.PlayerState
import kotlin.concurrent.Volatile
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.TimeSource

/**
 * First-person walk. Yaw 0 looks +Z. A/D turn, W/S move, drag looks.
 * Compose and Korender can both deliver one key; turns closer than 16 ms collapse to one.
 */
class HouseWalk {
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

    private var dragging = false
    private var lastX = 0f
    private var lastY = 0f
    private var lastTurn = TimeSource.Monotonic.markNow()
    private var didTurn = false
    private var lastLook = TimeSource.Monotonic.markNow()
    private var didLook = false

    fun onKey(down: Boolean, key: Key) {
        when (key) {
            Key.W -> heldW = down
            Key.S -> heldS = down
            Key.DirectionUp -> heldUp = down
            Key.DirectionDown -> heldDown = down
            Key.A, Key.DirectionLeft -> if (down) turn(-PlayerDefaults.turnDegrees)
            Key.D, Key.DirectionRight -> if (down) turn(PlayerDefaults.turnDegrees)
            else -> Unit
        }
    }

    fun pointerDown(x: Float, y: Float) {
        dragging = true
        lastX = x
        lastY = y
    }

    fun pointerUp() {
        dragging = false
    }

    fun pointerMove(x: Float, y: Float) {
        if (!dragging) return
        val dx = x - lastX
        val dy = y - lastY
        lastX = x
        lastY = y
        val sens = PlayerDefaults.lookSensitivity
        look(-dx * sens, -dy * sens)
    }

    fun look(dYaw: Double, dPitch: Double) {
        if (dYaw == 0.0 && dPitch == 0.0) return
        if (didLook && lastLook.elapsedNow() < 8.milliseconds) return
        lastLook = TimeSource.Monotonic.markNow()
        didLook = true
        state = PlayerSim.stepLook(state, dYaw, dPitch)
    }

    /** Verification hook. Snaps feet onto the floor under [next]. */
    fun debugTeleport(next: PlayerState) {
        state = next.withGround()
    }

    fun tick(dtSeconds: Float, fpsNow: Float) {
        fps = fpsNow
        val dt = dtSeconds.toDouble().coerceIn(0.0, 0.05)
        var forward = 0.0
        if (heldW || heldUp) forward += 1.0
        if (heldS || heldDown) forward -= 1.0
        if (forward != 0.0) {
            state = PlayerSim.stepMove(state, forward, dt)
        }
    }

    private fun turn(degrees: Double) {
        if (didTurn && lastTurn.elapsedNow() < 16.milliseconds) return
        lastTurn = TimeSource.Monotonic.markNow()
        didTurn = true
        state = PlayerSim.turnDegrees(state, degrees)
    }
}
