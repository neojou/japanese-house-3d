// Root build — plugins applied by subprojects only.
// Coexists with the Vite/npm SPA (package.json); does not replace it.
plugins {
    alias(libs.plugins.kotlinMultiplatform) apply false
    alias(libs.plugins.composeMultiplatform) apply false
    alias(libs.plugins.composeCompiler) apply false
}
