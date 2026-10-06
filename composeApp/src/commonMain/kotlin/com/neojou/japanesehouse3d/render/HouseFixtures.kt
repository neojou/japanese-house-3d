package com.neojou.japanesehouse3d.render

import com.neojou.japanesehouse3d.domain.Aabb
import com.neojou.japanesehouse3d.domain.FloorWet
import com.neojou.japanesehouse3d.domain.HouseInteract
import com.neojou.japanesehouse3d.domain.InteractMath
import com.neojou.japanesehouse3d.domain.PickVolume
import kotlin.concurrent.Volatile
import kotlin.math.PI

/**
 * Click state for doors, faucets, and tub water. Angles stay in plan space.
 * The render mirror is applied only when drawing.
 */
class HouseFixtures {
    private val swingOpen = HashMap<String, Boolean>()
    private val swingAngle = HashMap<String, Double>()
    private val foldOpen = HashMap<String, Boolean>()
    private val foldAngle = HashMap<String, Double>()
    private val slides = HouseInteract.slides.associate { it.id to SlideRuntime() }

    var genkanOpen = false
    var genkanAngle = 0.0
        private set

    private val kitchenDrawerOpen = BooleanArray(8)
    private val kitchenDrawerT = DoubleArray(8)
    var kitchenOn = false
    var kitchenFlow = 0.001
        private set

    var tubFaucet = false
    var tubPlugged = true
    var tubFill = 0.0
        private set
    var tubFlow = 0.0
        private set
    var plugT = 0.0
        private set
    var floorWet = FloorWet(0.0, 0.0)
        private set

    var louverOpen = false
    var louverT = 0.0
        private set

    private val piaraDrawerOpen = BooleanArray(6)
    private val piaraDrawerT = DoubleArray(6)
    var piaraCabOpen = false
    var piaraCab = 0.0
        private set
    private val piaraMirrorOpen = BooleanArray(3)
    private val piaraMirrorT = DoubleArray(3)
    var piaraOn = false
    var piaraFlow = 0.001
        private set

    private val lidOpen = HashMap<Int, Boolean>()
    private val seatOpen = HashMap<Int, Boolean>()
    private val lidAngle = HashMap<Int, Double>()
    private val seatAngle = HashMap<Int, Double>()

    var dokoOn = false
    var dokoFlow = 0.001
        private set

    @Volatile
    private var heroPicks: List<PickVolume> = emptyList()

    fun setHeroPicks(picks: List<PickVolume>) {
        heroPicks = picks
    }

    fun pickVolumes(): List<PickVolume> {
        val doors = InteractMath.doorVolumes(
            swingAngle = { swingAngle[it] ?: 0.0 },
            slideShiftA = { slideShift(it).first },
            slideShiftB = { slideShift(it).second },
            slideCoverA = { coveredA(it) },
            slideCoverB = { coveredB(it) },
            foldAngle = { foldAngle[it] ?: 0.0 },
            genkanAngle = genkanAngle,
        )
        return doors + heroPicks
    }

    fun swingAngle(id: String): Double = swingAngle[id] ?: 0.0

    fun foldAngle(id: String): Double = foldAngle[id] ?: 0.0

    fun slideShift(id: String): Pair<Double, Double> {
        val door = HouseInteract.slides.first { it.id == id }
        val st = slides.getValue(id)
        return InteractMath.slideShift(door, st.tA, st.tB, st.pocket)
    }

    fun kitchenDrawer(index: Int): Double = kitchenDrawerT.getOrElse(index) { 0.0 }

    fun piaraDrawer(index: Int): Double = piaraDrawerT.getOrElse(index) { 0.0 }

    fun piaraMirror(index: Int): Double = piaraMirrorT.getOrElse(index) { 0.0 }

    fun lidAngle(index: Int): Double = lidAngle[index] ?: 0.0

    fun seatAngle(index: Int): Double = seatAngle[index] ?: 0.0

    val bladeRad: Double
        get() {
            val deg = HouseInteract.louverClosedDeg +
                (HouseInteract.louverOpenDeg - HouseInteract.louverClosedDeg) * louverT
            return deg * PI / 180.0
        }

    val sliderLift: Double get() = HouseInteract.louverSliderTravel * louverT

    val plugDrop: Double get() = plugT * HouseInteract.tub.plugTravel

    val buttonDrop: Double get() = plugT * HouseInteract.tub.buttonTravel

    /** Snap fixtures open so a capture does not wait on the damper. */
    fun presetDemo() {
        genkanOpen = true
        genkanAngle = HouseInteract.genkan.openRad
        kitchenOn = true
        kitchenFlow = 1.0
        tubFaucet = true
        tubPlugged = true
        tubFill = 0.72
        tubFlow = 1.0
        louverOpen = true
        louverT = 1.0
    }

    fun toggle(id: String) {
        when {
            id == "genkan" -> genkanOpen = !genkanOpen
            id == "kitchen:faucet" -> kitchenOn = !kitchenOn
            id.startsWith("kitchen:drawer:") -> {
                val index = id.substringAfterLast(':').toIntOrNull() ?: return
                if (index in kitchenDrawerOpen.indices) kitchenDrawerOpen[index] = !kitchenDrawerOpen[index]
            }
            id == "tub:faucet" -> tubFaucet = !tubFaucet
            id == "tub:plug" -> tubPlugged = !tubPlugged
            id == "louver" -> louverOpen = !louverOpen
            id == "piara:cab" -> piaraCabOpen = !piaraCabOpen
            id == "piara:faucet" -> piaraOn = !piaraOn
            id.startsWith("piara:drawer:") -> {
                val index = id.substringAfterLast(':').toIntOrNull() ?: return
                if (index in piaraDrawerOpen.indices) piaraDrawerOpen[index] = !piaraDrawerOpen[index]
            }
            id.startsWith("piara:mirror:") -> {
                val index = id.substringAfterLast(':').toIntOrNull() ?: return
                if (index in piaraMirrorOpen.indices) piaraMirrorOpen[index] = !piaraMirrorOpen[index]
            }
            id.startsWith("toilet:") -> toggleToilet(id)
            id == "doko:faucet" -> dokoOn = !dokoOn
            id.endsWith("__A") || id.endsWith("__B") -> toggleSlide(id)
            swingOpen.containsKey(id) || HouseInteract.swings.any { it.id == id } ->
                swingOpen[id] = !(swingOpen[id] ?: false)
            foldOpen.containsKey(id) || HouseInteract.folds.any { it.id == id } ->
                foldOpen[id] = !(foldOpen[id] ?: false)
            slides.containsKey(id) -> {
                val st = slides.getValue(id)
                st.a = !st.a
            }
        }
    }

    fun step(dt: Double) {
        if (dt <= 0.0) return
        for (door in HouseInteract.swings) {
            val open = swingOpen[door.id] ?: false
            val target = if (open) door.openSign * door.openAngleDeg * PI / 180.0 else 0.0
            swingAngle[door.id] = InteractMath.damp(swingAngle[door.id] ?: 0.0, target, HouseInteract.swingDamp, dt)
        }
        for (door in HouseInteract.folds) {
            val open = foldOpen[door.id] ?: false
            val target = if (open) door.openSign * door.openAngleDeg * PI / 180.0 else 0.0
            foldAngle[door.id] = InteractMath.damp(foldAngle[door.id] ?: 0.0, target, HouseInteract.foldDamp, dt)
        }
        for (door in HouseInteract.slides) {
            val st = slides.getValue(door.id)
            st.tA = InteractMath.damp(st.tA, if (st.a) 1.0 else 0.0, HouseInteract.slideDamp, dt)
            st.tB = InteractMath.damp(st.tB, if (st.b) 1.0 else 0.0, HouseInteract.slideDamp, dt)
            st.pocket = InteractMath.damp(st.pocket, if (st.a) 1.0 else 0.0, HouseInteract.slideDamp, dt)
        }
        genkanAngle = InteractMath.damp(
            genkanAngle,
            if (genkanOpen) HouseInteract.genkan.openRad else 0.0,
            HouseInteract.genkanDamp,
            dt,
        )
        for (i in kitchenDrawerT.indices) {
            kitchenDrawerT[i] = InteractMath.damp(
                kitchenDrawerT[i],
                if (kitchenDrawerOpen[i]) 1.0 else 0.0,
                HouseInteract.drawerDamp,
                dt,
            )
        }
        kitchenFlow = InteractMath.damp(kitchenFlow, if (kitchenOn) 1.0 else 0.001, HouseInteract.streamDamp, dt)
        tubFill = InteractMath.stepTubFill(tubFill, dt, tubPlugged, tubFaucet)
        floorWet = InteractMath.stepFloorWet(floorWet, dt, tubFill, tubPlugged, tubFaucet)
        tubFlow = InteractMath.damp(tubFlow, if (tubFaucet) 1.0 else 0.0, HouseInteract.streamDamp, dt)
        plugT = InteractMath.damp(plugT, if (tubPlugged) 0.0 else 1.0, HouseInteract.plugDamp, dt)
        louverT = InteractMath.damp(louverT, if (louverOpen) 1.0 else 0.0, HouseInteract.louverDamp, dt)
        for (i in piaraDrawerT.indices) {
            piaraDrawerT[i] = InteractMath.damp(
                piaraDrawerT[i],
                if (piaraDrawerOpen[i]) 1.0 else 0.0,
                HouseInteract.drawerDamp,
                dt,
            )
        }
        piaraCab = InteractMath.damp(piaraCab, if (piaraCabOpen) 1.0 else 0.0, HouseInteract.swingDamp, dt)
        for (i in piaraMirrorT.indices) {
            piaraMirrorT[i] = InteractMath.damp(
                piaraMirrorT[i],
                if (piaraMirrorOpen[i]) 1.0 else 0.0,
                HouseInteract.swingDamp,
                dt,
            )
        }
        piaraFlow = InteractMath.damp(piaraFlow, if (piaraOn) 1.0 else 0.001, HouseInteract.streamDamp, dt)
        val toiletIds = (lidOpen.keys + seatOpen.keys + lidAngle.keys + seatAngle.keys).toSet()
        for (index in toiletIds) {
            val lidTarget = if (lidOpen[index] == true) HouseInteract.lidOpenRad else 0.0
            val seatTarget = if (seatOpen[index] == true) HouseInteract.seatOpenRad else 0.0
            lidAngle[index] = InteractMath.damp(lidAngle[index] ?: 0.0, lidTarget, HouseInteract.toiletDamp, dt)
            seatAngle[index] = InteractMath.damp(seatAngle[index] ?: 0.0, seatTarget, HouseInteract.toiletDamp, dt)
        }
        dokoFlow = InteractMath.damp(dokoFlow, if (dokoOn) 1.0 else 0.001, HouseInteract.streamDamp, dt)
    }

    private fun toggleSlide(id: String) {
        val leafA = id.endsWith("__A")
        val key = if (leafA) id.removeSuffix("__A") else id.removeSuffix("__B")
        val door = HouseInteract.slides.firstOrNull { it.id == key } ?: return
        val st = slides.getValue(key)
        if (!door.overlap) {
            st.a = !st.a
            return
        }
        if (leafA) {
            st.a = !st.a
            st.b = false
        } else {
            st.b = !st.b
            st.a = false
        }
    }

    private fun toggleToilet(id: String) {
        val parts = id.split(':')
        if (parts.size != 3) return
        val index = parts[1].toIntOrNull() ?: return
        val part = parts[2]
        if (part == "lid") {
            val open = lidOpen[index] == true
            lidOpen[index] = !open
            if (open) seatOpen[index] = false
            return
        }
        if (part == "seat") {
            if (lidOpen[index] != true) {
                lidOpen[index] = true
                seatOpen[index] = false
            } else {
                seatOpen[index] = seatOpen[index] != true
            }
        }
    }

    private fun coveredA(id: String): Boolean {
        val door = HouseInteract.slides.firstOrNull { it.id == id } ?: return false
        return door.overlap && slides.getValue(id).b
    }

    private fun coveredB(id: String): Boolean {
        val door = HouseInteract.slides.firstOrNull { it.id == id } ?: return false
        return door.overlap && slides.getValue(id).a
    }

    private class SlideRuntime(
        var a: Boolean = false,
        var b: Boolean = false,
        var tA: Double = 0.0,
        var tB: Double = 0.0,
        var pocket: Double = 0.0,
    )
}

/** Plan AABB written back from a drawn mesh so the click uses the same transform. */
internal fun cornersToPlan(world: com.zakgof.korender.math.Transform, min: FloatArray, max: FloatArray): Aabb {
    val width = com.neojou.japanesehouse3d.domain.HouseSpec.width
    var minX = Double.POSITIVE_INFINITY
    var minY = Double.POSITIVE_INFINITY
    var minZ = Double.POSITIVE_INFINITY
    var maxX = Double.NEGATIVE_INFINITY
    var maxY = Double.NEGATIVE_INFINITY
    var maxZ = Double.NEGATIVE_INFINITY
    val xs = floatArrayOf(min[0], max[0])
    val ys = floatArrayOf(min[1], max[1])
    val zs = floatArrayOf(min[2], max[2])
    for (x in xs) {
        for (y in ys) {
            for (z in zs) {
                val p = world * com.zakgof.korender.math.Vec3(x, y, z)
                val planX = width - p.x
                if (planX < minX) minX = planX
                if (p.y < minY) minY = p.y.toDouble()
                if (p.z < minZ) minZ = p.z.toDouble()
                if (planX > maxX) maxX = planX
                if (p.y > maxY) maxY = p.y.toDouble()
                if (p.z > maxZ) maxZ = p.z.toDouble()
            }
        }
    }
    return Aabb(minX, minY, minZ, maxX, maxY, maxZ)
}
