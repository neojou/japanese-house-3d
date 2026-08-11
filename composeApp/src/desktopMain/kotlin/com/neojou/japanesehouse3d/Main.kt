package com.neojou.japanesehouse3d

import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState

/**
 * Desktop entry — opens a window hosting [App].
 */
fun main() {
    application {
        val windowState = rememberWindowState(
            size = DpSize(960.dp, 640.dp),
        )
        Window(
            onCloseRequest = ::exitApplication,
            title = "Japanese House 3D · K2 1F shell",
            state = windowState,
        ) {
            App()
        }
    }
}
