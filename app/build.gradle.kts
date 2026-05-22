plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.lenerd.spotifyplus"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.lenerd.spotifyplus"
        minSdk = 30
        //noinspection EditedTargetSdkVersion
        targetSdk = 36
        versionCode = 1
        versionName = "0.10.0.0"
        vectorDrawables.useSupportLibrary = true

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        externalNativeBuild {
            cmake {
                cppFlags("")
                arguments("-DANDROID_STL=c++_shared")
                targets("native-lib", "spotifyplus_bridge")
            }
        }

        ndk {
            abiFilters += listOf("armeabi-v7a", "arm64-v8a", "x86_64")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    kotlin {
        jvmToolchain(21)
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.22.1"
        }
    }

    sourceSets {
        getByName("main") {
            jniLibs.srcDirs("libnode/bin/", "$buildDir/generated/jniLibs")
        }
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }
}

val copySpotifyPlusBridge by tasks.registering(Copy::class) {
    val abis = listOf("armeabi-v7a", "arm64-v8a", "x86_64")

    dependsOn("externalNativeBuildDebug")

    abis.forEach { abi ->
        from(fileTree("$projectDir/.cxx") {
            include("**/$abi/libspotifyplus_bridge.so")
        })
        into("$buildDir/generated/jniLibs/$abi")
    }
}

tasks.matching { it.name == "mergeDebugJniLibFolders" }.configureEach {
    dependsOn(copySpotifyPlusBridge)
}

//tasks.matching { it.name == "mergeReleaseJniLibFolders" }.configureEach {
//    dependsOn(copySpotifyPlusBridge)
//}

dependencies {

    implementation("androidx.core:core-ktx:1.18.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.10.0")
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation(platform("androidx.compose:compose-bom:2024.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.appcompat:appcompat:1.7.1")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.09.00"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
    implementation("androidx.navigation:navigation-compose:2.9.7")

    implementation(platform("androidx.compose:compose-bom:2025.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")

    debugImplementation("androidx.compose.ui:ui-tooling")

    compileOnly(files("$rootDir/libxposed/api-100.aar"))
    implementation(files("$rootDir/libxposed/service-100.aar"))
    implementation(files("$rootDir/libxposed/interface-100.aar"))

    implementation("org.luckypray:dexkit:2.0.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.android.flexbox:flexbox:3.0.0")
    implementation("com.google.code.gson:gson:2.13.1")
    implementation("com.mikhaellopez:circleview:1.4.1")
    implementation("com.github.pemistahl:lingua:1.2.2")
    implementation("com.google.android.material:material:1.13.0")
    implementation("androidx.media3:media3-exoplayer:1.9.3")
    implementation("androidx.media3:media3-ui:1.9.3")
    implementation("androidx.media3:media3-exoplayer-hls:1.9.3")
    implementation("org.jsoup:jsoup:1.21.2")

    implementation("com.facebook.yoga:yoga:3.2.1")
    implementation("com.facebook.soloader:soloader:0.12.1")
    implementation("com.facebook.fbjni:fbjni-java-only:0.7.0")

    implementation(project(":spotifyplus-sdk"))

    compileOnly("de.robv.android.xposed:api:82")
}