import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import OptimizedIcon from '@/components/atoms/ui/OptimizedIcon';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { RootState, AppDispatch } from '@/store';
import { fetchUserChats, setCurrentChat, clearUnreadCount } from '@/store/slices/chatSlice';
import { socketService } from '@/services/socketService';
import { ChatData } from '@/services/chatService';
import { useDrawer } from '@/contexts/DrawerContext';
import { useFilter } from '@/contexts/FilterContext';

// Chat item separator component
const ChatItemSeparator: React.FC = () => {
  const { colors } = useTheme();
  return <View style={[styles.chatItemSeparator, { backgroundColor: colors.border }]} />;
};

const ChatScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  
  const { chats, loading } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);
  const { openDrawer } = useDrawer();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const { activeFilter, setActiveFilter } = useFilter();

  const getChatTitle = useCallback((chat: ChatData) => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat';
    } else {
      const otherParticipant = chat.participants.find(
        p => p.user_id !== user?.id && p.user_id !== user?.firebaseUid
      );
      return otherParticipant?.userDetails?.localName || 
             otherParticipant?.userDetails?.fullName || 
             otherParticipant?.userDetails?.phoneNumber || 
             'Unknown User';
    }
  }, [user?.id, user?.firebaseUid]);

  // Filter chats based on active filter and search text - memoized for performance
  const filteredChats = useMemo(() => {
    let filtered = chats;
    
    // Apply filter based on active filter
    switch (activeFilter) {
      case 'direct':
        filtered = chats.filter(chat => chat.type === 'direct');
        break;
      case 'groups':
        filtered = chats.filter(chat => chat.type === 'group');
        break;
      case 'unread':
        filtered = chats.filter(chat => chat.unread_count && chat.unread_count > 0);
        break;
      case 'archived':
        // For now, we'll show chats that haven't been active recently
        // In a real app, you'd have an archived field
        filtered = chats.filter(chat => {
          if (!chat.last_message) return true;
          const lastMessageTime = new Date(chat.last_message.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return lastMessageTime < weekAgo;
        });
        break;
      case 'all':
      default:
        filtered = chats;
        break;
    }
    
    // Apply search filter if search text exists
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(chat => {
        const chatTitle = getChatTitle(chat).toLowerCase();
        const lastMessage = chat.last_message?.content?.toLowerCase() || '';
        
        return chatTitle.includes(searchLower) || lastMessage.includes(searchLower);
      });
    }
    
    console.log('📱 [ChatScreen] Filtered chats updated:', {
      totalChats: chats.length,
      filteredCount: filtered.length,
      activeFilter: activeFilter,
      searchText: searchText,
      chatOrder: filtered.map(chat => ({
        id: chat.id,
        name: getChatTitle(chat),
        unread_count: chat.unread_count || 0,
        last_message_time: chat.last_message?.created_at,
        updated_at: chat.updated_at
      }))
    });
    
    return filtered;
  }, [chats, activeFilter, searchText, getChatTitle]);

  const toggleSearch = useCallback(() => {
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible) {
      setSearchText(''); // Clear search when hiding
    }
  }, [isSearchVisible]);

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  const hideSearch = useCallback(() => {
    setIsSearchVisible(false);
    setSearchText('');
  }, []);

  const loadChats = useCallback(async (forceRefresh: boolean = false) => {
    try {
      await dispatch(fetchUserChats(forceRefresh)).unwrap();
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  }, [dispatch]);

  const setupSocketListeners = useCallback(() => {
    // Listen for new chats being created
    const removeChatCreatedListener = socketService.addChatCreatedListener((chat: ChatData) => {
      console.log('💬 [ChatScreen] New chat created:', chat.id);
      dispatch(setCurrentChat(chat));
      // Force refresh chats when a new chat is created
      loadChats(true);
    });
    
    // Listen for new messages to update chat list
    const removeMessageListener = socketService.addMessageListener((message: any) => {
      console.log('📨 [ChatScreen] New message received for chat:', message.chat_id);
      // Force refresh chats to update last message and unread count
      loadChats(true);
    });
    
    // Listen for connection status changes
    const removeConnectionListener = socketService.addConnectionListener((connected: boolean) => {
      console.log('🔌 [ChatScreen] Socket connection status changed:', connected);
      if (connected) {
        // Refresh chats when reconnected
        loadChats(true);
      }
    });
    
    return () => {
      removeChatCreatedListener();
      removeMessageListener();
      removeConnectionListener();
    };
  }, [dispatch, loadChats]);

  useEffect(() => {
    loadChats();
    const cleanup = setupSocketListeners();
    
    // Setup periodic refresh every 30 seconds (similar to reference implementation)
    const refreshInterval = setInterval(() => {
      console.log('🔄 [ChatScreen] Periodic chat list refresh');
      loadChats(true);
    }, 30000); // 30 seconds
    
    return () => {
      if (cleanup) {
        cleanup();
      }
      clearInterval(refreshInterval);
    };
  }, [loadChats, setupSocketListeners]);

  useFocusEffect(
    useCallback(() => {
      loadChats(true); // Force refresh on focus
    }, [loadChats])
  );

  const handleChatPress = useCallback((chat: ChatData) => {
    // Clear unread count immediately when chat is opened
    if (chat.unread_count && chat.unread_count > 0) {
      dispatch(clearUnreadCount(chat.id));
    }
    
    dispatch(setCurrentChat(chat));
    (navigation as any).navigate('ConversationScreen', { chat });
  }, [dispatch, navigation]);

  const handleCreateChat = useCallback(() => {
    (navigation as any).navigate('FilteredContactsScreen');
  }, [navigation]);

  const getChatSubtitle = useCallback((chat: ChatData) => {
    if (chat.last_message) {
      const isFromCurrentUser = chat.last_message.sender_id === user?.id || chat.last_message.sender_id === user?.firebaseUid;
      
      // Get message type indicator
      const getMessageTypeIndicator = (message: any) => {
        if (!message.message_type) return '';
        
        switch (message.message_type) {
          case 'image':
            return '📷 ';
          case 'video':
            return '🎥 ';
          case 'audio':
            return '🎵 ';
          case 'file':
            return '📄 ';
          default:
            return '';
        }
      };
      
      const typeIndicator = getMessageTypeIndicator(chat.last_message);
      const prefix = isFromCurrentUser ? 'You: ' : '';
      
      // If it's a media message, show the type indicator
      if (chat.last_message.message_type && chat.last_message.message_type !== 'text') {
        return `${prefix}${typeIndicator}${chat.last_message.content || getMediaTypeText(chat.last_message.message_type)}`;
      }
      
      return `${prefix}${chat.last_message.content}`;
    }
    return chat.type === 'group' 
      ? `${chat.participants.length} members`
      : 'No messages yet';
  }, [user?.id, user?.firebaseUid]);

  const getMediaTypeText = (messageType: string) => {
    switch (messageType) {
      case 'image':
        return 'Photo';
      case 'video':
        return 'Video';
      case 'audio':
        return 'Audio';
      case 'file':
        return 'File';
      default:
        return 'Media';
    }
  };

  const getChatAvatarInitials = useCallback((chat: ChatData) => {
    if (chat.type === 'group') {
      return chat.name?.charAt(0).toUpperCase() || 'G';
    } else {
      const otherParticipant = chat.participants.find(
        p => p.user_id !== user?.id && p.user_id !== user?.firebaseUid
      );
      const name = otherParticipant?.userDetails?.localName || otherParticipant?.userDetails?.fullName;
      return name?.charAt(0).toUpperCase() || 'U';
    }
  }, [user?.id, user?.firebaseUid]);

  const getAvatarColor = useCallback((chat: ChatData) => {
    const avatarColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B500', '#52B788', '#E63946', '#457B9D'
    ];
    const title = getChatTitle(chat);
    const index = title.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  }, [getChatTitle]);

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

  const renderChatItem = useCallback(({ item }: { item: ChatData }) => {
    const avatarColor = getAvatarColor(item);
    const hasUnread = item.unread_count && item.unread_count > 0;
    

    const chatItemStyle = [
      styles.chatItem,
      { 
        borderLeftColor: hasUnread ? colors.accent : 'transparent'
      }
    ];

    return (
      <TouchableOpacity
        style={chatItemStyle}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          {(() => {
            if (item.type === 'group') {
              return (
                <View style={[styles.avatarPlaceholder, { backgroundColor: avatarColor }]}>
                  <Text style={styles.avatarText}>
                    {getChatAvatarInitials(item)}
                  </Text>
                  <View style={styles.groupBadge}>
                    <OptimizedIcon name="people" size={moderateScale(10)} color="#FFFFFF" />
                  </View>
                </View>
              );
            } else {
              const otherParticipant = item.participants.find(
                p => p.user_id !== user?.id && p.user_id !== user?.firebaseUid
              );
              const profilePicture = otherParticipant?.userDetails?.localProfilePicture || 
                                   otherParticipant?.userDetails?.profilePicture;

              if (profilePicture) {
                return (
                  <Image
                    source={{ uri: profilePicture }}
                    style={styles.avatarImage}
                    defaultSource={require('@/assets/logo.png')}
                  />
                );
              } else {
                return (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: avatarColor }]}>
                    <Text style={styles.avatarText}>
                      {getChatAvatarInitials(item)}
                    </Text>
                  </View>
                );
              }
            }
          })()}
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
              <Text style={styles.chatTime}>
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
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadText}>
                  {(item.unread_count || 0) > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [user, colors, getAvatarColor, getChatAvatarInitials, getChatSubtitle, getChatTitle, handleChatPress]);

  const renderEmptyState = useCallback(() => {
    const getEmptyStateContent = () => {
      switch (activeFilter) {
        case 'direct':
          return {
            icon: 'person-outline',
            title: 'No Direct Messages',
            subtitle: 'Start a conversation with someone',
          };
        case 'groups':
          return {
            icon: 'people-outline',
            title: 'No Group Chats',
            subtitle: 'Create or join a group chat',
          };
        case 'unread':
          return {
            icon: 'mail-unread-outline',
            title: 'No Unread Messages',
            subtitle: 'All caught up! No new messages',
          };
        case 'archived':
          return {
            icon: 'archive-outline',
            title: 'No Archived Chats',
            subtitle: 'Chats older than a week will appear here',
          };
        default:
          return {
            icon: 'chatbubbles-outline',
            title: 'No Chats Yet',
            subtitle: 'Start a conversation by creating a new chat',
          };
      }
    };

    const emptyContent = getEmptyStateContent();

    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
          <OptimizedIcon name={emptyContent.icon} size={moderateScale(56)} color={colors.textSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {emptyContent.title}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {emptyContent.subtitle}
        </Text>
        {activeFilter !== 'unread' && activeFilter !== 'archived' && (
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.accent }]}
            onPress={handleCreateChat}
          >
            <OptimizedIcon name="add-circle-outline" size={moderateScale(20)} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Start Chatting</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [colors, handleCreateChat, activeFilter]);


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
    <TouchableWithoutFeedback onPress={hideSearch}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header with Maharishi Connect */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={openDrawer}
        >
          <OptimizedIcon name="menu-outline" size={moderateScale(24)} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Maharishi Connect
        </Text>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={toggleSearch}
        >
          <OptimizedIcon name="search-outline" size={moderateScale(24)} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      {isSearchVisible && (
        <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.background }]}>
            <OptimizedIcon name="search-outline" size={moderateScale(20)} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search chats..."
              placeholderTextColor={colors.textSecondary}
              value={searchText}
              onChangeText={handleSearchTextChange}
              autoFocus={true}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
                <OptimizedIcon name="close-circle" size={moderateScale(20)} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      
      {/* Filter Buttons */}
      <View style={[styles.filterContainer, { backgroundColor: colors.background }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              { 
                backgroundColor: activeFilter === 'all' ? colors.primary : colors.surface,
                borderColor: activeFilter === 'all' ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.7}
          >
            <OptimizedIcon 
              name="chatbubbles-outline" 
              size={moderateScale(16)} 
              color={activeFilter === 'all' ? colors.textOnPrimary : colors.textSecondary} 
            />
            <Text style={[
              styles.filterButtonText,
              { color: activeFilter === 'all' ? colors.textOnPrimary : colors.text }
            ]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              { 
                backgroundColor: activeFilter === 'direct' ? colors.primary : colors.surface,
                borderColor: activeFilter === 'direct' ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setActiveFilter('direct')}
            activeOpacity={0.7}
          >
            <OptimizedIcon 
              name="person-outline" 
              size={moderateScale(16)} 
              color={activeFilter === 'direct' ? colors.textOnPrimary : colors.textSecondary} 
            />
            <Text style={[
              styles.filterButtonText,
              { color: activeFilter === 'direct' ? colors.textOnPrimary : colors.text }
            ]}>
              Direct
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              { 
                backgroundColor: activeFilter === 'groups' ? colors.primary : colors.surface,
                borderColor: activeFilter === 'groups' ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setActiveFilter('groups')}
            activeOpacity={0.7}
          >
            <OptimizedIcon 
              name="people-outline" 
              size={moderateScale(16)} 
              color={activeFilter === 'groups' ? colors.textOnPrimary : colors.textSecondary} 
            />
            <Text style={[
              styles.filterButtonText,
              { color: activeFilter === 'groups' ? colors.textOnPrimary : colors.text }
            ]}>
              Groups
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              { 
                backgroundColor: activeFilter === 'unread' ? colors.primary : colors.surface,
                borderColor: activeFilter === 'unread' ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setActiveFilter('unread')}
            activeOpacity={0.7}
          >
            <OptimizedIcon 
              name="mail-unread-outline" 
              size={moderateScale(16)} 
              color={activeFilter === 'unread' ? colors.textOnPrimary : colors.textSecondary} 
            />
            <Text style={[
              styles.filterButtonText,
              { color: activeFilter === 'unread' ? colors.textOnPrimary : colors.text }
            ]}>
              Unread
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              { 
                backgroundColor: activeFilter === 'archived' ? colors.accent : colors.surface,
                borderColor: activeFilter === 'archived' ? colors.accent : colors.border,
              }
            ]}
            onPress={() => setActiveFilter('archived')}
            activeOpacity={0.7}
          >
            <OptimizedIcon 
              name="archive-outline" 
              size={moderateScale(16)} 
              color={activeFilter === 'archived' ? colors.textOnPrimary : colors.textSecondary} 
            />
            <Text style={[
              styles.filterButtonText,
              { color: activeFilter === 'archived' ? colors.textOnPrimary : colors.text }
            ]}>
              Archived
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        ItemSeparatorComponent={ChatItemSeparator}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={chats.length === 0 ? styles.emptyListContainer : styles.listContent}
      />
      
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={handleCreateChat}
        activeOpacity={0.85}
      >
        <OptimizedIcon name="create-outline" size={moderateScale(28)} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
    </TouchableWithoutFeedback>
  );
};

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
  headerButton: {
    padding: wp(2),
    borderRadius: moderateScale(8),
  },
  headerTitle: {
    fontSize: responsiveFont(20),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  searchContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: moderateScale(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: wp(2),
  },
  searchInput: {
    flex: 1,
    fontSize: responsiveFont(16),
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: wp(2),
    padding: wp(1),
  },
  filterContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterScrollContent: {
    paddingHorizontal: wp(1),
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    marginHorizontal: wp(1),
    borderRadius: moderateScale(20),
    borderWidth: 1,
    minWidth: moderateScale(80),
    justifyContent: 'center',
  },
  filterButtonText: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    marginLeft: wp(1.5),
    letterSpacing: 0.2,
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
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: moderateScale(8),
  },
  chatItemSeparator: {
    height: 1,
    marginHorizontal: wp(4),
    opacity: 0.3,
  },
  avatar: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(25),
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(25),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: responsiveFont(20),
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
    color: '#AAAAAA',
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