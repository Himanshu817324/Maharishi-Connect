import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from './socketService';
import { chatService } from './chatService';
import { messageService } from './messageService';
import { contactService } from './contactService';

class ChatInitializationService {
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    console.log('🚀 [ChatInitializationService] Initialize called');
    if (this.isInitialized) {
      console.log('✅ Chat services already initialized');
      return;
    }

    if (this.initializationPromise) {
      console.log('⏳ Chat services initialization already in progress');
      return this.initializationPromise;
    }

    console.log('🔄 Starting chat services initialization...');
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('🚀 Initializing chat services...');

      // Check if user is authenticated
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

      console.log('🔑 Found auth token:', token.substring(0, 20) + '...');
      console.log('👤 User ID:', user.id);
      console.log('👤 User phone:', user.phone);
      console.log('👤 User fullName:', user.fullName);

      // Initialize Socket.IO connection
      console.log('🔌 Connecting to Socket.IO...');
      await socketService.initialize('https://api.maharishiconnect.com', token);

      // Initialize services
      console.log('📱 Initializing services...');
      await this.initializeServices();

      // Setup event listeners
      console.log('👂 Setting up event listeners...');
      this.setupEventListeners();

      // Load user chats after initialization
      console.log('📱 Loading user chats...');
      await this.loadUserChats();

      // Create a test chat if no chats exist
      await this.createTestChatIfNeeded();

      this.isInitialized = true;
      console.log('✅ Chat services initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize chat services:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    // Initialize services in parallel
    await Promise.all([
      this.initializeChatService(),
      this.initializeMessageService(),
      this.initializeContactService(),
    ]);
  }

  private async initializeChatService(): Promise<void> {
    try {
      // Pre-load user chats
      await chatService.getUserChats();
      console.log('✅ Chat service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize chat service:', error);
      // Don't throw - continue with other services
    }
  }

  private async initializeMessageService(): Promise<void> {
    try {
      // Process any pending messages in queue
      const queueStatus = messageService.getQueueStatus();
      if (queueStatus.pending > 0) {
        console.log(`📤 Processing ${queueStatus.pending} pending messages`);
        // The message service will automatically process the queue
      }
      console.log('✅ Message service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize message service:', error);
      // Don't throw - continue with other services
    }
  }

  private async initializeContactService(): Promise<void> {
    try {
      // Pre-load contacts
      await contactService.getContacts();
      console.log('✅ Contact service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize contact service:', error);
      // Don't throw - continue with other services
    }
  }

  private setupEventListeners(): void {
    // Socket connection listeners
    socketService.addConnectionListener((connected: boolean) => {
      console.log(`🔌 Socket connection status: ${connected ? 'Connected' : 'Disconnected'}`);

      if (connected) {
        // Rejoin any active chats when reconnected
        this.rejoinActiveChats();
      }
    });

    // Message listeners
    socketService.addMessageListener(async (message) => {
      console.log('📨 [ChatInitializationService] New message received:', {
        id: message.id,
        chat_id: message.chat_id,
        content: message.content,
        sender_id: message.sender_id
      });

      // Check if we're currently viewing this chat - if so, let ConversationScreen handle it
      const { store } = await import('@/store');
      const state = store.getState();
      const currentChatId = state.message.currentChatId;
      
      if (currentChatId === message.chat_id) {
        console.log('📨 [ChatInitializationService] Message is for current chat, letting ConversationScreen handle it');
        return;
      }

      // Handle chat creation for new messages
      await this.handleNewMessage(message);
    });

    socketService.addMessageSentListener((message) => {
      console.log('✅ Message sent confirmation:', message.id);
      // Messages will be handled by Redux store listeners
    });

    socketService.addMessageDeliveredListener((data) => {
      console.log('📬 Message delivered:', data.messageId);
      // Delivery confirmations will be handled by Redux store listeners
    });

    // Chat listeners
    socketService.addChatCreatedListener((chat) => {
      console.log('💬 New chat created:', chat.id);
      // Chats will be handled by Redux store listeners
    });

    socketService.addJoinedChatListener((data) => {
      console.log('👥 Joined chat:', data.chatId);
      // Chat join events will be handled by Redux store listeners
    });

    // User status listeners
    socketService.addUserOnlineListener((userData) => {
      console.log('🟢 User came online:', userData.user_id);
      // User status will be handled by Redux store listeners
    });

    socketService.addUserOfflineListener((userData) => {
      console.log('🔴 User went offline:', userData.user_id);
      // User status will be handled by Redux store listeners
    });
  }

  private async loadUserChats(): Promise<void> {
    try {
      console.log('📱 Loading user chats...');
      const response = await chatService.getUserChats();
      if (response.status === 'SUCCESS' && response.chats) {
        console.log(`📱 Loaded ${response.chats.length} chats from server`);

        // Import Redux actions dynamically to avoid circular dependencies
        const { addChat } = await import('@/store/slices/chatSlice');
        const { store } = await import('@/store');

        // Add all chats to Redux store
        response.chats.forEach(chat => {
          store.dispatch(addChat(chat));
        });

        console.log('✅ User chats loaded and added to Redux store');
      } else {
        console.log('📱 No chats found for user');
      }
    } catch (error) {
      console.error('❌ Failed to load user chats:', error);
    }
  }

  private async createTestChatIfNeeded(): Promise<void> {
    // No test chats will be created - users start with empty chat list
    console.log('📱 No test chats will be created - users start with empty chat list');
  }

  private async rejoinActiveChats(): Promise<void> {
    try {
      // Get current chats and rejoin them
      const response = await chatService.getUserChats();
      if (response.status === 'SUCCESS' && response.chats) {
        for (const chat of response.chats) {
          socketService.joinChat(chat.id);
        }
        console.log(`🔄 Rejoined ${response.chats.length} active chats`);
      }
    } catch (error) {
      console.error('❌ Failed to rejoin active chats:', error);
    }
  }

  private async handleNewMessage(message: any): Promise<void> {
    try {
      console.log('📨 Handling new message:', message.id, 'for chat:', message.chat_id);

      // Check if this is a message from another user (not our own message)
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        console.log('📨 No current user found, ignoring message');
        return;
      }

      // Check both possible user ID formats
      const currentUserId = currentUser.id || currentUser.firebaseUid;
      const isOwnMessage = message.sender_id === currentUserId ||
        message.sender_id === currentUser.id ||
        message.sender_id === currentUser.firebaseUid;

      if (isOwnMessage) {
        console.log('📨 Ignoring own message. Current user ID:', currentUserId, 'Message sender:', message.sender_id);
        return;
      }

      // Check if we already have this chat in our Redux store
      const { store } = await import('@/store');
      const state = store.getState();
      const existingChat = state.chat.chats.find(chat => chat.id === message.chat_id);

      if (existingChat) {
        console.log('💬 Chat already exists in store, adding message and updating chat');
        const { addMessage } = await import('@/store/slices/messageSlice');
        const { updateChatLastMessage, incrementUnreadCount } = await import('@/store/slices/chatSlice');

        // Add message to store
        console.log('🔄 Dispatching addMessage for chat:', message.chat_id);
        store.dispatch(addMessage(message));

        // Update chat's last message and increment unread count atomically
        console.log('🔄 Dispatching updateChatLastMessage for chat:', message.chat_id);
        store.dispatch(updateChatLastMessage({
          chatId: message.chat_id,
          lastMessage: {
            id: message.id,
            content: message.content,
            sender_id: message.sender_id,
            created_at: message.created_at,
            message_type: message.message_type,
          }
        }));

        // Only increment unread count if the message is not from the current user
        const currentUserId = store.getState().auth.user?.id || store.getState().auth.user?.firebaseUid;
        if (message.sender_id !== currentUserId) {
          console.log('🔄 Dispatching incrementUnreadCount for chat:', message.chat_id);
          store.dispatch(incrementUnreadCount(message.chat_id));
        }

        console.log('✅ Message added and chat updated in real-time');
        return;
      }

      // Try to get chat details from server
      try {
        const chatResponse = await chatService.getChatDetails(message.chat_id);

        if (chatResponse.chat) {
          console.log('💬 Chat details found from server:', chatResponse.chat.id);

          // Import Redux actions dynamically to avoid circular dependencies
          const { addChat } = await import('@/store/slices/chatSlice');
          const { addMessageAndCreateChat } = await import('@/store/slices/messageSlice');

          // Dispatch actions to create chat and add message
          store.dispatch(addChat(chatResponse.chat));
          store.dispatch(addMessageAndCreateChat({
            message,
            chat: chatResponse.chat
          }));

          // Update chat's last message and increment unread count
          const { updateChatLastMessage, incrementUnreadCount } = await import('@/store/slices/chatSlice');
          store.dispatch(updateChatLastMessage({
            chatId: message.chat_id,
            lastMessage: {
              id: message.id,
              content: message.content,
              sender_id: message.sender_id,
              created_at: message.created_at,
              message_type: message.message_type,
            }
          }));
          store.dispatch(incrementUnreadCount(message.chat_id));

          console.log('✅ Chat created and message added for:', chatResponse.chat.id);
          return;
        }
      } catch (error) {
        console.log('⚠️ Failed to get chat details from server, creating local chat');
      }

      // If server doesn't have the chat or we can't access it, create a local chat
      console.log('🔧 Creating local chat for message:', message.chat_id);

      // Get local contact data for the sender
      let senderLocalData = null;
      try {
        const { contactService } = await import('./contactService');
        const deviceContacts = await contactService.getContactsWithStatus();
        const allContacts = [...deviceContacts.existingUsers, ...deviceContacts.nonUsers.map(nonUser => ({
          user_id: nonUser.phoneNumber,
          fullName: nonUser.name || 'Unknown',
          phoneNumber: nonUser.phoneNumber,
          localName: nonUser.name,
          localProfilePicture: undefined,
          localEmail: undefined,
        }))];

        senderLocalData = allContacts.find(contact =>
          contact.user_id === message.sender_id ||
          contact.fullName === message.sender?.fullName
        );
      } catch (error) {
        console.log('⚠️ Could not load local contact data:', error);
      }

      const localChat = {
        id: message.chat_id,
        type: 'direct' as const,
        name: undefined,
        created_by: message.sender_id,
        created_at: message.created_at,
        updated_at: message.created_at,
        participants: [
          {
            user_id: message.sender_id,
            role: 'member' as const,
            joined_at: message.created_at,
            userDetails: {
              user_id: message.sender_id,
              fullName: message.sender?.fullName || 'Unknown User',
              profilePicture: message.sender?.profilePicture,
              // Add local contact data
              localName: senderLocalData?.localName || senderLocalData?.fullName,
              localProfilePicture: senderLocalData?.localProfilePicture,
              phoneNumber: senderLocalData?.phoneNumber,
            },
          },
          {
            user_id: currentUserId,
            role: 'member' as const,
            joined_at: new Date().toISOString(),
            userDetails: {
              user_id: currentUserId,
              fullName: currentUser.fullName || 'You',
              profilePicture: currentUser.avatar,
            },
          },
        ],
        last_message: {
          id: message.id,
          content: message.content,
          sender_id: message.sender_id,
          created_at: message.created_at,
          type: message.message_type || 'text',
          status: 'delivered',
        },
        unread_count: 1,
      };

      // Import Redux actions dynamically to avoid circular dependencies
      const { addChat } = await import('@/store/slices/chatSlice');
      const { addMessageAndCreateChat } = await import('@/store/slices/messageSlice');

      // Dispatch actions to create chat and add message
      store.dispatch(addChat(localChat));
      store.dispatch(addMessageAndCreateChat({
        message,
        chat: localChat
      }));

      // Update chat's last message and increment unread count
      const { updateChatLastMessage, incrementUnreadCount } = await import('@/store/slices/chatSlice');
      store.dispatch(updateChatLastMessage({
        chatId: message.chat_id,
        lastMessage: {
          id: message.id,
          content: message.content,
          sender_id: message.sender_id,
          created_at: message.created_at,
        }
      }));
      store.dispatch(incrementUnreadCount(message.chat_id));

      console.log('✅ Local chat created and message added for:', localChat.id);
    } catch (error) {
      console.error('❌ Failed to handle new message:', error);
    }
  }

  private async getCurrentUser(): Promise<any> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const authStateData = await AsyncStorage.default.getItem('@maharishi_connect_auth_state');
      if (!authStateData) {
        console.log('👤 No auth state found');
        return null;
      }

      const authState = JSON.parse(authStateData);
      const user = authState.user;
      console.log('👤 Current user from storage:', user?.id || 'No user found');
      return user;
    } catch (error) {
      console.error('❌ Failed to get current user:', error);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('🔌 Disconnecting chat services...');
      socketService.disconnect();
      this.isInitialized = false;
      this.initializationPromise = null;
      console.log('✅ Chat services disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting chat services:', error);
    }
  }

  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  getConnectionStatus(): boolean {
    return socketService.isSocketConnected();
  }

  async retryConnection(): Promise<void> {
    if (this.isInitialized) {
      await this.disconnect();
    }
    await this.initialize();
  }

}

// Export singleton instance
export const chatInitializationService = new ChatInitializationService();
export default chatInitializationService;
