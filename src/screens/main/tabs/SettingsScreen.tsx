import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { RootState } from '@/store';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

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

  const accountItems = [
    { title: 'Account', icon: 'key-outline', onPress: () => navigation.navigate('ProfileScreen' as never) },
    { title: 'Privacy', icon: 'lock-closed-outline', onPress: () => {} },
    { title: 'Notifications', icon: 'notifications-outline', onPress: () => {} },
    { title: 'Backup', icon: 'cloud-outline', onPress: () => {} },
  ];

  const helpItems = [
    { title: 'Help', icon: 'help-circle-outline', onPress: () => {} },
    { title: 'About', icon: 'information-circle-outline', onPress: () => {} },
  ];

  const renderMenuItem = (item: any) => (
    <TouchableOpacity
      key={item.title}
      style={styles.menuItem}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <Icon name={item.icon} size={moderateScale(24)} color={colors.text} />
      <Text style={[styles.menuText, { color: colors.text }]}>
        {item.title}
      </Text>
      <Icon name="chevron-forward" size={moderateScale(20)} color={colors.textSecondary} style={styles.arrowIcon} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={moderateScale(24)} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Settings
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Profile Section */}
        <TouchableOpacity 
          style={styles.profileSection}
          onPress={() => navigation.navigate('ProfileScreen' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accent }]}>
                <Text style={[styles.avatarText, { color: colors.textOnPrimary }]}>
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.fullName || user?.name || user?.phone || 'User'}
            </Text>
            <Text style={[styles.userStatus, { color: colors.accent }]}>
              Available
            </Text>
            <TouchableOpacity style={styles.editButton}>
              <Text style={[styles.editText, { color: colors.accent }]}>
                Edit
              </Text>
            </TouchableOpacity>
          </View>
          <Icon name="chevron-forward" size={moderateScale(20)} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Account
          </Text>
          <View style={styles.menuContainer}>
            {accountItems.map(renderMenuItem)}
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Help
          </Text>
          <View style={styles.menuContainer}>
            {helpItems.map(renderMenuItem)}
          </View>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.accent }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={[styles.logoutText, { color: colors.textOnPrimary }]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    paddingTop: hp(4), // Extra padding for status bar
  },
  backButton: {
    padding: wp(2),
    borderRadius: moderateScale(8),
  },
  headerTitle: {
    fontSize: responsiveFont(20),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: moderateScale(40), // Same width as back button for centering
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(4),
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(3),
  },
  avatarContainer: {
    marginRight: wp(4),
  },
  avatar: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
  },
  avatarPlaceholder: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: responsiveFont(24),
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: responsiveFont(20),
    fontWeight: '700',
    marginBottom: hp(0.5),
  },
  userStatus: {
    fontSize: responsiveFont(16),
    fontWeight: '500',
    marginBottom: hp(0.5),
  },
  editButton: {
    alignSelf: 'flex-start',
  },
  editText: {
    fontSize: responsiveFont(16),
    fontWeight: '500',
  },
  section: {
    marginBottom: hp(3),
  },
  sectionTitle: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
    paddingHorizontal: wp(5),
    marginBottom: hp(2),
  },
  menuContainer: {
    paddingHorizontal: wp(5),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(2),
    paddingHorizontal: wp(2),
  },
  menuText: {
    fontSize: responsiveFont(16),
    fontWeight: '500',
    marginLeft: wp(3),
    flex: 1,
  },
  arrowIcon: {
    marginLeft: wp(2),
  },
  logoutButton: {
    marginHorizontal: wp(5),
    paddingVertical: hp(2),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(2),
  },
  logoutText: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
  },
});