package com.neojou.japanesehouse3d.domain

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.hypot
import kotlin.math.sin
import kotlin.math.tan

data class Ray(
    val ox: Double,
    val oy: Double,
    val oz: Double,
    val dx: Double,
    val dy: Double,
    val dz: Double,
)

data class Aabb(
    val minX: Double,
    val minY: Double,
    val minZ: Double,
    val maxX: Double,
    val maxY: Double,
    val maxZ: Double,
)

data class PickVolume(val id: String, val box: Aabb)

data class FloorWet(val front: Double, val moisture: Double)

/**
 * Door, faucet, and water motion shared with the desktop view.
 * Angles use the three.js Y rotation: positive yaw sends +X toward −Z.
 * Plan axes stay +X east, +Z north. The render mirror is applied later.
 */
object InteractMath {
    private const val NEAR = 0.08
    private const val FOV_DEG = 70.0

    fun damp(current: Double, target: Double, lambda: Double, dt: Double): Double {
        if (dt <= 0.0) return current
        val t = 1.0 - exp(-lambda * dt)
        return current + (target - current) * t
    }

    /** Hinge-group yaw before the open angle. NS walls map local +X onto +Z. */
    fun doorBaseYaw(axis: String, hingeAt: String): Double {
        val along = if (axis == "ns") -PI / 2.0 else 0.0
        return if (hingeAt == "max") along + PI else along
    }

    fun bifoldBRel(alpha: Double): Double = -2.0 * alpha

    /**
     * Outer pin of a bifold in the hinge frame. `out` stays 0 so the pin
     * remains on the wall line.
     */
    fun foldPin(alpha: Double, panelW: Double): Pair<Double, Double> {
        val ax = panelW * cos(alpha)
        val az = -panelW * sin(alpha)
        val bYaw = -alpha
        return (ax + panelW * cos(bYaw)) to (az - panelW * sin(bYaw))
    }

    /**
     * Hinge → free-edge direction. NS base yaw is −π/2. Hinge at max flips
     * the leaf instead of adding π.
     */
    fun swingLeafDir(axis: String, hingeAt: String, openSign: Int, alphaAbs: Double): Pair<Double, Double> {
        val base = if (axis == "ns") -PI / 2.0 else 0.0
        val yaw = base + openSign * alphaAbs
        val leaf = if (hingeAt == "min") 1.0 else -1.0
        val c = cos(yaw)
        val s = sin(yaw)
        return (leaf * c) to (-leaf * s)
    }

    fun stepTubFill(fill: Double, dt: Double, plugged: Boolean, faucetOn: Boolean): Double {
        var next = fill
        if (!plugged) next -= HouseInteract.tubDrainRate * dt
        else if (faucetOn) next += HouseInteract.tubFillRate * dt
        return next.coerceIn(0.0, 1.0)
    }

    fun isTubSpilling(fill: Double, plugged: Boolean, faucetOn: Boolean): Boolean =
        plugged && faucetOn && fill >= 0.995

    fun stepFloorWet(state: FloorWet, dt: Double, fill: Double, plugged: Boolean, faucetOn: Boolean): FloorWet {
        if (isTubSpilling(fill, plugged, faucetOn)) {
            return FloorWet(
                front = (state.front + HouseInteract.tubSpreadRate * dt).coerceAtMost(1.0),
                moisture = (state.moisture + HouseInteract.tubSpreadRate * 1.15 * dt).coerceAtMost(1.0),
            )
        }
        if (!faucetOn || !plugged) {
            val moisture = (state.moisture - HouseInteract.tubDryRate * dt).coerceAtLeast(0.0)
            return FloorWet(front = if (moisture <= 1e-4) 0.0 else state.front, moisture = moisture)
        }
        return state
    }

    fun waterSurfaceY(fill: Double, floorY: Double, brimY: Double): Double {
        val t = fill.coerceIn(0.0, 1.0)
        return floorY + t * (brimY - floorY)
    }

    fun runoffVisible(faucetOn: Boolean, plugged: Boolean, fill: Double): Boolean =
        faucetOn && (!plugged || fill < 0.07)

    fun overflowWetRadius(front: Double): Double = front.coerceIn(0.0, 1.0) * 2.85

    /** Three.js R_y. Positive yaw sends +X toward −Z and +Z toward +X. */
    fun rotY(yaw: Double, x: Double, y: Double, z: Double): Triple<Double, Double, Double> {
        val c = cos(yaw)
        val s = sin(yaw)
        return Triple(x * c + z * s, y, -x * s + z * c)
    }

    fun swingAabb(door: HouseInteract.Swing, alpha: Double): Aabb {
        return rotatedBox(
            door.hingeX,
            door.hingeY,
            door.hingeZ,
            alpha,
            door.centerX - door.hingeX,
            door.centerY - door.hingeY,
            door.centerZ - door.hingeZ,
            door.sizeX,
            door.sizeY,
            door.sizeZ,
        )
    }

    fun genkanAabb(alpha: Double): Aabb {
        val g = HouseInteract.genkan
        return rotatedBox(
            g.hingeX,
            g.hingeY,
            g.hingeZ,
            alpha,
            g.centerX - g.hingeX,
            0.0,
            g.centerZ - g.hingeZ,
            g.sizeX,
            g.sizeY,
            g.sizeZ,
        )
    }

    fun foldAabbs(door: HouseInteract.Fold, alpha: Double): List<Aabb> {
        val base = doorBaseYaw(door.axis, door.hingeAt)
        val yawA = base + alpha
        val yawB = bifoldBRel(alpha)
        return listOf(
            foldPanel(door, yawA, yawB = null),
            foldPanel(door, yawA, yawB = yawB),
        )
    }

    /**
     * Plan-space ray through a viewport pixel. [px]/[py] and [viewW]/[viewH]
     * are the same pixel space (framebuffer, not window points). Pixel y
     * grows downward. At the center, the direction is [PlayerSim.lookDirection].
     * Screen-right is plan east when yaw is 0.
     */
    fun planRay(
        planX: Double,
        planY: Double,
        planZ: Double,
        yaw: Double,
        pitch: Double,
        px: Double,
        py: Double,
        viewW: Double,
        viewH: Double,
    ): Ray {
        val look = PlayerSim.lookDirection(PlayerState(yaw = yaw, pitch = pitch))
        val wfx = -look.first
        val wfy = look.second
        val wfz = look.third
        val rx = wfy * 0.0 - wfz * 1.0
        val ry = wfz * 0.0 - wfx * 0.0
        val rz = wfx * 1.0 - wfy * 0.0
        val rlen = hypot(rx, hypot(ry, rz)).coerceAtLeast(1e-8)
        val rnx = rx / rlen
        val rny = ry / rlen
        val rnz = rz / rlen
        val ux = rny * wfz - rnz * wfy
        val uy = rnz * wfx - rnx * wfz
        val uz = rnx * wfy - rny * wfx
        val aspect = if (viewH > 0.0) viewW / viewH else 1.5
        val half = NEAR * tan(FOV_DEG * PI / 360.0)
        val halfW = half * aspect
        val ndcX = if (viewW > 0.0) (px / viewW) * 2.0 - 1.0 else 0.0
        val ndcY = if (viewH > 0.0) 1.0 - (py / viewH) * 2.0 else 0.0
        var dx = wfx * NEAR + rnx * (ndcX * halfW) + ux * (ndcY * half)
        var dy = wfy * NEAR + rny * (ndcX * halfW) + uy * (ndcY * half)
        var dz = wfz * NEAR + rnz * (ndcX * halfW) + uz * (ndcY * half)
        val len = hypot(dx, hypot(dy, dz)).coerceAtLeast(1e-8)
        dx /= len
        dy /= len
        dz /= len
        return Ray(planX, planY, planZ, -dx, dy, dz)
    }

    fun firstHit(ray: Ray, volumes: List<PickVolume>): String? {
        var best = Double.POSITIVE_INFINITY
        var id: String? = null
        for (volume in volumes) {
            val t = rayT(ray, volume.box) ?: continue
            if (t < best) {
                best = t
                id = volume.id
            }
        }
        return id
    }

    fun rayT(ray: Ray, box: Aabb): Double? {
        var tMin = 0.0
        var tMax = Double.POSITIVE_INFINITY
        val x = clip(ray.ox, ray.dx, box.minX, box.maxX, tMin, tMax) ?: return null
        tMin = x.first
        tMax = x.second
        val y = clip(ray.oy, ray.dy, box.minY, box.maxY, tMin, tMax) ?: return null
        tMin = y.first
        tMax = y.second
        val z = clip(ray.oz, ray.dz, box.minZ, box.maxZ, tMin, tMax) ?: return null
        tMin = z.first
        tMax = z.second
        if (tMax < 0.0) return null
        return if (tMin >= 0.0) tMin else 0.0
    }

    /**
     * Closed and current door volumes in plan space. Slide shifts are meters
     * already applied along the opening (A then B). Overlap leaves with the
     * other leaf more than half open are omitted so the front leaf wins.
     */
    fun doorVolumes(
        swingAngle: (String) -> Double,
        slideShiftA: (String) -> Double,
        slideShiftB: (String) -> Double,
        slideCoverA: (String) -> Boolean,
        slideCoverB: (String) -> Boolean,
        foldAngle: (String) -> Double,
        genkanAngle: Double,
    ): List<PickVolume> {
        val out = ArrayList<PickVolume>()
        val boxes = HouseSpec.boxes.associateBy { it.id }
        for (door in HouseInteract.swings) {
            out += PickVolume(door.id, swingAabb(door, swingAngle(door.id)))
            addFrames(out, boxes, door.id, door.leafId, door.id)
        }
        for (door in HouseInteract.slides) {
            val boxA = boxes[door.leafA]
            if (boxA != null && !slideCoverA(door.id)) {
                val id = if (door.overlap) "${door.id}__A" else door.id
                out += PickVolume(id, shifted(boxA, door.axis, slideShiftA(door.id)))
            }
            if (door.panels == 2) {
                val boxB = boxes[door.leafB]
                if (boxB != null && !slideCoverB(door.id)) {
                    val id = if (door.overlap) "${door.id}__B" else door.id
                    out += PickVolume(id, shifted(boxB, door.axis, slideShiftB(door.id)))
                }
            }
            val frameId = if (door.overlap) "${door.id}__A" else door.id
            addFrames(out, boxes, door.id, door.leafA, frameId, door.leafB)
        }
        for (door in HouseInteract.folds) {
            for (box in foldAabbs(door, foldAngle(door.id))) {
                out += PickVolume(door.id, box)
            }
        }
        out += PickVolume("genkan", genkanAabb(genkanAngle))
        return out
    }

    fun slideShift(door: HouseInteract.Slide, tA: Double, tB: Double, pocketT: Double): Pair<Double, Double> {
        return if (door.overlap) {
            (door.stack * tA) to (-door.stack * tB)
        } else {
            (door.pocketA * pocketT) to (door.pocketB * pocketT)
        }
    }

    private fun addFrames(
        out: MutableList<PickVolume>,
        boxes: Map<String, HouseSpec.Box>,
        prefix: String,
        skipA: String,
        id: String,
        skipB: String? = null,
    ) {
        for ((boxId, box) in boxes) {
            if (!boxId.startsWith("$prefix-")) continue
            if (boxId == skipA || boxId == skipB) continue
            if (boxId.endsWith("-leaf")) continue
            out += PickVolume(id, axisBox(box))
        }
    }

    private fun shifted(box: HouseSpec.Box, axis: String, along: Double): Aabb {
        val x = box.x + if (axis == "ew") along else 0.0
        val z = box.z + if (axis == "ns") along else 0.0
        return axisBox(box, x, z)
    }

    private fun axisBox(box: HouseSpec.Box, x: Double = box.x, z: Double = box.z): Aabb {
        if (abs(box.yaw) < 1e-6) {
            return fromCenter(x, box.y, z, box.sx, box.sy, box.sz)
        }
        return rotatedBox(x, box.y, z, -box.yaw, 0.0, 0.0, 0.0, box.sx, box.sy, box.sz)
    }

    private fun foldPanel(door: HouseInteract.Fold, yawA: Double, yawB: Double?): Aabb {
        val hx = door.hingeX
        val hy = door.hingeY
        val hz = door.hingeZ
        var minX = Double.POSITIVE_INFINITY
        var minY = Double.POSITIVE_INFINITY
        var minZ = Double.POSITIVE_INFINITY
        var maxX = Double.NEGATIVE_INFINITY
        var maxY = Double.NEGATIVE_INFINITY
        var maxZ = Double.NEGATIVE_INFINITY
        val signs = doubleArrayOf(-0.5, 0.5)
        for (sx in signs) {
            for (sy in signs) {
                for (sz in signs) {
                    var x = door.leafW / 2.0 + sx * door.leafW
                    var y = door.leafH / 2.0 + sy * door.leafH
                    var z = sz * door.thick
                    if (yawB != null) {
                        val spun = rotY(yawB, x, y, z)
                        x = spun.first + door.panelW
                        y = spun.second
                        z = spun.third
                    }
                    val spunA = rotY(yawA, x, y, z)
                    val px = hx + spunA.first
                    val py = hy + spunA.second
                    val pz = hz + spunA.third
                    if (px < minX) minX = px
                    if (py < minY) minY = py
                    if (pz < minZ) minZ = pz
                    if (px > maxX) maxX = px
                    if (py > maxY) maxY = py
                    if (pz > maxZ) maxZ = pz
                }
            }
        }
        return Aabb(minX, minY, minZ, maxX, maxY, maxZ)
    }

    private fun rotatedBox(
        hx: Double,
        hy: Double,
        hz: Double,
        yaw: Double,
        ox: Double,
        oy: Double,
        oz: Double,
        sx: Double,
        sy: Double,
        sz: Double,
    ): Aabb {
        var minX = Double.POSITIVE_INFINITY
        var minY = Double.POSITIVE_INFINITY
        var minZ = Double.POSITIVE_INFINITY
        var maxX = Double.NEGATIVE_INFINITY
        var maxY = Double.NEGATIVE_INFINITY
        var maxZ = Double.NEGATIVE_INFINITY
        val signs = doubleArrayOf(-0.5, 0.5)
        for (ix in signs) {
            for (iy in signs) {
                for (iz in signs) {
                    val spun = rotY(yaw, ox + ix * sx, oy + iy * sy, oz + iz * sz)
                    val x = hx + spun.first
                    val y = hy + spun.second
                    val z = hz + spun.third
                    if (x < minX) minX = x
                    if (y < minY) minY = y
                    if (z < minZ) minZ = z
                    if (x > maxX) maxX = x
                    if (y > maxY) maxY = y
                    if (z > maxZ) maxZ = z
                }
            }
        }
        return Aabb(minX, minY, minZ, maxX, maxY, maxZ)
    }

    private fun fromCenter(x: Double, y: Double, z: Double, sx: Double, sy: Double, sz: Double): Aabb =
        Aabb(x - sx / 2.0, y - sy / 2.0, z - sz / 2.0, x + sx / 2.0, y + sy / 2.0, z + sz / 2.0)

    private fun clip(
        origin: Double,
        dir: Double,
        min: Double,
        max: Double,
        tMin: Double,
        tMax: Double,
    ): Pair<Double, Double>? {
        if (abs(dir) < 1e-12) {
            if (origin < min || origin > max) return null
            return tMin to tMax
        }
        var t1 = (min - origin) / dir
        var t2 = (max - origin) / dir
        if (t1 > t2) {
            val swap = t1
            t1 = t2
            t2 = swap
        }
        val lo = if (t1 > tMin) t1 else tMin
        val hi = if (t2 < tMax) t2 else tMax
        if (lo > hi) return null
        return lo to hi
    }
}

/** Runoff strip yaw so a +Z box points from the spout toward the drain. */
fun runoffYaw(dx: Double, dz: Double): Double = atan2(dx, dz)
