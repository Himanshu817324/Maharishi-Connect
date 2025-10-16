import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import ProfileScreen from '../../screens/auth/ProfileScreen';
import LoginScreen from '../../screens/auth/LoginScreen';


const Stack = createStackNavigator();

const AuthStackContent: React.FC = () => {
  const navigation = useNavigation();
  const { hasSeenOnboarding, isLoggedIn, user } = useSelector((state: RootState) => state.auth);

  // Prevent navigation back to onboarding when user has seen it
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If user has seen onboarding and trying to go back to it, prevent it
      if (hasSeenOnboarding) {
        const targetRoute = e.data.action.payload?.name;
        if (targetRoute === 'OnboardingStack') {
          e.preventDefault();
          console.log('🚫 Navigation to onboarding blocked - user has already seen it');
        }
      }
    });

    return unsubscribe;
  }, [navigation, hasSeenOnboarding]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

export default function AuthStack() {
  return <AuthStackContent />;
}
