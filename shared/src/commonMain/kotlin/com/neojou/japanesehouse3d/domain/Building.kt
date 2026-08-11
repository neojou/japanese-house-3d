package com.neojou.japanesehouse3d.domain

/**
 * Subset of npm `src/data/dimensions.ts` — K1/K2 shell only.
 * Numbers must stay aligned with TS tests in DomainParityTest.
 */
object Building {
    const val width = 10.92
    const val depth = 6.37
    const val wallThickness = 0.15
    const val wallHeight = 2.5
    const val floorHeight = 2.7
}

object FloorLevels {
    const val grade = 0.0
    const val interior1f = 0.5
    const val story2f = Building.floorHeight // 2.7
    const val ph = Building.floorHeight * 2 // 5.4
}

/** South façade breaks (west → east), meters. */
object SouthFacade {
    const val ldkA = 2.175
    const val ldkB = 4.195
    const val genkanDoor = 1.52
    const val sclSouth = 1.21
    const val ubSouth = 1.82
}

object PlanX {
    const val west = 0.0
    const val ldkE = SouthFacade.ldkA + SouthFacade.ldkB // 6.37 genkan W
    const val genkanE = ldkE + SouthFacade.genkanDoor // 7.89
    const val sclE = genkanE + SouthFacade.sclSouth // 9.10
    const val east = Building.width // 10.92
}

object PlanZ {
    const val south = 0.0
    /** Genkan / SCL south plane */
    const val recess = 2.83
    const val wetS = 4.55
    const val north = Building.depth // 6.37
    const val ubSouth = 2.72
}

object Genkan {
    const val doorWidth = SouthFacade.genkanDoor
    const val doorHeight = 2.15
    const val sill = FloorLevels.interior1f
    /** Opening along X on south wall at z = recess */
    val doorX0 = PlanX.ldkE
    val doorX1 = PlanX.genkanE
    val doorZ = PlanZ.recess
}

object PlayerDefaults {
    const val eyeHeight = 1.5
    const val moveSpeed = 2.0
    const val turnDegrees = 10.0
    const val lookSensitivity = 0.002
    const val pitchLimitDeg = 85.0
    /** Plan-space spawn (npm PLAYER.spawn) */
    const val spawnX = (PlanX.ldkE + PlanX.genkanE) / 2.0
    const val spawnY = FloorLevels.grade
    const val spawnZ = -2.8
    /** Looking north (+Z) */
    const val spawnYaw = 0.0
}
