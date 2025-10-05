import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { RootState, AppDispatch } from '@/store';
import {
  fetchUserChats,
  setCurrentChat,
  clearUnreadCount,
} from '@/store/slices/chatSlice';
import { socketService } from '@/services/socketService';
import { ChatData } from '@/services/chatService';
import CustomSafeAreaView from '@/components/atoms/ui/CustomSafeAreaView';

const ChatScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();

  const { chats, loading } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);

  // Enhanced state for WhatsApp-like features
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'favorites' | 'groups'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadChats = useCallback(
    async (forceRefresh: boolean = false) => {
      try {
        setIsRefreshing(true);
        await dispatch(fetchUserChats(forceRefresh)).unwrap();
      } catch (error) {
        console.error('Error loading chats:', error);
      } finally {
        setIsRefreshing(false);
      }
    },
    [dispatch],
  );

  const onRefresh = useCallback(() => {
    loadChats(true);
  }, [loadChats]);

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
    }, [loadChats]),
  );

  const handleChatPress = (chat: ChatData) => {
    console.log(
      '💬 Opening chat:',
      chat.id,
      'with unread count:',
      chat.unread_count,
    );

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
        p => p.user_id !== user?.id && p.user_id !== user?.firebaseUid,
      );
      return (
        otherParticipant?.userDetails?.localName ||
        otherParticipant?.userDetails?.fullName ||
        'Unknown User'
      );
    }
  };

  const getChatSubtitle = (chat: ChatData) => {
    if (chat.last_message) {
      console.log(`📱 [ChatScreen] Last message for chat ${chat.id}:`, {
        content: chat.last_message.content,
        sender_id: chat.last_message.sender_id,
        created_at: chat.last_message.created_at,
        currentUserId: user?.id,
        firebaseUid: user?.firebaseUid,
      });

      const isFromCurrentUser =
        chat.last_message.sender_id === user?.id ||
        chat.last_message.sender_id === user?.firebaseUid;
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
        p => p.user_id !== user?.id && p.user_id !== user?.firebaseUid,
      );
      const name =
        otherParticipant?.userDetails?.localName ||
        otherParticipant?.userDetails?.fullName;
      return name?.charAt(0).toUpperCase() || 'U';
    }
  };

  const getAvatarColor = (chat: ChatData) => {
    const avatarColors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
      '#F8B500',
      '#52B788',
      '#E63946',
      '#457B9D',
    ];
    const title = getChatTitle(chat);
    const index = title.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  // Filter and search functionality
  const getFilteredChats = () => {
    let filteredChats = chats;

    // Apply search filter
    if (searchQuery.trim()) {
      filteredChats = filteredChats.filter(chat => {
        const title = getChatTitle(chat).toLowerCase();
        const subtitle = getChatSubtitle(chat).toLowerCase();
        const query = searchQuery.toLowerCase();
        return title.includes(query) || subtitle.includes(query);
      });
    }

    // Apply category filter
    switch (selectedFilter) {
      case 'unread':
        filteredChats = filteredChats.filter(chat => chat.unread_count && chat.unread_count > 0);
        break;
      case 'groups':
        filteredChats = filteredChats.filter(chat => chat.type === 'group');
        break;
      case 'favorites':
        // For now, show all chats. You can implement favorites later
        break;
      default:
        break;
    }

    return filteredChats;
  };

  const getUnreadCount = () => {
    return chats.reduce((total, chat) => total + (chat.unread_count || 0), 0);
  };

  const getGroupCount = () => {
    return chats.filter(chat => chat.type === 'group').length;
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

    return (
      <TouchableOpacity
        style={[styles.chatItem, { backgroundColor: colors.background }]}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{getChatAvatarInitials(item)}</Text>
          {item.type === 'group' && (
            <View style={styles.groupBadge}>
              <Icon name="people" size={moderateScale(8)} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text
              style={[
                styles.chatTitle,
                { color: colors.text },
                hasUnread ? styles.chatTitleUnread : null,
              ]}
              numberOfLines={1}
            >
              {getChatTitle(item)}
            </Text>
            <View style={styles.chatHeaderRight}>
              {item.last_message && (
                <Text style={[styles.chatTime, { color: colors.textSecondary }]}>
                  {formatLastMessageTime(item.last_message.created_at)}
                </Text>
              )}
              {hasUnread && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.unreadText}>
                    {(item.unread_count || 0) > 99 ? '99+' : item.unread_count}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Text
            style={[
              styles.chatSubtitleText,
              { color: colors.textSecondary },
              hasUnread ? styles.chatSubtitleUnread : null,
            ]}
            numberOfLines={1}
          >
            {getChatSubtitle(item)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <View style={styles.headerContent}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <Icon name="search" size={moderateScale(18)} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search chats..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <Icon name="ellipsis-vertical" size={moderateScale(20)} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterButtons = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      <TouchableOpacity
        style={[
          styles.filterButton,
          { backgroundColor: selectedFilter === 'all' ? colors.accent : colors.surface },
        ]}
        onPress={() => setSelectedFilter('all')}
      >
        <Text
          style={[
            styles.filterText,
            { color: selectedFilter === 'all' ? colors.textOnPrimary : colors.text },
          ]}
        >
          All
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterButton,
          { backgroundColor: selectedFilter === 'unread' ? colors.accent : colors.surface },
        ]}
        onPress={() => setSelectedFilter('unread')}
      >
        <Text
          style={[
            styles.filterText,
            { color: selectedFilter === 'unread' ? colors.textOnPrimary : colors.text },
          ]}
        >
          Unread {getUnreadCount() > 0 && `(${getUnreadCount()})`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterButton,
          { backgroundColor: selectedFilter === 'groups' ? colors.accent : colors.surface },
        ]}
        onPress={() => setSelectedFilter('groups')}
      >
        <Text
          style={[
            styles.filterText,
            { color: selectedFilter === 'groups' ? colors.textOnPrimary : colors.text },
          ]}
        >
          Groups ({getGroupCount()})
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );


  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}
      >
        <Icon
          name="chatbubbles-outline"
          size={moderateScale(56)}
          color={colors.textSecondary}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {searchQuery ? 'No chats found' : 'No Chats Yet'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {searchQuery 
          ? 'Try adjusting your search terms'
          : 'Start a conversation by creating a new chat'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.accent }]}
          onPress={handleCreateChat}
        >
          <Icon
            name="add-circle-outline"
            size={moderateScale(20)}
            color="#FFFFFF"
          />
          <Text style={styles.emptyButtonText}>Start Chatting</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && chats.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading your chats...
          </Text>
        </View>
      </View>
    );
  }

  const filteredChats = getFilteredChats();

  return (
    <CustomSafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      topColor={colors.background}
      bottomColor={colors.background}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {renderHeader()}
      {renderFilterButtons()}

      <FlatList
        data={filteredChats}
        keyExtractor={item => item.id}
        renderItem={renderChatItem}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={
          filteredChats.length === 0 ? styles.emptyListContainer : styles.listContent
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={handleCreateChat}
        activeOpacity={0.85}
      >
        <Icon name="add" size={moderateScale(28)} color="#FFFFFF" />
      </TouchableOpacity>
    </CustomSafeAreaView>
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
  // Enhanced Header Styles
  header: {
    paddingTop: hp(1),
    paddingBottom: hp(1),
    paddingHorizontal: wp(4),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderRadius: moderateScale(20),
    flex: 1,
    marginRight: wp(2),
  },
  searchInput: {
    flex: 1,
    fontSize: responsiveFont(14),
    marginLeft: wp(2),
    paddingVertical: 0,
  },
  menuButton: {
    padding: moderateScale(8),
  },
  // Filter Buttons Styles
  filterContainer: {
    maxHeight: hp(4),
    marginVertical: hp(0.3),
  },
  filterContent: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.2),
  },
  filterButton: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.6),
    borderRadius: moderateScale(12),
    marginRight: wp(1.5),
  },
  filterText: {
    fontSize: responsiveFont(11),
    fontWeight: '600',
  },
  listContent: {
    paddingTop: hp(0.5),
    paddingBottom: hp(6),
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    marginHorizontal: wp(2),
    marginVertical: hp(0.1),
    borderRadius: moderateScale(8),
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  avatar: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
    position: 'relative',
  },
  avatarText: {
    fontSize: responsiveFont(18),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  groupBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#10B981',
    width: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(0.3),
  },
  chatHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  chatTitle: {
    fontSize: responsiveFont(15),
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.2,
    marginRight: wp(2),
  },
  chatTitleUnread: {
    fontWeight: '700',
  },
  chatTime: {
    fontSize: responsiveFont(11),
    fontWeight: '500',
  },
  chatSubtitleText: {
    fontSize: responsiveFont(13),
    lineHeight: responsiveFont(16),
    fontWeight: '400',
  },
  chatSubtitleUnread: {
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: moderateScale(4),
  },
  unreadText: {
    fontSize: responsiveFont(9),
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
    right: wp(4),
    width: moderateScale(52),
    height: moderateScale(52),
    borderRadius: moderateScale(26),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
});

export default ChatScreen;
