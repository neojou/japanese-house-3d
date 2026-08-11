package com.neojou.japanesehouse3d.render

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import com.neojou.japanesehouse3d.domain.Box3
import com.neojou.japanesehouse3d.domain.PlayerState
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.tan

/**
 * Software first-person box renderer (K-S0 / K2).
 * Plan-space: +X east, +Y up, +Z north; yaw 0 looks +Z.
 */
object SoftRenderer {

    private data class Face(
        val depth: Double,
        val points: List<Offset>,
        val color: Color,
    )

    fun drawScene(
        draw: DrawScope,
        player: PlayerState,
        boxes: List<Box3>,
        fovYDeg: Double = 70.0,
    ) {
        val w = draw.size.width
        val h = draw.size.height
        if (w < 1f || h < 1f) return

        // Sky + ground gradient (simple)
        draw.drawRect(Color(0xFFB8C4D0))
        draw.drawRect(
            color = Color(0xFF6B7A5E),
            topLeft = Offset(0f, h * 0.55f),
            size = androidx.compose.ui.geometry.Size(w, h * 0.45f),
        )

        val eyeX = player.x
        val eyeY = player.eyeY
        val eyeZ = player.z
        val yaw = player.yaw
        val pitch = player.pitch
        val cy = cos(yaw)
        val sy = sin(yaw)
        val cp = cos(pitch)
        val sp = sin(pitch)

        val fov = fovYDeg * PI / 180.0
        val fy = 1.0 / tan(fov / 2.0)
        val aspect = w.toDouble() / h.toDouble()
        val fx = fy / aspect
        val near = 0.08

        // Face index sets (quads) into corner array 0..7
        val facesIdx = listOf(
            intArrayOf(0, 1, 2, 3), // -Z
            intArrayOf(5, 4, 7, 6), // +Z
            intArrayOf(4, 0, 3, 7), // -X
            intArrayOf(1, 5, 6, 2), // +X
            intArrayOf(3, 2, 6, 7), // +Y
            intArrayOf(4, 5, 1, 0), // -Y
        )

        val projected = mutableListOf<Face>()

        for (box in boxes) {
            val corners = box.corners()
            val cam = corners.map { (px, py, pz) ->
                // World → camera: translate then yaw then pitch
                val dx = px - eyeX
                val dy = py - eyeY
                val dz = pz - eyeZ
                // yaw around Y: to camera space where -Z is forward? 
                // We want forward +Z in world to be +Z cam looking along +Z.
                // Standard: cam forward = (sin yaw, 0, cos yaw)
                // Right = (cos yaw, 0, -sin yaw)
                val rx = dx * cy - dz * sy // along right when yaw=0 right=+X: 
                // Actually: rotate world so camera looks down -Z for classic GL,
                // or keep +Z forward: 
                // forward F=(sy,0,cy), right R=(cy,0,-sy), up=Y
                val rightX = cy
                val rightZ = -sy
                val fwdX = sy
                val fwdZ = cy
                var cx = dx * rightX + dz * rightZ
                var cz = dx * fwdX + dz * fwdZ
                var cyv = dy
                // pitch: rotate around camera X (right)
                val cz2 = cz * cp - cyv * sp
                val cy2 = cz * sp + cyv * cp
                Triple(cx, cy2, cz2)
            }

            val argb = box.colorArgb
            val base = Color(
                red = ((argb shr 16) and 0xFF) / 255f,
                green = ((argb shr 8) and 0xFF) / 255f,
                blue = (argb and 0xFF) / 255f,
                alpha = 1f,
            )

            for (idx in facesIdx) {
                val pts = idx.map { cam[it] }
                // Cull if all behind near
                if (pts.all { it.third <= near }) continue
                val avgZ = pts.map { it.third }.average()
                if (avgZ <= near) continue

                val screen = pts.mapNotNull { (cx, cyv, cz) ->
                    val z = cz.coerceAtLeast(near)
                    val ndcX = (cx * fx) / z
                    val ndcY = (cyv * fy) / z
                    val sx = ((ndcX + 1.0) * 0.5 * w).toFloat()
                    val sy = ((1.0 - ndcY) * 0.5 * h).toFloat()
                    Offset(sx, sy)
                }
                if (screen.size < 3) continue

                // Face normal lighting (camera space rough)
                val shade = (0.55 + 0.45 * (avgZ / (avgZ + 8.0))).coerceIn(0.35, 1.0)
                val col = base.copy(
                    red = (base.red * shade.toFloat()).coerceIn(0f, 1f),
                    green = (base.green * shade.toFloat()).coerceIn(0f, 1f),
                    blue = (base.blue * shade.toFloat()).coerceIn(0f, 1f),
                )
                projected += Face(avgZ, screen, col)
            }
        }

        projected.sortByDescending { it.depth }
        for (face in projected) {
            val path = Path().apply {
                moveTo(face.points[0].x, face.points[0].y)
                for (i in 1 until face.points.size) {
                    lineTo(face.points[i].x, face.points[i].y)
                }
                close()
            }
            draw.drawPath(path, face.color, style = Fill)
            draw.drawPath(path, Color(0x33000000), style = Stroke(width = 1f))
        }
    }
}
