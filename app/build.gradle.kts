import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "com.lenerd46.spotifyplus"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.lenerd46.spotifyplus"
        minSdk = 24
        targetSdk = 37
        versionCode = 13
        versionName = "0.6.7"
    }

    val keystoreProp = Properties()
    val keystorePropFile = rootProject.file("keystore.properties")
    if (keystorePropFile.exists()) {
        keystoreProp.load(keystorePropFile.inputStream())
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

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.media3.exoplayer)
    implementation(libs.androidx.media3.ui)
    implementation(libs.androidx.media3.exoplayer.hls)
    implementation(libs.material)

    implementation(libs.circleview)
    implementation(libs.flexbox)
    implementation(libs.gson)
    implementation(libs.jsoup)
    implementation(libs.lingua)
    implementation(libs.okhttp)
    implementation(libs.rhino)

    compileOnly(libs.xposed.api)
    implementation(libs.dexkit)
}