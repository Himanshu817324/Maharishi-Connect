import { useTheme } from "@/theme";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState, useCallback } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { dimensions, fontSize, moderateScale, spacing, shadow, borderRadius } from "@/theme/responsive";
import chatApiService from "@/services/chatApiService";

interface ChatUser {
  _id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
}

const ChatHeader = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { id, name, avatar } = route.params as { id: string; name?: string; avatar?: string };
  const { colors } = useTheme();
  const [user, setUser] = useState<ChatUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadChatData = useCallback(async () => {
    setIsLoading(true);
    try {
      const chatData = await chatApiService.getChat(id);
      console.log('🔍 ChatHeader received chat data:', chatData);
      
      if (chatData) {
        // Use API data if available
        setUser({
          _id: 'other-user',
          name: chatData.name || 'Chat',
          avatar: chatData.avatar_url || chatData.avatar,
          isOnline: false
        });
      } else {
        // Fallback to route params if API fails
        console.log('🔍 Using route params as fallback');
        setUser({
          _id: 'other-user',
          name: name || 'Chat',
          avatar: avatar,
          isOnline: false
        });
      }
    } catch (error) {
      console.error('Error loading chat data:', error);
      // Fallback to route params if API fails
      console.log('🔍 Using route params as fallback due to error');
      setUser({
        _id: 'other-user',
        name: name || 'Chat',
        avatar: avatar,
        isOnline: false
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, name, avatar]);

  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  // Always show header, use route params as fallback
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
