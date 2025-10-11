import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
  Keyboard,
  LayoutAnimation,
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
} from '@/store/slices/messageSlice';
import { socketService, MessageData } from '@/services/socketService';
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
  const { currentChatMessages, currentChatId, pagination } = useSelector(
    (state: RootState) => state.message,
  );
  const { user } = useSelector((state: RootState) => state.auth);

  const [replyToMessage, setReplyToMessage] = useState<{
    id: string;
    content: string;
    sender: string;
  } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

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

  const chat = routeChat || currentChat;

  console.log('🔍 ConversationScreen chat state:', {
    routeChat: routeChat?.id,
    currentChat: currentChat?.id,
    currentChatId: currentChatId,
    finalChat: chat?.id,
    routeChatParticipants: routeChat?.participants?.map(p => p.user_id),
    currentChatParticipants: currentChat?.participants?.map(p => p.user_id),
  });

  useEffect(() => {
    currentChatMessagesRef.current = currentChatMessages;
    console.log('📱 Current chat messages updated:', {
      chatId: chat?.id,
      messageCount: currentChatMessages.length,
      messages: currentChatMessages.map(m => ({
        id: m.id,
        sender_id: m.sender_id,
        content: m.content,
      })),
    });
  }, [currentChatMessages, chat?.id]);

  useEffect(() => {
    if (currentChatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 10);
    }
  }, [currentChatMessages.length]);


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

        scrollToBottom();
      }
    });

    // Listener for incoming messages from other users
    const removeMessageListener = socketService.addMessageListener(
      (message: MessageData) => {
        if (message.chat_id === chat?.id) {
          console.log(
            '📨 [ConversationScreen] Incoming message received:',
            message.id,
          );
          // Ensure incoming messages have 'sent' status
          const messageWithStatus = {
            ...message,
            status: 'sent' as const,
          };
          dispatch(addMessage(messageWithStatus));

          // Mark message as delivered when received
          try {
            console.log('📬 [ConversationScreen] Marking message as delivered:', message.id);
            socketService.markMessageAsDelivered(message.id);
          } catch (error) {
            console.error('❌ [ConversationScreen] Error marking message as delivered:', error);
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

          scrollToBottom();
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
        console.log('📊 [ConversationScreen] Message status update received:', data);
        console.log('📊 [ConversationScreen] Current chat ID:', chat?.id);
        console.log('📊 [ConversationScreen] Data chat ID:', data.chatId);
        console.log('📊 [ConversationScreen] Chat IDs match:', data.chatId === chat?.id);
        
        if (data.chatId === chat?.id) {
          console.log('📊 [ConversationScreen] Processing message status update:', data);
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
          console.log('📊 [ConversationScreen] Message status update dispatched to Redux');
        } else {
          console.log('📊 [ConversationScreen] Ignoring status update for different chat');
        }
      },
    );

    // Message delivered listeners
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _removeMessageDeliveredListener =
      socketService.addMessageDeliveredListener(data => {
        console.log('📬 [ConversationScreen] Message delivered event received:', data);
        console.log('📬 [ConversationScreen] Current chat ID:', chat?.id);
        console.log('📬 [ConversationScreen] Data chat ID:', data.chatId);
        console.log('📬 [ConversationScreen] Chat IDs match:', data.chatId === chat?.id);
        
        if (data.chatId === chat?.id) {
          console.log('📬 [ConversationScreen] Processing message delivered:', data);
          console.log('📬 [ConversationScreen] Dispatching updateMessageStatus:', {
            messageId: data.messageId,
            chatId: data.chatId,
            status: 'delivered',
            userId: data.userId,
            timestamp: data.timestamp,
          });
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
          console.log('📬 [ConversationScreen] Message delivered status dispatched to Redux');
        } else {
          console.log('📬 [ConversationScreen] Ignoring delivered event for different chat');
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
  }, [chat?.id, dispatch]);

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
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [chat, dispatch]);

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

  // Keyboard event listeners with smooth animations
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      e => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
        // Smooth animation for keyboard appearance
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        // Smooth animation for keyboard disappearance
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
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
        messageService.sendMessageImmediate(chat.id, content, messageType, {
          replyToMessageId: replyToMessage?.id,
        });
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

            scrollToBottom();
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
        message => message.sender_id !== user?.id && 
        message.sender_id !== user?.firebaseUid && 
        message.status !== 'seen'
      );
      
      console.log('👁️ [ConversationScreen] Marking messages as seen:', unreadMessages.length);
      
      unreadMessages.forEach(message => {
        try {
          console.log('👁️ [ConversationScreen] Marking message as seen:', message.id);
          socketService.markMessageAsSeen(message.id);
        } catch (error) {
          console.error('❌ [ConversationScreen] Error marking message as seen:', error);
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

  // Function to group messages with day separators
  const groupMessagesWithSeparators = (messages: MessageData[]): GroupedMessageItem[] => {
    if (messages.length === 0) return [];
    
    const groupedItems: GroupedMessageItem[] = [];
    let lastDate = '';
    
    console.log('📅 Grouping messages:', messages.length, 'messages');
    
    messages.forEach((message, _index) => {
      const messageDate = new Date(message.created_at);
      // Get local date string in YYYY-MM-DD format
      const currentDate = messageDate.getFullYear() + '-' + 
        String(messageDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(messageDate.getDate()).padStart(2, '0');
      
      console.log('📅 Processing message:', {
        messageId: message.id,
        created_at: message.created_at,
        currentDate,
        lastDate,
        isNewDay: currentDate !== lastDate,
        messageDateLocal: messageDate.toLocaleDateString()
      });
      
      // Add separator if this is a new day
      if (currentDate !== lastDate) {
        const formattedDate = formatDateForSeparator(message.created_at);
        console.log('📅 Adding separator:', formattedDate);
        
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
    });
    
    console.log('📅 Final grouped items:', groupedItems.length, 'items');
    return groupedItems;
  };

  // Get grouped messages for rendering
  const groupedMessages = groupMessagesWithSeparators(currentChatMessages);


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
          let uploadResult;
          
          if (messageType === 'image') {
            // Use image upload service for images
            const { imageUploadService } = await import('@/services/imageUploadService');
            uploadResult = await imageUploadService.uploadChatImage(file.uri, chat.id);
          } else {
            // For other file types, use the general file service
            const { fileService } = await import('@/services/fileService');
            const result = await fileService.uploadFile(file.uri, file.name, file.type);
            uploadResult = {
              success: result.status === 'SUCCESS',
              url: result.file?.mediaUrl,
              s3Key: result.file?.s3Key,
              fileId: result.file?.id,
              error: result.error,
            };
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
      scrollToBottom();

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
          { backgroundColor: colors.background },
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

  // Platform-specific container component
  const Container = Platform.OS === 'ios' ? KeyboardAvoidingView : View;

  return (
    <CustomSafeAreaView
      style={styles.container}
      topColor={colors.background}
      bottomColor={colors.background}
    >
      <Container
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : undefined}
        enabled={Platform.OS === 'ios'}
      >
        <View style={styles.screen}>
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
          

          <View style={styles.messageListContainer}>
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
              keyExtractor={(item, _index) => 
                item.type === 'separator' 
                  ? `separator-${(item.data as { date: string; formattedDate: string }).date}`
                  : (item.data as MessageData).id
              }
              renderItem={renderMessage}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
              onContentSizeChange={scrollToBottom}
              onLayout={scrollToBottom}
              onEndReached={loadOlderMessages}
              onEndReachedThreshold={0.1}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }}
            />
          </View>

          {renderTypingIndicator()}

          <View
            style={[
              styles.inputContainer,
              Platform.OS === 'android' && { marginBottom: keyboardHeight },
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
            />
          </View>
        </View>
      </Container>


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
    justifyContent: 'flex-end',
    paddingVertical: hp(1),
    paddingHorizontal: wp(1),
    paddingBottom: hp(2),
  },
  inputContainer: {
    // Additional styling as needed (padding, border, etc.)
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
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
