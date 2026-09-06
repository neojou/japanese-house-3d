package com.neojou.japanesehouse3d.render

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.float
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

data class GlbTri(
    val ax: Float,
    val ay: Float,
    val az: Float,
    val bx: Float,
    val by: Float,
    val bz: Float,
    val cx: Float,
    val cy: Float,
    val cz: Float,
    val argb: Int,
)

private const val MAGIC = 0x46546C67
private const val JSON_CHUNK = 0x4E4F534A
private const val BIN_CHUNK = 0x004E4942
private const val FLOAT = 5126
private const val UINT = 5125
private const val MAX_TRIS = 40_000

private class LeReader(val bytes: ByteArray, var pos: Int = 0) {
    fun u32(): Int {
        val b = bytes
        val p = pos
        val v =
            (b[p].toInt() and 0xFF) or
                ((b[p + 1].toInt() and 0xFF) shl 8) or
                ((b[p + 2].toInt() and 0xFF) shl 16) or
                ((b[p + 3].toInt() and 0xFF) shl 24)
        pos = p + 4
        return v
    }

    fun u16(): Int {
        val b = bytes
        val p = pos
        val v = (b[p].toInt() and 0xFF) or ((b[p + 1].toInt() and 0xFF) shl 8)
        pos = p + 2
        return v
    }

    fun f32(): Float = Float.fromBits(u32())

    fun take(n: Int): ByteArray {
        val sl = bytes.copyOfRange(pos, pos + n)
        pos += n
        return sl
    }
}

/**
 * Parse a glTF 2 binary (Y-up, plan meters) into world-space triangles.
 * Not SoftRenderer — a dedicated GLB path. Throws if the file is not glTF.
 */
fun parseHouseGlb(bytes: ByteArray): List<GlbTri> {
    require(bytes.size >= 20) { "glb too small" }
    val le = LeReader(bytes)
    require(le.u32() == MAGIC) { "not a glb" }
    le.u32()
    le.u32()
    val jsonLen = le.u32()
    require(le.u32() == JSON_CHUNK) { "missing JSON chunk" }
    val jsonStr = le.take(jsonLen).decodeToString()
    val pad = (4 - jsonLen % 4) % 4
    le.pos += pad
    val binLen = le.u32()
    require(le.u32() == BIN_CHUNK) { "missing BIN chunk" }
    val bin = le.take(binLen)

    val root = Json.parseToJsonElement(jsonStr).jsonObject
    val accessors = root["accessors"]?.jsonArray ?: JsonArray(emptyList())
    val views = root["bufferViews"]?.jsonArray ?: JsonArray(emptyList())
    val meshes = root["meshes"]?.jsonArray ?: JsonArray(emptyList())
    val nodes = root["nodes"]?.jsonArray ?: JsonArray(emptyList())
    val materials = root["materials"]?.jsonArray ?: JsonArray(emptyList())
    val scenes = root["scenes"]?.jsonArray ?: JsonArray(emptyList())
    val sceneIdx = root["scene"]?.jsonPrimitive?.int ?: 0
    val sceneNodes =
        scenes.getOrNull(sceneIdx)?.jsonObject?.get("nodes")?.jsonArray
            ?: JsonArray(emptyList())

    val out = ArrayList<GlbTri>(4096)

    fun accView(acc: JsonObject): Pair<Int, Int> {
        val viewI = acc["bufferView"]!!.jsonPrimitive.int
        val v = views[viewI].jsonObject
        val off =
            (v["byteOffset"]?.jsonPrimitive?.int ?: 0) +
                (acc["byteOffset"]?.jsonPrimitive?.int ?: 0)
        return off to acc["count"]!!.jsonPrimitive.int
    }

    fun readFloat3(accI: Int): Array<FloatArray> {
        val a = accessors[accI].jsonObject
        require(a["componentType"]!!.jsonPrimitive.int == FLOAT)
        val (off, count) = accView(a)
        val r = LeReader(bin, off)
        return Array(count) { floatArrayOf(r.f32(), r.f32(), r.f32()) }
    }

    fun readIndices(accI: Int): IntArray {
        val a = accessors[accI].jsonObject
        val ct = a["componentType"]!!.jsonPrimitive.int
        val (off, count) = accView(a)
        val r = LeReader(bin, off)
        return IntArray(count) {
            if (ct == UINT) r.u32() else r.u16()
        }
    }

    fun matColor(mi: Int?): Int {
        if (mi == null || mi !in materials.indices) return 0xFFF2EDE4.toInt()
        val pbr = materials[mi].jsonObject["pbrMetallicRoughness"]?.jsonObject
        val f = pbr?.get("baseColorFactor")?.jsonArray
        if (f == null || f.size < 3) return 0xFFF2EDE4.toInt()
        val r = (f[0].jsonPrimitive.float.coerceIn(0f, 1f) * 255f).toInt()
        val g = (f[1].jsonPrimitive.float.coerceIn(0f, 1f) * 255f).toInt()
        val b = (f[2].jsonPrimitive.float.coerceIn(0f, 1f) * 255f).toInt()
        return (0xFF shl 24) or (r shl 16) or (g shl 8) or b
    }

    data class Xf(
        val tx: Float,
        val ty: Float,
        val tz: Float,
        val rx: Float,
        val ry: Float,
        val rz: Float,
        val rw: Float,
        val sx: Float,
        val sy: Float,
        val sz: Float,
    ) {
        fun apply(x: Float, y: Float, z: Float): FloatArray {
            var px = x * sx
            var py = y * sy
            var pz = z * sz
            val ix = rw * px + ry * pz - rz * py
            val iy = rw * py + rz * px - rx * pz
            val iz = rw * pz + rx * py - ry * px
            val iw = -rx * px - ry * py - rz * pz
            px = ix * rw + iw * -rx + iy * -rz - iz * -ry
            py = iy * rw + iw * -ry + iz * -rx - ix * -rz
            pz = iz * rw + iw * -rz + ix * -ry - iy * -rx
            return floatArrayOf(px + tx, py + ty, pz + tz)
        }

        fun times(c: Xf): Xf {
            val p = apply(c.tx, c.ty, c.tz)
            val q = quatMul(rx, ry, rz, rw, c.rx, c.ry, c.rz, c.rw)
            return Xf(
                p[0], p[1], p[2],
                q[0], q[1], q[2], q[3],
                sx * c.sx, sy * c.sy, sz * c.sz,
            )
        }
    }

    fun nodeXf(n: JsonObject): Xf {
        val t = n["translation"]?.jsonArray
        val r = n["rotation"]?.jsonArray
        val s = n["scale"]?.jsonArray
        return Xf(
            t.f(0, 0f), t.f(1, 0f), t.f(2, 0f),
            r.f(0, 0f), r.f(1, 0f), r.f(2, 0f), r.f(3, 1f),
            s.f(0, 1f), s.f(1, 1f), s.f(2, 1f),
        )
    }

    fun emitMesh(meshI: Int, xf: Xf) {
        if (out.size >= MAX_TRIS) return
        val primitives = meshes[meshI].jsonObject["primitives"]?.jsonArray ?: return
        for (primEl in primitives) {
            val prim = primEl.jsonObject
            val attrs = prim["attributes"]?.jsonObject ?: continue
            val posI = attrs["POSITION"]?.jsonPrimitive?.int ?: continue
            val idxI = prim["indices"]?.jsonPrimitive?.int ?: continue
            val col = matColor(prim["material"]?.jsonPrimitive?.int)
            val pos = readFloat3(posI)
            val idx = readIndices(idxI)
            var i = 0
            while (i + 2 < idx.size && out.size < MAX_TRIS) {
                val ia = idx[i]
                val ib = idx[i + 1]
                val ic = idx[i + 2]
                val a = xf.apply(pos[ia][0], pos[ia][1], pos[ia][2])
                val b = xf.apply(pos[ib][0], pos[ib][1], pos[ib][2])
                val c = xf.apply(pos[ic][0], pos[ic][1], pos[ic][2])
                out += GlbTri(
                    a[0], a[1], a[2],
                    b[0], b[1], b[2],
                    c[0], c[1], c[2],
                    col,
                )
                i += 3
            }
        }
    }

    fun walk(nodeI: Int, parent: Xf) {
        if (out.size >= MAX_TRIS) return
        val n = nodes[nodeI].jsonObject
        val xf = parent.times(nodeXf(n))
        n["mesh"]?.jsonPrimitive?.int?.let { emitMesh(it, xf) }
        n["children"]?.jsonArray?.forEach { ch ->
            walk(ch.jsonPrimitive.int, xf)
        }
    }

    val ident = Xf(0f, 0f, 0f, 0f, 0f, 0f, 1f, 1f, 1f, 1f)
    for (el in sceneNodes) {
        walk(el.jsonPrimitive.int, ident)
    }
    return out
}

private fun JsonArray?.f(i: Int, d: Float): Float {
    if (this == null || i >= size) return d
    return this[i].jsonPrimitive.float
}

private fun quatMul(
    ax: Float, ay: Float, az: Float, aw: Float,
    bx: Float, by: Float, bz: Float, bw: Float,
): FloatArray = floatArrayOf(
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
)
