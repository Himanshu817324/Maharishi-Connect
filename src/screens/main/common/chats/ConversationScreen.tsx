import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
  LayoutAnimation,
  ActivityIndicator,
} from 'react-native';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { RootState, AppDispatch } from '@/store';
import {
  setCurrentChat,
  clearCurrentChat,
  clearUnreadCount,
  updateChatLastMessage,
} from '@/store/slices/chatSlice';
import {
  fetchChatMessages,
  addMessage,
  setCurrentChatMessages,
  clearCurrentChatMessages,
  setLoadingOlderMessages,
  updateMessage,
  updateMessageStatus,
  removeMessage,
} from '@/store/slices/messageSlice';
import { socketService } from '@/services/socketService';
import { MessageData } from '@/services/chatService';
import { messageService } from '@/services/messageService';
import { chatService } from '@/services/chatService';
import { ChatData } from '@/services/chatService';
import { MediaFile } from '@/services/mediaService';
import MediaViewer from '@/components/MediaViewer';
import ChatHeader from '@/components/atoms/chats/ChatHeader';
import MessageBubble from '@/components/atoms/chats/MessageBubble';
import ChatInput from '@/components/atoms/chats/ChatInput';
import TypingIndicator from '@/components/atoms/chats/TypingIndicator';
import CustomSafeAreaView from '@/components/atoms/ui/CustomSafeAreaView';
import FileMessageBubble from '@/components/FileMessageBubble';
import { FlatList } from 'react-native';
// import { logger } from '@/utils/logger';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

// Utility function to format date for day separators
const formatDateForSeparator = (dateString: string): string => {
  const messageDate = new Date(dateString);
  const now = new Date();
  
  // Get local date strings in YYYY-MM-DD format for comparison
  const messageDateStr = messageDate.getFullYear() + '-' + 
    String(messageDate.getMonth() + 1).padStart(2, '0') + '-' + 
    String(messageDate.getDate()).padStart(2, '0');
  
  const todayStr = now.getFullYear() + '-' + 
    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
    String(now.getDate()).padStart(2, '0');
  
  // Calculate yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.getFullYear() + '-' + 
    String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + 
    String(yesterday.getDate()).padStart(2, '0');
  
  console.log('📅 Date comparison:', {
    messageDateStr,
    todayStr,
    yesterdayStr,
    originalDateString: dateString,
    messageDateLocal: messageDate.toLocaleDateString(),
    nowLocal: now.toLocaleDateString(),
    yesterdayLocal: yesterday.toLocaleDateString()
  });
  
  if (messageDateStr === todayStr) {
    return 'Today';
  } else if (messageDateStr === yesterdayStr) {
    return 'Yesterday';
  } else {
    // Format as "Sunday 23 September" or similar
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    };
    return messageDate.toLocaleDateString('en-US', options);
  }
};

// Utility function to check if two dates are on the same day (currently unused but kept for future use)
// const isSameDay = (date1: string, date2: string): boolean => {
//   const d1 = new Date(date1);
//   const d2 = new Date(date2);
//   return d1.getFullYear() === d2.getFullYear() &&
//          d1.getMonth() === d2.getMonth() &&
//          d1.getDate() === d2.getDate();
// };

// Interface for grouped message items
interface GroupedMessageItem {
  type: 'message' | 'separator';
  data: MessageData | { date: string; formattedDate: string };
}

interface RouteParams {
  chat: ChatData;
}

const ConversationScreen: React.FC = () => {
  const { colors } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();

  const { chat: routeChat } = route.params as RouteParams;
  const { currentChat } = useSelector((state: RootState) => state.chat);
  const { currentChatMessages, currentChatId, pagination, loading } = useSelector(
    (state: RootState) => state.message,
  );
  const { user } = useSelector((state: RootState) => state.auth);

  const [replyToMessage, setReplyToMessage] = useState<{
    id: string;
    content: string;
    sender: string;
  } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // ✅ FIX: Use enhanced keyboard hook with dynamic calculations
  const { keyboardHeight, isKeyboardVisible, adjustedKeyboardHeight, screenInfo } = useKeyboardHeight();

  // Typing indicators
  const [localTypingUsers, setLocalTypingUsers] = useState<
    Array<{
      userId: string;
      userName: string;
    }>
  >([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Online status
  const [_onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [_userLastSeen, setUserLastSeen] = useState<Map<string, string>>(
    new Map(),
  );

  const flatListRef = useRef<FlatList>(null);
  const currentChatMessagesRef = useRef<MessageData[]>([]);
  const [_isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [hasInitiallyScrolled, setHasInitiallyScrolled] = useState(false);

  const chat = routeChat || currentChat;

  console.log('🔍 ConversationScreen chat state:', {
    routeChat: routeChat?.id,
    currentChat: currentChat?.id,
    currentChatId: currentChatId,
    finalChat: chat?.id,
    routeChatParticipants: routeChat?.participants?.map(p => p.user_id),
    currentChatParticipants: currentChat?.participants?.map(p => p.user_id),
  });

  // Auto-scroll to bottom when chat changes or messages are first loaded
  useEffect(() => {
    if (currentChatMessages.length > 0) {
      setShouldAutoScroll(true);
      scrollToBottom(true, false);
    }
  }, [chat?.id, currentChatMessages.length, scrollToBottom]);

  useEffect(() => {
    currentChatMessagesRef.current = currentChatMessages;
    console.log('📱 Current chat messages updated:', {
      chatId: chat?.id,
      messageCount: currentChatMessages.length,
      messages: currentChatMessages.map(m => ({
        id: m.id,
        sender_id: m.sender_id,
        content: m.content.substring(0, 30) + '...',
        timestamp: m.created_at
      })),
      duplicateCheck: (() => {
        const messageIds = currentChatMessages.map(m => m.id);
        const uniqueIds = new Set(messageIds);
        const duplicates = messageIds.filter((id, index) => messageIds.indexOf(id) !== index);
        return {
          hasDuplicates: duplicates.length > 0,
          duplicateIds: duplicates,
          totalUnique: uniqueIds.size,
          totalMessages: messageIds.length
        };
      })()
    });
  }, [currentChatMessages, chat?.id]);

  // Reset initial scroll state when chat changes
  useEffect(() => {
    setHasInitiallyScrolled(false);
  }, [chat?.id]);

  // Initial scroll to bottom when chat opens
  useEffect(() => {
    if (currentChatMessages.length > 0 && !hasInitiallyScrolled) {
      // Force scroll to bottom when chat opens - use multiple attempts to ensure it works
      const scrollToBottom = () => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
          console.log('📍 Scrolling to bottom on chat open');
        }
      };
      
      // Try multiple times with increasing delays to ensure content is rendered
      const timeout1 = setTimeout(scrollToBottom, 100);
      const timeout2 = setTimeout(scrollToBottom, 300);
      const timeout3 = setTimeout(() => {
        scrollToBottom();
        setHasInitiallyScrolled(true);
      }, 500);
      
      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        clearTimeout(timeout3);
      };
    }
  }, [chat?.id, currentChatMessages.length, hasInitiallyScrolled]); // Only depend on chat.id to avoid multiple scrolls

  const setupSocketListeners = useCallback(() => {
    // Listener for sent messages (confirmation)
    socketService.addMessageSentListener((message: MessageData) => {
      if (message.chat_id === chat?.id) {
        console.log(
          '📨 [ConversationScreen] Message sent confirmation received:',
          message.id,
        );
        // Ensure message has 'sent' status
        const messageWithStatus = {
          ...message,
          status: 'sent' as const,
        };
        dispatch(addMessage(messageWithStatus));

        // Update the chat's last message in the chat list
        dispatch(
          updateChatLastMessage({
            chatId: message.chat_id,
            lastMessage: {
              id: message.id,
              content: message.content,
              sender_id: message.sender_id,
              created_at: message.created_at,
            },
          }),
        );

        scrollToBottom(true, false);
      }
    });

    // Listener for incoming messages from other users
    const removeMessageListener = socketService.addMessageListener(
      (message: MessageData) => {
        console.log('📨 [ConversationScreen] Socket message received:', {
          messageId: message.id,
          chatId: message.chat_id,
          senderId: message.sender_id,
          currentUserId: user?.id || user?.firebaseUid,
          content: message.content,
        });
        
        if (message.chat_id === chat?.id) {
          console.log(
            '📨 [ConversationScreen] Incoming message received:',
            message.id,
          );
          
          // Check if this is a message we sent (replace optimistic message)
          const isFromCurrentUser = message.sender_id === user?.id || message.sender_id === user?.firebaseUid;
          console.log('🔍 Is from current user:', isFromCurrentUser);
          
          if (isFromCurrentUser) {
            // This is our message coming back from server
            console.log('🔄 Socket message received from current user:', message.id);
            
            // Check if we already have this message (from REST API)
            const currentMessages = currentChatMessagesRef.current;
            const existingMessage = currentMessages.find(m => 
              m.id === message.id || 
              (m.content === message.content && 
               m.sender_id === message.sender_id &&
               Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 2000) // Within 2 seconds
            );
            
            if (existingMessage) {
              console.log('🔄 Message already exists, updating status:', existingMessage.id);
              // Just update the status if needed
              if (existingMessage.status === 'sending') {
                dispatch(updateMessage({
                  ...existingMessage,
                  status: 'sent',
                }));
              }
            } else {
              // Find optimistic message to replace
              const optimisticMessage = currentMessages.find(m => 
                m.content === message.content && 
                m.sender_id === message.sender_id &&
                m.id.startsWith('temp_') &&
                Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 5000 // Within 5 seconds
              );
              
              if (optimisticMessage) {
                console.log('🔄 Replacing optimistic message with socket message:', optimisticMessage.id);
                dispatch(removeMessage({ messageId: optimisticMessage.id, chatId: message.chat_id }));
                dispatch(addMessage({
                  ...message,
                  status: 'sent' as const,
                }));
              } else {
                console.log('🔄 Adding new socket message:', message.id);
                dispatch(addMessage({
                  ...message,
                  status: 'sent' as const,
                }));
              }
            }
          } else {
            // This is a message from another user - add it normally
            console.log('🔄 Adding message from other user:', message.id);
            const messageWithStatus = {
              ...message,
              status: 'sent' as const,
            };
            dispatch(addMessage(messageWithStatus));
          }

          // Mark message as delivered when received
          try {
            console.log(
              '📬 [ConversationScreen] Marking message as delivered:',
              message.id,
            );
            socketService.markMessageAsDelivered(message.id);
          } catch (error) {
            console.error(
              '❌ [ConversationScreen] Error marking message as delivered:',
              error,
            );
          }

          // Update the chat's last message in the chat list
          dispatch(
            updateChatLastMessage({
              chatId: message.chat_id,
              lastMessage: {
                id: message.id,
                content: message.content,
                sender_id: message.sender_id,
                created_at: message.created_at,
              },
            }),
          );

          scrollToBottom(true, false);
        }
      },
    );

    // Typing indicator listeners
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _removeTypingListener = socketService.addTypingListener(data => {
      if (data.chatId === chat?.id) {
        console.log('⌨️ [ConversationScreen] Typing indicator:', data);

        if (data.isTyping) {
          setLocalTypingUsers(prev => {
            const existing = prev.find(u => u.userId === data.userId);
            if (!existing) {
              return [
                ...prev,
                { userId: data.userId, userName: data.userName },
              ];
            }
            return prev;
          });
        } else {
          setLocalTypingUsers(prev =>
            prev.filter(u => u.userId !== data.userId),
          );
        }
      }
    });

    // Read receipt listeners (handles both messageRead and messageSeen events)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _removeReadReceiptListener = socketService.addReadReceiptListener(
      data => {
        if (data.chatId === chat?.id) {
          console.log('📖 [ConversationScreen] Read receipt:', data);
          // Update message status to 'seen' in Redux store
          dispatch(
            updateMessageStatus({
              messageId: data.messageId,
              chatId: data.chatId,
              status: 'seen',
              userId: data.userId,
              timestamp: data.readAt,
            }),
          );
        }
      },
    );

    // Message status listeners
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _removeMessageStatusListener = socketService.addMessageStatusListener(
      data => {
        console.log(
          '📊 [ConversationScreen] Message status update received:',
          data,
        );
        console.log('📊 [ConversationScreen] Current chat ID:', chat?.id);
        console.log('📊 [ConversationScreen] Data chat ID:', data.chatId);
        console.log(
          '📊 [ConversationScreen] Chat IDs match:',
          data.chatId === chat?.id,
        );
        console.log('📊 [ConversationScreen] Socket connected:', socketService.isSocketConnected());

        if (data.chatId === chat?.id) {
          console.log(
            '📊 [ConversationScreen] Processing message status update:',
            data,
          );
          // Update message status in Redux store
          dispatch(
            updateMessageStatus({
              messageId: data.messageId,
              chatId: data.chatId,
              status: data.status,
              userId: data.userId,
              timestamp: data.timestamp,
            }),
          );
          console.log(
            '📊 [ConversationScreen] Message status update dispatched to Redux',
          );
        } else {
          console.log(
            '📊 [ConversationScreen] Ignoring status update for different chat',
          );
        }
      },
    );

    // Message delivered listeners
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _removeMessageDeliveredListener =
      socketService.addMessageDeliveredListener(data => {
        console.log(
          '📬 [ConversationScreen] Message delivered event received:',
          data,
        );
        console.log('📬 [ConversationScreen] Current chat ID:', chat?.id);
        console.log('📬 [ConversationScreen] Data chat ID:', data.chatId);
        console.log(
          '📬 [ConversationScreen] Chat IDs match:',
          data.chatId === chat?.id,
        );
        console.log('📬 [ConversationScreen] Socket connected:', socketService.isSocketConnected());

        if (data.chatId === chat?.id) {
          console.log(
            '📬 [ConversationScreen] Processing message delivered:',
            data,
          );
          console.log(
            '📬 [ConversationScreen] Dispatching updateMessageStatus:',
            {
              messageId: data.messageId,
              chatId: data.chatId,
              status: 'delivered',
              userId: data.userId,
              timestamp: data.timestamp,
            },
          );
          // Update message status to 'delivered'
          dispatch(
            updateMessageStatus({
              messageId: data.messageId,
              chatId: data.chatId,
              status: 'delivered',
              userId: data.userId,
              timestamp: data.timestamp,
            }),
          );
          console.log(
            '📬 [ConversationScreen] Message delivered status dispatched to Redux',
          );
        } else {
          console.log(
            '📬 [ConversationScreen] Ignoring delivered event for different chat',
          );
        }
      });

    // Online status listeners
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _removeUserOnlineListener = socketService.addUserOnlineListener(
      userData => {
        console.log('🟢 [ConversationScreen] User came online:', userData);
        setOnlineUsers(prev => new Set([...prev, userData.user_id]));
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _removeUserOfflineListener = socketService.addUserOfflineListener(
      userData => {
        console.log('🔴 [ConversationScreen] User went offline:', userData);
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userData.user_id);
          return newSet;
        });
        setUserLastSeen(
          prev =>
            new Map(
              prev.set(
                userData.user_id,
                userData.lastSeen || new Date().toISOString(),
              ),
            ),
        );
      },
    );

    socketService.addConnectionListener((connected: boolean) => {
      console.log('🔌 Socket connection status changed:', connected);
      setIsConnected(connected);
    });

    const initialConnectionStatus = socketService.isSocketConnected();
    console.log(
      '🔌 Initial socket connection status:',
      initialConnectionStatus,
    );
    setIsConnected(initialConnectionStatus);

    return () => {
      removeMessageListener();
      // Note: Some socket listeners don't return cleanup functions
      // They will be cleaned up when the component unmounts
    };
  }, [chat?.id, dispatch, user?.id, user?.firebaseUid, scrollToBottom]);

  const joinChatRoom = useCallback(() => {
    if (chat && socketService.isSocketConnected()) {
      socketService.joinChat(chat.id);
    }
  }, [chat]);

  const loadMessages = useCallback(async () => {
    if (!chat) return;

    try {
      console.log('📱 Loading messages for chat:', chat.id);
      const result = await dispatch(
        fetchChatMessages({
          chatId: chat.id,
          limit: 200, // Increased from 50 to 200
        }),
      ).unwrap();
      console.log('📱 Messages loaded:', result);

      dispatch(setCurrentChatMessages(chat.id));
      scrollToBottom(true, false);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [chat, dispatch, scrollToBottom]);

  const loadOlderMessages = useCallback(async () => {
    if (!chat || currentChatMessages.length === 0) return;
    
    const chatPagination = pagination[chat.id];
    if (!chatPagination?.hasMore || chatPagination.isLoadingOlder) return;

    try {
      dispatch(setLoadingOlderMessages({ chatId: chat.id, isLoading: true }));
      console.log('📱 Loading older messages for chat:', chat.id);
      const oldestMessage = currentChatMessages[0];
      
      const result = await dispatch(
        fetchChatMessages({
          chatId: chat.id,
          limit: 100,
          beforeMessageId: oldestMessage.id,
        }),
      ).unwrap();
      
      console.log('📱 Older messages loaded:', result);
      
      // Update current chat messages after loading older ones
      dispatch(setCurrentChatMessages(chat.id));
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      dispatch(setLoadingOlderMessages({ chatId: chat.id, isLoading: false }));
    }
  }, [chat, currentChatMessages, dispatch, pagination]);

  useEffect(() => {
    if (chat) {
      console.log('🔄 Switching to chat:', chat.id);

      dispatch(clearCurrentChat());
      dispatch(clearCurrentChatMessages());

      dispatch(setCurrentChat(chat));
      loadMessages();
      joinChatRoom();
      const cleanup = setupSocketListeners();
      if (chat?.id) {
        dispatch(clearUnreadCount(chat.id));
      }

      return cleanup;
    }

    return () => {};
  }, [
    chat,
    chat.id,
    dispatch,
    joinChatRoom,
    loadMessages,
    setupSocketListeners,
  ]);

  // ✅ FIX: Enhanced keyboard animation handling with screen-aware adjustments
  useEffect(() => {
    if (isKeyboardVisible) {
      // ✅ FIX: Screen-aware animation duration and type
      const animationDuration = screenInfo.isSmall ? 200 : screenInfo.isTablet ? 300 : 250;
      
      if (Platform.OS === 'android') {
        LayoutAnimation.configureNext({
          duration: animationDuration,
          create: { 
            type: 'easeInEaseOut', 
            property: 'opacity',
            springDamping: screenInfo.isSmall ? 0.8 : 0.9,
          },
          update: { 
            type: 'easeInEaseOut',
            springDamping: screenInfo.isSmall ? 0.8 : 0.9,
          },
          delete: { 
            type: 'easeInEaseOut', 
            property: 'opacity',
            springDamping: screenInfo.isSmall ? 0.8 : 0.9,
          },
        });
      } else {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      
      // ✅ FIX: Screen-aware scroll timing - use minimal animation
      const scrollDelay = screenInfo.isSmall ? 50 : screenInfo.isTablet ? 100 : 75;
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, Platform.OS === 'android' ? scrollDelay : 50);
    } else {
      // ✅ FIX: Screen-aware animation for keyboard hide
      const animationDuration = screenInfo.isSmall ? 200 : screenInfo.isTablet ? 300 : 250;
      
      if (Platform.OS === 'android') {
        LayoutAnimation.configureNext({
          duration: animationDuration,
          create: { 
            type: 'easeInEaseOut', 
            property: 'opacity',
            springDamping: screenInfo.isSmall ? 0.8 : 0.9,
          },
          update: { 
            type: 'easeInEaseOut',
            springDamping: screenInfo.isSmall ? 0.8 : 0.9,
          },
          delete: { 
            type: 'easeInEaseOut', 
            property: 'opacity',
            springDamping: screenInfo.isSmall ? 0.8 : 0.9,
          },
        });
      } else {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    }
  }, [isKeyboardVisible, screenInfo]);

  const scrollToBottom = useCallback((force = false, animated = true) => {
    if (force || shouldAutoScroll) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated });
      }, 50);
    }
  }, [shouldAutoScroll]);

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
    
    if (isAtBottom) {
      setShouldAutoScroll(true);
      setIsUserScrolling(false);
    } else {
      setShouldAutoScroll(false);
      setIsUserScrolling(true);
    }
  };

  const handleScrollBeginDrag = () => {
    setIsUserScrolling(true);
    setShouldAutoScroll(false);
  };

  const handleScrollEndDrag = () => {
    // Keep the current state, will be updated in handleScroll
  };

  const handleSendMessage = async (
    content: string,
    messageType: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text',
  ) => {
    if (!chat || !content.trim()) return;

    try {
      console.log('📤 Sending message immediately:', {
        chatId: chat.id,
        content,
        messageType,
      });

      if (isConnected) {
        console.log('🔌 Socket is connected, sending via socket');
        // Create optimistic message for immediate display
        const optimisticMessage: MessageData = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          chat_id: chat.id,
          sender_id: user?.id || user?.firebaseUid || '',
          content,
          message_type: messageType,
          created_at: new Date().toISOString(),
          sender: {
            user_id: user?.id || user?.firebaseUid || '',
            fullName: user?.fullName || user?.name || 'You',
            profilePicture: user?.avatar,
          },
          status: 'sending',
          reply_to_message_id: replyToMessage?.id,
        };

        // Add optimistic message to Redux store immediately
        console.log('🔄 Adding optimistic message to Redux store:', optimisticMessage.id);
        dispatch(addMessage(optimisticMessage));

        // Update the chat's last message optimistically
        dispatch(
          updateChatLastMessage({
            chatId: chat.id,
            lastMessage: {
              id: optimisticMessage.id,
              content: optimisticMessage.content,
              sender_id: optimisticMessage.sender_id,
              created_at: optimisticMessage.created_at,
            },
          }),
        );

        // Send via socket for real-time delivery
        try {
          messageService.sendMessageImmediate(chat.id, content, messageType, {
            replyToMessageId: replyToMessage?.id,
          });
          console.log('📤 Message sent via socket successfully');
        } catch (error) {
          console.error('❌ Error sending via socket:', error);
        }

        // ALWAYS send via REST API for persistence (dual-send approach)
        console.log('💾 Sending message via REST API for persistence');
        try {
          const response = await chatService.sendMessage(chat.id, {
            content,
            messageType,
            replyToMessageId: replyToMessage?.id,
          });

          if (response && response.data) {
            console.log('💾 Message persisted to server:', response.data.id);
            
            // Check if we already have this message (from socket)
            const currentMessages = currentChatMessagesRef.current;
            const existingMessage = currentMessages.find(m => 
              m.id === response.data.id || 
              (m.content === response.data.content && 
               m.sender_id === response.data.sender_id &&
               Math.abs(new Date(m.created_at).getTime() - new Date(response.data.created_at).getTime()) < 2000) // Within 2 seconds
            );
            
            if (existingMessage) {
              console.log('🔄 Message already exists from socket, updating status:', existingMessage.id);
              // Just update the status if needed
              if (existingMessage.status === 'sending') {
                dispatch(updateMessage({
                  ...existingMessage,
                  status: 'sent',
                }));
              }
            } else {
              // Remove optimistic message and add real one from server
              dispatch(removeMessage({ messageId: optimisticMessage.id, chatId: chat.id }));
              dispatch(addMessage({
                ...response.data,
                status: 'sent' as const,
              }));
            }

            // Update the chat's last message with server data
            dispatch(
              updateChatLastMessage({
                chatId: response.data.chat_id,
                lastMessage: {
                  id: response.data.id,
                  content: response.data.content,
                  sender_id: response.data.sender_id,
                  created_at: response.data.created_at,
                },
              }),
            );
            
            console.log('✅ Message successfully persisted and updated');
          }
        } catch (restError) {
          console.error('❌ REST API persistence failed:', restError);
          // Update optimistic message to failed status
          dispatch(updateMessage({
            ...optimisticMessage,
            status: 'failed',
          }));
        }
      } else {
        console.log('📤 Sending message via REST API (socket not connected)');
        try {
          const response = await chatService.sendMessage(chat.id, {
            content,
            messageType,
            replyToMessageId: replyToMessage?.id,
          });

          console.log('📥 REST API response:', response);

          if (response && response.data) {
            console.log('🔄 Adding message to Redux store:', response.data);
            // Ensure message has 'sent' status
            const messageWithStatus = {
              ...response.data,
              status: 'sent' as const,
            };
            dispatch(addMessage(messageWithStatus));

            // Update the chat's last message in the chat list
            dispatch(
              updateChatLastMessage({
                chatId: response.data.chat_id,
                lastMessage: {
                  id: response.data.id,
                  content: response.data.content,
                  sender_id: response.data.sender_id,
                  created_at: response.data.created_at,
                },
              }),
            );

            scrollToBottom(true, false);
          } else {
            console.log('⚠️ No message data in response');
          }
        } catch (error) {
          console.error('❌ Error sending message via REST API:', error);
        }
      }

      setReplyToMessage(null);

      // Stop typing when message is sent
      handleStopTyping();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // Typing handlers
  const handleStopTyping = useCallback(() => {
    if (!chat || !isTyping) return;

    setIsTyping(false);
    socketService.stopTyping(chat.id);
  }, [chat, isTyping]);

  const handleStartTyping = useCallback(() => {
    if (!chat || isTyping) return;

    setIsTyping(true);
    socketService.startTyping(chat.id);

    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  }, [chat, isTyping, handleStopTyping]);

  // Mark messages as read when screen is focused
  const markMessagesAsRead = useCallback(() => {
    if (chat && socketService.isSocketConnected()) {
      socketService.markChatAsRead(chat.id);
      dispatch(clearUnreadCount(chat.id));

      // Mark all unread messages in this chat as seen
      const unreadMessages = currentChatMessages.filter(
        message =>
          message.sender_id !== user?.id &&
          message.sender_id !== user?.firebaseUid &&
          message.status !== 'seen',
      );

      console.log(
        '👁️ [ConversationScreen] Marking messages as seen:',
        unreadMessages.length,
      );

      unreadMessages.forEach(message => {
        try {
          console.log(
            '👁️ [ConversationScreen] Marking message as seen:',
            message.id,
          );
          socketService.markMessageAsSeen(message.id);
        } catch (error) {
          console.error(
            '❌ [ConversationScreen] Error marking message as seen:',
            error,
          );
        }
      });
    }
  }, [chat, dispatch, currentChatMessages, user?.id, user?.firebaseUid]);

  // Clear unread count when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (chat?.id) {
        console.log(
          '📱 ConversationScreen focused, clearing unread count for chat:',
          chat.id,
        );
        markMessagesAsRead();
      }
    }, [chat?.id, markMessagesAsRead]),
  );

  const handleMessagePress = (_message: MessageData) => {};

  const handleMessageLongPress = (message: MessageData) => {
    Alert.alert('Message Options', 'What would you like to do?', [
      {
        text: 'Reply',
        onPress: () =>
          setReplyToMessage({
            id: message.id,
            content: message.content,
            sender: message.sender.fullName,
          }),
      },
      { text: 'Copy', onPress: () => {} },
      ...(message.sender_id === user?.id
        ? [
            { text: 'Edit', onPress: () => handleEditMessage(message) },
            { text: 'Delete', onPress: () => handleDeleteMessage(message) },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleEditMessage = (message: MessageData) => {
    Alert.prompt(
      'Edit Message',
      'Enter new message content:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (newContent?: string) => {
            if (newContent && newContent.trim()) {
              try {
                await messageService.editMessage(message.id, newContent.trim());
              } catch (error) {
                console.error('Error editing message:', error);
                Alert.alert('Error', 'Failed to edit message.');
              }
            }
          },
        },
      ],
      'plain-text',
      message.content,
    );
  };

  const handleDeleteMessage = (message: MessageData) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await messageService.deleteMessage(message.id);
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message.');
            }
          },
        },
      ],
    );
  };

  const [isMediaViewerVisible, setIsMediaViewerVisible] = useState(false);
  const [mediaViewerFiles, setMediaViewerFiles] = useState<MediaFile[]>([]);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  // Function to group messages with day separators - memoized for performance
  const groupMessagesWithSeparators = useCallback((messages: MessageData[]): GroupedMessageItem[] => {
    if (messages.length === 0) return [];
    
    // Sort messages by created_at in ascending order (oldest first) for proper display
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    console.log('📱 [groupMessagesWithSeparators] Processing messages:', {
      messageCount: sortedMessages.length,
      messageIds: sortedMessages.map(m => m.id),
      firstMessageTime: sortedMessages[0]?.created_at,
      lastMessageTime: sortedMessages[sortedMessages.length - 1]?.created_at
    });
    
    const groupedItems: GroupedMessageItem[] = [];
    let lastDate = '';
    
    sortedMessages.forEach((message, index) => {
      const messageDate = new Date(message.created_at);
      // Get local date string in YYYY-MM-DD format
      const currentDate = messageDate.getFullYear() + '-' + 
        String(messageDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(messageDate.getDate()).padStart(2, '0');
      
      // Add separator if this is a new day
      if (currentDate !== lastDate) {
        const formattedDate = formatDateForSeparator(message.created_at);
        
        groupedItems.push({
          type: 'separator',
          data: {
            date: currentDate,
            formattedDate: formattedDate
          }
        });
        lastDate = currentDate;
      }
      
      // Add the message
      groupedItems.push({
        type: 'message',
        data: message
      });
      
      console.log(`📱 [groupMessagesWithSeparators] Added message ${index + 1}/${sortedMessages.length}:`, {
        messageId: message.id,
        content: message.content.substring(0, 50) + '...',
        timestamp: message.created_at
      });
    });
    
    console.log('📱 [groupMessagesWithSeparators] Final grouped items:', {
      totalItems: groupedItems.length,
      messageItems: groupedItems.filter(item => item.type === 'message').length,
      separatorItems: groupedItems.filter(item => item.type === 'separator').length
    });
    
    return groupedItems;
  }, []);

  // Get grouped messages for rendering - memoized for performance
  const groupedMessages = useMemo(() => 
    groupMessagesWithSeparators(currentChatMessages), 
    [groupMessagesWithSeparators, currentChatMessages]
  );

  // Debug log for message grouping
  useEffect(() => {
    console.log('📱 [ConversationScreen] Messages grouped:', {
      chatId: chat?.id,
      rawMessageCount: currentChatMessages.length,
      groupedItemCount: groupedMessages.length,
      messageIds: currentChatMessages.map(m => m.id),
      groupedMessageIds: groupedMessages
        .filter(item => item.type === 'message')
        .map(item => (item.data as MessageData).id),
      duplicateCheck: (() => {
        const messageIds = currentChatMessages.map(m => m.id);
        const uniqueIds = new Set(messageIds);
        const duplicates = messageIds.filter((id, index) => messageIds.indexOf(id) !== index);
        return {
          hasDuplicates: duplicates.length > 0,
          duplicateIds: duplicates,
          totalUnique: uniqueIds.size,
          totalMessages: messageIds.length
        };
      })()
    });
  }, [groupedMessages, currentChatMessages, chat?.id]);


  const handleMediaSelected = async (type: string, files: MediaFile[]) => {
    if (!chat || files.length === 0) return;

    // Debug: Test server response format
    try {
      const { apiService } = await import('@/services/apiService');
      await apiService.testServerResponse();
    } catch (error) {
      console.error('Server test failed:', error);
    }

    try {
      // For now, we'll send each file as a separate message
      // In a real implementation, you might want to batch them or create a gallery message
      for (const file of files) {
        try {
          console.log('📤 [ConversationScreen] Processing file:', file.name);
          
          // Determine message type based on file type
          let messageType: 'text' | 'image' | 'video' | 'audio' | 'file' = 'file';
          if (type === 'image') {
            messageType = 'image';
          } else if (type === 'video') {
            messageType = 'video';
          } else if (type === 'audio') {
            messageType = 'audio';
          }

          // Create a message object for the media file
          const messageId = `temp_${Date.now()}_${Math.random()}`;
          const timestamp = new Date().toISOString();

          // Add message to Redux store immediately for optimistic UI
          dispatch(addMessage({
            id: messageId,
            chat_id: chat.id,
            sender_id: user?.id || '',
            content: file.name, // Use file name as content
            message_type: messageType,
            media_url: file.uri, // Store the local URI temporarily
            media_metadata: {
              filename: file.name,
              size: file.size,
              mimeType: file.type,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              // Additional metadata for media files
              duration: file.duration,
              width: file.width,
              height: file.height,
            },
            created_at: timestamp,
            sender: {
              user_id: user?.id || '',
              fullName: user?.fullName || 'You',
            },
            status: 'sending',
          }));

          // Upload the file to server and update message with server URL
          try {
            console.log('📤 [ConversationScreen] Starting file upload:', {
              fileName: file.name,
              fileType: file.type,
              fileUri: file.uri,
              messageType
            });

            let uploadResult;
            
            if (messageType === 'image') {
              // Use image upload service for images
              console.log('📤 [ConversationScreen] Uploading image via imageUploadService');
              const { imageUploadService } = await import('@/services/imageUploadService');
              uploadResult = await imageUploadService.uploadChatImage(file.uri, chat.id);
              console.log('📤 [ConversationScreen] Image upload result:', uploadResult);
            } else {
              // For other file types, use the general file service
              console.log('📤 [ConversationScreen] Uploading file via fileService');
              const { fileService } = await import('@/services/fileService');
              const result = await fileService.uploadFile(file.uri, file.name, file.type, undefined, true);
              uploadResult = {
                success: result.status === 'SUCCESS',
                url: result.file?.mediaUrl,
                s3Key: result.file?.s3Key,
                fileId: result.file?.id,
                error: result.error,
              };
              console.log('📤 [ConversationScreen] File upload result:', uploadResult);
            }

            if (uploadResult.success && uploadResult.url) {
              // Update message with server URL
              dispatch(updateMessage({
                id: messageId,
                chat_id: chat.id,
                sender_id: user?.id || '',
                content: file.name,
                message_type: messageType,
                media_url: uploadResult.url, // Update with server URL
                media_metadata: {
                  filename: file.name,
                  size: file.size,
                  mimeType: file.type,
                  fileName: file.name,
                  fileSize: file.size,
                  fileType: file.type,
                  duration: file.duration,
                  width: file.width,
                  height: file.height,
                  // Add server metadata
                  s3Key: (uploadResult as any).s3Key,
                  fileId: (uploadResult as any).fileId,
                },
                created_at: timestamp,
                sender: {
                  user_id: user?.id || '',
                  fullName: user?.fullName || 'You',
                },
                status: 'sent',
              }));

              // Send message to server via socket
              try {
                console.log('📤 [ConversationScreen] Sending message via socket:', {
                  chatId: chat.id,
                  messageType,
                  mediaUrl: uploadResult.url
                });
                
                messageService.sendMessageImmediate(
                  chat.id,
                  file.name,
                  messageType,
                  {
                    mediaUrl: uploadResult.url,
                    mediaMetadata: {
                      filename: file.name,
                      size: file.size,
                      mimeType: file.type,
                    },
                  }
                );
                
                console.log('📤 [ConversationScreen] Message sent successfully via socket');
              } catch (socketError) {
                console.error('📤 [ConversationScreen] Socket send error:', socketError);
                // Don't fail the entire upload if socket send fails
                // The message is already uploaded to server
              }
            } else {
              // Upload failed, update message status
              console.error('Upload failed:', uploadResult.error || 'Upload failed');
              dispatch(updateMessageStatus({
                messageId: messageId,
                chatId: chat.id,
                status: 'failed',
              }));
            }
          } catch (uploadError) {
            console.error('Error uploading file:', uploadError);
            
            // Provide more detailed error information
            let errorMessage = 'Upload failed';
            if (uploadError instanceof Error) {
              errorMessage = uploadError.message;
              console.error('Upload error details:', {
                message: uploadError.message,
                name: uploadError.name,
                stack: uploadError.stack?.substring(0, 200)
              });
            }
            
            // Update message status to failed
            dispatch(updateMessageStatus({
              messageId: messageId,
              chatId: chat.id,
              status: 'failed',
            }));
            
            // Show user-friendly error message
            Alert.alert(
              'Upload Failed',
              `Failed to upload ${file.name}: ${errorMessage}`,
              [{ text: 'OK' }]
            );
          }
        } catch (fileError) {
          console.error('📤 [ConversationScreen] Error processing individual file:', fileError);
          // Continue with next file even if this one fails
        }
      }

      // Update chat last message
      const lastMessage = files[files.length - 1];
      const lastMessageId = `temp_${Date.now()}_${Math.random()}`;
      const lastMessageTimestamp = new Date().toISOString();
      
      dispatch(updateChatLastMessage({
        chatId: chat.id,
        lastMessage: {
          id: lastMessageId,
          content: lastMessage.name,
          sender_id: user?.id || '',
          created_at: lastMessageTimestamp,
        },
      }));

      // Clear reply if any
      setReplyToMessage(null);
      
      // Scroll to bottom
      scrollToBottom(true, false);

    } catch (error) {
      console.error('Error sending media:', error);
      Alert.alert('Error', 'Failed to send media');
    }
  };


  const handleMediaPress = (message: MessageData) => {
    if (!message.media_url) return;

    // Convert message to MediaFile format
    const mediaFile: MediaFile = {
      uri: message.media_url,
      name: message.content || 'Media File',
      type: message.media_metadata?.mimeType || 'application/octet-stream',
      size: message.media_metadata?.size || 0,
      duration: (message.media_metadata as any)?.duration,
      width: (message.media_metadata as any)?.width,
      height: (message.media_metadata as any)?.height,
    };

    setMediaViewerFiles([mediaFile]);
    setMediaViewerIndex(0);
    setIsMediaViewerVisible(true);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleInfo = () => {
    Alert.alert('Coming Soon', 'Chat info screen will be implemented soon.');
  };

  const handleCall = () => {
    Alert.alert('Coming Soon', 'Voice call will be implemented soon.');
  };

  const handleVideoCall = () => {
    Alert.alert('Coming Soon', 'Video call will be implemented soon.');
  };

  const handleSearch = () => {
    Alert.alert('Coming Soon', 'Message search will be implemented soon.');
  };

  const handleMore = () => {
    Alert.alert('Chat Options', 'What would you like to do?', [
      { text: 'Search Messages', onPress: handleSearch },
      { text: 'Chat Info', onPress: handleInfo },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Day separator component
  const renderDaySeparator = (formattedDate: string) => (
    <View style={styles.daySeparatorContainer}>
      <View style={[styles.daySeparatorLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.daySeparatorText, { color: colors.textSecondary }]}>
        {formattedDate}
      </Text>
      <View style={[styles.daySeparatorLine, { backgroundColor: colors.border }]} />
    </View>
  );

  const renderMessage = ({
    item,
    index,
  }: {
    item: GroupedMessageItem;
    index: number;
  }) => {
    // Handle day separator
    if (item.type === 'separator') {
      const separatorData = item.data as { date: string; formattedDate: string };
      return renderDaySeparator(separatorData.formattedDate);
    }

    // Handle message
    const messageData = item.data as MessageData;
    const currentUserId = user?.id || user?.firebaseUid;
    const isOwn =
      messageData.sender_id === currentUserId ||
      messageData.sender_id === user?.id ||
      messageData.sender_id === user?.firebaseUid;
    
    // Find previous message (skip separators)
    let previousMessage: MessageData | null = null;
    for (let i = index - 1; i >= 0; i--) {
      if (groupedMessages[i].type === 'message') {
        previousMessage = groupedMessages[i].data as MessageData;
        break;
      }
    }

    // Only show avatar for group chats, not for direct contacts
    const showAvatar =
      chat?.type === 'group' &&
      !isOwn &&
      (!previousMessage || previousMessage.sender_id !== messageData.sender_id);

    console.log('📱 Rendering message:', {
      messageId: messageData.id,
      senderId: messageData.sender_id,
      currentUserId,
      user_id: user?.id,
      user_firebaseUid: user?.firebaseUid,
      isOwn,
      chatType: chat?.type,
      showAvatar,
      content: messageData.content,
      timestamp: messageData.created_at,
      messageType: messageData.message_type,
    });

    // Render file message if it's a file type
    if (messageData.message_type === 'file') {
      return (
        <FileMessageBubble
          message={messageData}
          isOwn={isOwn}
          onPress={() => handleMessagePress(messageData)}
          onLongPress={() => handleMessageLongPress(messageData)}
        />
      );
    }

    return (
      <MessageBubble
        message={messageData}
        isOwn={isOwn}
        showAvatar={showAvatar}
        showTime={true}
        isGroupChat={chat?.type === 'group'}
        onPress={() => handleMessagePress(messageData)}
        onLongPress={() => handleMessageLongPress(messageData)}
        onMediaPress={handleMediaPress}
      />
    );
  };

  const renderTypingIndicator = () => {
    if (localTypingUsers.length === 0) return null;

    return localTypingUsers.map((typingUser, index) => (
      <TypingIndicator
        key={`${typingUser.userId}-${index}`}
        isVisible={true}
        userName={typingUser.userName}
        isOwn={false}
      />
    ));
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}
      >
        <Text style={styles.emptyIcon}>💬</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No messages yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Start the conversation by sending a message
      </Text>
    </View>
  );

  if (!chat) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContainer,
          { backgroundColor: colors.chatBackground },
        ]}
      >
        <View
          style={[styles.errorContainer, { backgroundColor: colors.surface }]}
        >
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Chat not found
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
            This chat may have been deleted
          </Text>
        </View>
      </View>
    );
  }

  // Show loading state while messages are being fetched
  if (loading && currentChatMessages.length === 0) {
    return (
      <CustomSafeAreaView
        style={[styles.container, { backgroundColor: colors.chatBackground }]}
        topColor={colors.chatBackground}
        bottomColor={colors.chatBackground}
      >
        <ChatHeader
          chat={chat}
          currentUserId={user?.id || user?.firebaseUid}
          onBack={handleBack}
          onCall={handleCall}
          onVideoCall={handleVideoCall}
          onSearch={handleSearch}
          onInfo={handleInfo}
          onMore={handleMore}
        />
        
        <View style={[styles.container, styles.centerContainer]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tabBarBG} />
            <Text style={[styles.loadingText, { color: colors.tabBarBG }]}>
              Loading messages...
            </Text>
          </View>
        </View>
      </CustomSafeAreaView>
    );
  }

  return (
    <CustomSafeAreaView
      style={[styles.container, { backgroundColor: colors.chatBackground }]}
      topColor={colors.chatBackground}
      bottomColor={colors.chatBackground}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={Platform.OS === 'ios'}
      >
        <View style={[styles.screen, { backgroundColor: colors.chatBackground }]}>
          <ChatHeader
            chat={chat}
            currentUserId={user?.id || user?.firebaseUid}
            onBack={handleBack}
            onCall={handleCall}
            onVideoCall={handleVideoCall}
            onSearch={handleSearch}
            onInfo={handleInfo}
            onMore={handleMore}
            backgroundColor={colors.chatBackground}
          />

          <View 
            style={[
              styles.messageListContainer,
              Platform.OS === 'android' && isKeyboardVisible && {
                paddingBottom: 10, // Small padding to prevent messages from touching input
              },
            ]}
          >
            {pagination[chat?.id || '']?.isLoadingOlder && (
              <View style={styles.loadingIndicator}>
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading older messages...
                </Text>
              </View>
            )}
            <FlatList
              ref={flatListRef}
              data={groupedMessages}
              keyExtractor={(item, index) => {
                if (item.type === 'separator') {
                  return `separator-${(item.data as { date: string; formattedDate: string }).date}`;
                } else {
                  const message = item.data as MessageData;
                  // Use a combination of ID and index to ensure uniqueness
                  return `message-${message.id}-${index}`;
                }
              }}
              renderItem={renderMessage}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
              onScroll={handleScroll}
              onScrollBeginDrag={handleScrollBeginDrag}
              onScrollEndDrag={handleScrollEndDrag}
              scrollEventThrottle={16}
              onLayout={() => {
                // Ensure scroll to bottom when FlatList layout is complete (only if not already scrolled)
                if (!hasInitiallyScrolled) {
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: false });
                    setHasInitiallyScrolled(true);
                    console.log('📍 FlatList layout complete - scrolling to bottom');
                  }, 100);
                }
              }}
              onScrollToIndexFailed={(info) => {
                // Fallback to scrolling to end if scrollToIndex fails
                console.log('ScrollToIndex failed:', info);
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }, 100);
              }}
              onEndReached={loadOlderMessages}
              onEndReachedThreshold={0.1}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={20}
              windowSize={10}
            />
          </View>

          {renderTypingIndicator()}

          <View 
            style={[
              styles.inputContainer,
              Platform.OS === 'android' && isKeyboardVisible && {
                marginBottom: Math.max(adjustedKeyboardHeight + 20, 30), // Ensure minimum 30px clearance
              },
            ]}
          >
            <ChatInput
              onSendMessage={handleSendMessage}
              onMediaSelected={handleMediaSelected}
              replyToMessage={replyToMessage || undefined}
              onCancelReply={() => setReplyToMessage(null)}
              disabled={false}
              keyboardHeight={keyboardHeight}
              isKeyboardVisible={isKeyboardVisible}
              onStartTyping={handleStartTyping}
              onStopTyping={handleStopTyping}
              screenInfo={screenInfo}
            />
          </View>
        </View>
      </KeyboardAvoidingView>


        <MediaViewer
          visible={isMediaViewerVisible}
          onClose={() => setIsMediaViewerVisible(false)}
          mediaFiles={mediaViewerFiles}
          initialIndex={mediaViewerIndex}
        />
      </CustomSafeAreaView>
    );
  };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  messageListContainer: {
    flex: 1,
  },
  loadingIndicator: {
    paddingVertical: hp(1),
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    fontSize: responsiveFont(12),
    fontStyle: 'italic',
  },
  flatListContent: {
    flexGrow: 1,
    paddingVertical: hp(1),
    paddingHorizontal: wp(1),
    paddingBottom: hp(2),
  },
  inputContainer: {
    // ✅ FIX: Better input container styling for Android
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    // Ensure proper positioning
    position: 'relative',
    zIndex: 1000,
    // Ensure the input stays at the bottom
    alignSelf: 'stretch',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  errorContainer: {
    alignItems: 'center',
    padding: moderateScale(32),
    borderRadius: moderateScale(24),
    width: '100%',
    maxWidth: moderateScale(320),
  },
  errorIcon: {
    fontSize: responsiveFont(48),
    marginBottom: hp(2),
  },
  errorText: {
    fontSize: responsiveFont(20),
    fontWeight: '700',
    marginBottom: hp(1),
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  errorSubtext: {
    fontSize: responsiveFont(14),
    textAlign: 'center',
    lineHeight: responsiveFont(20),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(10),
    paddingVertical: hp(8),
  },
  emptyIconContainer: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  emptyIcon: {
    fontSize: responsiveFont(48),
  },
  emptyTitle: {
    fontSize: responsiveFont(22),
    fontWeight: '700',
    marginBottom: hp(1),
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: responsiveFont(15),
    textAlign: 'center',
    lineHeight: responsiveFont(22),
  },
  typingContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingBubble: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(16),
    marginRight: moderateScale(8),
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    marginHorizontal: moderateScale(2),
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  typingText: {
    fontSize: responsiveFont(13),
    fontWeight: '500',
    fontStyle: 'italic',
  },
  daySeparatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: hp(2),
    paddingHorizontal: wp(4),
  },
  daySeparatorLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  daySeparatorText: {
    fontSize: responsiveFont(12),
    fontWeight: '500',
    marginHorizontal: wp(3),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default ConversationScreen;
