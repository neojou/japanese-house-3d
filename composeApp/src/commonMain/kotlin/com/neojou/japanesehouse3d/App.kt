package com.neojou.japanesehouse3d

import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neojou.japanesehouse3d.domain.HouseSpec
import com.neojou.japanesehouse3d.domain.PlayerState
import com.neojou.japanesehouse3d.render.HeroLibrary
import com.neojou.japanesehouse3d.render.HouseWalk
import com.neojou.japanesehouse3d.render.drawHouse
import com.neojou.japanesehouse3d.render.loadPublicBytes
import com.neojou.japanesehouse3d.render.scheduleFrameCapture
import com.zakgof.korender.KeyEvent
import com.zakgof.korender.Korender
import com.zakgof.korender.TouchEvent
import com.zakgof.korender.math.ColorRGBA
import com.zakgof.korender.scope.FrameScope
import kotlin.math.round

/**
 * KMP first-person house. Korender draws [com.neojou.japanesehouse3d.domain.HouseSpec].
 * SoftRenderer remains in the tree and is not on this path.
 *
 * Controls: W/S move · A/D turn 10° · click empty space to look · click doors and faucets.
 */
@Composable
fun App() {
    val walk = remember { HouseWalk() }
    LaunchedEffect(walk) { scheduleFrameCapture(walk) }
    LaunchedEffect(Unit) {
        for (file in HouseSpec.heroes.map { it.file }.distinct()) {
            runCatching { HeroLibrary.offer(file, loadPublicBytes(file)) }
                .onFailure { println("hero names $file: $it") }
        }
    }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
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
            },
    ) {
        Korender(
            resourceLoader = { path ->
                if (path == HUD_CHIP) hudChipPng else loadPublicBytes(path)
            },
            vSync = true,
        ) {
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
                    TouchEvent.Type.UP -> walk.pointerUp(e.x, e.y)
                    TouchEvent.Type.MOVE -> walk.pointerMove(e.x, e.y)
                }
            }
            Frame {
                walk.noteView(width, height)
                walk.tick(frameInfo.dt, frameInfo.avgFps)
                drawHouse(walk.state, walk.fixtures)
                positionHud(walk.state)
            }
        }

        Text(
            text = "W/S 移動 · A/D 轉向 · 點空處看 · 點門與水龍頭",
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

/**
 * Plan-space coordinates drawn inside the GL frame.
 * Compose text sits under the desktop SwingPanel / wasm canvas, so it never shows.
 * Korender's font atlas is code points 0–127, so this string stays ASCII.
 */
private fun FrameScope.positionHud(state: PlayerState) {
    Gui {
        Row {
            Filler()
            Column {
                Image(
                    id = "hud-top",
                    imageResource = HUD_CHIP,
                    width = HUD_CHIP_W,
                    height = 12f,
                    marginRight = 12f,
                )
                Stack {
                    Image(
                        id = "hud-chip",
                        imageResource = HUD_CHIP,
                        width = HUD_CHIP_W,
                        height = 28f,
                        marginRight = 12f,
                    )
                    Row {
                        Image(
                            id = "hud-inset",
                            imageResource = HUD_CHIP,
                            width = 10f,
                            height = 22f,
                        )
                        Text(id = "hud-m", text = "m", height = 16f, color = hudDim, static = false)
                        Text(id = "hud-xl", text = "  X ", height = 22f, color = hudRose, static = false)
                        Text(id = "hud-x", text = state.x.fmt2(), height = 22f, color = hudWhite, static = false)
                        Text(id = "hud-zl", text = "   Z ", height = 22f, color = hudSky, static = false)
                        Text(id = "hud-z", text = state.z.fmt2(), height = 22f, color = hudWhite, static = false)
                        Text(id = "hud-yl", text = "   Y ", height = 22f, color = hudEmerald, static = false)
                        Text(id = "hud-y", text = state.eyeY.fmt2(), height = 22f, color = hudWhite, static = false)
                    }
                }
            }
        }
    }
}

private const val HUD_CHIP = "kmp/hud-chip.png"
private const val HUD_CHIP_W = 300f

private val hudDim = ColorRGBA(1f, 1f, 1f, 0.45f)
private val hudWhite = ColorRGBA(1f, 1f, 1f, 0.90f)
private val hudRose = ColorRGBA(0xFD / 255f, 0xA4 / 255f, 0xAF / 255f, 0.90f)
private val hudSky = ColorRGBA(0x7D / 255f, 0xD3 / 255f, 0xFC / 255f, 0.90f)
private val hudEmerald = ColorRGBA(0x6E / 255f, 0xE7 / 255f, 0xB7 / 255f, 0.90f)

/** 1×1 black PNG, alpha 168 (~0.66). Stretched by Korender's GUI image. */
private val hudChipPng: ByteArray = intArrayOf(
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196,
    137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 218, 99, 96, 96, 96, 88, 1, 0, 0, 173, 0, 169, 37, 30, 72, 194, 0, 0, 0, 0,
    73, 69, 78, 68, 174, 66, 96, 130,
).map { it.toByte() }.toByteArray()

/** Two decimal places, matching the npm coordinate chip. */
private fun Double.fmt2(): String {
    val scaled = round(this * 100.0).toLong()
    val sign = if (scaled < 0) "-" else ""
    val abs = kotlin.math.abs(scaled)
    val frac = (abs % 100).toString().padStart(2, '0')
    return "$sign${abs / 100}.$frac"
}
