import React, { useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { RootState, AppDispatch } from '@/store';
import { fetchUserChats, setCurrentChat, clearUnreadCount } from '@/store/slices/chatSlice';
import { socketService } from '@/services/socketService';
import { ChatData } from '@/services/chatService';
import CustomHeader from '@/components/atoms/ui/CustomHeader';

const ChatScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  
  const { chats, loading } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);

  const loadChats = useCallback(async (forceRefresh: boolean = false) => {
    try {
      await dispatch(fetchUserChats(forceRefresh)).unwrap();
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  }, [dispatch]);

  const setupSocketListeners = useCallback(() => {
    socketService.addChatCreatedListener((chat: ChatData) => {
      dispatch(setCurrentChat(chat));
      // Force refresh chats when a new chat is created
      loadChats(true);
    });
    
    return () => {};
  }, [dispatch, loadChats]);

  useEffect(() => {
    loadChats();
    const cleanup = setupSocketListeners();
    
    return cleanup;
  }, [loadChats, setupSocketListeners]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 ChatScreen focused, refreshing chats...');
      loadChats(true); // Force refresh on focus
    }, [loadChats])
  );

  const handleChatPress = (chat: ChatData) => {
    console.log('💬 Opening chat:', chat.id, 'with unread count:', chat.unread_count);
    
    // Clear unread count immediately when chat is opened
    if (chat.unread_count && chat.unread_count > 0) {
      console.log('🔔 Clearing unread count immediately for chat:', chat.id);
      dispatch(clearUnreadCount(chat.id));
    }
    
    dispatch(setCurrentChat(chat));
    (navigation as any).navigate('ConversationScreen', { chat });
  };

  const handleCreateChat = () => {
    (navigation as any).navigate('FilteredContactsScreen');
  };

  const getChatTitle = (chat: ChatData) => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat';
    } else {
      const otherParticipant = chat.participants.find(
        p => p.user_id !== user?.id && p.user_id !== user?.firebaseUid
      );
      return otherParticipant?.userDetails?.localName || otherParticipant?.userDetails?.fullName || 'Unknown User';
    }
  };

  const getChatSubtitle = (chat: ChatData) => {
    if (chat.last_message) {
      console.log(`📱 [ChatScreen] Last message for chat ${chat.id}:`, {
        content: chat.last_message.content,
        sender_id: chat.last_message.sender_id,
        created_at: chat.last_message.created_at,
        currentUserId: user?.id,
        firebaseUid: user?.firebaseUid
      });
      
      const isFromCurrentUser = chat.last_message.sender_id === user?.id || chat.last_message.sender_id === user?.firebaseUid;
      if (isFromCurrentUser) {
        return `You: ${chat.last_message.content}`;
      }
      return chat.last_message.content;
    }
    return chat.type === 'group' 
      ? `${chat.participants.length} members`
      : 'No messages yet';
  };

  const getChatAvatarInitials = (chat: ChatData) => {
    if (chat.type === 'group') {
      return chat.name?.charAt(0).toUpperCase() || 'G';
    } else {
      const otherParticipant = chat.participants.find(
        p => p.user_id !== user?.id && p.user_id !== user?.firebaseUid
      );
      const name = otherParticipant?.userDetails?.localName || otherParticipant?.userDetails?.fullName;
      return name?.charAt(0).toUpperCase() || 'U';
    }
  };

  const getAvatarColor = (chat: ChatData) => {
    const avatarColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B500', '#52B788', '#E63946', '#457B9D'
    ];
    const title = getChatTitle(chat);
    const index = title.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const renderChatItem = ({ item }: { item: ChatData }) => {
    const avatarColor = getAvatarColor(item);
    const hasUnread = item.unread_count && item.unread_count > 0;
    
    // Debug logging for unread count
    if (item.unread_count && item.unread_count > 0) {
      console.log('🔔 Chat item has unread count:', item.id, item.unread_count);
    }

    const chatItemStyle = [
      styles.chatItem,
      { 
        backgroundColor: colors.surface,
        borderLeftColor: hasUnread ? colors.accent : 'transparent'
      }
    ];

    return (
      <TouchableOpacity
        style={chatItemStyle}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>
            {getChatAvatarInitials(item)}
          </Text>
          {item.type === 'group' && (
            <View style={styles.groupBadge}>
              <Icon name="people" size={moderateScale(10)} color="#FFFFFF" />
            </View>
          )}
        </View>
        
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text 
              style={[
                styles.chatTitle, 
                { color: colors.text },
                hasUnread ? styles.chatTitleUnread : null
              ]} 
              numberOfLines={1}
            >
              {getChatTitle(item)}
            </Text>
            {item.last_message && (
              <Text style={[styles.chatTime, { color: colors.textSecondary }]}>
                {formatLastMessageTime(item.last_message.created_at)}
              </Text>
            )}
          </View>
          
          <View style={styles.chatSubtitle}>
            <Text 
              style={[
                styles.chatSubtitleText, 
                { color: colors.textSecondary },
                hasUnread ? styles.chatSubtitleUnread : null
              ]} 
              numberOfLines={2}
            >
              {getChatSubtitle(item)}
            </Text>
            {hasUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.unreadText}>
                  {(item.unread_count || 0) > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
        <Icon name="chatbubbles-outline" size={moderateScale(56)} color={colors.textSecondary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No Chats Yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Start a conversation by creating a new chat
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.accent }]}
        onPress={handleCreateChat}
      >
        <Icon name="add-circle-outline" size={moderateScale(20)} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Start Chatting</Text>
      </TouchableOpacity>
    </View>
  );


  if (loading && chats.length === 0) {
    return (
      <View style={[styles.container, styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading your chats...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader title="Chats" />
      
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={chats.length === 0 ? styles.emptyListContainer : styles.listContent}
      />
      
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={handleCreateChat}
        activeOpacity={0.85}
      >
        <Icon name="create-outline" size={moderateScale(28)} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: responsiveFont(16),
    fontWeight: '500',
    marginTop: hp(2),
    letterSpacing: 0.3,
  },
  listContent: {
    paddingTop: hp(1),
    paddingBottom: hp(8), // Reduced bottom padding to remove extra space
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.8),
    marginHorizontal: wp(2),
    marginVertical: hp(0.4),
    borderRadius: moderateScale(16),
    borderLeftWidth: 3,
  },
  avatar: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3.5),
    position: 'relative',
  },
  avatarText: {
    fontSize: responsiveFont(22),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  groupBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10B981',
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.6),
  },
  chatTitle: {
    fontSize: responsiveFont(17),
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.2,
    marginRight: wp(2),
  },
  chatTitleUnread: {
    fontWeight: '700',
  },
  chatTime: {
    fontSize: responsiveFont(13),
    fontWeight: '500',
  },
  chatSubtitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatSubtitleText: {
    fontSize: responsiveFont(15),
    flex: 1,
    lineHeight: responsiveFont(20),
    fontWeight: '400',
  },
  chatSubtitleUnread: {
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: moderateScale(22),
    height: moderateScale(22),
    borderRadius: moderateScale(11),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: moderateScale(6),
    marginLeft: moderateScale(8),
  },
  unreadText: {
    fontSize: responsiveFont(11),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(10),
    paddingVertical: hp(10),
  },
  emptyIconContainer: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  emptyTitle: {
    fontSize: responsiveFont(24),
    fontWeight: '700',
    marginBottom: hp(1),
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: responsiveFont(15),
    textAlign: 'center',
    marginBottom: hp(4),
    lineHeight: responsiveFont(22),
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(24),
    paddingVertical: moderateScale(14),
    borderRadius: moderateScale(16),
  },
  emptyButtonText: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: moderateScale(8),
    letterSpacing: 0.3,
  },
  fab: {
    position: 'absolute',
    bottom: hp(5),
    right: wp(6),
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default ChatScreen;