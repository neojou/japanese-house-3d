package com.neojou.japanesehouse3d.render

import com.neojou.japanesehouse3d.domain.HouseSpec
import com.neojou.japanesehouse3d.domain.PlayerSim
import com.neojou.japanesehouse3d.domain.PlayerState
import com.zakgof.korender.Material
import com.zakgof.korender.math.ColorRGB
import com.zakgof.korender.math.ColorRGBA
import com.zakgof.korender.math.Transform
import com.zakgof.korender.math.Vec3
import com.zakgof.korender.scope.FrameScope
import kotlin.math.PI
import kotlin.math.tan

private const val BELL_ALBEDO = "textures/bellart-travertine/albedo.jpg"
private const val BELL_NORMAL = "textures/bellart-travertine/normal.png"

/**
 * Walk state stays in plan space (yaw 0 looks +Z). Drawing uses the same X
 * mirror as the npm house group: worldX = width - planX, so looking north
 * puts LDK on the left and the genkan on the right. Sun stays in npm world
 * space. Bell Art albedo is already #8e7363; the stucco tint stays white.
 */
fun FrameScope.drawHouse(player: PlayerState) {
    val (dx, dy, dz) = PlayerSim.lookDirection(player)
    camera = camera(
        Vec3(worldX(player.x), player.eyeY.toFloat(), player.z.toFloat()),
        Vec3(-dx.toFloat(), dy.toFloat(), dz.toFloat()),
        Vec3.Y,
    )
    val near = 0.08f
    val far = 200f
    val half = (near * tan(70.0 * PI / 360.0)).toFloat()
    val aspect = if (height > 0) width.toFloat() / height.toFloat() else 1.5f
    projection = projection(half * 2f * aspect, half * 2f, near, far, frustum())

    background = ColorRGBA(197f / 255f, 208f / 255f, 220f / 255f, 1f)
    Sky(
        fastCloudSky(
            density = 2.2f,
            thickness = 8f,
            scale = 1.1f,
            zenithColor = ColorRGB(0x8FA8C8),
            horizonColor = ColorRGB(0xC5D0DC),
            cloudLight = 0.95f,
            cloudDark = 0.62f,
        ),
    )

    val sunColor = ColorRGB(
        HouseSpec.sunR.toFloat(),
        HouseSpec.sunG.toFloat(),
        HouseSpec.sunB.toFloat(),
    ) * HouseSpec.sunIntensity.toFloat()
    val shadow = hardwarePcf()
    DirectionalLight(
        Vec3(
            -HouseSpec.sunX.toFloat(),
            -HouseSpec.sunY.toFloat(),
            -HouseSpec.sunZ.toFloat(),
        ),
        sunColor,
    ) {
        Cascade(2048, 0.5f, 36f, algorithm = shadow)
    }
    // One ambient stands in for npm ambient 0.32 plus hemi sky/ground at 0.4.
    AmbientLight(ColorRGB(0.615f, 0.618f, 0.609f))
    for (fill in HouseSpec.fills) {
        val dist = fill.distance.toFloat().coerceAtLeast(0.5f)
        PointLight(
            Vec3(worldX(fill.x), fill.y.toFloat(), fill.z.toFloat()),
            ColorRGB(fill.r.toFloat(), fill.g.toFloat(), fill.b.toFloat()) * fill.intensity.toFloat(),
            attenuationLinear = 1f / dist,
            attenuationQuadratic = 0.5f / (dist * dist),
        )
    }

    val albedo = texture(BELL_ALBEDO)
    val normal = texture(BELL_NORMAL)
    val unit = cube(0.5f)
    val materials = HashMap<String, Material>()
    for (box in HouseSpec.boxes) {
        val glass = box.finish == "glass"
        val material = materials.getOrPut(materialKey(box)) {
            base {
                when (box.finish) {
                    "stucco" -> {
                        color = ColorRGBA(1f, 1f, 1f, 1f)
                        colorTexture = albedo
                        normalTexture = normal
                        triplanarScale = 0.5f
                        stochasticSharpness = 0.35f
                        metallicFactor = 0f
                        roughnessFactor = box.rough.toFloat()
                    }
                    "glass" -> {
                        color = ColorRGBA(box.r.toFloat(), box.g.toFloat(), box.b.toFloat(), 0.42f)
                        metallicFactor = box.metal.toFloat()
                        roughnessFactor = box.rough.toFloat()
                    }
                    else -> {
                        color = ColorRGBA(box.r.toFloat(), box.g.toFloat(), box.b.toFloat(), 1f)
                        metallicFactor = box.metal.toFloat()
                        roughnessFactor = box.rough.toFloat()
                    }
                }
            }
        }
        Renderable(material, unit, boxTransform(box), transparent = glass)
    }
    for (hero in HouseSpec.heroes) {
        Model(hero.file, heroTransform(hero))
    }
    drawCompass()
    PostProcess(fog(density = 0.008f, color = ColorRGB(0xC5D0DC)))
}

/** npm `planToWorldX`: house group is scale(-1,1,1) then translate(width, 0, 0). */
private fun worldX(planX: Double): Float = (HouseSpec.width - planX).toFloat()

/**
 * East-lawn compass, same placement as npm Compass: plan X just past the
 * east wall, mid-depth. The disk is drawn in world space, so it is not
 * mirrored a second time. Red needle points +Z (north).
 */
private fun FrameScope.drawCompass() {
    val x = worldX(HouseSpec.width + 1.2)
    val y = 0.02f
    val z = (HouseSpec.depth / 2.0).toFloat()
    val diskMat = base { color = ColorRGBA(0.961f, 0.961f, 0.941f, 1f); roughnessFactor = 0.9f }
    val northMat = base { color = ColorRGBA(0.753f, 0.224f, 0.169f, 1f); roughnessFactor = 0.6f }
    val southMat = base { color = ColorRGBA(0.173f, 0.243f, 0.314f, 1f); roughnessFactor = 0.6f }
    Renderable(
        diskMat,
        disk(0.55f, 32),
        Transform().rotate(Vec3.X, (-PI / 2.0).toFloat()).translate(x, y, z),
    )
    // coneTop points +Y. +90° about X sends that axis to +Z.
    Renderable(
        northMat,
        coneTop(0.4f, 0.12f, 3),
        Transform().rotate(Vec3.X, (PI / 2.0).toFloat()).translate(x, y + 0.03f, z + 0.2f),
    )
    Renderable(
        southMat,
        coneTop(0.22f, 0.08f, 3),
        Transform().rotate(Vec3.X, (-PI / 2.0).toFloat()).translate(x, y + 0.03f, z - 0.16f),
    )
}

private fun materialKey(box: HouseSpec.Box): String =
    "${box.finish}|${box.r}|${box.g}|${box.b}|${box.rough}|${box.metal}"

private fun boxTransform(box: HouseSpec.Box): Transform {
    // A centered box is symmetric under X reflection, so negated yaw is enough.
    var t = Transform.scale(box.sx.toFloat(), box.sy.toFloat(), box.sz.toFloat())
    if (box.yaw > 1e-6 || box.yaw < -1e-6) {
        t = t.rotate(Vec3.Y, -box.yaw.toFloat())
    }
    return t.translate(worldX(box.x), box.y.toFloat(), box.z.toFloat())
}

private fun heroTransform(hero: HouseSpec.Hero): Transform {
    // Group mirror is a reflection: scale X by -1, then the reflected yaw.
    var t = Transform.scale(-1f, 1f, 1f)
    if (hero.yaw > 1e-6 || hero.yaw < -1e-6) {
        t = t.rotate(Vec3.Y, -hero.yaw.toFloat())
    }
    return t.translate(worldX(hero.x), hero.y.toFloat(), hero.z.toFloat())
}
