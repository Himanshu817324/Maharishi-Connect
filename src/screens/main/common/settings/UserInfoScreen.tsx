import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../store';
import { useTheme } from '../../../../theme';
import CustomHeader from '../../../../components/atoms/ui/CustomHeader';
import AvatarWithInitials from '../../../../components/atoms/ui/AvatarWithInitials';
import { logout } from '../../../../store/slices/authSlice';
import {
  moderateScale,
  responsiveFont,
  wp,
  hp,
} from '../../../../theme/responsive';
import { LightColors } from '../../../../theme/colors';
import { useFocusEffect } from '@react-navigation/native';

export default function UserInfoScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);
  const profileCompleted = useSelector(
    (state: RootState) => state.auth.profileCompleted,
  );

  console.log('🔍 UserInfoScreen - Current user data:', user);
  console.log('🔍 UserInfoScreen - Profile completed:', profileCompleted);
  console.log('🔍 UserInfoScreen - Profile picture:', user?.profilePicture);
  console.log('🔍 UserInfoScreen - Avatar:', user?.avatar);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔍 UserInfoScreen - Screen focused, refreshing data...');
      console.log('🔍 UserInfoScreen - Updated user data:', user);
    }, [user]),
  );

  const infoSections = [
    {
      title: 'Personal Information',
      items: [
        {
          label: 'Full Name',
          value: user?.fullName || user?.name || 'Not set',
          icon: 'person-outline',
          iconColor: LightColors.primary,
        },
        {
          label: 'Phone Number',
          value: user?.phone || 'Not set',
          icon: 'call-outline',
          iconColor: LightColors.accent,
        },
        {
          label: 'Status',
          value: user?.status || 'Available',
          icon: 'chatbubble-ellipses-outline',
          iconColor: LightColors.accent,
        },
      ],
    },
    {
      title: 'Location',
      items: [
        {
          label: 'Country',
          value: user?.country || 'Not set',
          icon: 'earth-outline',
          iconColor: LightColors.primary,
        },
        {
          label: 'State/Region',
          value: user?.state || 'Not set',
          icon: 'location-outline',
          iconColor: LightColors.accent,
        },
      ],
    },
    {
      title: 'Account Status',
      items: [
        {
          label: 'Verification',
          value: user?.isVerified ? 'Verified' : 'Not Verified',
          icon: user?.isVerified
            ? 'shield-checkmark-outline'
            : 'shield-outline',
          iconColor: user?.isVerified ? LightColors.accent : LightColors.error,
          showBadge: true,
          badgeStatus: user?.isVerified,
        },
        {
          label: 'Profile Status',
          value: user?.profileCompleted ? 'Complete' : 'Incomplete',
          icon: user?.profileCompleted
            ? 'checkmark-circle-outline'
            : 'alert-circle-outline',
          iconColor: user?.profileCompleted
            ? LightColors.accent
            : LightColors.error,
          showBadge: true,
          badgeStatus: user?.profileCompleted,
        },
      ],
    },
  ];

  const handleEditProfile = () => {
    navigation.navigate('EditProfileScreen' as never);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
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
          // Reset navigation stack to prevent back navigation
          navigation.reset({
            index: 0,
            routes: [{ name: 'SplashScreen' as never }],
          });
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader
        title="Profile"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View
          style={[styles.profileSection, { backgroundColor: colors.surface }]}
        >
          <View style={styles.avatarContainer}>
            <AvatarWithInitials
              name={user?.fullName || 'User Name'}
              profilePicture={user?.profilePicture || user?.avatar}
              size={moderateScale(100)}
            />
            <TouchableOpacity
              style={[
                styles.editAvatarButton,
                { backgroundColor: colors.accent },
              ]}
              onPress={handleEditProfile}
            >
              <Icon
                name="camera"
                size={moderateScale(16)}
                color={LightColors.textOnPrimary}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.profileName, { color: colors.text }]}>
            {user?.fullName || 'User Name'}
          </Text>
          <Text style={[styles.profilePhone, { color: colors.textSecondary }]}>
            {user?.phone || 'Phone number'}
          </Text>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View
              style={[
                styles.statItem,
                { backgroundColor: colors.accent + '15' },
              ]}
            >
              <Icon
                name="shield-checkmark"
                size={moderateScale(20)}
                color={colors.accent}
              />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {user?.isVerified ? 'Verified' : 'Unverified'}
              </Text>
            </View>
            <View
              style={[
                styles.statItem,
                { backgroundColor: colors.accent + '15' },
              ]}
            >
              <Icon
                name="checkmark-circle"
                size={moderateScale(20)}
                color={colors.accent}
              />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {user?.profileCompleted ? 'Complete' : 'Incomplete'}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Sections */}
        {infoSections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.infoSectionContainer}>
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              {section.title}
            </Text>
            <View
              style={[styles.infoCard, { backgroundColor: colors.surface }]}
            >
              {section.items.map((item, itemIndex) => (
                <View
                  key={item.label}
                  style={[
                    styles.infoItem,
                    itemIndex !== section.items.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border + '30',
                    },
                  ]}
                >
                  <View style={styles.infoLeft}>
                    <View
                      style={[
                        styles.infoIconContainer,
                        { backgroundColor: item.iconColor + '15' },
                      ]}
                    >
                      <Icon
                        name={item.icon}
                        size={moderateScale(20)}
                        color={item.iconColor}
                      />
                    </View>
                    <Text style={[styles.infoLabel, { color: colors.text }]}>
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.infoRight}>
                    <Text
                      style={[
                        styles.infoValue,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.value}
                    </Text>
                    {'showBadge' in item && item.showBadge && (
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: item.badgeStatus
                              ? LightColors.accent
                              : LightColors.error,
                          },
                        ]}
                      >
                        <Icon
                          name={item.badgeStatus ? 'checkmark' : 'close'}
                          size={moderateScale(12)}
                          color={LightColors.textOnPrimary}
                        />
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
            onPress={handleEditProfile}
            activeOpacity={0.8}
          >
            <Icon
              name="create-outline"
              size={moderateScale(20)}
              color={LightColors.textOnPrimary}
            />
            <Text style={styles.primaryButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dangerButton,
              {
                backgroundColor: LightColors.error + '15',
                borderColor: LightColors.error + '30',
              },
            ]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Icon
              name="log-out-outline"
              size={moderateScale(20)}
              color={LightColors.error}
            />
            <Text style={styles.dangerButtonText}>Logout</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(1.5),
  },
  backButton: {
    padding: moderateScale(8),
  },
  headerTitle: {
    fontSize: responsiveFont(20),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  placeholder: {
    width: moderateScale(40),
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: hp(4),
    paddingHorizontal: wp(5),
    marginBottom: hp(2),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: hp(2),
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: LightColors.background,
  },
  profileName: {
    fontSize: responsiveFont(26),
    fontWeight: '800',
    marginBottom: hp(0.5),
    letterSpacing: 0.5,
  },
  profilePhone: {
    fontSize: responsiveFont(15),
    fontWeight: '500',
    marginBottom: hp(2),
  },
  quickStats: {
    flexDirection: 'row',
    gap: moderateScale(12),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(12),
    gap: moderateScale(6),
  },
  statLabel: {
    fontSize: responsiveFont(13),
    fontWeight: '600',
  },
  infoSectionContainer: {
    marginBottom: hp(2),
  },
  sectionTitle: {
    fontSize: responsiveFont(13),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: wp(5),
    marginBottom: hp(1),
  },
  infoCard: {
    marginHorizontal: wp(4),
    borderRadius: moderateScale(16),
    overflow: 'hidden',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoIconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  infoLabel: {
    fontSize: responsiveFont(15),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  infoValue: {
    fontSize: responsiveFont(15),
    fontWeight: '500',
    textAlign: 'right',
  },
  statusBadge: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsSection: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(4),
    gap: moderateScale(12),
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.8),
    borderRadius: moderateScale(16),
    gap: moderateScale(8),
  },
  primaryButtonText: {
    fontSize: responsiveFont(16),
    fontWeight: '700',
    color: LightColors.textOnPrimary,
    letterSpacing: 0.3,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.8),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    gap: moderateScale(8),
  },
  dangerButtonText: {
    fontSize: responsiveFont(16),
    fontWeight: '700',
    color: LightColors.error,
    letterSpacing: 0.3,
  },
});
