package com.neojou.japanesehouse3d.domain

/**
 * Subset of npm `src/data/dimensions.ts` — K1/K2 shell only.
 * Numbers must stay aligned with TS tests in DomainParityTest.
 */
object Building {
    const val width = HouseSpec.width
    const val depth = HouseSpec.depth
    const val wallThickness = HouseSpec.wallThickness
    const val wallHeight = HouseSpec.wallHeight
    const val floorHeight = HouseSpec.floorHeight
}

object FloorLevels {
    const val grade = HouseSpec.grade
    const val interior1f = HouseSpec.interior1f
    const val story2f = HouseSpec.story2f
    const val ph = HouseSpec.ph
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
    const val ldkE = HouseSpec.ldkE
    const val genkanE = HouseSpec.genkanE
    const val sclE = HouseSpec.sclE
    const val east = Building.width // 10.92
}

object PlanZ {
    const val south = 0.0
    /** Genkan / SCL south plane */
    const val recess = HouseSpec.recessZ
    const val wetS = 4.55
    const val north = Building.depth // 6.37
    const val ubSouth = HouseSpec.ubSouthZ
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
    const val eyeHeight = HouseSpec.eyeHeight
    const val moveSpeed = HouseSpec.moveSpeed
    const val turnDegrees = HouseSpec.turnDegrees
    const val lookSensitivity = HouseSpec.lookSensitivity
    const val pitchLimitDeg = 85.0
    /** Plan-space spawn (npm PLAYER.spawn) */
    const val spawnX = HouseSpec.spawnX
    const val spawnY = FloorLevels.grade
    const val spawnZ = HouseSpec.spawnZ
    /** Looking north (+Z) */
    const val spawnYaw = 0.0
}
