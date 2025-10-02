# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Keep Firebase Auth classes
-keep class com.google.firebase.auth.** { *; }
-keep class com.google.android.gms.auth.** { *; }

# Keep React Native Firebase classes
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**

# Keep network security config
-keep class android.security.NetworkSecurityConfig { *; }

# Keep JSON serialization classes
-keep class * implements java.io.Serializable { *; }
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep Redux classes
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.** { *; }

# Keep AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Keep Toast classes
-keep class com.reactnativecommunity.toast.** { *; }

# Keep all native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep class com.facebook.soloader.** { *; }

# Fix R8 missing classes issues
-dontwarn coil3.PlatformContext
-dontwarn coil3.**
-keep class coil3.** { *; }

# Keep all image loading libraries
-keep class com.bumptech.glide.** { *; }
-keep class com.squareup.picasso.** { *; }
-keep class com.facebook.imagepipeline.** { *; }

# Keep all network libraries
-keep class okhttp3.** { *; }
-keep class retrofit2.** { *; }
-dontwarn okhttp3.**
-dontwarn retrofit2.**

# Keep all serialization libraries
-keep class com.google.gson.** { *; }
-keep class com.fasterxml.jackson.** { *; }
-dontwarn com.google.gson.**
-dontwarn com.fasterxml.jackson.**

# Keep all reflection-based libraries
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# Keep all enum classes
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep all native methods and JNI
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep all classes that might be accessed via reflection
-keep class * extends java.lang.Exception { *; }
-keep class * implements java.io.Serializable { *; }
