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
import MediaPicker from '@/components/MediaPicker';

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
  const { currentChatMessages, currentChatId, typingUsers } = useSelector(
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

          scrollToBottom();
        }
      },
    );

    // Typing indicator listeners
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
    const removeMessageDeliveredListener =
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
    const _removeUserOnlineListener = socketService.addUserOnlineListener(
      userData => {
        console.log('🟢 [ConversationScreen] User came online:', userData);
        setOnlineUsers(prev => new Set([...prev, userData.user_id]));
      },
    );

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
          limit: 50,
        }),
      ).unwrap();
      console.log('📱 Messages loaded:', result);

      dispatch(setCurrentChatMessages(chat.id));
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [chat, dispatch]);

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

  const [isMediaPickerVisible, setIsMediaPickerVisible] = useState(false);
  const [isMediaViewerVisible, setIsMediaViewerVisible] = useState(false);
  const [mediaViewerFiles, setMediaViewerFiles] = useState<MediaFile[]>([]);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  const handleSendImage = () => {
    setIsMediaPickerVisible(true);
  };

  const handleSendVideo = () => {
    setIsMediaPickerVisible(true);
  };

  const handleSendAudio = () => {
    setIsMediaPickerVisible(true);
  };

  const handleSendFile = () => {
    setIsMediaPickerVisible(true);
  };

  const handleMediaSelected = async (type: string, files: MediaFile[]) => {
    if (!chat || files.length === 0) return;

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
          media_url: file.uri, // Store the file URI
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

        // Here you would typically upload the file to your server
        // and then update the message with the server response
        // For now, we'll just simulate success
        setTimeout(() => {
          dispatch(updateMessageStatus({
            messageId: messageId,
            chatId: chat.id,
            status: 'sent',
          }));
        }, 1000);
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

  const handleMediaUploadError = (error: string) => {
    console.error('Media upload error:', error);
    Alert.alert('Upload Error', error);
  };

  const handleMediaPress = (message: MessageData) => {
    if (!message.media_url) return;

    // Convert message to MediaFile format
    const mediaFile: MediaFile = {
      uri: message.media_url,
      name: message.content || 'Media File',
      type: message.media_metadata?.mimeType || 'application/octet-stream',
      size: message.media_metadata?.size || 0,
      duration: message.media_metadata?.duration,
      width: message.media_metadata?.width,
      height: message.media_metadata?.height,
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

  const renderMessage = ({
    item,
    index,
  }: {
    item: MessageData;
    index: number;
  }) => {
    const currentUserId = user?.id || user?.firebaseUid;
    const isOwn =
      item.sender_id === currentUserId ||
      item.sender_id === user?.id ||
      item.sender_id === user?.firebaseUid;
    const previousMessage = index > 0 ? currentChatMessages[index - 1] : null;

    // Only show avatar for group chats, not for direct contacts
    const showAvatar =
      chat?.type === 'group' &&
      !isOwn &&
      (!previousMessage || previousMessage.sender_id !== item.sender_id);

    console.log('📱 Rendering message:', {
      messageId: item.id,
      senderId: item.sender_id,
      currentUserId,
      user_id: user?.id,
      user_firebaseUid: user?.firebaseUid,
      isOwn,
      chatType: chat?.type,
      showAvatar,
      content: item.content,
    });

    // Render file message if it's a file type
    if (item.message_type === 'file') {
      return (
        <FileMessageBubble
          message={item}
          isOwn={isOwn}
          onPress={() => handleMessagePress(item)}
          onLongPress={() => handleMessageLongPress(item)}
        />
      );
    }

    return (
      <MessageBubble
        message={item}
        isOwn={isOwn}
        showAvatar={showAvatar}
        showTime={true}
        isGroupChat={chat?.type === 'group'}
        onPress={() => handleMessagePress(item)}
        onLongPress={() => handleMessageLongPress(item)}
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
      topColor={colors.primary}
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
            <FlatList
              ref={flatListRef}
              data={currentChatMessages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
              onContentSizeChange={scrollToBottom}
              onLayout={scrollToBottom}
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
              onSendImage={handleSendImage}
              onSendVideo={handleSendVideo}
              onSendAudio={handleSendAudio}
              onSendFile={handleSendFile}
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

      {/* Media Picker Modal */}
        <MediaPicker
          visible={isMediaPickerVisible}
          onClose={() => setIsMediaPickerVisible(false)}
          onMediaSelected={handleMediaSelected}
          onUploadError={handleMediaUploadError}
          maxFileSize={50 * 1024 * 1024} // 50MB
        />

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
});

export default ConversationScreen;
