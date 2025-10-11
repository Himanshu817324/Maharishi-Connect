import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { lightweightImagePicker } from '@/services/lightweightImagePicker';
import Toast from 'react-native-toast-message';

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
  activeFilter?: 'all' | 'direct' | 'groups' | 'unread' | 'archived';
  onFilterChange?: (filter: 'all' | 'direct' | 'groups' | 'unread' | 'archived') => void;
  onCameraPress?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const SideDrawer: React.FC<SideDrawerProps> = ({ 
  visible, 
  onClose, 
  activeFilter = 'all', 
  onFilterChange,
  onCameraPress 
}) => {
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

  const handleCameraPress = async () => {
    try {
      const result = await lightweightImagePicker.takePhoto();
      
      if (result.success && result.files.length > 0) {
        const file = result.files[0];
        Toast.show({
          type: 'success',
          text1: 'Photo captured!',
          text2: 'Photo saved to gallery',
        });
        // You can add additional logic here to handle the captured photo
        if (onCameraPress) {
          onCameraPress();
        }
      } else if (result.error) {
        Toast.show({
          type: 'error',
          text1: 'Camera Error',
          text2: result.error,
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Toast.show({
        type: 'error',
        text1: 'Camera Error',
        text2: 'Failed to access camera',
      });
    }
  };

  const filterItems = [
    { 
      key: 'all' as const, 
      icon: 'chatbubbles-outline', 
      title: 'All Chats', 
      onPress: () => onFilterChange?.('all') 
    },
    { 
      key: 'direct' as const, 
      icon: 'person-outline', 
      title: 'Direct Messages', 
      onPress: () => onFilterChange?.('direct') 
    },
    { 
      key: 'groups' as const, 
      icon: 'people-outline', 
      title: 'Groups', 
      onPress: () => onFilterChange?.('groups') 
    },
    { 
      key: 'unread' as const, 
      icon: 'mail-unread-outline', 
      title: 'Unread Messages', 
      onPress: () => onFilterChange?.('unread') 
    },
    { 
      key: 'archived' as const, 
      icon: 'archive-outline', 
      title: 'Archived Chats', 
      onPress: () => onFilterChange?.('archived') 
    },
  ];

  const otherMenuItems = [
    { icon: 'camera-outline', title: 'Take Photo', onPress: handleCameraPress },
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
        <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
          {/* Filter Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              FILTER CHATS
            </Text>
            {filterItems.map((item, index) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.menuItem,
                  { 
                    backgroundColor: activeFilter === item.key ? colors.accent : 'transparent',
                  },
                ]}
                onPress={() => {
                  item.onPress();
                  onClose();
                }}
              >
                <Icon
                  name={item.icon}
                  size={moderateScale(20)}
                  color={activeFilter === item.key ? '#FFFFFF' : colors.text}
                  style={styles.menuIcon}
                />
                <Text style={[
                  styles.menuText, 
                  { 
                    color: activeFilter === item.key ? '#FFFFFF' : colors.text,
                    fontWeight: activeFilter === item.key ? '600' : '500',
                  }
                ]}>
                  {item.title}
                </Text>
                {activeFilter === item.key && (
                  <Icon
                    name="checkmark"
                    size={moderateScale(16)}
                    color="#FFFFFF"
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Other Actions Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              ACTIONS
            </Text>
            {otherMenuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.menuItem, { backgroundColor: 'transparent' }]}
                onPress={() => {
                  item.onPress();
                  onClose();
                }}
              >
                <Icon
                  name={item.icon}
                  size={moderateScale(20)}
                  color={colors.text}
                  style={styles.menuIcon}
                />
                <Text style={[styles.menuText, { color: colors.text }]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    marginRight: wp(3),
  },
  userAvatarPlaceholder: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    marginRight: wp(3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  drawerTitle: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: hp(0.5),
  },
  userStatus: {
    fontSize: responsiveFont(12),
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  menuContainer: {
    flex: 1,
    paddingVertical: hp(1),
  },
  sectionContainer: {
    marginBottom: hp(2),
  },
  sectionTitle: {
    fontSize: responsiveFont(10),
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: hp(0.8),
    marginHorizontal: wp(6),
    marginTop: hp(0.8),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.2),
    marginHorizontal: wp(2),
    borderRadius: moderateScale(10),
    marginBottom: hp(0.3),
  },
  menuIcon: {
    marginRight: wp(3),
  },
  menuText: {
    fontSize: responsiveFont(14),
    fontWeight: '500',
    letterSpacing: 0.2,
    flex: 1,
  },
  checkIcon: {
    marginLeft: wp(2),
  },
});

export default SideDrawer;
