import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View, Image } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useNavigation } from '@react-navigation/native';
import { useAuthPersistence } from '../hooks/useAuthPersistence';
import { moderateScale, responsiveFont, wp } from '../theme/responsive';

export default function SplashScreen() {
  
  const navigation = useNavigation();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const profileCompleted = useSelector((state: RootState) => state.auth.profileCompleted);
  const hasSeenOnboarding = useSelector((state: RootState) => state.auth.hasSeenOnboarding);
  
  // Initialize auth state from AsyncStorage and get initialization status
  const isAuthInitialized = useAuthPersistence();
  const [fallbackInitialized, setFallbackInitialized] = useState(false);
  

  // Fallback timeout to ensure we don't get stuck
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setFallbackInitialized(true);
    }, 3000); // 3 second fallback

    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    if (!isAuthInitialized && !fallbackInitialized) {
      return;
    }


    // Small delay to ensure smooth transition
    const navigationTimer = setTimeout(() => {

      // Navigate based on auth state - FIXED ORDER
      if (!hasSeenOnboarding) {
        // User hasn't seen onboarding -> show onboarding first
        navigation.navigate('OnboardingStack' as never);
      } else if (!isLoggedIn) {
        // User has seen onboarding but not logged in -> show login
        navigation.navigate('AuthStack' as never);
      } else if (isLoggedIn && !profileCompleted) {
        // User is logged in but profile not completed -> go to profile completion
        navigation.navigate('AuthStack' as never);
      } else if (isLoggedIn && profileCompleted) {
        // User is logged in and profile is completed -> go to main app
        navigation.navigate('MainStack' as never);
      }
    }, 500); // Additional delay for smooth transition

    return () => clearTimeout(navigationTimer);
  }, [isAuthInitialized, fallbackInitialized, isLoggedIn, profileCompleted, hasSeenOnboarding, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="#ffffff"
        barStyle="dark-content"
      />
      
      {/* Logo Section - Takes up most of the screen */}
      <View style={styles.logoSection}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Maharishi Connect</Text>
      </View>
      
      {/* Loading Section */}
      <View style={styles.loadingSection}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#ffffff",
  },
  logoSection: {
    flex: 0.8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: moderateScale(40),
  },
  logo: {
    width: wp(60), // 60% of screen width
    height: wp(60), // Maintain aspect ratio
    marginBottom: moderateScale(20),
  },
  title: { 
    fontSize: responsiveFont(28), 
    fontWeight: "bold", 
    color: "#000000",
    textAlign: "center",
  },
  loadingSection: {
    flex: 0.2,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: moderateScale(40),
  },
  loadingText: {
    marginTop: moderateScale(10),
    fontSize: responsiveFont(16),
    color: "#333333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 20,
  },
  debugText: {
    fontSize: 12,
    color: "#999999",
    marginTop: 20,
  },
});
