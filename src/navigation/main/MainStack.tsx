import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import TabNavigator from '../../screens/main/tabs/TabNavigator';
import UserInfoScreen from '../../screens/main/common/settings/UserInfoScreen';
import EditProfileScreen from '../../screens/main/common/settings/EditProfileScreen';
import ConversationScreen from '../../screens/main/common/chats/ConversationScreen';
import FilteredContactsScreen from '../../screens/main/common/chats/FilteredContactsScreen';
import SideDrawer from '../../components/SideDrawer';
import { DrawerProvider, useDrawer } from '../../contexts/DrawerContext';
import { FilterProvider, useFilter } from '../../contexts/FilterContext';

const Stack = createStackNavigator();

const MainStackContent: React.FC = () => {
  const { isDrawerVisible, closeDrawer } = useDrawer();
  const { activeFilter, setActiveFilter } = useFilter();

  const handleCameraPress = () => {
    // Handle camera press - you can add navigation or other logic here
    console.log('Camera pressed from drawer');
  };

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="UserInfoScreen" component={UserInfoScreen} />
        <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
        <Stack.Screen name="ConversationScreen" component={ConversationScreen} />
        <Stack.Screen name="FilteredContactsScreen" component={FilteredContactsScreen} />
      </Stack.Navigator>
      
      {/* Side Drawer - Renders over everything */}
      <SideDrawer
        visible={isDrawerVisible}
        onClose={closeDrawer}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onCameraPress={handleCameraPress}
      />
    </>
  );
};

export default function MainStack() {
  return (
    <DrawerProvider>
      <FilterProvider>
        <MainStackContent />
      </FilterProvider>
    </DrawerProvider>
  );
}
