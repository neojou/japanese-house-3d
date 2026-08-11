package com.neojou.japanesehouse3d.domain

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

data class PlayerState(
    /** Plan-space position of feet */
    val x: Double = PlayerDefaults.spawnX,
    val z: Double = PlayerDefaults.spawnZ,
    val feetY: Double = PlayerDefaults.spawnY,
    /** Yaw: 0 = look +Z (north); increases CCW toward +X (east) when viewed from above? 
     *  Use: forward = (sin(yaw), cos(yaw)) in XZ so yaw=0 → +Z. */
    val yaw: Double = PlayerDefaults.spawnYaw,
    val pitch: Double = 0.0,
) {
    val eyeY: Double get() = feetY + PlayerDefaults.eyeHeight

    fun withGround(): PlayerState {
        val g = Height.groundY(x, z, feetY)
        return copy(feetY = g)
    }
}

object PlayerSim {
    private val pitchLimit = PlayerDefaults.pitchLimitDeg * PI / 180.0

    fun stepMove(
        state: PlayerState,
        forward: Double,
        dt: Double,
        speed: Double = PlayerDefaults.moveSpeed,
    ): PlayerState {
        if (forward == 0.0 || dt <= 0.0) return state.withGround()
        val dist = forward * speed * dt
        val nx = state.x + sin(state.yaw) * dist
        val nz = state.z + cos(state.yaw) * dist
        return state.copy(x = nx, z = nz).withGround()
    }

    fun stepYaw(state: PlayerState, deltaYawRad: Double): PlayerState =
        state.copy(yaw = state.yaw + deltaYawRad)

    fun stepLook(state: PlayerState, dYaw: Double, dPitch: Double): PlayerState {
        val p = (state.pitch + dPitch).coerceIn(-pitchLimit, pitchLimit)
        return state.copy(yaw = state.yaw + dYaw, pitch = p)
    }

    fun turnDegrees(state: PlayerState, degrees: Double): PlayerState =
        stepYaw(state, degrees * PI / 180.0)
}
