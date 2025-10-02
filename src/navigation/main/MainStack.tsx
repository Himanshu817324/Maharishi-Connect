import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import TabNavigator from '../../screens/main/tabs/TabNavigator';
import FilteredContactsScreen from '../../screens/main/common/chats/FilteredContactsScreen';
import UserInfoScreen from '../../screens/main/common/settings/UserInfoScreen';
import ConversationScreen from '../../screens/main/common/chats/ConversationScreen';

const Stack = createStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="ConversationScreen" component={ConversationScreen} />
      <Stack.Screen name="FilteredContactsScreen" component={FilteredContactsScreen} />
      <Stack.Screen name="UserInfoScreen" component={UserInfoScreen} />
    </Stack.Navigator>
  );
}
