// app/build.gradle.kts — con Compose + Billing + todas las dependencias
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace   = "com.klonos.lagkiller"
    compileSdk  = 34

    defaultConfig {
        applicationId = "com.klonos.lagkiller"
        minSdk        = 26
        targetSdk     = 34
        versionCode   = 5
        versionName   = "5.0.0"
        ndk { abiFilters += "arm64-v8a" }
    }

    sourceSets {
        getByName("main") { jniLibs.srcDir("src/main/jniLibs") }
    }

    buildFeatures {
        compose = true  // ← Habilitar Compose
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.7"
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            applicationIdSuffix = ".debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

// Rust core: compilar antes de assembleDebug/Release
tasks.register<Exec>("buildRustCore") {
    group       = "build"
    description = "Compila lagkiller_engine.so con cargo-ndk"
    workingDir  = file("../rust_core")
    commandLine(
        "cargo", "ndk",
        "-t", "arm64-v8a",
        "-o", "../app/src/main/jniLibs",
        "build", "--release"
    )
}
tasks.whenTaskAdded {
    if (name in listOf("assembleDebug", "assembleRelease", "bundleRelease")) {
        dependsOn("buildRustCore")
    }
}

dependencies {
    // Compose BOM — gestiona versiones automáticamente
    val composeBom = platform("androidx.compose:compose-bom:2024.02.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    // Compose UI
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.animation:animation")

    // Activity + ViewModel Compose
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")

    // Core Android
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")

    // Google Play Billing (monetización)
    implementation("com.android.billingclient:billing-ktx:6.2.0")

    // Debug tools
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
