import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const SideDrawer: React.FC<SideDrawerProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const slideAnim = React.useRef(new Animated.Value(-screenWidth)).current;
  const backdropAnim = React.useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setShouldRender(true);
      // Reset animation values before starting
      slideAnim.setValue(-screenWidth);
      backdropAnim.setValue(0);
      
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -screenWidth,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Hide component after animation completes
        setShouldRender(false);
      });
    }
  }, [visible, slideAnim, backdropAnim]);

  const menuItems = [
    { icon: 'chatbubbles-outline', title: 'Unread Messages', onPress: () => {} },
    { icon: 'chatbubbles-outline', title: 'Chats', onPress: () => {} },
    { icon: 'people-outline', title: 'Groups', onPress: () => {} },
    { icon: 'archive-outline', title: 'Archived Chats', onPress: () => {} },
    { icon: 'star-outline', title: 'Starred Messages', onPress: () => {} },
    { icon: 'settings-outline', title: 'Settings', onPress: () => {} },
    { icon: 'person-add-outline', title: 'Invite a friend', onPress: () => {} },
  ];

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      
      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.background,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.userProfileContainer}>
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.userAvatar}
              />
            ) : (
              <View style={[styles.userAvatarPlaceholder, { backgroundColor: colors.accent }]}>
                <Text style={[styles.userAvatarText, { color: colors.textOnPrimary }]}>
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={[styles.drawerTitle, { color: colors.text }]}>
                {user?.fullName || user?.name || user?.phone || 'User'}
              </Text>
              <Text style={[styles.userStatus, { color: colors.textSecondary }]}>
                {user?.status || 'Available'}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                { backgroundColor: item.title === 'Chats' ? colors.surface : 'transparent' },
              ]}
              onPress={() => {
                item.onPress();
                onClose();
              }}
            >
              <Icon
                name={item.icon}
                size={moderateScale(24)}
                color={colors.text}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, { color: colors.text }]}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },
  backdropTouchable: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: screenWidth * 0.8,
    zIndex: 999,
    paddingTop: hp(6), // Account for status bar
  },
  drawerHeader: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(3),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  userProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    marginRight: wp(4),
  },
  userAvatarPlaceholder: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    marginRight: wp(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: responsiveFont(20),
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  drawerTitle: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: hp(0.5),
  },
  userStatus: {
    fontSize: responsiveFont(14),
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  menuContainer: {
    paddingVertical: hp(2),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
    marginHorizontal: wp(2),
    borderRadius: moderateScale(12),
  },
  menuIcon: {
    marginRight: wp(4),
  },
  menuText: {
    fontSize: responsiveFont(16),
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

export default SideDrawer;
