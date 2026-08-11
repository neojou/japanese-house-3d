package com.neojou.japanesehouse3d.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class DomainParityTest {

    @Test
    fun buildingMatchesNpm() {
        assertEquals(10.92, Building.width, 1e-9)
        assertEquals(6.37, Building.depth, 1e-9)
        assertEquals(0.15, Building.wallThickness, 1e-9)
        assertEquals(2.5, Building.wallHeight, 1e-9)
        assertEquals(2.7, FloorLevels.story2f, 1e-9)
        assertEquals(5.4, FloorLevels.ph, 1e-9)
        assertEquals(0.5, FloorLevels.interior1f, 1e-9)
    }

    @Test
    fun southFacadeBreaks() {
        assertEquals(6.37, PlanX.ldkE, 1e-9)
        assertEquals(7.89, PlanX.genkanE, 1e-9)
        assertEquals(9.10, PlanX.sclE, 1e-6)
        assertEquals(2.83, PlanZ.recess, 1e-9)
    }

    @Test
    fun planToWorldXMirrors() {
        assertEquals(Building.width, planToWorldX(0.0), 1e-9)
        assertEquals(0.0, planToWorldX(Building.width), 1e-9)
        assertEquals(Building.width / 2, planToWorldX(Building.width / 2), 1e-9)
        assertEquals(5.0, worldToPlanX(planToWorldX(5.0)), 1e-9)
    }

    @Test
    fun spawnMatchesNpm() {
        assertEquals((6.37 + 7.89) / 2.0, PlayerDefaults.spawnX, 1e-9)
        assertEquals(-2.8, PlayerDefaults.spawnZ, 1e-9)
        assertEquals(1.5, PlayerDefaults.eyeHeight, 1e-9)
    }

    @Test
    fun heightOutdoorIsGrade() {
        val y = Height.groundY(PlayerDefaults.spawnX, PlayerDefaults.spawnZ, 0.0)
        assertEquals(0.0, y, 1e-9)
    }

    @Test
    fun heightInteriorRaised() {
        val y = Height.groundY(3.0, 3.0, 0.5)
        assertEquals(0.5, y, 1e-9)
    }

    @Test
    fun playerMovesNorthOnYawZero() {
        val s0 = PlayerState().withGround()
        val s1 = PlayerSim.stepMove(s0, forward = 1.0, dt = 1.0, speed = 2.0)
        assertTrue(s1.z > s0.z, "yaw=0 should increase Z (north)")
        assertEquals(s0.x, s1.x, 1e-6)
    }

    @Test
    fun shellHasBoxes() {
        assertTrue(Shell1F.boxes().size >= 8)
    }
}
