// KMP walkthrough UI: Desktop + WasmJs Korender scene.
// Domain: project :shared. Plan: docs/KMP-plan.md

import javax.inject.Inject
import org.gradle.api.tasks.JavaExec
import org.gradle.language.jvm.tasks.ProcessResources
import org.gradle.process.ExecOperations
import org.jetbrains.kotlin.gradle.ExperimentalWasmDsl

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
}

// macOS has no OpenGL 3.3 compatibility profile. Korender 0.7 asks for one and
// Apple falls back to 2.1, which crashes in glBindBufferBase. The patched jar
// asks for 4.1 core and #version 410. Gradle cache stays untouched.
abstract class PatchKorenderDesktopTask : DefaultTask() {
    @get:InputFile
    abstract val sourceJar: RegularFileProperty

    @get:InputFile
    abstract val patchScript: RegularFileProperty

    @get:OutputFile
    abstract val patchedJar: RegularFileProperty

    @get:Inject
    abstract val execOps: ExecOperations

    @TaskAction
    fun patch() {
        val dest = patchedJar.get().asFile
        dest.parentFile.mkdirs()
        execOps.exec {
            commandLine(
                "python3",
                patchScript.get().asFile.absolutePath,
                sourceJar.get().asFile.absolutePath,
                dest.absolutePath,
            )
        }
    }
}

val korenderDesktopUpstream = configurations.create("korenderDesktopUpstream") {
    isCanBeResolved = true
    isCanBeConsumed = false
    isTransitive = false
}

val patchKorenderDesktop = tasks.register<PatchKorenderDesktopTask>("patchKorenderDesktop") {
    patchScript.set(rootProject.layout.projectDirectory.file("tools/kmp/patch-korender-desktop.py"))
    sourceJar.fileProvider(
        korenderDesktopUpstream.elements.map { locations ->
            locations.map { it.asFile }.single { it.extension == "jar" }
        },
    )
    patchedJar.set(layout.buildDirectory.file("patched/korender-desktop-0.7.0-gl41.jar"))
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
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")
                implementation("com.github.zakgof:korender:0.7.0") {
                    // Desktop uses the patched jar below. Wasm still resolves korender-wasm-js.
                    exclude(group = "com.github.zakgof", module = "korender-desktop")
                }
            }
        }
        val desktopMain by getting {
            dependencies {
                implementation(compose.desktop.currentOs)
                implementation(files(patchKorenderDesktop.flatMap { it.patchedJar }))
                // Transitives that arrived only through korender-desktop.
                implementation("org.lwjgl:lwjgl:3.4.1")
                implementation("org.lwjgl:lwjgl-opengl:3.4.1")
                implementation("org.lwjgl:lwjgl-jawt:3.4.1")
                implementation("org.lwjglx:lwjgl3-awt:0.2.4") {
                    exclude(group = "org.lwjgl")
                }
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-swing:1.11.0")
                implementation("org.jetbrains.kotlin:kotlin-reflect:2.4.20")
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-cbor:1.11.0")
            }
        }
        val wasmJsMain by getting
    }
}

dependencies {
    add("korenderDesktopUpstream", "com.github.zakgof:korender-desktop:0.7.0")
}

compose.desktop {
    application {
        mainClass = "com.neojou.japanesehouse3d.MainKt"
    }
}

// `exclude` does not drop korender-desktop: the jvm variant *is* that module.
// Keep the patched jar and remove the cache jar at execution so its
// JvmPlatformKt and #version 330 header cannot win.
tasks.withType<JavaExec>().configureEach {
    doFirst {
        val filtered = classpath.files.filter { file ->
            "/com.github.zakgof/korender-desktop/" !in file.path
        }
        logger.lifecycle(
            "Korender runtime jars: " +
                filtered.filter { "korender" in it.name }.joinToString { it.name },
        )
        classpath = files(filtered)
    }
}

tasks.withType<ProcessResources>().configureEach {
    if (name == "wasmJsProcessResources") {
        from(rootProject.file("public")) {
            include(
                "models/hero/*.glb",
                "textures/bellart-travertine/albedo.jpg",
                "textures/bellart-travertine/normal.png",
            )
        }
    }
}
