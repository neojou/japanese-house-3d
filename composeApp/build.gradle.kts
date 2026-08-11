// KMP walkthrough UI (K2): Desktop + WasmJs first-person shell.
// Domain: project :shared. Plan: docs/KMP-plan.md

import org.jetbrains.kotlin.gradle.ExperimentalWasmDsl

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
}

group = "com.neojou.japanesehouse3d"
version = "0.1.0"

kotlin {
    jvm("desktop")
    jvmToolchain(25)

    @OptIn(ExperimentalWasmDsl::class)
    wasmJs {
        outputModuleName.set("JapaneseHouse3d")
        browser { }
        binaries.executable()
    }

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation(project(":shared"))
                implementation(compose.runtime)
                implementation(compose.foundation)
                implementation(compose.material3)
                implementation(compose.ui)
            }
        }
        val desktopMain by getting {
            dependencies {
                implementation(compose.desktop.currentOs)
            }
        }
        val wasmJsMain by getting
    }
}

compose.desktop {
    application {
        mainClass = "com.neojou.japanesehouse3d.MainKt"
    }
}
