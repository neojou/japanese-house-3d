package com.neojou.japanesehouse3d.domain

/**
 * Plan space: +X east, +Z north, +Y up; origin SW of LDK.
 *
 * npm display mirrors house in X (`planToWorldX = width - planX`) so north view
 * matches PDF (LDK left). K2 renderer uses **plan space** for camera + mesh;
 * apply [planToWorldX] only when interop with npm world or future mirror group.
 */
fun planToWorldX(planX: Double): Double = Building.width - planX

fun worldToPlanX(worldX: Double): Double = Building.width - worldX
