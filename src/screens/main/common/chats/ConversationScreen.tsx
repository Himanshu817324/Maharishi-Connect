import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useRoute,
  RouteProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, store } from '@/store';
import {
  markChatAsRead,
  setCurrentChat,
  addMessage,
  updateMessageStatus,
  loadChatMessages,
} from '@/store/slices/chatSlice';
import { selectCurrentUser } from '@/store/slices/authSlice';
import socketService from '@/services/socketService';
import chatApiService from '@/services/chatApiService';
import sqliteService from '@/services/sqliteService';
import { useTheme } from '@/theme';
import CustomStatusBar from '@/components/atoms/ui/StatusBar';
import ChatHeader from '@/components/atoms/chats/ChatHeader';
import ChatInput from '@/components/atoms/chats/ChatInput';
import MessageBubble from '@/components/atoms/chats/MessageBubble';
import { fontSize, spacing } from '@/theme/responsive';
import { useSocketLifecycle } from '@/hooks/useSocketLifecycle';
import offlineMessageQueue from '@/services/offlineMessageQueue';

type ConversationRouteParams = {
  id: string;
  name?: string;
  avatar?: string;
};

type ConversationRouteProp = RouteProp<
  { ConversationScreen: ConversationRouteParams },
  'ConversationScreen'
>;

const ConversationScreen: React.FC = () => {
  const route = useRoute<ConversationRouteProp>();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { colors } = useTheme();

  const { id: chatId } = route.params;
  const currentUser = useSelector(selectCurrentUser);

  const allMessages = useSelector((state: RootState) => state.chat.messages);

  // Get messages for this chat and sort newest-to-oldest for inverted list
  const chatMessages = [...(allMessages[chatId] || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const loadedRef = useRef(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  // Socket lifecycle management for conversation - keep connection active
  const { cancelDisconnection } = useSocketLifecycle({
    connectOnFocus: true,
    disconnectOnBlur: false, // Don't disconnect when leaving conversation (user might go back to chat list)
    disconnectDelay: 0,
  });

  // Load messages function with enhanced sync
  const loadMessages = async (forceFullSync = false) => {
    if (isLoading || !chatId || !currentUser?.id) return;

    try {
      setIsLoading(true);
      console.log(
        '📥 Loading messages for chat:',
        chatId,
        forceFullSync ? '(FORCE FULL SYNC)' : '',
      );

      if (currentUser?.token) {
        chatApiService.setAuthToken(currentUser.token);
      }

      // Always perform full server sync when opening a chat
      const result = await dispatch(loadChatMessages(chatId) as any);

      if (result.meta.requestStatus === 'fulfilled') {
        console.log(
          `📥 Successfully loaded ${result.payload.messages.length} messages`,
        );
        console.log(`📥 Source: ${result.payload.source}`);

        // If we got messages from server sync, log the sync success
        if (result.payload.source === 'server-synced') {
          console.log('✅ Full server sync completed successfully');
          setLastSyncTime(Date.now());
        }

        // If chat was cleaned up (not found on server), navigate back
        if (result.payload.source === 'cleaned-up') {
          console.log('🗑️ Chat was cleaned up, navigating back to chat list');
          navigation.goBack();
          return;
        }
      } else {
        console.error('📥 Failed to load messages:', result.payload);
      }

      loadedRef.current = true;
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages on mount
  useEffect(() => {
    if (chatId && currentUser?.id && !loadedRef.current) {
      loadMessages();
    }
  }, [chatId, currentUser?.id]);

  // Reload on focus with full sync
  useFocusEffect(
    useCallback(() => {
      console.log('📄 ConversationScreen focused - performing full sync');
      if (chatId && currentUser?.id) {
        // Always perform full sync when screen comes into focus
        loadMessages(true);
      }
    }, [chatId, currentUser?.id]),
  );

  // Periodic sync to handle missed messages (every 30 seconds)
  useEffect(() => {
    if (!chatId || !currentUser?.id) return;

    const syncInterval = setInterval(() => {
      const timeSinceLastSync = Date.now() - lastSyncTime;
      // Only sync if it's been more than 30 seconds since last sync
      if (timeSinceLastSync > 30000) {
        console.log('🔄 Periodic sync triggered');
        loadMessages(true);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(syncInterval);
  }, [chatId, currentUser?.id, lastSyncTime]);

  // Enhanced real-time message handling with proper cleanup
  useEffect(() => {
    if (!chatId || !currentUser?.id) return;

    console.log(
      '📨 [ConversationScreen] Setting up real-time message listeners for chat:',
      chatId,
    );

    // Listen for message updates (edits, deletions)
    const unsubMessageUpdate = socketService.on(
      'messageEdited',
      (data: any) => {
        console.log('📨 [ConversationScreen] Message edited:', data);
        if (data.chatId === chatId || data.chat_id === chatId) {
          dispatch({
            type: 'chat/updateMessage',
            payload: {
              messageId: data.messageId || data.message_id,
              content: data.content,
            },
          });
        }
      },
    );

    const unsubMessageDelete = socketService.on(
      'messageDeleted',
      (data: any) => {
        console.log('📨 [ConversationScreen] Message deleted:', data);
        if (data.chatId === chatId || data.chat_id === chatId) {
          dispatch({
            type: 'chat/removeMessage',
            payload: data.messageId || data.message_id,
          });
        }
      },
    );

    // Listen for typing indicators
    const unsubTyping = socketService.on(
      'typingUpdate',
      (data: { userId: string; chatId: string; isTyping: boolean }) => {
        if (data.chatId === chatId && data.userId !== currentUser.id) {
          handleTypingUpdate(data);
        }
      },
    );

    return () => {
      console.log(
        '📨 [ConversationScreen] Cleaning up message listeners for chat:',
        chatId,
      );
      unsubMessageUpdate?.();
      unsubMessageDelete?.();
      unsubTyping?.();
    };
  }, [chatId, currentUser?.id, dispatch]);

  // Socket connection - ensure socket is connected for real-time messaging
  useEffect(() => {
    if (!currentUser?.id) return;

    const initSocket = async () => {
      try {
        console.log(
          '🔌 [ConversationScreen] Ensuring socket connection for real-time messaging...',
        );

        // Connect socket if not already connected (should be connected from ChatScreen)
        if (!socketService.getConnectionStatus()) {
          console.log(
            '🔌 [ConversationScreen] Socket not connected, connecting now...',
          );
          await socketService.connect(currentUser.id, currentUser.token);
          console.log(
            '✅ [ConversationScreen] Socket connected for conversation',
          );
        } else {
          console.log(
            '✅ [ConversationScreen] Socket already connected, ready for messaging',
          );
        }

        console.log('🔌 [ConversationScreen] Joining chat:', chatId);
        socketService.joinChat(chatId);

        const unsubMessage = socketService.on(
          'newMessage',
          async (message: any) => {
            console.log(
              '📨 [ConversationScreen] Received newMessage:',
              message,
            );

            if (message.chatId === chatId || message.chat_id === chatId) {
              const messageId = message._id || message.id;

              // Check if message already exists to prevent duplication
              const exists = chatMessages.find(m => m._id === messageId);
              if (!exists) {
                console.log(
                  '📨 [ConversationScreen] Processing new message:',
                  messageId,
                );

                // Resolve user name properly
                const senderId = message.senderId || message.sender_id;
                let senderName = 'Unknown User';

                if (senderId === currentUser.id) {
                  senderName = 'You';
                } else {
                  // Try to get sender name from message data first
                  senderName =
                    message.sender_name ||
                    message.senderName ||
                    message.user?.name;

                  // If no name in message, try to resolve from chat participants
                  if (!senderName || senderName === 'Unknown User') {
                    // Try to get chat info from Redux state
                    const state = store.getState();
                    const chat = state.chat.chats.find(
                      (c: any) => c.id === chatId,
                    );
                    if (chat?.participants) {
                      const participant = chat.participants.find(
                        (p: any) =>
                          (p?.user_id || p?.uid || p?.id || p) === senderId,
                      );
                      if (participant) {
                        // Prioritize participant data over phone number formatting
                        senderName =
                          participant?.user_name ||
                          participant?.fullName ||
                          participant?.name ||
                          participant?.userDetails?.fullName ||
                          'Unknown User';

                        // Only format phone number if no name is available
                        if (senderName === 'Unknown User') {
                          const phoneNumber =
                            participant?.user_mobile || participant?.phone;
                          if (phoneNumber) {
                            const normalizedNumber = phoneNumber.replace(
                              /\D/g,
                              '',
                            );
                            if (normalizedNumber.length === 10) {
                              senderName = `+91${normalizedNumber}`;
                            } else if (normalizedNumber.length > 10) {
                              senderName = `+91${normalizedNumber.slice(-10)}`;
                            } else {
                              senderName = phoneNumber;
                            }
                          }
                        }
                      }
                    }
                  }
                }

                const formattedMessage = {
                  _id: messageId,
                  text: message.content || message.text,
                  chatId,
                  senderId,
                  createdAt:
                    message.createdAt ||
                    message.created_at ||
                    new Date().toISOString(),
                  status: 'sent' as const,
                  user: {
                    _id: senderId,
                    name: senderName,
                  },
                };

                // Save to SQLite first for persistence
                try {
                  await sqliteService.saveMessage({
                    id: formattedMessage._id,
                    clientId: formattedMessage._id,
                    chatId: formattedMessage.chatId,
                    content: formattedMessage.text,
                    text: formattedMessage.text,
                    senderId: formattedMessage.senderId,
                    timestamp: formattedMessage.createdAt,
                    createdAt: formattedMessage.createdAt,
                    status: formattedMessage.status,
                    senderName: formattedMessage.user.name,
                  });
                  console.log(
                    '💾 [ConversationScreen] Message saved to SQLite:',
                    formattedMessage._id,
                  );
                } catch (saveError) {
                  console.error(
                    '❌ [ConversationScreen] Failed to save message to SQLite:',
                    saveError,
                  );
                  // Continue with Redux dispatch even if SQLite save fails
                }

                console.log(
                  '📨 [ConversationScreen] Dispatching addMessage:',
                  formattedMessage,
                );
                dispatch(addMessage(formattedMessage));
              } else {
                console.log(
                  '📨 [ConversationScreen] Message already exists, skipping:',
                  messageId,
                );
              }
            } else {
              console.log(
                '📨 [ConversationScreen] Message not for this chat:',
                message.chatId || message.chat_id,
                'vs',
                chatId,
              );
            }
          },
        );

        const unsubDelivered = socketService.on(
          'messageDelivered',
          (data: any) => {
            if (data.chatId === chatId) {
              dispatch(
                updateMessageStatus({
                  messageId: data.messageId,
                  status: 'delivered',
                }),
              );
            }
          },
        );

        const unsubRead = socketService.on('messageRead', (data: any) => {
          if (data.chatId === chatId) {
            dispatch(
              updateMessageStatus({
                messageId: data.messageId,
                status: 'read',
              }),
            );
          }
        });

        const unsubTyping = socketService.on(
          'typingUpdate',
          (data: { userId: string; isTyping: boolean }) => {
            if (data.userId !== currentUser.id) handleTypingUpdate(data);
          },
        );

        // Handle socket reconnection
        const unsubReconnect = socketService.on('connect', () => {
          console.log(
            '🔌 [ConversationScreen] Socket reconnected, rejoining chat:',
            chatId,
          );
          socketService.joinChat(chatId);

          // Process offline message queue when socket reconnects
          offlineMessageQueue.startProcessing();
        });

        return () => {
          console.log(
            '🧹 [ConversationScreen] Cleaning up conversation socket listeners...',
          );
          unsubMessage?.();
          unsubDelivered?.();
          unsubRead?.();
          unsubTyping?.();
          unsubReconnect?.();
          socketService.leaveChat(chatId);

          // Note: We don't disconnect socket here as user might go back to ChatScreen
          // Socket will be disconnected when user leaves all chat-related screens
        };
      } catch (error) {
        console.error('Socket init error:', error);
      }
    };

    const cleanup = initSocket();
    return () => {
      cleanup?.then(fn => fn?.());
    };
  }, [chatId, currentUser?.id]);

  const handleTypingUpdate = useCallback(
    (data: { userId: string; isTyping: boolean }) => {
      if (data.isTyping) {
        setTypingUsers(prev =>
          prev.includes(data.userId) ? prev : [...prev, data.userId],
        );
        setIsTyping(true);
      } else {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
        setIsTyping(false);
      }
    },
    [],
  );

  // Enhanced send message handler with dual approach and better error handling
  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || !currentUser) return;

      const tempId = `temp_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const messageTimestamp = new Date().toISOString();

      const optimisticMessage = {
        _id: tempId,
        text: messageText.trim(),
        chatId,
        senderId: currentUser.id,
        createdAt: messageTimestamp,
        status: 'sending' as const,
        user: { _id: currentUser.id, name: currentUser.name || 'You' },
      };

      // Step 1: Add optimistic message to UI immediately
      dispatch(addMessage(optimisticMessage));

      // Step 2: Save optimistic message to SQLite for offline persistence
      try {
        await sqliteService.saveMessage({
          id: tempId,
          clientId: tempId,
          chatId,
          content: messageText.trim(),
          text: messageText.trim(),
          senderId: currentUser.id,
          timestamp: messageTimestamp,
          createdAt: messageTimestamp,
          status: 'sending',
          senderName: currentUser.name || 'You',
        });
        console.log(
          '💾 [ConversationScreen] Optimistic message saved to SQLite:',
          tempId,
        );
      } catch (sqliteError) {
        console.error(
          '❌ [ConversationScreen] Failed to save optimistic message:',
          sqliteError,
        );
      }

      let socketSent = false;
      let apiSent = false;
      let serverId: string | null = null;

      try {
        // Step 3: Send via socket for real-time delivery
        if (socketService.getConnectionStatus()) {
          socketSent = socketService.sendMessage({
            chatId,
            content: messageText.trim(),
            messageType: 'text',
            tempId,
            senderId: currentUser.id,
            createdAt: messageTimestamp,
          });
          console.log(
            '📤 [ConversationScreen] Message sent via socket:',
            socketSent,
          );
        } else {
          console.log(
            '⚠️ [ConversationScreen] Socket not connected, skipping socket send',
          );
        }

        // Step 4: Send via API for server persistence and delivery confirmation
        try {
          const serverMessage = await chatApiService.sendMessage(chatId, {
            content: messageText.trim(),
            messageType: 'text',
          });

          serverId = serverMessage?._id || serverMessage?.id;
          apiSent = true;
          console.log(
            '📤 [ConversationScreen] Message sent via API:',
            serverId,
          );
        } catch (apiError) {
          console.error('❌ [ConversationScreen] API send failed:', apiError);
          throw apiError;
        }

        // Step 5: Update message with server ID and status
        if (serverId) {
          console.log(
            '✅ [ConversationScreen] Message sent successfully, updating ID:',
            tempId,
            '->',
            serverId,
          );

          // Update Redux state
          dispatch({
            type: 'chat/replaceMessageId',
            payload: { tempId, serverId, chatId },
          });
          dispatch(
            updateMessageStatus({ messageId: serverId, status: 'sent' }),
          );

          // Update SQLite with server ID
          try {
            await sqliteService.updateMessageIdByClientId(tempId, serverId);
            await sqliteService.updateMessageStatus(serverId, 'sent');
            console.log(
              '💾 [ConversationScreen] Updated message in SQLite with server ID:',
              serverId,
            );
          } catch (updateError) {
            console.error(
              '❌ [ConversationScreen] Failed to update message in SQLite:',
              updateError,
            );
          }
        } else {
          // If no server ID but API succeeded, mark as sent
          dispatch(updateMessageStatus({ messageId: tempId, status: 'sent' }));
        }
      } catch (error) {
        console.error('❌ [ConversationScreen] Send message error:', error);

        // Update message status to failed
        dispatch(updateMessageStatus({ messageId: tempId, status: 'failed' }));

        // Update SQLite status
        try {
          await sqliteService.updateMessageStatus(tempId, 'failed');
        } catch (sqliteError) {
          console.error(
            '❌ [ConversationScreen] Failed to update message status in SQLite:',
            sqliteError,
          );
        }

        // Show appropriate error message
        if (error instanceof Error) {
          if (error.message.includes('Network request failed')) {
            Alert.alert(
              'Network Error',
              'Please check your internet connection and try again.',
            );
          } else if (error.message.includes('timeout')) {
            Alert.alert(
              'Timeout Error',
              'Message sending timed out. It may still be delivered.',
            );
          } else if (error.message.includes('Chat not found')) {
            Alert.alert('Chat Error', 'This chat is no longer available.');
          } else {
            Alert.alert('Error', 'Failed to send message. Please try again.');
          }
        }
      }
    },
    [currentUser, chatId, dispatch],
  );

  const handleEditMessage = useCallback(
    async (messageId: string, newContent: string) => {
      // Implementation
    },
    [dispatch],
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      // Implementation
    },
    [dispatch],
  );

  const handleAddReaction = useCallback(
    async (messageId: string, emoji: string) => {
      // Implementation
    },
    [currentUser, dispatch],
  );

  const handleRemoveReaction = useCallback(
    async (messageId: string, emoji: string) => {
      // Implementation
    },
    [currentUser, dispatch],
  );

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isMe = item.senderId === currentUser?.id;

    // For inverted list, check the next item in the array (which is earlier in time)
    const prevMessageInTimeline = chatMessages[index + 1];
    const showTime =
      index === chatMessages.length - 1 ||
      (prevMessageInTimeline &&
        prevMessageInTimeline.senderId !== item.senderId) ||
      index === 0;

    return (
      <MessageBubble
        message={{
          id: item._id,
          content: item.text,
          timestamp: item.createdAt,
          sender: isMe ? 'me' : 'other',
          type: item.type || 'text',
          status: item.status,
          isEdited: item.isEdited,
        }}
        isMe={isMe}
        showTime={showTime}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
        onAddReaction={handleAddReaction}
        onRemoveReaction={handleRemoveReaction}
        onPress={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <CustomStatusBar />
        <ChatHeader />

        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={item => item._id}
          renderItem={renderMessage}
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
          inverted
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.subText }]}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          }
          ListHeaderComponent={
            isTyping && typingUsers.length > 0 ? (
              <View
                style={[
                  styles.typingIndicator,
                  { backgroundColor: colors.background },
                ]}
              >
                <View style={styles.typingDots}>
                  <View
                    style={[
                      styles.typingDot,
                      { backgroundColor: colors.subText },
                    ]}
                  />
                  <View
                    style={[
                      styles.typingDot,
                      { backgroundColor: colors.subText },
                    ]}
                  />
                  <View
                    style={[
                      styles.typingDot,
                      { backgroundColor: colors.subText },
                    ]}
                  />
                </View>
                <Text style={[styles.typingText, { color: colors.subText }]}>
                  {typingUsers.length === 1
                    ? 'Someone is typing...'
                    : `${typingUsers.length} people are typing...`}
                </Text>
              </View>
            ) : null
          }
        />

        <ChatInput onSendMessage={handleSendMessage} chatId={chatId} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardAvoidingView: { flex: 1 },
  messagesList: { flex: 1, paddingHorizontal: spacing.sm },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    transform: [{ scaleY: -1 }],
  },
  emptyText: { fontSize: fontSize.md, textAlign: 'center' },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typingDots: { flexDirection: 'row', marginRight: spacing.sm },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
    opacity: 0.4,
  },
  typingText: { fontSize: fontSize.sm, fontStyle: 'italic' },
});

export default ConversationScreen;
