import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { RootStackParamList } from '../types/navigation';

// Import navigation stacks
import AuthStack from './auth/AuthStack';
import MainStack from './main/MainStack';
import OnboardingStack from './onboarding/OnboardingStack';

// Import screens
import SplashScreen from '../screens/SplashScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  console.log('🚀 RootNavigator rendered');
  
  const { user, isLoggedIn, profileCompleted, hasSeenOnboarding } = useSelector((state: RootState) => state.auth);
  
  console.log('🔐 Auth state:', { 
    isLoggedIn, 
    hasUser: !!user, 
    profileCompleted,
    hasSeenOnboarding,
    userDetails: user ? {
      id: user.id,
      fullName: user.fullName,
      firebaseUid: user.firebaseUid
    } : null
  });
  
  try {
    return (
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="SplashScreen"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="SplashScreen" component={SplashScreen} />
          <Stack.Screen name="OnboardingStack" component={OnboardingStack} />
          <Stack.Screen name="AuthStack" component={AuthStack} />
          <Stack.Screen name="MainStack" component={MainStack} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  } catch (error) {
    console.error('❌ Error in RootNavigator:', error);
    return null;
  }
}
