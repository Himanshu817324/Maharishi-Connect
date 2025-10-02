import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useTheme } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { useAuthPersistence } from '../hooks/useAuthPersistence';

export default function SplashScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const profileCompleted = useSelector((state: RootState) => state.auth.profileCompleted);
  const hasSeenOnboarding = useSelector((state: RootState) => state.auth.hasSeenOnboarding);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state from AsyncStorage
  useAuthPersistence();

  useEffect(() => {
    // Wait for auth state to be initialized from AsyncStorage
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 1000); // Give time for AsyncStorage to load

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const navigationTimer = setTimeout(() => {
      console.log('🚀 Navigating from SplashScreen:', {
        isLoggedIn,
        profileCompleted,
        hasSeenOnboarding,
      });

      // Navigate based on auth state
      if (!hasSeenOnboarding) {
        // User hasn't seen onboarding -> show onboarding first
        navigation.navigate('OnboardingStack' as never);
      } else if (!isLoggedIn) {
        // User hasn't logged in -> go to login
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
  }, [isInitialized, isLoggedIn, profileCompleted, hasSeenOnboarding, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="#ffffff"
        barStyle="dark-content"
      />
      <Text style={styles.title}>Maharishi Connect</Text>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
});
