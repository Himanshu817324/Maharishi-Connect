import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import CustomHeader from '@/components/atoms/ui/CustomHeader';
import ThemeToggle from '@/components/atoms/ui/ThemeToggle';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);

  const handleSyncContacts = async () => {
    try {
      setIsSyncingContacts(true);
      console.log("🔄 Starting manual contacts sync...");
      
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
          },
        },
      ]
    );
  };

  const settingsCategories = [
    {
      title: 'Account',
      items: [
        { title: 'Profile', icon: 'person-outline', onPress: () => navigation.navigate('UserInfoScreen' as never) },
        { title: 'Sync Contacts', icon: 'sync-outline', onPress: handleSyncContacts, isLoading: isSyncingContacts },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { title: 'Privacy', icon: 'shield-checkmark-outline', onPress: () => {} },
        { title: 'Notifications', icon: 'notifications-outline', onPress: () => {} },
        { title: 'Storage & Data', icon: 'server-outline', onPress: () => {} },
      ]
    },
    {
      title: 'Support',
      items: [
        { title: 'Help Center', icon: 'help-circle-outline', onPress: () => {} },
        { title: 'About', icon: 'information-circle-outline', onPress: () => {} },
      ]
    },
  ];

  const renderSettingItem = (item: any, isLast: boolean) => (
    <TouchableOpacity
      key={item.title}
      style={[
        styles.settingItem,
        { backgroundColor: colors.surface },
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border + '30' },
        item.isLoading && { opacity: 0.7 }
      ]}
      onPress={item.onPress}
      disabled={item.isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.accent + '15' }]}>
          <Icon 
            name={item.isLoading ? "sync" : item.icon} 
            size={moderateScale(22)} 
            color={colors.accent}
          />
        </View>
        <Text style={[styles.settingText, { color: colors.text }]}>
          {item.title}
        </Text>
      </View>
      <Icon name="chevron-forward" size={moderateScale(20)} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader title="Settings" />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Manage your account and preferences
        </Text>
      </View>
      
      {/* Theme Toggle Section */}
      <View style={styles.themeSection}>
        <ThemeToggle />
      </View>

      {/* Settings Categories */}
      {settingsCategories.map((category, _categoryIndex) => (
        <View key={category.title} style={styles.categoryContainer}>
          <Text style={[styles.categoryTitle, { color: colors.textSecondary }]}>
            {category.title}
          </Text>
          <View style={[styles.categoryCard, { backgroundColor: colors.surface }]}>
            {category.items.map((item, itemIndex) => 
              renderSettingItem(item, itemIndex === category.items.length - 1)
            )}
          </View>
        </View>
      ))}

      {/* App Info */}
      <View style={styles.appInfoSection}>
        <Text style={[styles.appInfoText, { color: colors.textSecondary }]}>
          Maharishi Connect
        </Text>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          Version 1.0.0
        </Text>
      </View>

      {/* Logout Section */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: '#FF4444' + '10', borderColor: '#FF4444' + '30' }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Icon name="log-out-outline" size={moderateScale(22)} color="#FF4444" />
          <Text style={styles.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: wp(5),
    paddingTop: hp(3),
    paddingBottom: hp(1),
  },
  title: {
    fontSize: responsiveFont(32),
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: hp(0.5),
  },
  subtitle: {
    fontSize: responsiveFont(15),
    fontWeight: '400',
    lineHeight: responsiveFont(22),
  },
  themeSection: {
    paddingHorizontal: wp(1.7),
    paddingVertical: hp(2),
  },
  categoryContainer: {
    marginBottom: hp(2.5),
  },
  categoryTitle: {
    fontSize: responsiveFont(13),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: wp(5),
    marginBottom: hp(1),
  },
  categoryCard: {
    marginHorizontal: wp(4),
    borderRadius: moderateScale(16),
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(4),
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  settingText: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: hp(3),
  },
  appInfoText: {
    fontSize: responsiveFont(15),
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: hp(0.5),
  },
  versionText: {
    fontSize: responsiveFont(13),
    fontWeight: '400',
  },
  logoutSection: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(4),
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.8),
    borderRadius: moderateScale(16),
    borderWidth: 1,
  },
  logoutText: {
    fontSize: responsiveFont(16),
    fontWeight: '700',
    marginLeft: wp(2),
    color: '#FF4444',
    letterSpacing: 0.3,
  },
});