package com.neojou.japanesehouse3d

import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neojou.japanesehouse3d.domain.PlayerDefaults
import com.neojou.japanesehouse3d.render.HouseWalk
import com.neojou.japanesehouse3d.render.drawHouse
import com.neojou.japanesehouse3d.render.loadPublicBytes
import com.neojou.japanesehouse3d.render.scheduleFrameCapture
import com.zakgof.korender.KeyEvent
import com.zakgof.korender.Korender
import com.zakgof.korender.TouchEvent
import kotlin.math.round

/**
 * KMP first-person house. Korender draws [com.neojou.japanesehouse3d.domain.HouseSpec].
 * SoftRenderer remains in the tree and is not on this path.
 *
 * Controls: W/S move · A/D turn 10° · arrows · drag look.
 */
@Composable
fun App() {
    val walk = remember { HouseWalk() }
    LaunchedEffect(walk) { scheduleFrameCapture(walk) }
    var hud by remember { mutableStateOf(walk.state) }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }
    LaunchedEffect(Unit) {
        while (true) {
            withFrameNanos {
                hud = walk.state
            }
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color(0xFF1A1A1A))
            .focusRequester(focusRequester)
            .focusable()
            .onKeyEvent { e ->
                when (e.type) {
                    KeyEventType.KeyDown -> {
                        walk.onKey(true, e.key)
                        true
                    }
                    KeyEventType.KeyUp -> {
                        walk.onKey(false, e.key)
                        true
                    }
                    else -> false
                }
            }
            .pointerInput(Unit) {
                detectDragGestures { change, dragAmount ->
                    change.consume()
                    val sens = PlayerDefaults.lookSensitivity
                    walk.look(
                        dYaw = dragAmount.x * sens,
                        dPitch = -dragAmount.y * sens,
                    )
                }
            },
    ) {
        Korender(resourceLoader = { loadPublicBytes(it) }, vSync = true) {
            OnKey { e ->
                if (e.type == KeyEvent.Type.DOWN || e.type == KeyEvent.Type.UP) {
                    walk.onKey(e.type == KeyEvent.Type.DOWN, e.composeKey)
                }
            }
            OnTouch { e ->
                when (e.type) {
                    TouchEvent.Type.DOWN ->
                        if (e.button == TouchEvent.Button.LEFT || e.button == TouchEvent.Button.NONE) {
                            walk.pointerDown(e.x, e.y)
                        }
                    TouchEvent.Type.UP -> walk.pointerUp()
                    TouchEvent.Type.MOVE -> walk.pointerMove(e.x, e.y)
                }
            }
            Frame {
                walk.tick(frameInfo.dt, frameInfo.avgFps)
                drawHouse(walk.state)
            }
        }

        Text(
            text = buildAnnotatedString {
                withStyle(SpanStyle(color = Color(0x73FFFFFF))) { append("m  ") }
                withStyle(SpanStyle(color = Color(0xE6FDA4AF))) { append("X ") }
                withStyle(SpanStyle(color = Color(0xE6FFFFFF))) { append(hud.x.fmt2()) }
                append("   ")
                withStyle(SpanStyle(color = Color(0xE67DD3FC))) { append("Z ") }
                withStyle(SpanStyle(color = Color(0xE6FFFFFF))) { append(hud.z.fmt2()) }
                append("   ")
                withStyle(SpanStyle(color = Color(0xE66EE7B7))) { append("Y ") }
                withStyle(SpanStyle(color = Color(0xE6FFFFFF))) { append(hud.eyeY.fmt2()) }
            },
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(12.dp)
                .background(Color(0x66000000), RoundedCornerShape(8.dp))
                .padding(horizontal = 8.dp, vertical = 6.dp),
        )
        Text(
            text = "W/S 移動 · A/D 轉向 · 拖曳視角",
            color = Color(0xBFFFFFFF),
            fontSize = 12.sp,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(12.dp)
                .background(Color(0x66000000), RoundedCornerShape(8.dp))
                .padding(horizontal = 8.dp, vertical = 6.dp),
        )
    }
}

/** Two decimal places, matching the npm coordinate chip. */
private fun Double.fmt2(): String {
    val scaled = round(this * 100.0).toLong()
    val sign = if (scaled < 0) "-" else ""
    val abs = kotlin.math.abs(scaled)
    val frac = (abs % 100).toString().padStart(2, '0')
    return "$sign${abs / 100}.$frac"
}
