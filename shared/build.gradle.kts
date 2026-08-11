// Pure Kotlin domain for KMP walkthrough (no Compose).
// Used by composeApp; safe for unit tests without UI.

import org.jetbrains.kotlin.gradle.ExperimentalWasmDsl

plugins {
    alias(libs.plugins.kotlinMultiplatform)
}

group = "com.neojou.japanesehouse3d"
version = "0.1.0"

kotlin {
    jvm()
    jvmToolchain(25)

    @OptIn(ExperimentalWasmDsl::class)
    wasmJs {
        browser()
    }

    sourceSets {
        val commonMain by getting
        val commonTest by getting {
            dependencies {
                implementation(kotlin("test"))
            }
        }
    }
}
