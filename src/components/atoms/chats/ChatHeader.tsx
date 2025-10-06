import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import {
  responsiveFont,
  wp,
  hp,
  moderateScale,
  dimensions,
} from '@/theme/responsive';
import CustomStatusBar from '@/components/atoms/ui/StatusBar';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import { ChatData } from '@/services/chatService';

interface ChatHeaderProps {
  chat: ChatData;
  currentUserId?: string;
  onBack?: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onSearch?: () => void;
  onInfo?: () => void;
  onMore?: () => void;
  isOnline?: boolean;
  lastSeen?: string;
  backgroundColor?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  chat,
  currentUserId,
  onBack,
  onCall,
  onVideoCall,
  onSearch,
  onInfo,
  onMore,
  isOnline = false,
  lastSeen,
  backgroundColor,
}) => {
  const { colors } = useTheme();
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const handleMenuPress = () => setIsMenuVisible(!isMenuVisible);
  const handleMenuClose = () => setIsMenuVisible(false);
  const handleMenuAction = (action: () => void) => {
    action();
    setIsMenuVisible(false);
  };

  const getChatTitle = () => {
    if (chat.type === 'group') return chat.name || 'Group Chat';
    const other = chat.participants.find(
      p => p.user_id !== currentUserId && p.user_id !== chat.created_by
    );
    return (
      other?.userDetails.localName ||
      other?.userDetails.fullName ||
      'Unknown User'
    );
  };

  const getChatSubtitle = () => {
    if (chat.type === 'group') return `${chat.participants.length} members`;
    if (isOnline) return 'Online';
    if (lastSeen) return `Last seen ${new Date(lastSeen).toLocaleTimeString()}`;
    return 'Offline';
  };

  const getAvatarInitials = () => {
    if (chat.type === 'group') {
      return chat.name?.charAt(0).toUpperCase() || 'G';
    } else {
      const other = chat.participants.find(
        p => p.user_id !== currentUserId && p.user_id !== chat.created_by
      );
      const name =
        other?.userDetails.localName || other?.userDetails.fullName || '';
      return name.charAt(0).toUpperCase() || 'U';
    }
  };

  const renderAvatar = () => {
    if (chat.type === 'group') {
      return (
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarText, { color: colors.textOnPrimary }]}>
            {getAvatarInitials()}
          </Text>
        </View>
      );
    } else {
      const other = chat.participants.find(
        p => p.user_id !== currentUserId && p.user_id !== chat.created_by
      );
      const profilePicture =
        other?.userDetails.localProfilePicture ||
        other?.userDetails.profilePicture;

      if (profilePicture) {
        return (
          <View style={styles.avatar}>
            <Image
              source={{ uri: profilePicture }}
              style={styles.avatarImage}
              defaultSource={require('@/assets/logo.png')}
            />
          </View>
        );
      }
      return (
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarText, { color: colors.textOnPrimary }]}>
            {getAvatarInitials()}
          </Text>
        </View>
      );
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor || colors.primary,
          shadowColor: '#000',
        },
      ]}
    >
      <CustomStatusBar backgroundColor={colors.primary} />
      <View style={styles.headerContent}>
        <View style={styles.leftSection}>
          {onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name="arrow-back"
                size={moderateScale(24)}
                color={colors.textOnPrimary}
              />
            </TouchableOpacity>
          )}
          <View style={styles.avatarContainer}>
            {renderAvatar()}
            {chat.type === 'direct' && (
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor: isOnline
                      ? colors.accent
                      : colors.textSecondary,
                  },
                ]}
              />
            )}
          </View>
          <View style={styles.titleContainer}>
            <Text
              style={[styles.title, { color: colors.textOnPrimary }]}
              numberOfLines={1}
            >
              {getChatTitle()}
            </Text>
            <View style={styles.subtitleContainer}>
              <Text
                style={[styles.subtitle, { color: colors.textOnPrimary }]}
                numberOfLines={1}
              >
                {getChatSubtitle()}
              </Text>
              {chat.type === 'direct' && (
                <OnlineStatusIndicator
                  isOnline={isOnline}
                  lastSeen={lastSeen}
                  showText={true}
                  size="small"
                />
              )}
            </View>
          </View>
        </View>

        <View style={styles.rightSection}>
          {onCall && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onCall}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name="call"
                size={moderateScale(20)}
                color={colors.textOnPrimary}
              />
            </TouchableOpacity>
          )}

          {onVideoCall && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onVideoCall}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name="videocam"
                size={moderateScale(20)}
                color={colors.textOnPrimary}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleMenuPress}
          >
            <Icon
              name="ellipsis-vertical"
              size={moderateScale(20)}
              color={colors.textOnPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu */}
      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleMenuClose}
      >
        <Pressable style={styles.menuOverlay} onPress={handleMenuClose}>
          <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
            {onSearch && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuAction(onSearch)}
              >
                <Icon name="search" size={moderateScale(20)} color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Search
                </Text>
              </TouchableOpacity>
            )}
            {onInfo && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuAction(onInfo)}
              >
                <Icon
                  name="information-circle"
                  size={moderateScale(20)}
                  color={colors.text}
                />
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Chat Info
                </Text>
              </TouchableOpacity>
            )}
            {onMore && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuAction(onMore)}
              >
                <Icon name="settings" size={moderateScale(20)} color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  More Options
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? hp(6) : hp(1),
    paddingBottom: hp(1.5),
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    height: hp(6),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  backButton: {
    marginRight: wp(2),
  },
  avatarContainer: {
    position: 'relative',
    marginRight: wp(3),
  },
  avatar: {
    width: dimensions.avatarMedium,
    height: dimensions.avatarMedium,
    borderRadius: dimensions.avatarMedium / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: dimensions.avatarMedium / 2,
  },
  avatarText: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: wp(3),
    height: wp(3),
    borderRadius: wp(1.5),
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: responsiveFont(19),
    fontWeight: '700',
    textAlign: 'left',
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.25),
  },
  subtitle: {
    fontSize: responsiveFont(14),
    opacity: 0.9,
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: wp(2),
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: dimensions.headerHeight + hp(1),
    paddingRight: wp(4),
  },
  menuContainer: {
    borderRadius: wp(2),
    paddingVertical: hp(1),
    minWidth: wp(40),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  menuItemText: {
    fontSize: responsiveFont(16),
    marginLeft: wp(3),
    fontWeight: '500',
  },
});

export default ChatHeader;
