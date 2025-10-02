import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../store';
import { useTheme } from '../../../../theme';
import CustomStatusBar from '../../../../components/atoms/ui/StatusBar';
import AvatarWithInitials from '../../../../components/atoms/ui/AvatarWithInitials';
import { logout } from '../../../../store/slices/authSlice';

export default function UserInfoScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);
  const profileCompleted = useSelector((state: RootState) => state.auth.profileCompleted);

  // Debug: Log user data to see what we're working with
  console.log('🔍 UserInfoScreen - Current user data:', user);
  console.log('🔍 UserInfoScreen - User fullName:', user?.fullName);
  console.log('🔍 UserInfoScreen - User country:', user?.country);
  console.log('🔍 UserInfoScreen - User state:', user?.state);
  console.log('🔍 UserInfoScreen - User status:', user?.status);
  console.log('🔍 UserInfoScreen - User avatar:', user?.avatar);
  console.log('🔍 UserInfoScreen - Profile completed:', profileCompleted);
  console.log('🔍 UserInfoScreen - Complete Redux auth state:', useSelector((state: RootState) => state.auth));

  // Enhanced info items with all available user data
  const infoItems = [
    { 
      label: 'Phone Number', 
      value: user?.phone || 'Not set', 
      icon: 'call-outline',
      type: 'phone'
    },
    { 
      label: 'Full Name', 
      value: user?.fullName || user?.name || 'Not set', 
      icon: 'person-outline',
      type: 'name'
    },
    { 
      label: 'Country', 
      value: user?.country || 'Not set', 
      icon: 'location-outline',
      type: 'location'
    },
    { 
      label: 'State/Region', 
      value: user?.state || 'Not set', 
      icon: 'location-outline',
      type: 'location'
    },
    { 
      label: 'Status', 
      value: user?.status || 'Not set', 
      icon: 'ellipse-outline',
      type: 'status'
    },
    { 
      label: 'Verification Status', 
      value: user?.isVerified ? 'Verified ✅' : 'Not Verified ❌', 
      icon: 'checkmark-circle-outline',
      type: 'verification'
    },
    { 
      label: 'Profile Completion', 
      value: user?.profileCompleted ? 'Complete ✅' : 'Incomplete ⚠️', 
      icon: 'document-text-outline',
      type: 'completion'
    },
    { 
      label: 'User ID', 
      value: user?.firebaseUid || user?.id || 'Not available', 
      icon: 'key-outline',
      type: 'id'
    },
  ];

  const handleEditProfile = () => {
    // Navigate to profile editing screen
    navigation.navigate('ProfileScreen' as never);
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
            console.log('🚪 User logging out from UserInfoScreen...');
            dispatch(logout());
            // Navigation will be handled by SplashScreen after logout
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomStatusBar />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Account</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.profileSection}>
        <AvatarWithInitials
          name={user?.fullName || 'User Name'}
          profilePicture={user?.avatar || user?.profilePicture}
          size={100}
        />
        <Text style={[styles.profileName, { color: colors.text }]}>
          {user?.fullName || 'User Name'}
        </Text>
        <Text style={[styles.profileSubtitle, { color: colors.subText }]}>
          {user?.phone || 'Phone number'}
        </Text>
      </View>

      <View style={styles.infoSection}>
        {infoItems.map((item, index) => (
          <View
            key={index}
            style={[
              styles.infoItem,
              { borderBottomColor: colors.border },
              index === infoItems.length - 1 && { borderBottomWidth: 0 }
            ]}
          >
            <View style={styles.infoLeft}>
              <Icon name={item.icon} size={20} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.text }]}>
                {item.label}
              </Text>
            </View>
            <Text 
              style={[
                styles.infoValue, 
                { 
                  color: item.type === 'verification' || item.type === 'completion' 
                    ? (item.value.includes('✅') ? '#4CAF50' : '#FF9800')
                    : colors.subText 
                }
              ]}
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={handleEditProfile}
        >
          <Icon name="create-outline" size={20} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.text }]}>
            Edit Profile
          </Text>
          <Icon name="chevron-forward" size={20} color={colors.subText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={handleLogout}
        >
          <Icon name="log-out-outline" size={20} color="#ef4444" />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>
            Logout
          </Text>
          <Icon name="chevron-forward" size={20} color={colors.subText} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profileSubtitle: {
    fontSize: 16,
  },
  infoSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  actionsSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
});
