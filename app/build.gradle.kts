import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.xposedkit)
}

android {
    namespace = "cc.meteormc.spotifyplus"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "cc.meteormc.spotifyplus"
        minSdk = 26
        targetSdk = 37
        versionCode = 13
        versionName = "0.6.7"
    }

    val keystoreProp = Properties()
    val keystorePropFile = rootProject.file("keystore.properties")
    if (keystorePropFile.exists()) {
        keystoreProp.load(keystorePropFile.bufferedReader())
    }

    signingConfigs {
        val storeFile = providers.gradleProperty("android.storeFile").orNull ?: return@signingConfigs
        val storePassword = providers.gradleProperty("android.storePassword").orNull ?: return@signingConfigs
        val keyAlias = providers.gradleProperty("android.keyAlias").orNull ?: return@signingConfigs
        val keyPassword = providers.gradleProperty("android.keyPassword").orNull ?: return@signingConfigs

        create("release") {
            this.storeFile = rootProject.file(storeFile)
            this.storePassword = storePassword
            this.keyAlias = keyAlias
            this.keyPassword = keyPassword
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.findByName("release")
            optimization {
                enable = true
            }
        }
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

kotlin {
    compilerOptions {
        optIn.addAll(
            "kotlin.ExperimentalStdlibApi",
            "org.luckypray.dexkit.annotations.DexKitExperimentalApi"
        )
    }
}

dependencies {
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.core.ktx)
    implementation(libs.material)

    implementation(libs.dexkit)
    implementation(libs.gson)
}