import { useNavigation } from '@react-navigation/native';
import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  setChats,
  setLoading,
  setError,
  mergeChats,
  removeChat,
} from '@/store/slices/chatSlice';
import { selectCurrentUser } from '@/store/slices/authSlice';
import MessageTime from '@/components/atoms/chats/MessageTime';
import CustomStatusBar from '@/components/atoms/ui/StatusBar';
import AvatarWithInitials from '@/components/atoms/ui/AvatarWithInitials';
import chatApiService from '@/services/chatApiService';
import sqliteService from '@/services/sqliteService';
import socketService from '@/services/socketService';
import chatManagementService from '@/services/chatManagementService';
import { useTheme } from '@/theme';
import {
  dimensions,
  fontSize,
  spacing,
  borderRadius,
  shadow,
} from '@/theme/responsive';
import ContactResolver from '@/utils/contactResolver';
import { fetchContacts } from '@/services/contactService';

type ApiChat = any;

const normalizeChat = (c: ApiChat, currentUserId?: string) => {
  const id = c?.id || c?._id;
  const type =
    (c?.type || c?.chat_type) === 'direct' ? 'direct' : c?.type || 'group';
  const participants = c?.participants || c?.members || [];
  let name = c?.name;
  if (!name && type === 'direct' && Array.isArray(participants)) {
    const other = participants.find((p: any) => {
      const participantId = p?.user_id || p?.uid || p?.id || p;
      return participantId !== currentUserId;
    });
    if (other) {
      name =
        other?.user_mobile ||
        other?.phone ||
        other?.mobile ||
        other?.userDetails?.fullName ||
        other?.user_name ||
        other?.fullName ||
        other?.name ||
        `+91${
          other?.user_mobile || other?.phone || other?.mobile || ''
        }`.replace(/^\+91$/, 'Unknown');
    } else {
      name = 'Unknown';
    }
  }
  return {
    id,
    type,
    name: name || 'Unknown',
    participants,
    avatar: c?.avatar || c?.icon || undefined,
    lastMessage: c?.last_message_content || c?.lastMessage || '',
    lastMessageTime:
      c?.last_message_created_at ||
      c?.updated_at ||
      c?.created_at ||
      c?.lastMessageTime ||
      null,
    unreadCount: c?.unread_count ?? c?.unreadCount ?? 0,
  } as any;
};

const directKey = (chat: any, currentUserId?: string) => {
  if (chat?.type !== 'direct' || !Array.isArray(chat?.participants)) return '';
  const ids = chat.participants
    .map((p: any) => p?.user_id || p?.uid || p?.id)
    .filter(Boolean)
    .sort();
  return ids.join('|');
};

const dedupeChats = (chats: any[], currentUserId?: string) => {
  const byId = new Map<string, any>();
  const byPair = new Map<string, string>();
  for (const c of chats) {
    if (!c?.id) continue;
    if (!byId.has(c.id)) byId.set(c.id, c);
    else {
      const prev = byId.get(c.id);
      const newer =
        new Date(c.lastMessageTime || 0).getTime() >=
        new Date(prev?.lastMessageTime || 0).getTime()
          ? c
          : prev;
      byId.set(c.id, newer);
    }
    if (c.type === 'direct') {
      const key = directKey(c, currentUserId);
      if (key) {
        const existingId = byPair.get(key);
        if (!existingId) byPair.set(key, c.id);
        else {
          const keep =
            new Date(byId.get(c.id)?.lastMessageTime || 0).getTime() >=
            new Date(byId.get(existingId)?.lastMessageTime || 0).getTime()
              ? c.id
              : existingId;
          byPair.set(key, keep);
        }
      }
    }
  }
  const keepIds = new Set<string>(byId.keys());
  for (const [key, keepId] of byPair.entries()) {
    for (const id of byId.keys()) {
      if (id === keepId) continue;
      const a = byId.get(id);
      const b = byId.get(keepId);
      if (!a || !b) continue;
      if (a.type !== 'direct' || b.type !== 'direct') continue;
      if (
        directKey(a, currentUserId) === key &&
        directKey(b, currentUserId) === key
      ) {
        keepIds.delete(id);
      }
    }
  }
  return Array.from(keepIds).map(id => byId.get(id));
};

export default function ChatScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { chats, isLoading, error } = useSelector(
    (state: RootState) => state.chat,
  );
  const currentUser = useSelector(selectCurrentUser);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(
    socketService.getConnectionStatus(),
  );
  const [contactResolverReady, setContactResolverReady] = useState(false);

  const syncChatsFromServer = useCallback(
    async (isInitialLoad = false) => {
      if (!currentUser?.token) return;
      console.log(
        `🔄 Syncing chats from server... (Initial: ${isInitialLoad})`,
      );
      if (isInitialLoad) dispatch(setLoading(true));

      try {
        chatApiService.setAuthToken(currentUser.token);

        // Fetch ALL chats from server with pagination if needed
        let allServerChats: any[] = [];
        let hasMoreChats = true;
        let offset = 0;
        const limit = 50;

        while (hasMoreChats) {
          const apiChats = await chatApiService.getUserChats();

          if (apiChats.length === 0) {
            hasMoreChats = false;
            break;
          }

          allServerChats.push(...apiChats);

          // If we got fewer chats than requested, we've reached the end
          if (apiChats.length < limit) {
            hasMoreChats = false;
          } else {
            offset += limit;
          }

          // Safety check
          if (offset > 200) {
            console.warn('🔄 Reached safety limit for chat fetching');
            break;
          }
        }

        console.log(`🔄 Fetched ${allServerChats.length} chats from server`);

        // Step 2: Clean up orphaned chats (chats that exist locally but not on server)
        console.log(`🧹 [ChatScreen] Checking for orphaned chats...`);
        const localChats = await sqliteService.getChats();
        const serverChatIds = new Set(
          allServerChats.map(chat => chat.id || chat._id),
        );

        let orphanedChatsRemoved = 0;
        for (const localChat of localChats) {
          const localChatId = localChat.id || localChat._id;
          if (!serverChatIds.has(localChatId)) {
            console.log(
              `🗑️ [ChatScreen] Removing orphaned chat: ${localChatId}`,
            );

            // Remove from Redux state
            dispatch(removeChat(localChatId));

            // Remove from SQLite
            await sqliteService.deleteChat(localChatId);

            orphanedChatsRemoved++;
          }
        }

        if (orphanedChatsRemoved > 0) {
          console.log(
            `✅ [ChatScreen] Removed ${orphanedChatsRemoved} orphaned chats`,
          );
        }

        const normalizedApiChats = allServerChats.map(c =>
          normalizeChat(c, currentUser.id),
        );

        // Merge with existing chats (deduplication handled in Redux)
        dispatch(mergeChats(normalizedApiChats));

        // Save all chats to SQLite with proper format
        let chatsSaved = 0;
        for (const chat of normalizedApiChats) {
          try {
            // Format chat for SQLite storage
            const chatForSQLite = {
              id: chat.id,
              name: chat.name,
              type: chat.type || 'direct',
              avatar: chat.avatar,
              lastMessage: chat.lastMessage || '',
              lastMessageTime: chat.lastMessageTime,
              unreadCount: chat.unreadCount || 0,
              participants: JSON.stringify(chat.participants || []), // Store as JSON string
              createdAt: chat.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await sqliteService.saveChat(chatForSQLite);
            chatsSaved++;
          } catch (chatSaveError) {
            console.error(`❌ Failed to save chat ${chat.id}:`, chatSaveError);
          }
        }

        console.log(`💾 Saved ${chatsSaved} chats to SQLite`);
      } catch (error) {
        console.error('❌ Failed to sync chats from server:', error);
        if (isInitialLoad) dispatch(setError('Failed to sync chats.'));
      } finally {
        if (isInitialLoad) dispatch(setLoading(false));
      }
    },
    [currentUser, dispatch],
  );

  useEffect(() => {
    if (currentUser?.id && !socketService.getConnectionStatus()) {
      socketService
        .connect(currentUser.id, currentUser.token)
        .catch(err =>
          console.error('❌ [ChatScreen] Socket connection failed:', err),
        );
    }
    const unsubConnect = socketService.on('connect', () => {
      console.log('🔌 [ChatScreen] Socket connected');
      setSocketConnected(true);
      // Refresh chats when socket reconnects
      syncChatsFromServer();
    });
    const unsubDisconnect = socketService.on('disconnect', () => {
      console.log('🔌 [ChatScreen] Socket disconnected');
      setSocketConnected(false);
    });

    // Handle real-time chat updates
    const unsubNewChat = socketService.on('newChat', (chatData: any) => {
      console.log('📨 [ChatScreen] New chat received:', chatData);
      // The socket service already handles adding to Redux, just log
    });

    const unsubChatUpdated = socketService.on(
      'chatUpdated',
      (chatData: any) => {
        console.log('📨 [ChatScreen] Chat updated:', chatData);
        // The socket service already handles updating Redux, just log
      },
    );

    const loadInitialChats = async () => {
      if (!currentUser?.id) return;

      dispatch(setLoading(true));
      console.log('🚀 Performing initial chat load from local DB...');

      try {
        // Initialize chat management service
        await chatManagementService.initialize();

        // Always load from SQLite first to show cached data immediately
        const localChats = await sqliteService.getChats();
        console.log(`🚀 Found ${localChats.length} chats in SQLite`);

        if (localChats.length > 0) {
          const normalized = localChats.map(c =>
            normalizeChat(c, currentUser.id),
          );
          // Sort by last message time (most recent first)
          normalized.sort((a, b) => {
            const timeA = new Date(a.lastMessageTime || 0).getTime();
            const timeB = new Date(b.lastMessageTime || 0).getTime();
            return timeB - timeA;
          });
          dispatch(setChats(normalized));
          console.log(
            `🚀 Loaded ${normalized.length} chats from SQLite to Redux`,
          );
        }

        // Then sync with server to get any updates
        await syncChatsFromServer(true);
      } catch (error) {
        console.error('🚀 Error loading initial chats:', error);
        dispatch(setError('Failed to load chats'));
      } finally {
        dispatch(setLoading(false));
      }
    };

    initializeContactResolver();
    loadInitialChats();

    return () => {
      unsubConnect?.();
      unsubDisconnect?.();
      unsubNewChat?.();
      unsubChatUpdated?.();
    };
  }, [currentUser?.id]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await syncChatsFromServer();
    setIsRefreshing(false);
  }, [syncChatsFromServer]);

  // Auto-refresh chats periodically to catch any missed updates
  useEffect(() => {
    if (!currentUser?.id) return;

    const refreshInterval = setInterval(() => {
      console.log('🔄 [ChatScreen] Periodic chat refresh');
      syncChatsFromServer();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [currentUser?.id, syncChatsFromServer]);

  // Periodic cleanup of orphaned data
  useEffect(() => {
    if (!currentUser?.id) return;

    const cleanupInterval = setInterval(async () => {
      console.log('🧹 [ChatScreen] Periodic cleanup of orphaned data');
      try {
        // Get all local chats
        const localChats = await sqliteService.getChats();

        // Check each chat against server
        for (const localChat of localChats) {
          const chatId = localChat.id || localChat._id;
          try {
            // Try to fetch chat details from server
            await chatApiService.getChatDetails(chatId);
          } catch (error) {
            if (
              error instanceof Error &&
              error.message &&
              error.message.includes('Chat not found')
            ) {
              console.log(
                `🗑️ [ChatScreen] Found orphaned chat during cleanup: ${chatId}`,
              );

              // Remove from Redux state
              dispatch(removeChat(chatId));

              // Remove from SQLite
              await sqliteService.deleteChat(chatId);

              console.log(
                `✅ [ChatScreen] Cleaned up orphaned chat: ${chatId}`,
              );
            }
          }
        }
      } catch (cleanupError) {
        console.error(
          '❌ [ChatScreen] Error during periodic cleanup:',
          cleanupError,
        );
      }
    }, 60000); // Cleanup every 60 seconds

    return () => clearInterval(cleanupInterval);
  }, [currentUser?.id, dispatch]);

  const initializeContactResolver = async () => {
    try {
      console.log('📞 Initializing contact resolver...');
      const localContacts = await fetchContacts();
      await ContactResolver.initialize(localContacts);
      setContactResolverReady(true);
      console.log('✅ Contact resolver initialized');
    } catch (error) {
      console.error('❌ Failed to initialize contact resolver:', error);
      // Still mark as ready to prevent infinite loading
      setContactResolverReady(true);
    }
  };

  // Enhanced name resolution that prevents flickering
  const getDisplayName = (item: any): string => {
    // Always use the enhanced resolver which has better fallbacks
    return ContactResolver.resolveChatNameEnhanced(item, currentUser?.id || '');
  };

  const getDisplayAvatar = (item: any): string | null => {
    if (item.type !== 'direct') {
      return item.avatar || null;
    }
    return ContactResolver.resolveChatAvatar(item, currentUser?.id || '');
  };

  const handleAddPress = async () => {
    try {
      console.log('🔄 Navigating to contacts...');
      navigation.navigate('FilteredContactsScreen' as never);
    } catch (error) {
      console.error('❌ Navigation error:', error);
      Alert.alert('Navigation Error', 'Please try again.');
    }
  };

  if ((isLoading && chats.length === 0) || !contactResolverReady) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <CustomStatusBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {!contactResolverReady ? 'Loading contacts...' : 'Loading chats...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <CustomStatusBar />
      {!socketConnected && (
        <View
          style={[styles.connectionBanner, { backgroundColor: colors.warning }]}
        >
          <Text
            style={[styles.connectionText, { color: colors.textOnPrimary }]}
          >
            Reconnecting...
          </Text>
        </View>
      )}
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => {
          const displayName = getDisplayName(item);
          const displayAvatar = getDisplayAvatar(item);
          return (
            <TouchableOpacity
              style={[styles.chatItem, { backgroundColor: colors.background }]}
              onPress={() =>
                (navigation as any).navigate('ConversationScreen', {
                  id: item.id,
                  name: displayName,
                  avatar: displayAvatar,
                })
              }
            >
              <AvatarWithInitials
                name={displayName}
                profilePicture={displayAvatar}
                size={50}
                style={styles.avatar}
              />
              <View style={styles.chatInfo}>
                <View style={styles.row}>
                  <Text style={[styles.chatName, { color: colors.text }]}>
                    {displayName}
                  </Text>
                  <View style={styles.rightSection}>
                    {item.lastMessageTime && (
                      <MessageTime
                        timestamp={item.lastMessageTime}
                        variant="list"
                      />
                    )}
                    {item.unreadCount > 0 && (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: colors.textOnPrimary },
                          ]}
                        >
                          {item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text
                  style={[styles.lastMessage, { color: colors.subText }]}
                  numberOfLines={1}
                >
                  {item.lastMessage || 'No messages yet'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => (
          <View
            style={[styles.separator, { backgroundColor: colors.border }]}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              No chats yet. Tap + to start
            </Text>
          </View>
        }
      />
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.primary, shadowColor: colors.primary },
          isRefreshing && { opacity: 0.7 },
        ]}
        onPress={handleAddPress}
        activeOpacity={0.7}
        disabled={isRefreshing}
      >
        <Icon
          name={isRefreshing ? 'sync' : 'add'}
          size={32}
          color={colors.textOnPrimary}
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, fontSize: fontSize.md },
  connectionBanner: { padding: spacing.xs, alignItems: 'center' },
  connectionText: { fontSize: fontSize.sm, fontWeight: '600' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  emptyText: { fontSize: fontSize.md, textAlign: 'center' },
  listContent: { paddingBottom: dimensions.fabHeight + spacing.lg },
  chatItem: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  avatar: { marginRight: spacing.sm },
  chatInfo: { flex: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  chatName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.xs,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: dimensions.iconXLarge + spacing.md,
    flexShrink: 0,
  },
  lastMessage: { fontSize: fontSize.sm, flex: 1, flexShrink: 1 },
  badge: {
    minWidth: dimensions.iconSmall + spacing.xs,
    height: dimensions.iconSmall + spacing.xs,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: dimensions.avatarMedium + spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: borderRadius.round,
    width: dimensions.iconXLarge + spacing.md,
    height: dimensions.iconXLarge + spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.lg,
  },
});
