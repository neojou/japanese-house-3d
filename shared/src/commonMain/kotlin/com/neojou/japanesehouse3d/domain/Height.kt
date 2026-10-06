package com.neojou.japanesehouse3d.domain

import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.floor
import kotlin.math.hypot

/**
 * Walk surface from the npm `getGroundHeight` rules.
 * Inputs are [HouseSpec] (exported from `dimensions.ts`). Expected samples
 * are produced by calling the TypeScript function.
 */
object Height {
    const val MAX_STEP_UP = HouseSpec.maxStepUp
    const val MAX_STEP_DOWN = HouseSpec.maxStepDown

    private data class Hit(val y: Double, val kind: String)

    fun groundY(planX: Double, planZ: Double, feetY: Double = HouseSpec.interiorFloorY): Double {
        val all = collect(planX, planZ, feetY)
        if (all.isEmpty()) return 0.0
        val lo = feetY - MAX_STEP_DOWN
        val hi = feetY + MAX_STEP_UP
        val inWindow = all.filter { it.y >= lo && it.y <= hi }
        if (inWindow.isNotEmpty()) {
            descent(inWindow, feetY)?.let { return it }
            return best(inWindow)
        }
        val stepUpOk = all.filter { it.y <= hi }
        if (stepUpOk.isNotEmpty()) {
            descent(stepUpOk, feetY)?.let { return it }
            return best(stepUpOk)
        }
        val below = all.filter { it.y <= feetY }
        if (below.isNotEmpty()) return best(below)
        return 0.0
    }

    private fun stairish(h: Hit) = h.kind == "stair" || h.kind == "landing" || h.kind == "step"

    private fun best(hits: List<Hit>): Double {
        val maxY = hits.maxOf { it.y }
        val top = hits.filter { kotlin.math.abs(it.y - maxY) < 1e-6 }
        return (top.firstOrNull { stairish(it) } ?: top.first()).y
    }

    private fun descent(hits: List<Hit>, feetY: Double): Double? {
        val down = hits.filter {
            stairish(it) && it.y < feetY - 0.02 && it.y >= feetY - MAX_STEP_DOWN - 0.02
        }
        if (down.isEmpty()) return null
        return down.maxOf { it.y }
    }

    private fun collect(planX: Double, planZ: Double, feetY: Double): List<Hit> {
        val hits = mutableListOf(Hit(0.0, "grade"))
        val ignore2f = feetY < HouseSpec.feetIgnore2fBelow
        val ignorePh = feetY < HouseSpec.feetIgnorePhBelow
        for (slab in HouseSpec.slabs) {
            if (ignore2f && (slab.floor == "2f" || (slab.y >= HouseSpec.y2fSlabMin && slab.y < HouseSpec.yPhSlabMin))) {
                continue
            }
            if (ignorePh && (slab.floor == "ph" || slab.y >= HouseSpec.yPhSlabMin)) continue
            if (planX >= slab.x && planX <= slab.x + slab.w && planZ >= slab.z && planZ <= slab.z + slab.d) {
                hits += Hit(slab.y, "slab")
            }
        }
        genkanSteps(planX, planZ, hits)
        if (pastGenkanDoor(planX, planZ) || overInterior(planX, planZ)) {
            hits += Hit(HouseSpec.interiorFloorY, "slab")
        }
        for (flight in HouseSpec.stairs) straight(flight, planX, planZ, hits)
        for (winder in HouseSpec.winders) winderHits(winder, planX, planZ, hits)
        return hits
    }

    private fun genkanSteps(planX: Double, planZ: Double, hits: MutableList<Hit>) {
        val mid = (HouseSpec.genkanX0 + HouseSpec.genkanX1) / 2.0
        val half = HouseSpec.genkanStepWidth / 2.0 + 0.08
        if (planX < mid - half || planX > mid + half) return
        val face = HouseSpec.genkanZ - HouseSpec.wallThickness / 2.0
        val d = HouseSpec.genkanStepDepth
        if (planZ >= face - 2 * d - 0.05 && planZ < face - d) {
            hits += Hit(HouseSpec.genkanStepHeight, "step")
        } else if (planZ >= face - d && planZ <= face + 0.05) {
            hits += Hit(HouseSpec.genkanStepHeight * HouseSpec.genkanStepCount, "step")
        }
    }

    private fun pastGenkanDoor(planX: Double, planZ: Double): Boolean {
        val pad = 0.25
        return planX >= HouseSpec.genkanX0 - pad &&
            planX <= HouseSpec.genkanX1 + pad &&
            planZ >= HouseSpec.genkanZ - HouseSpec.wallThickness / 2.0 - 0.05
    }

    private fun overInterior(planX: Double, planZ: Double): Boolean {
        for (slab in HouseSpec.slabs) {
            if (slab.floor != "1f") continue
            if (slab.y < HouseSpec.interiorFloorY - 0.01) continue
            if (slab.y > HouseSpec.interiorFloorY + 0.05) continue
            if (planX >= slab.x && planX <= slab.x + slab.w && planZ >= slab.z && planZ <= slab.z + slab.d) {
                return true
            }
        }
        return false
    }

    private fun straight(flight: HouseSpec.Stair, planX: Double, planZ: Double, hits: MutableList<Hit>) {
        val pad = HouseSpec.stairPad
        val half = flight.width / 2.0 + pad
        if (planX < flight.x - half || planX > flight.x + half) return
        val n = flight.stepCount
        when (flight.direction) {
            "north" -> for (i in 0 until n) {
                val z0 = flight.z + i * flight.treadDepth - pad * 0.5
                val z1 = flight.z + (i + 1) * flight.treadDepth + pad * 0.5
                if (planZ >= z0 && planZ < z1) hits += Hit(flight.baseY + (i + 1) * flight.riserHeight, "stair")
            }
            "south" -> for (i in 0 until n) {
                val zNorth = flight.z - i * flight.treadDepth + pad * 0.5
                val zSouth = flight.z - (i + 1) * flight.treadDepth - pad * 0.5
                if (planZ > zSouth && planZ <= zNorth) hits += Hit(flight.baseY + (i + 1) * flight.riserHeight, "stair")
            }
            "east" -> for (i in 0 until n) {
                val x0 = flight.x + i * flight.treadDepth - pad * 0.5
                val x1 = flight.x + (i + 1) * flight.treadDepth + pad * 0.5
                if (planX >= x0 && planX < x1) hits += Hit(flight.baseY + (i + 1) * flight.riserHeight, "stair")
            }
            "west" -> for (i in 0 until n) {
                val xE = flight.x - i * flight.treadDepth + pad * 0.5
                val xW = flight.x - (i + 1) * flight.treadDepth - pad * 0.5
                if (planX > xW && planX <= xE) hits += Hit(flight.baseY + (i + 1) * flight.riserHeight, "stair")
            }
        }
    }

    private fun winderHits(w: HouseSpec.Winder, planX: Double, planZ: Double, hits: MutableList<Hit>) {
        val dx = planX - w.pivotX
        val dz = planZ - w.pivotZ
        val r = hypot(dx, dz)
        val rMin = maxOf(0.0, w.rInner - HouseSpec.stairPad)
        val rMax = w.rOuter + HouseSpec.stairPad
        if (r < rMin || r > rMax) return
        val t = sweepParam(atan2(dz, dx), w.startAngle, w.sweep) ?: return
        // 9-decimal export can sit 1e-9 short of a step edge. Snap that boundary up.
        val i = floor(t * w.stepCount + 1e-6).toInt().coerceIn(0, w.stepCount - 1)
        hits += Hit(w.baseY + (i + 1) * w.riserHeight, "stair")
    }

    private fun norm(a0: Double): Double {
        var a = a0
        while (a > PI) a -= PI * 2
        while (a <= -PI) a += PI * 2
        return a
    }

    private fun sweepParam(ang: Double, start: Double, sweep: Double): Double? {
        val pad = HouseSpec.winderAngPad
        var a = norm(ang - start)
        if (sweep < 0) {
            if (a > 0) a -= PI * 2
            if (a > pad || a < sweep - pad) return null
            return (a / sweep).coerceIn(0.0, 0.999)
        }
        if (a < 0) a += PI * 2
        if (a < -pad || a > sweep + pad) return null
        return (a / sweep).coerceIn(0.0, 0.999)
    }
}
