import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SocketMessage {
  chatId: string;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file';
  mediaUrl?: string;
  mediaMetadata?: {
    filename: string;
    size: number;
    mimeType: string;
  };
  replyToMessageId?: string;
}

export interface SocketChat {
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  participants: string[];
}

export interface MessageData {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file';
  media_url?: string;
  media_metadata?: {
    filename: string;
    size: number;
    mimeType: string;
  };
  reply_to_message_id?: string;
  created_at: string;
  edited_at?: string;
  sender: {
    user_id: string;
    fullName: string;
    profilePicture?: string;
  };
}

export interface ChatData {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants: Array<{
    user_id: string;
    role: 'admin' | 'member';
    joined_at: string;
    userDetails: {
      user_id: string;
      fullName: string;
      profilePicture?: string;
      // Local contact data
      localName?: string;
      localProfilePicture?: string;
      phoneNumber?: string;
    };
  }>;
  last_message?: MessageData;
  unread_count?: number;
  is_archived?: boolean;
  archived_at?: string;
}

export interface UserStatusData {
  user_id: string;
  fullName: string;
  profilePicture?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface DeliveryData {
  messageId: string;
  chatId: string;
  deliveredTo: string[];
  deliveredAt: string;
}

export interface TypingData {
  chatId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface ReadReceiptData {
  messageId: string;
  userId: string;
  userName: string;
  chatId: string;
  readAt: string;
}

export interface MessageStatusData {
  messageId: string;
  chatId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: string;
  userId?: string;
}

export interface DebugData {
  roomId: string;
  participants: string[];
  messageCount: number;
  lastActivity: string;
}

export interface SystemStatus {
  connectedUsers: number;
  activeRooms: number;
  messagesPerMinute: number;
  uptime: string;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Event listeners
  private messageListeners: ((message: MessageData) => void)[] = [];
  private messageSentListeners: ((message: MessageData) => void)[] = [];
  private messageDeliveredListeners: ((data: DeliveryData) => void)[] = [];
  private chatCreatedListeners: ((chat: ChatData) => void)[] = [];
  private joinedChatListeners: ((data: { chatId: string; participants: string[] }) => void)[] = [];
  private userOnlineListeners: ((userData: UserStatusData) => void)[] = [];
  private userOfflineListeners: ((userData: UserStatusData) => void)[] = [];
  private roomDebugListeners: ((debugData: DebugData) => void)[] = [];
  private messageDebugListeners: ((debugData: any) => void)[] = [];
  private systemStatusListeners: ((status: SystemStatus) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  
  // New event listeners for typing, read receipts, and message status
  private typingListeners: ((data: TypingData) => void)[] = [];
  private readReceiptListeners: ((data: ReadReceiptData) => void)[] = [];
  private messageStatusListeners: ((data: MessageStatusData) => void)[] = [];

  async connect(): Promise<void> {
    try {
      // Get token from auth state
      const authStateData = await AsyncStorage.getItem('@maharishi_connect_auth_state');
      if (!authStateData) {
        throw new Error('No auth state found');
      }
      
      const authState = JSON.parse(authStateData);
      const user = authState.user;
      if (!user) {
        throw new Error('No user data found in auth state');
      }
      
      const token = user.token;
      if (!token) {
        throw new Error('No authentication token found in user data');
      }

      const baseURL = 'https://api.maharishiconnect.com';
      console.log('🔌 Attempting to connect to socket:', baseURL);
      console.log('🔌 Using token:', token.substring(0, 10) + '...');
      
      this.socket = io(baseURL, {
        auth: { token },
        transports: ['websocket'],
        timeout: 20000,
        forceNew: true, // Force a new connection
      });

      console.log('🔌 Socket instance created:', !!this.socket);
      console.log('🔌 Socket options:', {
        baseURL,
        transports: ['websocket'],
        timeout: 20000,
        forceNew: true
      });
      
      this.setupEventListeners();
      this.setupConnectionHandlers();
      
      // Add a timeout to check connection status
      setTimeout(() => {
        console.log('🔌 Socket connection status after 5s:', {
          connected: this.socket?.connected,
          id: this.socket?.id,
          isConnected: this.isConnected
        });
      }, 5000);

    } catch (error) {
      console.error('Socket connection error:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Socket connected successfully:', this.socket?.id);
      console.log('🔌 Socket transport:', this.socket?.io.engine.transport.name);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.connectionListeners.forEach(listener => listener(true));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.connectionListeners.forEach(listener => listener(false));
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type
      });
      this.isConnected = false;
      this.connectionListeners.forEach(listener => listener(false));
      this.handleReconnect();
    });

    // Message events
    this.socket.on('newMessage', (message: MessageData) => {
      console.log('📨 New message received:', message);
      console.log('📨 Message listeners count:', this.messageListeners.length);
      this.messageListeners.forEach((listener, index) => {
        console.log(`📨 Calling listener ${index}:`, listener);
        listener(message);
      });
    });

    this.socket.on('messageSent', (message: MessageData) => {
      console.log('✅ Message sent confirmation:', message);
      this.messageSentListeners.forEach(listener => listener(message));
    });

    this.socket.on('send_message_response', (response: any) => {
      console.log('📤 Send message response:', response);
    });

    this.socket.on('messageDelivered', (data: DeliveryData) => {
      console.log('Message delivered:', data);
      this.messageDeliveredListeners.forEach(listener => listener(data));
    });

    // Chat events
    this.socket.on('chatCreated', (chat: ChatData) => {
      console.log('Chat created:', chat);
      this.chatCreatedListeners.forEach(listener => listener(chat));
    });

    this.socket.on('joinedChat', (data: { chatId: string; participants: string[] }) => {
      console.log('Joined chat:', data);
      this.joinedChatListeners.forEach(listener => listener(data));
    });

    // User status events
    this.socket.on('userOnline', (userData: UserStatusData) => {
      console.log('User came online:', userData);
      this.userOnlineListeners.forEach(listener => listener(userData));
    });

    this.socket.on('userOffline', (userData: UserStatusData) => {
      console.log('User went offline:', userData);
      this.userOfflineListeners.forEach(listener => listener(userData));
    });

    // Debug events
    this.socket.on('room_debug', (debugData: DebugData) => {
      console.log('Room debug info:', debugData);
      this.roomDebugListeners.forEach(listener => listener(debugData));
    });

    this.socket.on('message_debug', (debugData: any) => {
      console.log('Message debug info:', debugData);
      this.messageDebugListeners.forEach(listener => listener(debugData));
    });

    this.socket.on('system_status', (status: SystemStatus) => {
      console.log('System status:', status);
      this.systemStatusListeners.forEach(listener => listener(status));
    });

    // Typing indicators
    this.socket.on('user_typing', (data: TypingData) => {
      console.log('User typing:', data);
      this.typingListeners.forEach(listener => listener(data));
    });

    // Read receipts
    this.socket.on('messageRead', (data: ReadReceiptData) => {
      console.log('Message read:', data);
      this.readReceiptListeners.forEach(listener => listener(data));
    });

    this.socket.on('chatMarkedAsRead', (data: ReadReceiptData) => {
      console.log('Chat marked as read:', data);
      this.readReceiptListeners.forEach(listener => listener(data));
    });

    // Message status updates
    this.socket.on('messageStatusUpdate', (data: MessageStatusData) => {
      console.log('Message status update:', data);
      this.messageStatusListeners.forEach(listener => listener(data));
    });
  }

  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.connectionListeners.forEach(listener => listener(true));
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Reconnection attempt:', attemptNumber);
      this.reconnectAttempts = attemptNumber;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Reconnection failed after maximum attempts');
      this.isConnected = false;
      this.connectionListeners.forEach(listener => listener(false));
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        this.socket?.connect();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  // Message operations
  sendMessage(messageData: SocketMessage): void {
    console.log('🔌 Attempting to send message:', {
      socketExists: !!this.socket,
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      messageData
    });
    
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }
    console.log('🔌 Emitting send_message:', messageData);
    this.socket.emit('send_message', messageData);
  }

  // Chat operations
  createChat(chatData: SocketChat): void {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('create_chat', chatData);
  }

  joinChat(chatId: string): void {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('join_chat', chatId);
  }

  // Typing indicators
  startTyping(chatId: string): void {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('typing_start', { chatId });
  }

  stopTyping(chatId: string): void {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('typing_stop', { chatId });
  }

  // Read receipts
  markMessageAsRead(messageId: string): void {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('mark_as_read', { messageId });
  }

  markChatAsRead(chatId: string): void {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('mark_chat_as_read', { chatId });
  }

  // Delivery status
  markMessageAsDelivered(messageId: string): void {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('mark_as_delivered', { messageId });
  }

  // Debug operations
  debugRoomStatus(chatId: string): void {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('debug_room_status', chatId);
  }

  debugMessageDelivery(messageId: string, chatId: string): void {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('debug_message_delivery', { messageId, chatId });
  }

  getSystemStatus(): void {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('get_system_status');
  }

  // Event listener management
  addMessageListener(listener: (message: MessageData) => void): () => void {
    console.log('📨 Adding message listener, total listeners:', this.messageListeners.length + 1);
    this.messageListeners.push(listener);
    
    // Return a cleanup function
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
      console.log('📨 Removed message listener, remaining:', this.messageListeners.length);
    };
  }

  removeMessageListener(listener: (message: MessageData) => void): void {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }

  addMessageSentListener(listener: (message: MessageData) => void): void {
    this.messageSentListeners.push(listener);
  }

  removeMessageSentListener(listener: (message: MessageData) => void): void {
    this.messageSentListeners = this.messageSentListeners.filter(l => l !== listener);
  }

  addMessageDeliveredListener(listener: (data: DeliveryData) => void): void {
    this.messageDeliveredListeners.push(listener);
  }

  removeMessageDeliveredListener(listener: (data: DeliveryData) => void): void {
    this.messageDeliveredListeners = this.messageDeliveredListeners.filter(l => l !== listener);
  }

  addChatCreatedListener(listener: (chat: ChatData) => void): void {
    this.chatCreatedListeners.push(listener);
  }

  removeChatCreatedListener(listener: (chat: ChatData) => void): void {
    this.chatCreatedListeners = this.chatCreatedListeners.filter(l => l !== listener);
  }

  addJoinedChatListener(listener: (data: { chatId: string; participants: string[] }) => void): void {
    this.joinedChatListeners.push(listener);
  }

  removeJoinedChatListener(listener: (data: { chatId: string; participants: string[] }) => void): void {
    this.joinedChatListeners = this.joinedChatListeners.filter(l => l !== listener);
  }

  addUserOnlineListener(listener: (userData: UserStatusData) => void): void {
    this.userOnlineListeners.push(listener);
  }

  removeUserOnlineListener(listener: (userData: UserStatusData) => void): void {
    this.userOnlineListeners = this.userOnlineListeners.filter(l => l !== listener);
  }

  addUserOfflineListener(listener: (userData: UserStatusData) => void): void {
    this.userOfflineListeners.push(listener);
  }

  removeUserOfflineListener(listener: (userData: UserStatusData) => void): void {
    this.userOfflineListeners = this.userOfflineListeners.filter(l => l !== listener);
  }

  addConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.push(listener);
  }

  removeConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
  }

  // New listener management methods
  addTypingListener(listener: (data: TypingData) => void): void {
    this.typingListeners.push(listener);
  }

  removeTypingListener(listener: (data: TypingData) => void): void {
    this.typingListeners = this.typingListeners.filter(l => l !== listener);
  }

  addReadReceiptListener(listener: (data: ReadReceiptData) => void): void {
    this.readReceiptListeners.push(listener);
  }

  removeReadReceiptListener(listener: (data: ReadReceiptData) => void): void {
    this.readReceiptListeners = this.readReceiptListeners.filter(l => l !== listener);
  }

  addMessageStatusListener(listener: (data: MessageStatusData) => void): void {
    this.messageStatusListeners.push(listener);
  }

  removeMessageStatusListener(listener: (data: MessageStatusData) => void): void {
    this.messageStatusListeners = this.messageStatusListeners.filter(l => l !== listener);
  }

  // Utility methods
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Clean up all listeners
  removeAllListeners(): void {
    this.messageListeners = [];
    this.messageSentListeners = [];
    this.messageDeliveredListeners = [];
    this.chatCreatedListeners = [];
    this.joinedChatListeners = [];
    this.userOnlineListeners = [];
    this.userOfflineListeners = [];
    this.roomDebugListeners = [];
    this.messageDebugListeners = [];
    this.systemStatusListeners = [];
    this.connectionListeners = [];
    this.typingListeners = [];
    this.readReceiptListeners = [];
    this.messageStatusListeners = [];
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
