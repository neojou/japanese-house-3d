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
import androidx.compose.ui.graphics.Color
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
    var fps by remember { mutableStateOf(0f) }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }
    LaunchedEffect(Unit) {
        while (true) {
            withFrameNanos {
                hud = walk.state
                fps = walk.fps
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
                        dYaw = -dragAmount.x * sens,
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
            text = "KMP · W/S 移動 · A/D 轉向 · 拖曳視角\n" +
                "X ${hud.x.fmt(2)}  Z ${hud.z.fmt(2)}  Y ${hud.eyeY.fmt(2)}  ${fps.toInt()} fps",
            color = Color(0xEEFFFFFF),
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(12.dp),
        )
    }
}

private fun Double.fmt(n: Int): String {
    var p = 1.0
    repeat(n) { p *= 10.0 }
    return (round(this * p) / p).toString()
}
