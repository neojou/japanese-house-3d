package com.neojou.japanesehouse3d.domain

/**
 * K1/K2 simplified ground height (plan XZ, feet Y).
 * Full stair/winder logic deferred to K4 — matches outdoor + raised 1F slab.
 */
object Height {
    const val MAX_STEP_UP = 0.55

    /**
     * @param planX plan-space X
     * @param planZ plan-space Z
     * @param feetY previous feet height (for step-up gating later)
     */
    fun groundY(planX: Double, planZ: Double, feetY: Double = FloorLevels.interior1f): Double {
        val candidates = mutableListOf(FloorLevels.grade)

        // Raised 1F interior envelope (simplified full footprint)
        if (planX in 0.0..Building.width && planZ in 0.0..Building.depth) {
            candidates += FloorLevels.interior1f
        }

        // Genkan exterior steps (two risers south of door) — rough boxes
        val stepPad = 0.35
        val doorMid = (Genkan.doorX0 + Genkan.doorX1) / 2
        val halfW = Genkan.doorWidth * 0.48
        if (planX in (doorMid - halfW)..(doorMid + halfW)) {
            if (planZ in (Genkan.doorZ - 0.9)..(Genkan.doorZ - 0.45)) {
                candidates += 0.25
            }
            if (planZ in (Genkan.doorZ - 0.45)..(Genkan.doorZ + 0.05)) {
                candidates += FloorLevels.interior1f
            }
        }

        // Prefer highest surface not more than MAX_STEP_UP above feet
        val reachable = candidates.filter { it <= feetY + MAX_STEP_UP }
        return (reachable.maxOrNull() ?: FloorLevels.grade)
    }
}
