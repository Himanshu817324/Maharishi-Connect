import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import {
  addMessage,
  updateMessageStatus,
  setTyping,
  setOnlineStatus,
  addChat,
  mergeChats,
  removeChat,
} from '../store/slices/chatSlice';
import chatApiService from './chatApiService';
import sqliteService from './sqliteService';

// Utility function to normalize chat data
const normalizeChat = (c: any, currentUserId?: string) => {
  const id = c?.id || c?._id;
  const type = (c?.type || c?.chat_type) === 'direct' ? 'direct' : (c?.type || 'group');
  const participants = c?.participants || c?.members || [];

  let name = c?.name;
  if (!name && type === 'direct' && Array.isArray(participants)) {
    const other = participants.find((p: any) => {
      const participantId = p?.user_id || p?.uid || p?.id || p;
      return participantId !== currentUserId;
    });
    if (other) {
      // Prioritize participant data over phone number formatting
      name = other?.userDetails?.fullName ||
        other?.fullName ||
        other?.name ||
        other?.user_name ||
        other?.displayName ||
        'Unknown User';

      // Only format phone number if no name is available
      if (name === 'Unknown User') {
        const phoneNumber = other?.user_mobile || other?.phone;
        if (phoneNumber) {
          const normalizedNumber = phoneNumber.replace(/\D/g, '');
          if (normalizedNumber.length === 10) {
            name = `+91${normalizedNumber}`;
          } else if (normalizedNumber.length > 10) {
            name = `+91${normalizedNumber.slice(-10)}`;
          } else {
            name = phoneNumber;
          }
        }
      }
    } else {
      name = 'Unknown';
    }
  }

  // If still no name, use a more descriptive fallback
  if (!name || name === 'Unknown Chat') {
    if (type === 'direct') {
      name = 'Direct Message';
    } else {
      name = 'Group Chat';
    }
  }

  return {
    id,
    type,
    name: name || 'Unknown Chat',
    participants,
    avatar: c?.avatar || c?.icon || undefined,
    lastMessage: c?.last_message_content || c?.lastMessage || '',
    lastMessageTime: c?.last_message_created_at || c?.updated_at || c?.created_at || c?.lastMessageTime || null,
    unreadCount: c?.unread_count ?? c?.unreadCount ?? 0,
  } as any;
};


class SocketService {
  public socket: Socket | null = null;
  private isConnected = false;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private isTyping = false;
  private processedMessages = new Set<string>(); // Track processed messages to prevent duplicates
  private connectionPromise: Promise<void> | null = null;
  private eventListeners = new Map<string, Set<Function>>();
  private currentUserId: string | null = null;
  private isInitialized = false;

  connect(userId: string, token?: string): Promise<void> {
    // Prevent multiple simultaneous connection attempts
    if (this.connectionPromise) {
      console.log('🔌 Connection already in progress, waiting...');
      return this.connectionPromise;
    }

    // If already connected with same user, don't reconnect
    if (this.socket?.connected && this.isConnected && this.currentUserId === userId) {
      console.log('🔌 Socket already connected for same user, skipping reconnection');
      return Promise.resolve();
    }

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      console.log('🔌 Connecting to socket server...');
      this.connectionStatus = 'connecting';
      this.currentUserId = userId;

      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      this.socket = io('https://api.maharishiconnect.com', {
        auth: { userId, token },
        transports: ['websocket', 'polling'],
        timeout: 30000, // Increased timeout for release builds
        forceNew: true,
        upgrade: true,
        rememberUpgrade: false,
        // Enhanced configuration for release builds
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
        // Add headers for better compatibility
        extraHeaders: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const onConnect = () => {
        console.log('✅ Socket connected successfully');
        this.isConnected = true;
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        this.connectionPromise = null;
        this.isInitialized = true;
        this.socket?.off('connect_error', onConnectError);
        resolve();
      };

      const onConnectError = (err: any) => {
        console.error('❌ Socket connect error:', err);
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        this.connectionPromise = null;
        this.socket?.off('connect', onConnect);
        reject(err);
      };

      this.socket.once('connect', onConnect);
      this.socket.once('connect_error', onConnectError);

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        if (reason === 'io server disconnect') this.handleReconnection();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        if (error.message.includes('Authentication error') || error.message.includes('jwt')) {
          if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
          }
        } else this.handleReconnection();
      });

      const handleIncoming = async (message: any) => {
        console.log('📨 [SocketService] Incoming message:', message);

        // Enhanced message deduplication with content hashing
        const messageId = message._id || message.id;
        if (!messageId) {
          console.warn('📨 [SocketService] Message missing ID, skipping:', message);
          return;
        }

        // Create a unique key combining message ID and content hash for better deduplication
        const contentHash = this.hashMessageContent(message);
        const messageKey = `${messageId}_${contentHash}`;

        // Check if message was already processed
        if (this.processedMessages.has(messageKey)) {
          console.log('📨 [SocketService] Message already processed, skipping:', messageId);
          return;
        }

        // Mark message as being processed
        this.processedMessages.add(messageKey);

        // Clean up old processed messages (keep only last 2000)
        if (this.processedMessages.size > 2000) {
          const messagesArray = Array.from(this.processedMessages);
          this.processedMessages.clear();
          messagesArray.slice(-1000).forEach(key => this.processedMessages.add(key));
        }

        // Enhanced user name resolution
        const senderId = message.sender_id || message.senderId || message.user?._id;
        let senderName = message.sender_name || message.senderName || message.user?.name;

        // If no sender name provided, try to resolve it
        if (!senderName || senderName === 'Unknown') {
          const state = store.getState();
          const currentUserId = state.auth.user?.id;

          if (senderId === currentUserId) {
            senderName = 'You';
          } else {
            // Try to resolve from chat participants
            const chatId = message.chat_id || message.chatId;
            const chat = state.chat.chats.find((c: any) => c.id === chatId);

            if (chat?.participants) {
              const participant = chat.participants.find((p: any) =>
                (p?.user_id || p?.uid || p?.id || p) === senderId
              );
              if (participant) {
                senderName = participant?.user_name || participant?.fullName ||
                  participant?.name || participant?.userDetails?.fullName ||
                  `+91${participant?.user_mobile || participant?.phone || ''}`.replace(/^\+91$/, 'Unknown User');
              }
            }

            // Fallback to phone number format if still unknown
            if (!senderName || senderName === 'Unknown') {
              senderName = message.sender_phone ? `+91${message.sender_phone}` : 'Unknown User';
            }
          }
        }

        const formattedMessage = {
          _id: message._id || message.id,
          text: message.content || message.text,
          createdAt: message.created_at || message.createdAt || new Date().toISOString(),
          user: {
            _id: senderId,
            name: senderName,
            avatar: message.sender_avatar || message.senderAvatar || message.user?.avatar,
          },
          chatId: message.chat_id || message.chatId,
          senderId: senderId,
          status: message.status || 'sent',
        };

        const state = store.getState();
        const chatId = formattedMessage.chatId;
        let chatExists = state.chat.chats.some((chat: any) => chat.id === chatId);

        if (!chatExists) {
          console.log(`📨 [SocketService] New chat detected (${chatId}), fetching and saving...`);
          try {
            if (state.auth.user?.token) {
              chatApiService.setAuthToken(state.auth.user.token);
            }
            const newChatData = await chatApiService.getChat(chatId);
            if (newChatData) {
              const currentUserId = state.auth.user?.id;
              const normalizedNewChat = normalizeChat(newChatData, currentUserId);

              await sqliteService.saveChat(normalizedNewChat);
              console.log(`💾 [SocketService] New chat ${chatId} saved to SQLite.`);

              store.dispatch(addChat(normalizedNewChat));
              console.log(`✅ [SocketService] Added new chat "${normalizedNewChat.name}" to the store.`);
            }
          } catch (error) {
            console.error(`❌ [SocketService] Failed to process new chat ${chatId}:`, error);
          }
        }

        // Save message to SQLite first, then dispatch to Redux
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
            senderName: formattedMessage.user.name
          });
          console.log('💾 [SocketService] Message saved to SQLite:', formattedMessage._id);
        } catch (saveError) {
          console.error('❌ [SocketService] Failed to save message to SQLite:', saveError);
          // Continue with Redux dispatch even if SQLite save fails
        }

        // Dispatch to Redux for immediate UI update
        store.dispatch(addMessage(formattedMessage as any));

        // Update chat last message
        try {
          const chatId = formattedMessage.chatId;
          const state = store.getState();
          const chat = state.chat.chats.find((c: any) => c.id === chatId);

          if (chat) {
            store.dispatch({
              type: 'chat/updateChatLastMessage',
              payload: {
                chatId,
                lastMessage: formattedMessage.text,
                lastMessageTime: formattedMessage.createdAt,
                unreadCount: chat.unreadCount + 1
              }
            });
          }
        } catch (chatUpdateError) {
          console.error('❌ [SocketService] Failed to update chat:', chatUpdateError);
        }
      };

      // Clean up existing listeners to prevent duplicates
      this.socket?.off('newMessage');
      this.socket?.off('message');
      this.socket?.off('new_message');

      // Use only one primary event listener to prevent conflicts
      this.socket?.on('newMessage', handleIncoming);

      // Keep fallback listeners but with different handlers to avoid conflicts
      this.socket?.on('message', (message: any) => {
        console.log('📨 [SocketService] Fallback message event:', message);
        // Process all message events as fallback
        if (message) {
          handleIncoming(message);
        }
      });

      this.socket?.on('new_message', (message: any) => {
        console.log('📨 [SocketService] Fallback new_message event:', message);
        // Process all new_message events as fallback
        if (message) {
          handleIncoming(message);
        }
      });

      this.socket.on('messageDelivered', (data) => {
        console.log('📨 [SocketService] Message delivered:', data);
        store.dispatch(updateMessageStatus({ messageId: data.messageId, status: 'delivered' }));
      });
      this.socket.on('messageRead', (data) => {
        console.log('📨 [SocketService] Message read:', data);
        store.dispatch(updateMessageStatus({ messageId: data.messageId, status: 'read' }));
      });

      // Handle message edits
      this.socket.on('messageEdited', (data: any) => {
        console.log('📨 [SocketService] Message edited:', data);
        try {
          store.dispatch({
            type: 'chat/updateMessage',
            payload: {
              messageId: data.messageId,
              updates: {
                text: data.content,
                editedAt: data.editedAt,
                isEdited: true
              }
            }
          });
        } catch (error) {
          console.error('❌ [SocketService] Failed to process message edit:', error);
        }
      });

      // Handle message deletions
      this.socket.on('messageDeleted', (data: any) => {
        console.log('📨 [SocketService] Message deleted:', data);
        try {
          store.dispatch({
            type: 'chat/removeMessage',
            payload: data.messageId
          });
        } catch (error) {
          console.error('❌ [SocketService] Failed to process message deletion:', error);
        }
      });

      // Handle new chat creation events
      this.socket.on('newChat', (chatData: any) => {
        console.log('📨 [SocketService] New chat created:', chatData);
        try {
          const normalizedChat = normalizeChat(chatData);
          store.dispatch(mergeChats([normalizedChat]));
          console.log('📨 [SocketService] New chat added to Redux:', normalizedChat.id);
        } catch (error) {
          console.error('❌ [SocketService] Failed to process new chat:', error);
        }
      });

      // Handle chat updates
      this.socket.on('chatUpdated', (chatData: any) => {
        console.log('📨 [SocketService] Chat updated:', chatData);
        try {
          const normalizedChat = normalizeChat(chatData);
          store.dispatch(mergeChats([normalizedChat]));
          console.log('📨 [SocketService] Chat update processed:', normalizedChat.id);
        } catch (error) {
          console.error('❌ [SocketService] Failed to process chat update:', error);
        }
      });

      // Handle chat deletion
      this.socket.on('chatDeleted', (data: any) => {
        console.log('📨 [SocketService] Chat deleted:', data);
        try {
          const { chatId } = data;
          store.dispatch(removeChat(chatId));
          console.log('📨 [SocketService] Chat deletion processed:', chatId);
        } catch (error) {
          console.error('❌ [SocketService] Failed to process chat deletion:', error);
        }
      });
      this.socket.on('messageEdited', (data) => {
        store.dispatch({ type: 'chat/updateMessage', payload: data });
      });
      this.socket.on('messageDeleted', (data) => {
        store.dispatch({ type: 'chat/removeMessage', payload: data.messageId });
      });
      this.socket.on('messageReactionAdded', (data) => {
        store.dispatch({ type: 'chat/addReaction', payload: data });
      });
      this.socket.on('messageReactionRemoved', (data) => {
        store.dispatch({ type: 'chat/removeReaction', payload: data });
      });
      this.socket.on('typingUpdate', (data) => {
        store.dispatch(setTyping(data));
      });
      this.socket.on('userOnline', (data) => {
        store.dispatch(setOnlineStatus(data));
      });
      this.socket.on('error', (err) => {
        console.error('Socket error:', err);
      });
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.socket) {
      // Clean up all event listeners
      this.eventListeners.forEach((listeners, event) => {
        listeners.forEach((listener) => {
          this.socket?.off(event, listener as (...args: any[]) => void);
        });
      });
      this.eventListeners.clear();

      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionStatus = 'disconnected';
      this.connectionPromise = null;
      this.isInitialized = false;
      this.currentUserId = null;
    }
  }

  // Clean up socket state for chat deletion
  cleanupChatState(chatId: string) {
    console.log(`🧹 [SocketService] Cleaning up state for chat: ${chatId}`);

    // Clear typing timeouts for this chat
    const timeout = this.typingTimeouts.get(chatId);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(chatId);
    }

    // Clear processed messages cache to prevent conflicts
    this.processedMessages.clear();

    console.log(`✅ [SocketService] State cleaned up for chat: ${chatId}`);
  }

  // Force reconnection for clean state
  forceReconnect() {
    console.log('🔄 [SocketService] Force reconnecting for clean state...');
    this.disconnect();
    this.reconnectAttempts = 0;
    // Will reconnect on next connect() call
  }

  sendMessage(message: any) {
    if (this.socket?.connected) {
      console.log('📤 Sending message via socket:', message.tempId || message._id);
      try {
        this.socket.emit('message', message);
        return true;
      } catch (error) {
        console.error('❌ Error sending message via socket:', error);
        return false;
      }
    }
    console.error('❌ Cannot send message: Socket not connected');
    return false;
  }

  editMessage(messageId: string, content: string) {
    if (this.socket?.connected) this.socket.emit('editMessage', { messageId, content });
  }

  deleteMessage(messageId: string) {
    if (this.socket?.connected) this.socket.emit('deleteMessage', { messageId });
  }

  addReaction(messageId: string, emoji: string) {
    if (this.socket?.connected) this.socket.emit('addReaction', { messageId, emoji });
  }

  removeReaction(messageId: string, emoji: string) {
    if (this.socket?.connected) this.socket.emit('removeReaction', { messageId, emoji });
  }

  markMessageAsRead(messageId: string) {
    if (this.socket?.connected) this.socket.emit('markMessageAsRead', { messageId });
  }

  joinChat(chatId: string) {
    if (this.socket?.connected) this.socket.emit('joinChat', { chatId });
  }

  leaveChat(chatId: string) {
    if (this.socket?.connected) this.socket.emit('leaveChat', { chatId });
  }

  createChat(chatData: any) {
    if (this.socket?.connected) this.socket.emit('createChat', chatData);
  }

  joinRoom(roomId: string) {
    this.joinChat(roomId);
  }

  leaveRoom(roomId: string) {
    this.leaveChat(roomId);
  }

  sendTyping(chatId: string, isTyping: boolean) {
    if (this.socket?.connected) this.socket.emit('typing', { chatId, isTyping });
  }

  markAsRead(messageId: string, chatId: string) {
    this.markMessageAsRead(messageId);
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.connectionStatus = 'reconnecting';
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.socket?.connect(), this.reconnectDelay * this.reconnectAttempts);
    } else {
      this.connectionStatus = 'disconnected';
      console.error('❌ Max reconnection attempts reached');
    }
  }

  getConnectionStatus() {
    return this.isConnected && this.socket?.connected;
  }

  getConnectionDetails() {
    return {
      isConnected: this.isConnected,
      connectionStatus: this.connectionStatus,
      socketConnected: this.socket?.connected,
    };
  }

  getConnectionStatusString() {
    return this.connectionStatus;
  }

  on(event: string, handler: (...args: any[]) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);

    this.socket?.on(event, handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler?: (...args: any[]) => void) {
    if (handler) {
      this.eventListeners.get(event)?.delete(handler);
      this.socket?.off(event, handler);
    } else {
      // Remove all listeners for this event
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.forEach(listener => {
          this.socket?.off(event, listener as (...args: any[]) => void);
        });
        this.eventListeners.delete(event);
      }
    }
  }

  addMessageListener(handler: (message: any) => void) {
    if (this.socket) this.socket.on('message', handler as (...args: any[]) => void);
  }

  removeMessageListener(handler: (message: any) => void) {
    if (this.socket) this.socket.off('message', handler as (...args: any[]) => void);
  }

  sendMessageToChat(chatId: string, message: any) {
    if (this.socket?.connected) this.socket.emit('sendMessage', { chatId, message });
  }

  markAllMessagesAsRead(chatId: string) {
    if (this.socket?.connected) this.socket.emit('markAllMessagesAsRead', { chatId });
  }

  startTyping(chatId: string) {
    if (this.socket?.connected && !this.isTyping) {
      this.isTyping = true;
      this.socket.emit('typing_start', { chatId });
      console.log('⌨️ Started typing in chat:', chatId);
    }
  }

  stopTyping(chatId: string) {
    if (this.socket?.connected && this.isTyping) {
      this.isTyping = false;
      this.socket.emit('typing_stop', { chatId });
      console.log('⌨️ Stopped typing in chat:', chatId);
    }
  }

  handleTyping(chatId: string) {
    if (!this.socket?.connected) return;
    if (this.typingTimeouts.has(chatId)) clearTimeout(this.typingTimeouts.get(chatId)!);
    if (!this.isTyping) this.startTyping(chatId);
    const timeout = setTimeout(() => {
      this.stopTyping(chatId);
      this.typingTimeouts.delete(chatId);
    }, 3000);
    this.typingTimeouts.set(chatId, timeout);
  }

  addMessageReaction(messageId: string, emoji: string) {
    if (this.socket?.connected) this.socket.emit('addMessageReaction', { messageId, emoji });
  }

  removeMessageReaction(messageId: string, emoji: string) {
    if (this.socket?.connected) this.socket.emit('removeMessageReaction', { messageId, emoji });
  }

  editMessageContent(messageId: string, content: string) {
    if (this.socket?.connected) this.socket.emit('editMessageContent', { messageId, content });
  }

  deleteMessageContent(messageId: string) {
    if (this.socket?.connected) this.socket.emit('deleteMessageContent', { messageId });
  }

  getOnlineUsers(chatId: string) {
    if (this.socket?.connected) this.socket.emit('getOnlineUsers', { chatId });
  }

  onOnlineUsersUpdate(handler: (users: any[]) => void) {
    if (this.socket) this.socket.on('onlineUsersUpdate', handler);
  }

  onTypingUpdate(handler: (data: { userId: string; chatId: string; isTyping: boolean }) => void) {
    if (this.socket) this.socket.on('typingUpdate', handler);
  }

  onMessageReaction(handler: (data: { messageId: string; emoji: string; userId: string }) => void) {
    if (this.socket) this.socket.on('messageReactionAdded', handler as (...args: any[]) => void);
  }

  onMessageReactionRemoved(handler: (data: { messageId: string; emoji: string; userId: string }) => void) {
    if (this.socket) this.socket.on('messageReactionRemoved', handler as (...args: any[]) => void);
  }

  // Helper method to create content hash for message deduplication
  private hashMessageContent(message: any): string {
    const content = message.content || message.text || '';
    const timestamp = message.createdAt || message.created_at || '';
    const senderId = message.senderId || message.sender_id || '';

    // Create a simple hash of the content, timestamp, and sender
    const hashInput = `${content}_${timestamp}_${senderId}`;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

export default new SocketService();