package com.neojou.japanesehouse3d

import androidx.compose.foundation.Canvas
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
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neojou.japanesehouse3d.domain.PlayerDefaults
import com.neojou.japanesehouse3d.domain.PlayerSim
import com.neojou.japanesehouse3d.domain.PlayerState
import com.neojou.japanesehouse3d.domain.Shell1F
import com.neojou.japanesehouse3d.render.SoftRenderer
import kotlin.math.round

/**
 * K2 walkable 1F shell — first-person soft renderer + domain height.
 *
 * Controls: W/S move · A/D turn 10° · arrows · drag look.
 */
@Composable
fun App() {
    var player by remember { mutableStateOf(PlayerState().withGround()) }
    val keys = remember { mutableSetOf<Key>() }
    val focusRequester = remember { FocusRequester() }
    val boxes = remember { Shell1F.boxes() }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    LaunchedEffect(Unit) {
        var last = 0L
        while (true) {
            withFrameNanos { now ->
                if (last == 0L) {
                    last = now
                    return@withFrameNanos
                }
                val dt = ((now - last) / 1_000_000_000.0).coerceIn(0.0, 0.05)
                last = now
                var forward = 0.0
                if (Key.W in keys || Key.DirectionUp in keys) forward += 1.0
                if (Key.S in keys || Key.DirectionDown in keys) forward -= 1.0
                if (forward != 0.0) {
                    player = PlayerSim.stepMove(player, forward, dt)
                }
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
                        keys.add(e.key)
                        when (e.key) {
                            // yaw: 0 = +Z north; +yaw → +X east = right when facing north
                            // A / ← = turn left (−yaw); D / → = turn right (+yaw)
                            Key.A, Key.DirectionLeft -> {
                                player = PlayerSim.turnDegrees(
                                    player,
                                    -PlayerDefaults.turnDegrees,
                                )
                            }
                            Key.D, Key.DirectionRight -> {
                                player = PlayerSim.turnDegrees(
                                    player,
                                    PlayerDefaults.turnDegrees,
                                )
                            }
                            else -> {}
                        }
                        true
                    }
                    KeyEventType.KeyUp -> {
                        keys.remove(e.key)
                        true
                    }
                    else -> false
                }
            }
            .pointerInput(Unit) {
                detectDragGestures { change, dragAmount ->
                    change.consume()
                    val sens = PlayerDefaults.lookSensitivity
                    player = PlayerSim.stepLook(
                        player,
                        dYaw = -dragAmount.x * sens,
                        dPitch = -dragAmount.y * sens,
                    )
                }
            },
    ) {
        Canvas(Modifier.fillMaxSize()) {
            SoftRenderer.drawScene(this, player, boxes)
        }

        Text(
            text = "K2 1F shell · W/S move · A/D turn · drag look\n" +
                "X ${player.x.fmt(2)}  Z ${player.z.fmt(2)}  Y ${player.eyeY.fmt(2)}",
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
