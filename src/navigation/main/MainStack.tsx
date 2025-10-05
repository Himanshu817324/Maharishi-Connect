import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import TabNavigator from '../../screens/main/tabs/TabNavigator';
import UserInfoScreen from '../../screens/main/common/settings/UserInfoScreen';
import ConversationScreen from '../../screens/main/common/chats/ConversationScreen';
import FilteredContactsScreen from '../../screens/main/common/chats/FilteredContactsScreen';

const Stack = createStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="UserInfoScreen" component={UserInfoScreen} />
      <Stack.Screen name="ConversationScreen" component={ConversationScreen} />
      <Stack.Screen name="FilteredContactsScreen" component={FilteredContactsScreen} />
    </Stack.Navigator>
  );
}
