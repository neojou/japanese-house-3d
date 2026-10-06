package com.neojou.japanesehouse3d.render

import com.neojou.japanesehouse3d.domain.HouseInteract
import com.neojou.japanesehouse3d.domain.HouseSpec
import com.neojou.japanesehouse3d.domain.PickVolume
import com.zakgof.korender.Mesh
import com.zakgof.korender.MeshAttribute
import com.zakgof.korender.ModelInfo
import com.zakgof.korender.math.ColorRGBA
import com.zakgof.korender.math.Transform
import com.zakgof.korender.math.Vec3
import com.zakgof.korender.scope.FrameScope
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.concurrent.Volatile

private val drawerSink = Regex("^Drawer_Sink_\\d+$")
private val drawerL = Regex("^Drawer_L\\d+$")
private val bladeName = Regex("^Blade_\\d+$")
private val mirrorDoor = Regex("^MirrorDoor_[LCR]$")

private class NameNode(val name: String?, val children: List<NameNode>)

private class Snap(
    val name: String?,
    val local: Transform,
    val meshes: List<Pair<Mesh, ModelInfo.Material?>>,
    val children: List<Snap>,
)

/**
 * Korender's ModelInfo nodes have null names, so each GLB is zipped with its
 * own JSON node tree. One hidden Model() keeps the meshes resident. Node
 * motion is applied on the named parent; children inherit it.
 */
internal object HeroLibrary {
    @Volatile
    private var nameMap: Map<String, NameNode> = emptyMap()
    private val snaps = HashMap<String, Snap>()
    private val broken = HashSet<String>()
    private val bounds = HashMap<String, FloatArray>()

    fun ready(file: String): Boolean = snaps[file] != null && file !in broken

    fun offer(file: String, bytes: ByteArray) {
        val tree = nameTree(bytes)
        nameMap = nameMap + (file to tree)
    }

    fun ingest(file: String, info: ModelInfo) {
        if (file in broken) return
        val names = nameMap[file] ?: return
        val root = info.instances.firstOrNull() ?: return
        val snap = zip(root, names, file)
        if (snap == null) {
            broken += file
            snaps.remove(file)
            println("hero $file node tree diverged; drawing the whole model")
            return
        }
        snaps[file] = snap
    }

    fun draw(
        scope: FrameScope,
        hero: HouseSpec.Hero,
        index: Int,
        fixtures: HouseFixtures,
        picks: MutableList<PickVolume>,
    ) {
        val snap = snaps[hero.file] ?: return
        val root = heroTransform(hero)
        walk(scope, snap, Transform(), emptyList(), root, hero, index, fixtures, picks, hero.file)
    }

    private fun walk(
        scope: FrameScope,
        node: Snap,
        parent: Transform,
        ancestors: List<String>,
        root: Transform,
        hero: HouseSpec.Hero,
        index: Int,
        fixtures: HouseFixtures,
        picks: MutableList<PickVolume>,
        path: String,
    ) {
        val names = if (node.name != null) ancestors + node.name else ancestors
        val here = parent * motion(hero.file, index, node.name, node.local, fixtures)
        val world = root * here
        val id = pickId(hero.file, index, names)
        // Korender culls back faces and ignores glTF doubleSided. The X mirror
        // flips winding, so the louver is drawn again with reversed triangles.
        // Its normal map is left off: with that mirror the mesh did not show.
        val louver = hero.file.contains("louver")
        node.meshes.forEachIndexed { prim, (mesh, material) ->
            val key = "$index:$path#$prim"
            val src = material?.color ?: ColorRGBA(0.72f, 0.7f, 0.66f, 1f)
            // Transmission is not in the material info. The louver pane is the
            // only untextured light material; keep it see-through so the blades show.
            val glass = louver && material?.colorTextureResource == null &&
                src.r > 0.7f && src.g > 0.7f && src.b > 0.7f
            val tint = if (glass) ColorRGBA(src.r, src.g, src.b, 0.28f) else src
            val mat = scope.base {
                color = tint
                metallicFactor = material?.metallicFactor ?: 0.05f
                roughnessFactor = material?.roughnessFactor ?: 0.55f
                material?.colorTextureResource?.let { colorTexture = it }
                if (!louver) material?.normalTextureResource?.let { normalTexture = it }
            }
            val seeThrough = tint.a < 0.99f
            val gpu = if (louver) DetachedMesh(mesh) else mesh
            scope.Renderable(mat, scope.mesh(key, gpu), world, transparent = seeThrough)
            if (louver) {
                scope.Renderable(
                    mat,
                    scope.mesh("$key#back", DetachedMesh(mesh, reverse = true)),
                    world,
                    transparent = seeThrough,
                )
            }
            if (id != null) {
                val box = vertexBounds(key, mesh) ?: return@forEachIndexed
                val min = floatArrayOf(box[0], box[1], box[2])
                val max = floatArrayOf(box[3], box[4], box[5])
                picks += PickVolume(id, cornersToPlan(world, min, max))
            }
        }
        node.children.forEach { child ->
            walk(scope, child, here, names, root, hero, index, fixtures, picks, "$path/${child.name ?: "?"}")
        }
    }

    private fun motion(file: String, index: Int, name: String?, local: Transform, fx: HouseFixtures): Transform {
        if (name == null) return local
        return when {
            file.contains("genkan") && name == "Hero_GenkanDoor" -> local * rotY(fx.genkanAngle)
            file.contains("kitchen") && drawerSink.matches(name) -> {
                val i = name.removePrefix("Drawer_Sink_").toIntOrNull() ?: return local
                val dx = (fx.kitchenDrawer(i) * HouseInteract.kitchenDrawerTravel).toFloat()
                local.translate(-dx, 0f, 0f)
            }
            file.contains("ub-bath") && name == "Hero_UbDrainPlug" ->
                local.translate(0f, -fx.plugDrop.toFloat(), 0f)
            file.contains("ub-bath") && name == "Hero_UbDrainButton" ->
                local.translate(0f, -fx.buttonDrop.toFloat(), 0f)
            file.contains("louver") && bladeName.matches(name) -> local * rotZ(fx.bladeRad)
            file.contains("louver") && name == "Operator_Slider" ->
                local.translate(0f, fx.sliderLift.toFloat(), 0f)
            file.contains("piara") && drawerL.matches(name) -> {
                val i = name.removePrefix("Drawer_L").toIntOrNull() ?: return local
                val dz = (fx.piaraDrawer(i) * HouseInteract.piaraDrawerTravel).toFloat()
                local.translate(0f, 0f, -dz)
            }
            file.contains("piara") && name == "CabDoor_R" ->
                local * rotY(-fx.piaraCab * HouseInteract.piaraDoorOpen)
            file.contains("piara") && name == "MirrorDoor_L" ->
                local * rotY(fx.piaraMirror(0) * HouseInteract.piaraMirrorOpen)
            file.contains("piara") && name == "MirrorDoor_C" ->
                local * rotY(fx.piaraMirror(1) * HouseInteract.piaraMirrorOpen)
            file.contains("piara") && name == "MirrorDoor_R" ->
                local * rotY(-fx.piaraMirror(2) * HouseInteract.piaraMirrorOpen)
            file.contains("amage") && name == "Lid" -> local * rotZ(fx.lidAngle(index))
            file.contains("amage") && name == "Seat" -> local * rotZ(fx.seatAngle(index))
            else -> local
        }
    }

    private fun pickId(file: String, index: Int, names: List<String>): String? {
        for (name in names.asReversed()) {
            idFor(file, index, name)?.let { return it }
        }
        return when {
            file.contains("genkan") -> "genkan"
            file.contains("louver") -> "louver"
            else -> null
        }
    }

    private fun idFor(file: String, index: Int, name: String): String? = when {
        file.contains("kitchen") && drawerSink.matches(name) ->
            "kitchen:drawer:${name.removePrefix("Drawer_Sink_")}"
        file.contains("kitchen") && name.startsWith("Hero_KitchenFaucet") -> "kitchen:faucet"
        file.contains("ub-bath") && name.startsWith("Hero_UbFaucet") && !name.contains("Shower") -> "tub:faucet"
        file.contains("ub-bath") && name == "Hero_UbDrainButton" -> "tub:plug"
        file.contains("piara") && drawerL.matches(name) ->
            "piara:drawer:${name.removePrefix("Drawer_L")}"
        file.contains("piara") && name == "CabDoor_R" -> "piara:cab"
        file.contains("piara") && mirrorDoor.matches(name) ->
            "piara:mirror:${"LCR".indexOf(name.last())}"
        file.contains("piara") &&
            (name.startsWith("Hero_PiaraFaucet") || name.startsWith("Hero_PiaraMixer")) -> "piara:faucet"
        file.contains("amage") && (name == "Lid" || name.startsWith("Lid_")) -> "toilet:$index:lid"
        file.contains("amage") && (name == "Seat" || name.startsWith("Seat_")) -> "toilet:$index:seat"
        file.contains("dokodemo") && name.startsWith("Hero_DokodemoFaucet") -> "doko:faucet"
        else -> null
    }

    private fun vertexBounds(key: String, mesh: Mesh): FloatArray? {
        bounds[key]?.let { cached ->
            return if (cached.isEmpty()) null else cached
        }
        var minX = Float.POSITIVE_INFINITY
        var minY = Float.POSITIVE_INFINITY
        var minZ = Float.POSITIVE_INFINITY
        var maxX = Float.NEGATIVE_INFINITY
        var maxY = Float.NEGATIVE_INFINITY
        var maxZ = Float.NEGATIVE_INFINITY
        var count = 0
        for (vertex in mesh.vertices) {
            val p = vertex.pos ?: continue
            count += 1
            if (p.x < minX) minX = p.x
            if (p.y < minY) minY = p.y
            if (p.z < minZ) minZ = p.z
            if (p.x > maxX) maxX = p.x
            if (p.y > maxY) maxY = p.y
            if (p.z > maxZ) maxZ = p.z
        }
        if (count == 0) {
            bounds[key] = floatArrayOf()
            return null
        }
        val box = floatArrayOf(minX, minY, minZ, maxX, maxY, maxZ)
        bounds[key] = box
        return box
    }

    private fun zip(info: ModelInfo.Node, name: NameNode, path: String): Snap? {
        val infoKids = info.children.orEmpty()
        if (infoKids.size != name.children.size) {
            println("hero tree $path '${name.name}' children ${infoKids.size} != ${name.children.size}")
            return null
        }
        val kids = ArrayList<Snap>(infoKids.size)
        for (i in infoKids.indices) {
            val child = zip(infoKids[i], name.children[i], "$path/${name.children[i].name ?: i}") ?: return null
            kids += child
        }
        val meshes = info.renderables.orEmpty().map { it.mesh to it.material }
        return Snap(name.name, info.transform ?: Transform(), meshes, kids)
    }
}

internal fun FrameScope.drawHeroes(fixtures: HouseFixtures) {
    val picks = ArrayList<PickVolume>()
    val files = HouseSpec.heroes.map { it.file }.distinct()
    val ready = files.filter { HeroLibrary.ready(it) }.toSet()
    for (file in ready) {
        Model(
            file,
            Transform().scale(0.001f).translate(0f, -200f, 0f),
            onUpdate = { HeroLibrary.ingest(file, it) },
        )
    }
    HouseSpec.heroes.forEachIndexed { index, hero ->
        if (hero.file in ready) {
            HeroLibrary.draw(this, hero, index, fixtures, picks)
        } else {
            Model(hero.file, heroTransform(hero), onUpdate = { HeroLibrary.ingest(hero.file, it) })
        }
        drawHeroStream(hero, fixtures)
    }
    fixtures.setHeroPicks(picks)
}

private fun FrameScope.drawHeroStream(hero: HouseSpec.Hero, fixtures: HouseFixtures) {
    val stream = when {
        hero.file.contains("kitchen") ->
            Stream(fixtures.kitchenFlow, HouseInteract.kitchenStreamX, HouseInteract.kitchenStreamY, HouseInteract.kitchenStreamZ, HouseInteract.kitchenStreamH)
        hero.file.contains("piara") ->
            Stream(fixtures.piaraFlow, HouseInteract.piaraStreamX, HouseInteract.piaraStreamY, HouseInteract.piaraStreamZ, HouseInteract.piaraStreamH)
        hero.file.contains("dokodemo") ->
            Stream(fixtures.dokoFlow, HouseInteract.dokoStreamX, HouseInteract.dokoStreamY, HouseInteract.dokoStreamZ, HouseInteract.dokoStreamH)
        else -> null
    } ?: return
    if (stream.flow <= 0.04) return
    val local = Transform()
        .translate(0f, (-stream.height / 2.0).toFloat(), 0f)
        .scale(1f, stream.flow.toFloat(), 1f)
        .translate(stream.x.toFloat(), stream.y.toFloat(), stream.z.toFloat())
    val mat = base {
        color = ColorRGBA(0.72f, 0.84f, 0.90f, 0.55f)
        roughnessFactor = 0.05f
        metallicFactor = 0.02f
    }
    Renderable(
        mat,
        cylinderSide(stream.height.toFloat(), 0.0045f, 8),
        heroTransform(hero) * local,
        transparent = true,
    )
}

private class Stream(val flow: Double, val x: Double, val y: Double, val z: Double, val height: Double)

/**
 * Not a Korender CMesh, so the GPU upload copies vertices instead of slicing
 * the GLB buffer a second time (that slice is empty once the hidden Model has
 * rewound it). [reverse] swaps each triangle so the mirrored back faces draw.
 */
private class DetachedMesh(source: Mesh, reverse: Boolean = false) : Mesh {
    override val attributes: List<MeshAttribute<*>> = source.attributes
    override val vertices: List<Mesh.Vertex> = source.vertices
    override val indices: List<Int>? = source.indices?.let { src ->
        if (!reverse) {
            src
        } else {
            object : AbstractList<Int>() {
                override val size: Int = src.size
                override fun get(index: Int): Int {
                    val tri = index - index % 3
                    val corner = index - tri
                    val flipped = if (corner == 0) 0 else 3 - corner
                    return src[tri + flipped]
                }
            }
        }
    }
}

private fun rotY(rad: Double): Transform = Transform().rotate(Vec3.Y, rad.toFloat())

private fun rotZ(rad: Double): Transform = Transform().rotate(Vec3.Z, rad.toFloat())

private fun nameTree(bytes: ByteArray): NameNode {
    require(bytes.size >= 20) { "glb too small" }
    fun u32(at: Int): Int =
        (bytes[at].toInt() and 0xFF) or
            ((bytes[at + 1].toInt() and 0xFF) shl 8) or
            ((bytes[at + 2].toInt() and 0xFF) shl 16) or
            ((bytes[at + 3].toInt() and 0xFF) shl 24)
    require(u32(0) == 0x46546C67) { "not a glb" }
    val jsonLen = u32(12)
    require(u32(16) == 0x4E4F534A) { "missing JSON chunk" }
    val json = bytes.decodeToString(20, 20 + jsonLen)
    val root = Json.parseToJsonElement(json).jsonObject
    val nodes = root["nodes"]?.jsonArray ?: return NameNode(null, emptyList())
    val scenes = root["scenes"]?.jsonArray
    val sceneIdx = root["scene"]?.jsonPrimitive?.int ?: 0
    val sceneNodes = scenes?.getOrNull(sceneIdx)?.jsonObject?.get("nodes")?.jsonArray
    fun build(index: Int): NameNode {
        val node = nodes[index].jsonObject
        val name = node["name"]?.jsonPrimitive?.content
        val children = node["children"]?.jsonArray?.map { build(it.jsonPrimitive.int) } ?: emptyList()
        return NameNode(name, children)
    }
    val roots = sceneNodes?.map { build(it.jsonPrimitive.int) } ?: emptyList()
    return NameNode(null, roots)
}
