import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import ProfileScreen from '../../screens/auth/ProfileScreen';
import OTPScreen from '../../screens/auth/OTPScreen';
import LoginScreen from '../../screens/auth/LoginScreen';


const Stack = createStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="OTPScreen" component={OTPScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
