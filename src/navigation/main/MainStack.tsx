import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
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
  const navigation = useNavigation();
  const { isLoggedIn, user } = useSelector((state: RootState) => state.auth);

  // Prevent navigation back to auth screens when logged in
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      // If user is logged in and trying to go back to auth screens, prevent it
      if (isLoggedIn && user) {
        const targetRoute = e.data.action.payload?.name;
        if (targetRoute === 'AuthStack' || targetRoute === 'OnboardingStack') {
          e.preventDefault();
          console.log(
            '🚫 Navigation to auth screens blocked - user is logged in',
          );
        }
      }
    });

    return unsubscribe;
  }, [navigation, isLoggedIn, user]);

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
        <Stack.Screen
          name="ConversationScreen"
          component={ConversationScreen}
        />
        <Stack.Screen
          name="FilteredContactsScreen"
          component={FilteredContactsScreen}
        />
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
