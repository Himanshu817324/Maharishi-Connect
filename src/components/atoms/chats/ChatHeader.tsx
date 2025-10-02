import { useTheme } from "@/theme";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import React, { useEffect, useState, useCallback } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { dimensions, fontSize, moderateScale, spacing, shadow, borderRadius } from "@/theme/responsive";
import chatApiService from "@/services/chatApiService";
import ContactResolver from "@/utils/contactResolver";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { selectCurrentUser } from "@/store/slices/authSlice";
import { MainStackParamList } from "@/types/navigation";

interface ChatUser {
  _id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
}

type ConversationRouteProp = RouteProp<MainStackParamList, 'ConversationScreen'>;

const ChatHeader = () => {
  const navigation = useNavigation();
  const route = useRoute<ConversationRouteProp>();
  const { id, name, avatar } = route.params;
  const { colors } = useTheme();
  const currentUser = useSelector(selectCurrentUser);
  const [user, setUser] = useState<ChatUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  const loadChatData = useCallback(async () => {
    setIsLoading(true);
    try {
      const chatData = await chatApiService.getChat(id);
      console.log('🔍 ChatHeader received chat data:', chatData);
      
      if (chatData) {
        // Use enhanced name resolution for consistent naming
        const resolvedName = ContactResolver.resolveChatNameEnhanced(chatData, currentUser?.id || '');
        const resolvedAvatar = ContactResolver.resolveChatAvatar(chatData, currentUser?.id || '');
        
        // Only update if we got a better name than what we have
        const currentName = user?.name || name;
        if (resolvedName && resolvedName !== 'Chat' && resolvedName !== 'Unknown User' && resolvedName !== currentName) {
          console.log('🔍 Updating with resolved name:', resolvedName);
          setUser({
            _id: 'other-user',
            name: resolvedName,
            avatar: resolvedAvatar || chatData.avatar_url || chatData.avatar,
            isOnline: false
          });
        }
      }
    } catch (error) {
      console.error('Error loading chat data:', error);
      // Don't override if we already have a good name from route params
      if (!user || user.name === 'Chat') {
        console.log('🔍 Using route params as fallback due to error');
        setUser({
          _id: 'other-user',
          name: name || 'Chat',
          avatar: avatar,
          isOnline: false
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, name, avatar, currentUser?.id, user]);

  // Set initial user from route params immediately to prevent "Chat" display
  useEffect(() => {
    if (name && name !== 'Chat') {
      console.log('🔍 Setting initial user from route params:', name);
      setUser({
        _id: 'other-user',
        name: name,
        avatar: avatar,
        isOnline: false
      });
    }
  }, [name, avatar]);

  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  // Refresh when ContactResolver becomes available
  useEffect(() => {
    const checkAndRefresh = () => {
      if (ContactResolver.isInitialized() && user && (user.name === 'Chat' || user.name === 'Unknown User')) {
        console.log('🔄 ContactResolver became available, refreshing header');
        loadChatData();
      }
    };

    // Check immediately
    checkAndRefresh();

    // Set up a small interval to check periodically
    const interval = setInterval(checkAndRefresh, 1000);
    
    return () => clearInterval(interval);
  }, [user, loadChatData]);

  // Always show header, use route params as fallback with enhanced name resolution
  const displayUser = user || {
    _id: 'other-user',
    name: name || 'Chat',
    avatar: avatar,
    isOnline: false
  };



  return (
    <View style={[styles.header, { backgroundColor: colors.primary }]}>
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Icon name="arrow-back" size={moderateScale(24)} color={colors.textOnPrimary} />
      </TouchableOpacity>
      
      {displayUser.avatar ? (
        <Image source={{ uri: displayUser.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: colors.textOnPrimary }]}>
            {displayUser.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
      )}
      
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.textOnPrimary }]}>
          {displayUser.name}
        </Text>
        <Text style={[styles.userStatus, { color: colors.textOnPrimary }]}>
          {isLoading ? "Loading..." : (displayUser.isOnline ? "Online" : "Last seen recently")}
        </Text>
      </View>
      
      <TouchableOpacity style={styles.actionButton}>
        <Icon name="call" size={moderateScale(22)} color={colors.textOnPrimary} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton}>
        <Icon name="videocam" size={moderateScale(22)} color={colors.textOnPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadow.md,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  avatar: {
    width: dimensions.avatarMedium,
    height: dimensions.avatarMedium,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  userStatus: {
    fontSize: fontSize.xs,
    opacity: 0.8,
  },
  actionButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});

export default ChatHeader;
