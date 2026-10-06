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
 * Plan-space camera: yaw 0 looks +Z. Meshes use HouseSpec centers, so no X-mirror.
 * Bell Art albedo is already #8e7363; the stucco tint stays white.
 */
fun FrameScope.drawHouse(player: PlayerState) {
    val (dx, dy, dz) = PlayerSim.lookDirection(player)
    camera = camera(
        Vec3(player.x.toFloat(), player.eyeY.toFloat(), player.z.toFloat()),
        Vec3(dx.toFloat(), dy.toFloat(), dz.toFloat()),
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
            Vec3(fill.x.toFloat(), fill.y.toFloat(), fill.z.toFloat()),
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
    PostProcess(fog(density = 0.008f, color = ColorRGB(0xC5D0DC)))
}

private fun materialKey(box: HouseSpec.Box): String =
    "${box.finish}|${box.r}|${box.g}|${box.b}|${box.rough}|${box.metal}"

private fun boxTransform(box: HouseSpec.Box): Transform {
    var t = Transform.scale(box.sx.toFloat(), box.sy.toFloat(), box.sz.toFloat())
    if (box.yaw > 1e-6 || box.yaw < -1e-6) {
        t = t.rotate(Vec3.Y, box.yaw.toFloat())
    }
    return t.translate(box.x.toFloat(), box.y.toFloat(), box.z.toFloat())
}

private fun heroTransform(hero: HouseSpec.Hero): Transform {
    val spun = if (hero.yaw > 1e-6 || hero.yaw < -1e-6) {
        Transform.rotate(Vec3.Y, hero.yaw.toFloat())
    } else {
        Transform.IDENTITY
    }
    return spun.translate(hero.x.toFloat(), hero.y.toFloat(), hero.z.toFloat())
}
