package com.neojou.japanesehouse3d.domain

/**
 * Axis-aligned box in plan space (meters).
 * Center (cx, cy, cz); full size (sx, sy, sz).
 */
data class Box3(
    val cx: Double,
    val cy: Double,
    val cz: Double,
    val sx: Double,
    val sy: Double,
    val sz: Double,
    val colorArgb: Long = 0xFFE8E0D4,
) {
    fun corners(): List<Triple<Double, Double, Double>> {
        val hx = sx / 2
        val hy = sy / 2
        val hz = sz / 2
        return listOf(
            Triple(cx - hx, cy - hy, cz - hz),
            Triple(cx + hx, cy - hy, cz - hz),
            Triple(cx + hx, cy + hy, cz - hz),
            Triple(cx - hx, cy + hy, cz - hz),
            Triple(cx - hx, cy - hy, cz + hz),
            Triple(cx + hx, cy - hy, cz + hz),
            Triple(cx + hx, cy + hy, cz + hz),
            Triple(cx - hx, cy + hy, cz + hz),
        )
    }
}

/**
 * Minimal 1F architectural shell for K2 (not full WALLS_1F export).
 */
object Shell1F {
    private const val T = Building.wallThickness
    private const val H = Building.wallHeight
    private val yWall = FloorLevels.interior1f + H / 2
    private val yFloor = FloorLevels.interior1f / 2

    fun boxes(): List<Box3> {
        val list = mutableListOf<Box3>()
        val ivory = 0xFFF2EDE4
        val floorCol = 0xFFD4C4A8
        val groundCol = 0xFF8A9A7A
        val roofHint = 0xFFE0D8CC

        // Outdoor ground pad
        list += Box3(
            Building.width / 2, -0.05, -1.5,
            Building.width + 4, 0.1, 6.0,
            groundCol,
        )

        // Interior floor slab (full footprint, simplified)
        list += Box3(
            Building.width / 2, yFloor, Building.depth / 2,
            Building.width, FloorLevels.interior1f, Building.depth,
            floorCol,
        )

        // South wall z=0: LDK only (x 0–6.37)
        list += wallEW(0.0, PlanX.ldkE, PlanZ.south, ivory)

        // South wall genkan/SCL at z=recess (with door gap)
        list += wallEW(PlanX.ldkE, Genkan.doorX0, PlanZ.recess, ivory) // none if equal
        // Left of door (none — door starts at ldkE)
        // Right of door: genkanE → east on recess + UB south jog
        list += wallEW(Genkan.doorX1, PlanX.sclE, PlanZ.recess, ivory)
        // UB south at z=ubSouth for x sclE–east
        list += wallEW(PlanX.sclE, PlanX.east, PlanZ.ubSouth, ivory)

        // North wall
        list += wallEW(0.0, PlanX.east, PlanZ.north, ivory)

        // West wall
        list += wallNS(PlanX.west, PlanZ.south, PlanZ.north, ivory)

        // East wall
        list += wallNS(PlanX.east, PlanZ.ubSouth, PlanZ.north, ivory)
        // East wall south jog for parking recess (LDK SE to genkan)
        list += wallNS(PlanX.ldkE, PlanZ.south, PlanZ.recess, ivory)

        // Genkan west interior (partial) — LDK | genkan
        list += wallNS(PlanX.ldkE, PlanZ.recess, PlanZ.north, ivory)

        // Light roof slab hint (thin)
        list += Box3(
            Building.width / 2, FloorLevels.interior1f + H + 0.05, Building.depth / 2,
            Building.width + 0.2, 0.08, Building.depth + 0.2,
            roofHint,
        )

        return list.filter { it.sx > 1e-6 && it.sz > 1e-6 }
    }

    private fun wallEW(x0: Double, x1: Double, z: Double, color: Long): Box3 {
        val xA = minOf(x0, x1)
        val xB = maxOf(x0, x1)
        return Box3(
            (xA + xB) / 2, yWall, z,
            (xB - xA).coerceAtLeast(T), H, T,
            color,
        )
    }

    private fun wallNS(x: Double, z0: Double, z1: Double, color: Long): Box3 {
        val zA = minOf(z0, z1)
        val zB = maxOf(z0, z1)
        return Box3(
            x, yWall, (zA + zB) / 2,
            T, H, (zB - zA).coerceAtLeast(T),
            color,
        )
    }
}
