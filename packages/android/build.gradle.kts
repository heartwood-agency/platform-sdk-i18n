plugins {
    id("com.android.library")
    id("maven-publish")
    id("signing")
}

val versionName: String = System.getenv("VERSION_NAME") ?: "0.1.0-SNAPSHOT"

android {
    namespace = "com.youversion.platform.i18n"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
        resourcePrefix = "yv_i18n_"

        aarMetadata {
            minCompileSdk = 24
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

publishing {
    publications {
        create<MavenPublication>("release") {
            groupId = "com.youversion.platform"
            artifactId = "i18n"
            version = versionName

            afterEvaluate {
                from(components["release"])
            }

            pom {
                name.set("YouVersion Platform i18n")
                description.set("Localized strings for YouVersion apps")
                url.set("https://github.com/nicholasgmartin/yv-platform-i18n")

                licenses {
                    license {
                        name.set("MIT License")
                        url.set("https://opensource.org/licenses/MIT")
                    }
                }

                scm {
                    url.set("https://github.com/nicholasgmartin/yv-platform-i18n")
                    connection.set("scm:git:git://github.com/nicholasgmartin/yv-platform-i18n.git")
                }
            }
        }
    }

    repositories {
        maven {
            name = "MavenCentral"
            url = uri("https://s01.oss.sonatype.org/service/local/staging/deploy/maven2/")
            credentials {
                username = System.getenv("MAVEN_CENTRAL_USERNAME")
                password = System.getenv("MAVEN_CENTRAL_PASSWORD")
            }
        }
    }
}

signing {
    val signingKeyId = System.getenv("SIGNING_KEY_ID")
    val signingKey = System.getenv("SIGNING_KEY")
    val signingPassword = System.getenv("SIGNING_PASSWORD")
    useInMemoryPgpKeys(signingKeyId, signingKey, signingPassword)
    sign(publishing.publications["release"])
}
