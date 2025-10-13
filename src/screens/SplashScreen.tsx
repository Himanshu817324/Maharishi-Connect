import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useNavigation } from '@react-navigation/native';
import { useAuthPersistence } from '../hooks/useAuthPersistence';

export default function SplashScreen() {
  console.log('🎬 SplashScreen component rendered');
  
  const navigation = useNavigation();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const profileCompleted = useSelector((state: RootState) => state.auth.profileCompleted);
  const hasSeenOnboarding = useSelector((state: RootState) => state.auth.hasSeenOnboarding);
  
  // Initialize auth state from AsyncStorage and get initialization status
  const isAuthInitialized = useAuthPersistence();
  const [fallbackInitialized, setFallbackInitialized] = useState(false);
  
  console.log('🎬 SplashScreen state:', {
    isAuthInitialized,
    isLoggedIn,
    profileCompleted,
    hasSeenOnboarding,
    fallbackInitialized,
  });

  // Fallback timeout to ensure we don't get stuck
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      console.log('⏰ Fallback timeout reached - forcing navigation');
      setFallbackInitialized(true);
    }, 3000); // 3 second fallback

    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    if (!isAuthInitialized && !fallbackInitialized) {
      console.log('⏳ Waiting for auth initialization...');
      return;
    }

    console.log('🚀 Auth initialized, checking navigation state:', {
      isLoggedIn,
      profileCompleted,
      hasSeenOnboarding,
    });

    // Small delay to ensure smooth transition
    const navigationTimer = setTimeout(() => {
      console.log('🚀 Navigating from SplashScreen:', {
        isLoggedIn,
        profileCompleted,
        hasSeenOnboarding,
      });

      // Navigate based on auth state - FIXED ORDER
      if (!hasSeenOnboarding) {
        // User hasn't seen onboarding -> show onboarding first
        console.log('📱 Navigating to OnboardingStack');
        navigation.navigate('OnboardingStack' as never);
      } else if (!isLoggedIn) {
        // User has seen onboarding but not logged in -> show login
        console.log('🔐 User not logged in, navigating to AuthStack');
        navigation.navigate('AuthStack' as never);
      } else if (isLoggedIn && !profileCompleted) {
        // User is logged in but profile not completed -> go to profile completion
        console.log('👤 Navigating to AuthStack for profile completion');
        navigation.navigate('AuthStack' as never);
      } else if (isLoggedIn && profileCompleted) {
        // User is logged in and profile is completed -> go to main app
        console.log('🏠 Navigating to MainStack');
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
      <Text style={styles.title}>Maharishi Connect</Text>
      <ActivityIndicator size="large" color="#007AFF" />
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 10,
    color: "#000000",
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
