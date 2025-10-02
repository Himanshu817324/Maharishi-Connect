import { store } from '../store';
import {
  setChats,
  mergeChats,
  addMessage,
  setMessagesForChat,
  removeChat,
  setLoading,
  setError
} from '../store/slices/chatSlice';
import chatApiService from './chatApiService';
import sqliteService from './sqliteService';
import socketService from './socketService';
import { selectCurrentUser } from '../store/slices/authSlice';

interface SyncResult {
  success: boolean;
  source: 'server' | 'local' | 'hybrid';
  chatsCount: number;
  messagesCount: number;
  errors?: string[];
}

interface MessageSyncOptions {
  forceServerSync?: boolean;
  backgroundSync?: boolean;
  chatId?: string;
}

class MessageSyncService {
  private isInitialized = false;
  private syncInProgress = false;
  private lastSyncTime = 0;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 [MessageSyncService] Initializing...');

      // Initialize SQLite if not already done
      if (!sqliteService.isInitialized()) {
        await sqliteService.init();
        console.log('✅ [MessageSyncService] SQLite initialized');
      }

      this.isInitialized = true;
      console.log('✅ [MessageSyncService] Initialization complete');
    } catch (error) {
      console.error('❌ [MessageSyncService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Main synchronization method - single authoritative sync with proper error handling
   */
  async syncAllData(options: MessageSyncOptions = {}): Promise<SyncResult> {
    if (this.syncInProgress && !options.forceServerSync) {
      console.log('🔄 [MessageSyncService] Sync already in progress, skipping...');
      return { success: false, source: 'local', chatsCount: 0, messagesCount: 0 };
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      console.log('🔄 [MessageSyncService] Starting authoritative data sync...');

      const state = store.getState();
      const currentUser = selectCurrentUser(state);

      if (!currentUser?.id || !currentUser?.token) {
        throw new Error('User not authenticated');
      }

      // Set auth token for API calls
      chatApiService.setAuthToken(currentUser.token);

      // Step 1: Load from local storage for immediate UI response
      const localChats = await this.loadFromLocalStorage();
      console.log(`📱 [MessageSyncService] Loaded ${localChats.length} chats from local storage`);

      // Step 2: Fetch from server with retry logic
      let serverChats: any[] = [];
      let serverSyncSuccess = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!serverSyncSuccess && retryCount < maxRetries) {
        try {
          console.log(`🌐 [MessageSyncService] Fetching chats from server (attempt ${retryCount + 1})...`);
          serverChats = await chatApiService.getUserChats();
          serverSyncSuccess = true;
          console.log(`🌐 [MessageSyncService] Fetched ${serverChats.length} chats from server`);
        } catch (serverError) {
          retryCount++;
          console.error(`❌ [MessageSyncService] Server sync attempt ${retryCount} failed:`, serverError);

          if (retryCount < maxRetries) {
            // Wait before retry with exponential backoff
            await new Promise<void>(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }

      // If server sync failed completely, use local data
      if (!serverSyncSuccess) {
        console.log('📱 [MessageSyncService] Server sync failed, using local data');
        if (localChats.length > 0) {
          store.dispatch(setChats(localChats));
          return {
            success: true,
            source: 'local',
            chatsCount: localChats.length,
            messagesCount: 0
          };
        }
        throw new Error('Server sync failed and no local data available');
      }

      // Step 3: Normalize and merge server data
      const normalizedServerChats = serverChats.map(chat => this.normalizeChat(chat, currentUser.id));

      // Step 4: Clean up orphaned chats (exist locally but not on server)
      await this.cleanupOrphanedChats(localChats, normalizedServerChats);

      // Step 5: Merge and save to local storage
      const mergedChats = this.mergeChatData(localChats, normalizedServerChats);
      store.dispatch(setChats(mergedChats));

      // Step 6: Save to SQLite
      await this.saveChatsToLocalStorage(mergedChats);

      // Step 7: Load messages for each chat if needed
      let totalMessages = 0;
      if (options.chatId) {
        // Sync specific chat messages
        const messages = await this.syncChatMessages(options.chatId, currentUser.id);
        totalMessages = messages.length;
      } else {
        // Sync messages for all chats (background sync)
        for (const chat of mergedChats.slice(0, 5)) { // Limit to first 5 chats for performance
          try {
            const messages = await this.syncChatMessages(chat.id, currentUser.id);
            totalMessages += messages.length;
          } catch (error) {
            console.error(`❌ [MessageSyncService] Failed to sync messages for chat ${chat.id}:`, error);
          }
        }
      }

      this.lastSyncTime = Date.now();
      const syncTime = Date.now() - startTime;

      console.log(`✅ [MessageSyncService] Sync completed in ${syncTime}ms`);
      console.log(`📊 [MessageSyncService] Results: ${mergedChats.length} chats, ${totalMessages} messages`);

      return {
        success: true,
        source: serverSyncSuccess ? 'server' : 'hybrid',
        chatsCount: mergedChats.length,
        messagesCount: totalMessages
      };

    } catch (error) {
      console.error('❌ [MessageSyncService] Sync failed:', error);
      store.dispatch(setError('Failed to sync data. Please try again.'));

      return {
        success: false,
        source: 'local',
        chatsCount: 0,
        messagesCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync messages for a specific chat
   */
  async syncChatMessages(chatId: string, currentUserId: string): Promise<any[]> {
    try {
      console.log(`📥 [MessageSyncService] Syncing messages for chat: ${chatId}`);

      // Step 1: Load from local storage first
      const localMessages = await sqliteService.getMessages(chatId);
      console.log(`📱 [MessageSyncService] Found ${localMessages.length} local messages for chat ${chatId}`);

      // Step 2: Fetch from server
      let serverMessages: any[] = [];
      try {
        const rawServerMessages = await chatApiService.getChatMessages(chatId, { limit: 100 });
        serverMessages = rawServerMessages.map(msg => this.normalizeMessage(msg, chatId));
        console.log(`🌐 [MessageSyncService] Fetched ${serverMessages.length} server messages for chat ${chatId}`);
      } catch (serverError) {
        console.error(`❌ [MessageSyncService] Server message sync failed for chat ${chatId}:`, serverError);

        // If chat not found on server, clean up
        if (serverError instanceof Error && serverError.message.includes('Chat not found')) {
          console.log(`🗑️ [MessageSyncService] Chat ${chatId} not found on server, cleaning up...`);
          store.dispatch(removeChat(chatId));
          await sqliteService.deleteChat(chatId);
          return [];
        }

        // Use local messages as fallback
        const formattedLocalMessages = localMessages.map(msg => this.formatLocalMessage(msg));
        store.dispatch(setMessagesForChat({ chatId, messages: formattedLocalMessages }));
        return formattedLocalMessages;
      }

      // Step 3: Save new server messages to local storage
      for (const message of serverMessages) {
        try {
          const exists = await sqliteService.messageExistsEnhanced(message._id, message._id);
          if (!exists) {
            await sqliteService.saveMessage({
              id: message._id,
              clientId: message._id,
              chatId,
              content: message.text,
              text: message.text,
              senderId: message.senderId,
              timestamp: message.createdAt,
              createdAt: message.createdAt,
              status: message.status,
              senderName: message.user.name
            });
          }
        } catch (saveError) {
          console.error(`❌ [MessageSyncService] Failed to save message ${message._id}:`, saveError);
        }
      }

      // Step 4: Combine and deduplicate messages
      const allMessages = [...localMessages.map(msg => this.formatLocalMessage(msg)), ...serverMessages];
      const deduplicatedMessages = this.deduplicateMessages(allMessages);

      // Step 5: Update Redux state
      store.dispatch(setMessagesForChat({ chatId, messages: deduplicatedMessages }));

      console.log(`✅ [MessageSyncService] Synced ${deduplicatedMessages.length} messages for chat ${chatId}`);
      return deduplicatedMessages;

    } catch (error) {
      console.error(`❌ [MessageSyncService] Failed to sync messages for chat ${chatId}:`, error);
      return [];
    }
  }

  /**
   * Load data from local storage
   */
  private async loadFromLocalStorage(): Promise<any[]> {
    try {
      const localChats = await sqliteService.getChats();
      return localChats.map(chat => this.normalizeLocalChat(chat));
    } catch (error) {
      console.error('❌ [MessageSyncService] Failed to load from local storage:', error);
      return [];
    }
  }

  /**
   * Clean up orphaned chats (exist locally but not on server)
   */
  private async cleanupOrphanedChats(localChats: any[], serverChats: any[]): Promise<void> {
    const serverChatIds = new Set(serverChats.map(chat => chat.id));
    let orphanedCount = 0;

    for (const localChat of localChats) {
      if (!serverChatIds.has(localChat.id)) {
        console.log(`🗑️ [MessageSyncService] Removing orphaned chat: ${localChat.id}`);
        store.dispatch(removeChat(localChat.id));
        await sqliteService.deleteChat(localChat.id);
        orphanedCount++;
      }
    }

    if (orphanedCount > 0) {
      console.log(`✅ [MessageSyncService] Cleaned up ${orphanedCount} orphaned chats`);
    }
  }

  /**
   * Merge local and server chat data
   */
  private mergeChatData(localChats: any[], serverChats: any[]): any[] {
    const chatMap = new Map<string, any>();

    // Add local chats first
    for (const chat of localChats) {
      chatMap.set(chat.id, chat);
    }

    // Merge with server data
    for (const serverChat of serverChats) {
      const existingChat = chatMap.get(serverChat.id);
      if (existingChat) {
        // Update existing chat with newer data
        const existingTime = new Date(existingChat.lastMessageTime || 0).getTime();
        const serverTime = new Date(serverChat.lastMessageTime || 0).getTime();
        if (serverTime > existingTime) {
          chatMap.set(serverChat.id, { ...existingChat, ...serverChat });
        }
      } else {
        // Add new chat
        chatMap.set(serverChat.id, serverChat);
      }
    }

    const mergedChats = Array.from(chatMap.values());

    // Sort by last message time
    return mergedChats.sort((a, b) => {
      const timeA = new Date(a.lastMessageTime || 0).getTime();
      const timeB = new Date(b.lastMessageTime || 0).getTime();
      return timeB - timeA;
    });
  }

  /**
   * Save chats to local storage
   */
  private async saveChatsToLocalStorage(chats: any[]): Promise<void> {
    for (const chat of chats) {
      try {
        await sqliteService.saveChat({
          id: chat.id,
          name: chat.name,
          type: chat.type || 'direct',
          avatar: chat.avatar,
          lastMessage: chat.lastMessage || '',
          lastMessageTime: chat.lastMessageTime,
          unreadCount: chat.unreadCount || 0,
          participants: JSON.stringify(chat.participants || []),
          createdAt: chat.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error(`❌ [MessageSyncService] Failed to save chat ${chat.id}:`, error);
      }
    }
  }

  /**
   * Normalize chat data from API
   */
  private normalizeChat(chat: any, currentUserId: string): any {
    const id = chat?.id || chat?._id;
    const type = (chat?.type || chat?.chat_type) === 'direct' ? 'direct' : (chat?.type || 'group');
    const participants = chat?.participants || chat?.members || [];

    let name = chat?.name;
    if (!name && type === 'direct' && Array.isArray(participants)) {
      const other = participants.find((p: any) => {
        const participantId = p?.user_id || p?.uid || p?.id || p;
        return participantId !== currentUserId;
      });
      if (other) {
        name = other?.userDetails?.fullName ||
          other?.fullName ||
          other?.name ||
          other?.user_name ||
          other?.displayName ||
          (other?.user_mobile ? `+91${other.user_mobile}` : null) ||
          (other?.phone ? `+91${other.phone}` : null) ||
          'Unknown User';
      } else {
        name = 'Unknown';
      }
    }

    return {
      id,
      type,
      name: name || 'Unknown Chat',
      participants,
      avatar: chat?.avatar || chat?.icon || undefined,
      lastMessage: chat?.last_message_content || chat?.lastMessage || '',
      lastMessageTime: chat?.last_message_created_at || chat?.updated_at || chat?.created_at || chat?.lastMessageTime || null,
      unreadCount: chat?.unread_count ?? chat?.unreadCount ?? 0,
    };
  }

  /**
   * Normalize local chat data
   */
  private normalizeLocalChat(chat: any): any {
    return {
      id: chat.id,
      name: chat.name,
      type: chat.type || 'direct',
      participants: typeof chat.participants === 'string' ? JSON.parse(chat.participants) : chat.participants || [],
      avatar: chat.avatar,
      lastMessage: chat.lastMessage || '',
      lastMessageTime: chat.lastMessageTime,
      unreadCount: chat.unreadCount || 0,
    };
  }

  /**
   * Normalize message data from API
   */
  private normalizeMessage(message: any, chatId: string): any {
    return {
      _id: message._id || message.id,
      text: message.content || message.text,
      chatId,
      senderId: message.senderId || message.sender_id,
      createdAt: message.createdAt || message.created_at,
      status: message.status || 'sent',
      user: {
        _id: message.senderId || message.sender_id,
        name: message.senderName || message.sender_name || 'User'
      }
    };
  }

  /**
   * Format local message for Redux
   */
  private formatLocalMessage(message: any): any {
    return {
      _id: message.id || message.clientId,
      text: message.content || message.text,
      chatId: message.chatId,
      senderId: message.senderId,
      createdAt: message.createdAt || message.timestamp,
      status: message.status || 'sent',
      user: {
        _id: message.senderId,
        name: message.senderName || 'User'
      }
    };
  }

  /**
   * Deduplicate messages
   */
  private deduplicateMessages(messages: any[]): any[] {
    const messageMap = new Map<string, any>();

    for (const message of messages) {
      const id = message._id;
      if (!id) continue;

      const existing = messageMap.get(id);
      if (!existing) {
        messageMap.set(id, message);
      } else {
        // Prefer server messages over local ones
        const existingIsTemp = existing._id.startsWith('temp_') || existing._id.startsWith('client_');
        const newIsTemp = message._id.startsWith('temp_') || message._id.startsWith('client_');

        if (existingIsTemp && !newIsTemp) {
          messageMap.set(id, message); // Replace temp with server
        } else if (!existingIsTemp && newIsTemp) {
          // Keep existing server message
        } else {
          // Both same type, keep newer one
          const existingTime = new Date(existing.createdAt).getTime();
          const newTime = new Date(message.createdAt).getTime();
          if (newTime > existingTime) {
            messageMap.set(id, message);
          }
        }
      }
    }

    return Array.from(messageMap.values()).sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  /**
   * Start background sync
   */
  startBackgroundSync(intervalMs: number = 60000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      const timeSinceLastSync = Date.now() - this.lastSyncTime;
      if (timeSinceLastSync > intervalMs) {
        console.log('🔄 [MessageSyncService] Background sync triggered');
        await this.syncAllData({ backgroundSync: true });
      }
    }, intervalMs);

    console.log(`🔄 [MessageSyncService] Background sync started (${intervalMs}ms interval)`);
  }

  /**
   * Stop background sync
   */
  stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🔄 [MessageSyncService] Background sync stopped');
    }
  }

  /**
   * Handle chat deletion with proper cleanup
   */
  async handleChatDeletion(chatId: string): Promise<void> {
    try {
      console.log(`🗑️ [MessageSyncService] Handling chat deletion: ${chatId}`);

      // Clean up socket state
      socketService.cleanupChatState(chatId);

      // Remove from Redux state
      store.dispatch(removeChat(chatId));

      // Delete from SQLite
      await sqliteService.deleteChat(chatId);

      console.log(`✅ [MessageSyncService] Chat deletion completed: ${chatId}`);
    } catch (error) {
      console.error(`❌ [MessageSyncService] Failed to delete chat ${chatId}:`, error);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): { isInitialized: boolean; syncInProgress: boolean; lastSyncTime: number } {
    return {
      isInitialized: this.isInitialized,
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime
    };
  }

  /**
   * Force sync for specific chat
   */
  async forceSyncChat(chatId: string): Promise<void> {
    const state = store.getState();
    const currentUser = selectCurrentUser(state);

    if (!currentUser?.id) return;

    try {
      console.log(`🔄 [MessageSyncService] Force syncing chat: ${chatId}`);
      await this.syncChatMessages(chatId, currentUser.id);
    } catch (error) {
      console.error(`❌ [MessageSyncService] Force sync failed for chat ${chatId}:`, error);
    }
  }
}

export default new MessageSyncService();
