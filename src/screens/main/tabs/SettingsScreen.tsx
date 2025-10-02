import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import CustomStatusBar from '@/components/atoms/ui/StatusBar';
import ThemeToggle from '@/components/atoms/ui/ThemeToggle';
import { useTheme } from '@/theme';
import { dimensions, fontSize, spacing, borderRadius, shadow } from '@/theme/responsive';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);

  const handleSyncContacts = async () => {
    try {
      setIsSyncingContacts(true);
      console.log("🔄 Starting manual contacts sync...");
      
      // Navigate to FilteredContactsScreen for manual sync
      navigation.navigate('FilteredContactsScreen' as never);
      
    } catch (error) {
      console.error("❌ Error during contacts sync:", error);
      Alert.alert(
        "Sync Error",
        "An error occurred while syncing contacts. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSyncingContacts(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            console.log('🚪 User logging out...');
            dispatch(logout());
            // Navigation will be handled by SplashScreen after logout
          },
        },
      ]
    );
  };

  const settingsItems = [
    { title: 'Account', icon: 'person-outline', onPress: () => navigation.navigate('UserInfoScreen' as never) },
    { title: 'Sync Contacts', icon: 'sync-outline', onPress: handleSyncContacts, isLoading: isSyncingContacts },
    { title: 'Privacy', icon: 'shield-outline', onPress: () => {} },
    { title: 'Notifications', icon: 'notifications-outline', onPress: () => {} },
    { title: 'Storage & Data', icon: 'cloud-outline', onPress: () => {} },
    { title: 'Help', icon: 'help-circle-outline', onPress: () => {} },
    { title: 'About', icon: 'information-circle-outline', onPress: () => {} },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomStatusBar />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>
      
      {/* Theme Toggle Section */}
      <ThemeToggle />

      <View style={styles.settingsList}>
        {settingsItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.settingItem, 
              { borderBottomColor: colors.border },
              item.isLoading && { opacity: 0.7 }
            ]}
            onPress={item.onPress}
            disabled={item.isLoading}
          >
            <View style={styles.settingLeft}>
              <Icon 
                name={item.isLoading ? "sync" : item.icon} 
                size={dimensions.iconMedium} 
                color={colors.primary}
                style={item.isLoading ? { transform: [{ rotate: '0deg' }] } : {}}
              />
              <Text style={[styles.settingText, { color: colors.text }]}>
                {item.title}
              </Text>
            </View>
            <Icon name="chevron-forward" size={dimensions.iconSmall} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Section */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: colors.border }]}
          onPress={handleLogout}
        >
          <Icon name="log-out-outline" size={24} color="#FF4444" />
          <Text style={[styles.logoutText, { color: '#FF4444' }]}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: dimensions.safeAreaTop + spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxxl,
    fontWeight: 'bold',
  },
  settingsList: {
    paddingHorizontal: spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: fontSize.md,
    marginLeft: spacing.md,
  },
  logoutSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
