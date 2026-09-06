package com.neojou.japanesehouse3d.render

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import com.neojou.japanesehouse3d.domain.PlayerState
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.tan

/**
 * Dedicated house.glb display path (triangle painter).
 * SoftRenderer stays as fallback when GLB is missing or parse fails.
 */
object GlbRenderer {

    private data class Face(
        val depth: Double,
        val points: List<Offset>,
        val color: Color,
    )

    fun drawScene(
        draw: DrawScope,
        player: PlayerState,
        tris: List<GlbTri>,
        fovYDeg: Double = 70.0,
    ) {
        val w = draw.size.width
        val h = draw.size.height
        if (w < 1f || h < 1f) return

        draw.drawRect(Color(0xFFB8C4D0))
        draw.drawRect(
            color = Color(0xFF6B7A5E),
            topLeft = Offset(0f, h * 0.55f),
            size = androidx.compose.ui.geometry.Size(w, h * 0.45f),
        )

        val eyeX = player.x
        val eyeY = player.eyeY
        val eyeZ = player.z
        val cy = cos(player.yaw)
        val sy = sin(player.yaw)
        val cp = cos(player.pitch)
        val sp = sin(player.pitch)
        val fov = fovYDeg * PI / 180.0
        val fy = 1.0 / tan(fov / 2.0)
        val aspect = w.toDouble() / h.toDouble()
        val fx = fy / aspect
        val near = 0.08

        fun cam(px: Double, py: Double, pz: Double): Triple<Double, Double, Double> {
            val dx = px - eyeX
            val dy = py - eyeY
            val dz = pz - eyeZ
            val rightX = cy
            val rightZ = -sy
            val fwdX = sy
            val fwdZ = cy
            val cx = dx * rightX + dz * rightZ
            val cz = dx * fwdX + dz * fwdZ
            val cz2 = cz * cp - dy * sp
            val cy2 = cz * sp + dy * cp
            return Triple(cx, cy2, cz2)
        }

        fun project(p: Triple<Double, Double, Double>): Offset? {
            val z = p.third
            if (z <= near) return null
            val ndcX = (p.first * fx) / z
            val ndcY = (p.second * fy) / z
            return Offset(
                ((ndcX + 1.0) * 0.5 * w).toFloat(),
                ((1.0 - ndcY) * 0.5 * h).toFloat(),
            )
        }

        val projected = ArrayList<Face>(tris.size / 2)
        for (t in tris) {
            val a = cam(t.ax.toDouble(), t.ay.toDouble(), t.az.toDouble())
            val b = cam(t.bx.toDouble(), t.by.toDouble(), t.bz.toDouble())
            val c = cam(t.cx.toDouble(), t.cy.toDouble(), t.cz.toDouble())
            val avgZ = (a.third + b.third + c.third) / 3.0
            if (avgZ <= near) continue
            val pa = project(a) ?: continue
            val pb = project(b) ?: continue
            val pc = project(c) ?: continue
            val cross = (pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x)
            if (cross <= 0f) continue
            val argb = t.argb
            val shade = (0.55 + 0.45 * (avgZ / (avgZ + 8.0))).coerceIn(0.35, 1.0)
            val col = Color(
                red = (((argb shr 16) and 0xFF) / 255f * shade.toFloat()).coerceIn(0f, 1f),
                green = (((argb shr 8) and 0xFF) / 255f * shade.toFloat()).coerceIn(0f, 1f),
                blue = ((argb and 0xFF) / 255f * shade.toFloat()).coerceIn(0f, 1f),
                alpha = 1f,
            )
            projected += Face(avgZ, listOf(pa, pb, pc), col)
        }
        projected.sortByDescending { it.depth }
        for (face in projected) {
            val path = Path().apply {
                moveTo(face.points[0].x, face.points[0].y)
                lineTo(face.points[1].x, face.points[1].y)
                lineTo(face.points[2].x, face.points[2].y)
                close()
            }
            draw.drawPath(path, face.color, style = Fill)
        }
    }
}
