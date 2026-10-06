package com.neojou.japanesehouse3d.render

import com.neojou.japanesehouse3d.domain.HouseInteract
import com.neojou.japanesehouse3d.domain.HouseSpec
import com.neojou.japanesehouse3d.domain.InteractMath
import com.neojou.japanesehouse3d.domain.runoffYaw
import com.zakgof.korender.math.ColorRGBA
import com.zakgof.korender.math.Transform
import com.zakgof.korender.math.Vec3
import com.zakgof.korender.scope.FrameScope
import kotlin.math.PI
import kotlin.math.hypot
import kotlin.math.max

private val boxesById by lazy { HouseSpec.boxes.associateBy { it.id } }

/**
 * Swing, slide, and fold leaves that the static box loop skips.
 * Closed swing and slide poses match the exported box. Folds are two
 * panels that abut in the opening when shut.
 */
internal fun FrameScope.drawDoors(fixtures: HouseFixtures) {
    val unit = cube(0.5f)
    for (door in HouseInteract.swings) {
        val box = boxesById[door.leafId] ?: continue
        val alpha = fixtures.swingAngle(door.id).toFloat()
        var plan = Transform.scale(door.sizeX.toFloat(), door.sizeY.toFloat(), door.sizeZ.toFloat())
            .translate(
                (door.centerX - door.hingeX).toFloat(),
                (door.centerY - door.hingeY).toFloat(),
                (door.centerZ - door.hingeZ).toFloat(),
            )
            .rotate(Vec3.Y, alpha)
            .translate(door.hingeX.toFloat(), door.hingeY.toFloat(), door.hingeZ.toFloat())
        paintBox(box, planToWorld(plan), unit)
    }
    for (door in HouseInteract.slides) {
        val (shiftA, shiftB) = fixtures.slideShift(door.id)
        val boxA = boxesById[door.leafA]
        if (boxA != null) paintBox(boxA, shiftedBox(boxA, door.axis, shiftA), unit)
        if (door.panels == 2) {
            val boxB = boxesById[door.leafB]
            if (boxB != null) paintBox(boxB, shiftedBox(boxB, door.axis, shiftB), unit)
        }
    }
    for (door in HouseInteract.folds) {
        val box = boxesById[door.leafId]
        val alpha = fixtures.foldAngle(door.id)
        val yawA = (InteractMath.doorBaseYaw(door.axis, door.hingeAt) + alpha).toFloat()
        val yawB = InteractMath.bifoldBRel(alpha).toFloat()
        paintFold(box, door, yawA, yawB = null, unit)
        paintFold(box, door, yawA, yawB, unit)
    }
}

internal fun FrameScope.drawWater(fixtures: HouseFixtures) {
    val tub = HouseInteract.tub
    val spilling = InteractMath.isTubSpilling(fixtures.tubFill, fixtures.tubPlugged, fixtures.tubFaucet)
    val surfY = if (spilling) {
        tub.spillY
    } else {
        InteractMath.waterSurfaceY(fixtures.tubFill, tub.bottomY + 0.008, tub.brimY)
    }
    if (fixtures.tubFill > 0.025) {
        val waterH = max(surfY - tub.bottomY, 0.002)
        val body = Transform
            .scale((tub.innerW * 0.98).toFloat(), waterH.toFloat(), (tub.innerL * 0.98).toFloat())
            .translate(tub.x.toFloat(), (tub.bottomY + waterH / 2.0).toFloat(), tub.z.toFloat())
        val surf = Transform
            .scale((tub.innerW * 0.96).toFloat(), 0.012f, (tub.innerL * 0.96).toFloat())
            .translate(tub.x.toFloat(), surfY.toFloat(), tub.z.toFloat())
        val mat = waterMat(0.62f)
        Renderable(mat, cube(0.5f), planToWorld(body), transparent = true)
        Renderable(mat, cube(0.5f), planToWorld(surf), transparent = true)
    }
    val bot = if (fixtures.tubFill > 0.025) surfY else tub.bottomY + 0.02
    val streamH = max(tub.tipY - bot, 0.02)
    if (fixtures.tubFlow > 0.04) {
        val midY = (tub.tipY + bot) / 2.0
        val radius = (0.012 * fixtures.tubFlow).toFloat().coerceAtLeast(0.002f)
        val stream = Transform()
            .translate(0f, (-streamH / 2.0).toFloat(), 0f)
            .translate(tub.tipX.toFloat(), midY.toFloat(), tub.tipZ.toFloat())
        Renderable(
            waterMat(0.5f),
            cylinderSide(streamH.toFloat(), radius, 8),
            planToWorld(stream),
            transparent = true,
        )
    }
    val runOn = InteractMath.runoffVisible(fixtures.tubFaucet, fixtures.tubPlugged, fixtures.tubFill) &&
        fixtures.tubFlow > 0.05
    if (runOn) {
        val dx = tub.holeX - tub.tipX
        val dz = tub.holeZ - tub.tipZ
        val len = hypot(dx, dz)
        if (len > 0.05) {
            val yaw = runoffYaw(dx, dz).toFloat()
            val strip = Transform
                .scale(0.034f, 0.008f, len.toFloat())
                .rotate(Vec3.Y, yaw)
                .translate(
                    ((tub.tipX + tub.holeX) / 2.0).toFloat(),
                    (tub.bottomY + 0.02).toFloat(),
                    ((tub.tipZ + tub.holeZ) / 2.0).toFloat(),
                )
            Renderable(waterMat(0.4f), cube(0.5f), planToWorld(strip), transparent = true)
        }
    }
    if (fixtures.floorWet.moisture > 0.015) {
        val radius = InteractMath.overflowWetRadius(fixtures.floorWet.front).toFloat().coerceAtLeast(0.15f)
        val diskT = Transform()
            .scale(radius)
            .rotate(Vec3.X, (-PI / 2.0).toFloat())
            .translate(tub.x.toFloat(), (tub.y + 0.02).toFloat(), tub.z.toFloat())
        val wet = base {
            color = ColorRGBA(0.45f, 0.55f, 0.62f, (0.15f + fixtures.floorWet.moisture.toFloat() * 0.35f))
            roughnessFactor = 0.2f
            metallicFactor = 0f
        }
        Renderable(wet, disk(1f, 24), planToWorld(diskT), transparent = true)
    }
}

private fun FrameScope.paintFold(
    box: HouseSpec.Box?,
    door: HouseInteract.Fold,
    yawA: Float,
    yawB: Float?,
    unit: com.zakgof.korender.MeshDeclaration,
) {
    var plan = Transform.scale(door.leafW.toFloat(), door.leafH.toFloat(), door.thick.toFloat())
        .translate((door.leafW / 2.0).toFloat(), (door.leafH / 2.0).toFloat(), 0f)
    if (yawB != null) {
        plan = plan.rotate(Vec3.Y, yawB)
            .translate(door.panelW.toFloat(), 0f, 0f)
    }
    plan = plan.rotate(Vec3.Y, yawA)
        .translate(door.hingeX.toFloat(), door.hingeY.toFloat(), door.hingeZ.toFloat())
    if (box != null) {
        paintBox(box, planToWorld(plan), unit)
    } else {
        val mat = base {
            color = ColorRGBA(0.62f, 0.52f, 0.40f, 1f)
            roughnessFactor = 0.6f
        }
        Renderable(mat, unit, planToWorld(plan))
    }
}

private fun shiftedBox(box: HouseSpec.Box, axis: String, along: Double): Transform {
    val x = box.x + if (axis == "ew") along else 0.0
    val z = box.z + if (axis == "ns") along else 0.0
    return boxTransform(box.copy(x = x, z = z))
}

private fun FrameScope.paintBox(
    box: HouseSpec.Box,
    transform: Transform,
    unit: com.zakgof.korender.MeshDeclaration,
) {
    val glass = box.finish == "glass"
    val mat = base {
        color = if (glass) {
            ColorRGBA(box.r.toFloat(), box.g.toFloat(), box.b.toFloat(), 0.42f)
        } else {
            ColorRGBA(box.r.toFloat(), box.g.toFloat(), box.b.toFloat(), 1f)
        }
        metallicFactor = box.metal.toFloat()
        roughnessFactor = box.rough.toFloat()
    }
    Renderable(mat, unit, transform, transparent = glass)
}

private fun FrameScope.waterMat(alpha: Float) = base {
    val tub = HouseInteract.tub
    color = ColorRGBA(tub.r.toFloat(), tub.g.toFloat(), tub.b.toFloat(), alpha)
    metallicFactor = 0.04f
    roughnessFactor = 0.08f
}
