package com.neojou.japanesehouse3d.domain

import kotlin.math.PI
import kotlin.math.cos
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class InteractMathTest {

    @Test
    fun dampMatchesExponentialLerp() {
        val once = InteractMath.damp(0.0, 1.0, lambda = 10.0, dt = 0.1)
        assertEquals(0.6321205588285577, once, 1e-12)
    }

    @Test
    fun nsLeafClosedPointsNorthAndOpenPointsEast() {
        val closed = InteractMath.swingLeafDir("ns", "min", 1, 0.0)
        assertEquals(0.0, closed.first, 1e-9)
        assertEquals(1.0, closed.second, 1e-9)
        val open = InteractMath.swingLeafDir("ns", "min", 1, 85.0 * PI / 180.0)
        assertEquals(0.9961946980917455, open.first, 1e-9)
        assertEquals(0.08715574274765817, open.second, 1e-9)
    }

    @Test
    fun hingeAtMaxFlipsTheLeafWest() {
        val open = InteractMath.swingLeafDir("ns", "max", 1, 85.0 * PI / 180.0)
        assertEquals(-0.9961946980917455, open.first, 1e-9)
        assertEquals(-0.08715574274765817, open.second, 1e-9)
    }

    @Test
    fun foldPinStaysOnTheWall() {
        val pin = InteractMath.foldPin(0.7, 0.4)
        assertEquals(0.0, pin.second, 1e-12)
        assertEquals(2.0 * 0.4 * cos(0.7), pin.first, 1e-12)
    }

    @Test
    fun northeastDoorSwingsEast() {
        val door = HouseInteract.swings.first { it.id == "swing-2f-ne" }
        assertEquals("ns", door.axis)
        assertEquals("min", door.hingeAt)
        assertEquals(1, door.openSign)
        assertEquals(85.0, door.openAngleDeg, 1e-9)
        assertEquals(3.64, door.hingeZ, 1e-9)
        val box = HouseSpec.boxes.first { it.id == door.leafId }
        assertEquals(door.centerX, box.x, 1e-4)
        assertEquals(door.centerZ, box.z, 1e-4)
        val closed = InteractMath.swingAabb(door, 0.0)
        val alpha = door.openSign * door.openAngleDeg * PI / 180.0
        val open = InteractMath.swingAabb(door, alpha)
        assertTrue(open.maxX > closed.maxX + 0.4, "open maxX ${open.maxX} closed ${closed.maxX}")
    }

    @Test
    fun tubFillAndSpillUseNpmRates() {
        assertEquals(0.12, HouseInteract.tubFillRate, 1e-12)
        assertEquals(0.12, InteractMath.stepTubFill(0.0, 1.0, plugged = true, faucetOn = true), 1e-12)
        assertEquals(0.0, InteractMath.stepTubFill(0.2, 1.0, plugged = false, faucetOn = true), 1e-12)
        assertEquals(false, InteractMath.isTubSpilling(0.99, plugged = true, faucetOn = true))
        assertEquals(true, InteractMath.isTubSpilling(0.995, plugged = true, faucetOn = true))
        assertEquals(false, InteractMath.isTubSpilling(1.0, plugged = false, faucetOn = true))
        val wet = InteractMath.stepFloorWet(FloorWet(0.0, 0.0), 1.0, 1.0, plugged = true, faucetOn = true)
        assertEquals(0.085, wet.front, 1e-12)
        assertEquals(2.85, InteractMath.overflowWetRadius(1.0), 1e-12)
    }

    @Test
    fun southSpawnRayHitsGenkanAndAWallRayDoesNot() {
        val volumes = closedDoors()
        val spawn = Ray(7.13, 1.5, -2.8, 0.0, 0.0, 1.0)
        assertEquals("genkan", InteractMath.firstHit(spawn, volumes))
        val wall = Ray(1.0, 1.5, -2.0, 0.0, 0.0, 1.0)
        val genkan = volumes.first { it.id == "genkan" }
        assertNull(InteractMath.rayT(wall, genkan.box))
        assertTrue(InteractMath.firstHit(wall, volumes) != "genkan")
    }

    @Test
    fun centerPixelLooksNorthAndScreenRightIsEast() {
        val center = InteractMath.planRay(7.13, 1.5, -2.8, 0.0, 0.0, 640.0, 400.0, 1280.0, 800.0)
        assertEquals(7.13, center.ox, 1e-9)
        assertEquals(0.0, center.dx, 1e-6)
        assertEquals(0.0, center.dy, 1e-6)
        assertEquals(1.0, center.dz, 1e-6)
        assertEquals("genkan", InteractMath.firstHit(center, closedDoors()))
        val right = InteractMath.planRay(7.13, 1.5, -2.8, 0.0, 0.0, 1280.0, 400.0, 1280.0, 800.0)
        assertTrue(right.dx > 0.2, "screen-right dx ${right.dx}")
        assertTrue(right.dz > 0.2, "screen-right dz ${right.dz}")
        val lookingWest = InteractMath.planRay(16.0, 1.5, 3.185, -PI / 2.0, 0.0, 1280.0, 400.0, 1280.0, 800.0)
        assertTrue(lookingWest.dz > 0.2, "east-sheet right should be north, dz ${lookingWest.dz}")
    }

    @Test
    fun closedFoldStaysInTheOpening() {
        val door = HouseInteract.folds.first { it.id == "fold-1f-scl" }
        val panels = InteractMath.foldAabbs(door, 0.0)
        val thin = panels.maxOf { it.maxX } - panels.minOf { it.minX }
        val span = panels.maxOf { it.maxZ } - panels.minOf { it.minZ }
        assertTrue(thin < 0.12, "thickness $thin")
        assertTrue(span > 0.8, "span $span")
        assertNotNull(panels)
    }

    private fun closedDoors(): List<PickVolume> = InteractMath.doorVolumes(
        swingAngle = { 0.0 },
        slideShiftA = { 0.0 },
        slideShiftB = { 0.0 },
        slideCoverA = { false },
        slideCoverB = { false },
        foldAngle = { 0.0 },
        genkanAngle = 0.0,
    )
}
