import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OptimizedIcon from '@/components/atoms/ui/OptimizedIcon';
import { useTheme } from '@/theme';
import { moderateScale } from '@/theme/responsive';
import { TabStackParamList } from '@/types/navigation';
import ChatScreen from './ChatScreen';
import CallsScreen from './CallsScreen';
import UpdatesScreen from './UpdatesScreen';
import SettingsScreen from './SettingsScreen';
import GestureNavigationBar from '@/components/atoms/ui/GestureNavigationBar';

// Import screens


const Tab = createBottomTabNavigator<TabStackParamList>();

const TabBarIcon = ({ route, color, focused }: { route: any; color: string; focused: boolean }) => {
  let iconName: string;

  switch (route.name) {
    case 'Chats':
      iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
      break;
    case 'Calls':
      iconName = focused ? 'call' : 'call-outline';
      break;
    case 'Updates':
      iconName = focused ? 'newspaper' : 'newspaper-outline';
      break;
    case 'Settings':
      iconName = focused ? 'settings' : 'settings-outline';
      break;
    default:
      iconName = 'help-circle-outline';
  }

  return (
    <OptimizedIcon 
      name={iconName} 
      size={moderateScale(focused ? 26 : 24)} 
      color={color} 
    />
  );
};

export default function TabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Tab.Navigator  
          screenOptions={({ route }) => ({
          headerShown: false,
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTitleStyle: {
            color: colors.textOnPrimary,
          },
          headerTintColor: colors.textOnPrimary,
          headerBackTitle: 'Back',
          headerBackTitleStyle: {
            color: colors.textOnPrimary,
          },
            tabBarActiveTintColor: colors.tabBarActive,
            tabBarInactiveTintColor: colors.textOnPrimary,
            tabBarStyle: {
              backgroundColor: colors.tabBarBG,
              borderTopColor: colors.tabBarBG,
              borderTopWidth: 0,
              height: Platform.OS === 'ios' ? moderateScale(85) + insets.bottom : moderateScale(65) + insets.bottom,
              paddingBottom: Platform.OS === 'ios' ? moderateScale(25) + insets.bottom : moderateScale(10) + insets.bottom,
              paddingTop: moderateScale(8),
              elevation: 8,
              shadowColor: colors.tabBarBG,
              shadowOffset: {
                width: 0,
                height: -2,
              },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            tabBarLabelStyle: {
              fontSize: moderateScale(12),
              fontWeight: '600',
              marginTop: moderateScale(2),
              marginBottom: moderateScale(2),
            },
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon route={route} color={color} focused={focused} />
            ),
          })}
        >
          <Tab.Screen 
            name="Chats" 
            component={ChatScreen}
            options={{
              tabBarLabel: 'Chats',
            }}
          />
          <Tab.Screen 
            name="Calls" 
            component={CallsScreen}
            options={{
              tabBarLabel: 'Calls',
            }}
          />
          <Tab.Screen 
            name="Updates" 
            component={UpdatesScreen}
            options={{
              tabBarLabel: 'Updates',
            }}
          />
          <Tab.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{
              tabBarLabel: 'Settings',
            }}
          />
        </Tab.Navigator>
      <GestureNavigationBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
