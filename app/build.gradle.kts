plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "wifi.login"
    compileSdk = 35

    defaultConfig {
        applicationId = "wifi.login"
        minSdk = 30
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        multiDexEnabled = false
    }


    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug")
        }
        debug {
            isMinifyEnabled = false
            isShrinkResources = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }

    buildFeatures {
        buildConfig = false
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    splits {
        abi {
            isEnable = true
            reset()
            include("armeabi-v7a")
            isUniversalApk = false
        }
    }

    packaging {
        resources {
            excludes += listOf(
                "META-INF/**",
                "kotlin/**",
                "**.properties"
            )
        }
    }

}
