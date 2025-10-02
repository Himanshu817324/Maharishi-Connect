import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import chatApiService from '@/services/chatApiService';
import sqliteService from '@/services/sqliteService';
import socketService from '@/services/socketService';
import { store } from '@/store';

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

interface Message {
  _id: string;
  text: string;
  chatId: string;
  senderId: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  isEdited?: boolean;
  reactions?: Record<string, number>;
}

interface ChatState {
  chats: any[];
  messages: Record<string, Message[]>;
  currentChat: any | null;
  isLoading: boolean;
  error: string | null;
  typingUsers: Record<string, string[]>;
  onlineUsers: string[];
}

const initialState: ChatState = {
  chats: [],
  messages: {},
  currentChat: null,
  isLoading: false,
  error: null,
  typingUsers: {},
  onlineUsers: [],
};

const normalizeMessageId = (msg: any): string => {
  return msg._id || msg.id || msg.clientId || '';
};

const deduplicateMessages = (messages: Message[]): Message[] => {
  const messageMap = new Map<string, Message>();
  for (const msg of messages) {
    const id = normalizeMessageId(msg);
    if (id) {
      const existing = messageMap.get(id);
      // Improved deduplication logic:
      // 1. If no existing message, add it
      // 2. If existing message is temporary and new one is server message, replace
      // 3. If both are server messages, keep the newer one
      // 4. If both are temporary, keep the newer one
      if (!existing) {
        messageMap.set(id, msg);
      } else {
        const existingIsTemp = existing._id.startsWith('temp_') || existing._id.startsWith('client_');
        const newIsTemp = msg._id.startsWith('temp_') || msg._id.startsWith('client_');

        if (existingIsTemp && !newIsTemp) {
          // Replace temp with server message
          messageMap.set(id, msg);
        } else if (!existingIsTemp && !newIsTemp) {
          // Both are server messages, keep the newer one
          const existingTime = new Date(existing.createdAt).getTime();
          const newTime = new Date(msg.createdAt).getTime();
          if (newTime > existingTime) {
            messageMap.set(id, msg);
          }
        } else if (existingIsTemp && newIsTemp) {
          // Both are temp, keep the newer one
          const existingTime = new Date(existing.createdAt).getTime();
          const newTime = new Date(msg.createdAt).getTime();
          if (newTime > existingTime) {
            messageMap.set(id, msg);
          }
        }
      }
    }
  }
  return Array.from(messageMap.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export const loadChatMessages = createAsyncThunk('chat/loadChatMessages', async (chatId: string, { rejectWithValue }) => {
  try {
    console.log(`📥 [loadChatMessages] Loading messages for chat: ${chatId}`);

    // Step 1: Load from SQLite first (fastest, always available)
    console.log(`📥 [loadChatMessages] Loading from SQLite...`);
    const localMessages = await sqliteService.getMessages(chatId);
    console.log(`📥 [loadChatMessages] Found ${localMessages.length} local messages`);

    // Format local messages properly
    const formattedLocalMessages: Message[] = localMessages.map(msg => ({
      _id: msg.id || msg.clientId || msg._id,
      text: msg.content || msg.text,
      chatId,
      senderId: msg.senderId,
      createdAt: msg.createdAt || msg.timestamp,
      status: msg.status || 'sent',
      user: {
        _id: msg.senderId,
        name: msg.senderName || msg.senderId || 'User'
      }
    }));

    // Step 2: Perform comprehensive server sync to get ALL messages
    let apiMessages: Message[] = [];
    let serverSyncSuccessful = false;

    try {
      console.log(`📥 [loadChatMessages] Performing comprehensive server sync...`);

      // Always fetch ALL messages from server for complete sync
      let allServerMessages: any[] = [];
      let hasMoreMessages = true;
      let offset = 0;
      const limit = 100; // Fetch in larger batches

      while (hasMoreMessages) {
        const batchOptions: any = { limit, offset };

        console.log(`📥 [loadChatMessages] Fetching batch ${offset / limit + 1} (offset: ${offset}, limit: ${limit})`);
        const rawApiMessages = await chatApiService.getChatMessages(chatId, batchOptions);

        if (rawApiMessages.length === 0) {
          hasMoreMessages = false;
          break;
        }

        allServerMessages.push(...rawApiMessages);
        console.log(`📥 [loadChatMessages] Fetched ${rawApiMessages.length} messages in this batch`);

        // If we got fewer messages than requested, we've reached the end
        if (rawApiMessages.length < limit) {
          hasMoreMessages = false;
        } else {
          offset += limit;
        }

        // Safety check to prevent infinite loops
        if (offset > 1000) {
          console.warn(`📥 [loadChatMessages] Reached safety limit for message fetching`);
          break;
        }
      }

      // Step 2.1: Get chat metadata and participants for better sync
      try {
        const chatDetails = await chatApiService.getChatDetails(chatId);
        console.log(`📥 [loadChatMessages] Fetched chat details:`, chatDetails);

        // Update chat in Redux with latest server data
        if (chatDetails) {
          const normalizedChat = normalizeChat(chatDetails);
          store.dispatch(mergeChats([normalizedChat]));
        }
      } catch (chatDetailsError) {
        console.warn('📥 [loadChatMessages] Failed to fetch chat details:', chatDetailsError);
        // Continue with message sync even if chat details fail
      }

      apiMessages = allServerMessages.map(msg => ({
        _id: msg._id || msg.id,
        text: msg.content || msg.text,
        chatId,
        senderId: msg.senderId || msg.sender_id,
        createdAt: msg.createdAt || msg.created_at,
        status: msg.status || 'sent',
        user: {
          _id: msg.senderId || msg.sender_id,
          name: msg.senderName || msg.sender_name || 'User'
        }
      }));

      console.log(`📥 [loadChatMessages] Found ${apiMessages.length} server messages (${allServerMessages.length} total fetched)`);

      // Save new messages from server to SQLite with better duplicate handling
      let newMessagesSaved = 0;
      let duplicateMessagesSkipped = 0;

      for (const msg of apiMessages) {
        try {
          // Check if message exists by both server ID and content to avoid duplicates
          const exists = await sqliteService.messageExistsEnhanced(msg._id, msg._id);
          if (!exists) {
            await sqliteService.saveMessage({
              id: msg._id,
              clientId: msg._id,
              chatId,
              content: msg.text,
              text: msg.text,
              senderId: msg.senderId,
              timestamp: msg.createdAt,
              createdAt: msg.createdAt,
              status: msg.status,
              senderName: msg.user.name
            });
            newMessagesSaved++;
            console.log(`💾 [loadChatMessages] Saved new message: ${msg._id}`);
          } else {
            duplicateMessagesSkipped++;
            console.log(`💾 [loadChatMessages] Skipped duplicate message: ${msg._id}`);
          }
        } catch (saveError) {
          console.error(`❌ [loadChatMessages] Error saving message ${msg._id}:`, saveError);
          // Continue with other messages even if one fails
        }
      }

      console.log(`💾 [loadChatMessages] Saved ${newMessagesSaved} new messages to SQLite, skipped ${duplicateMessagesSkipped} duplicates`);
      serverSyncSuccessful = true;

    } catch (apiError) {
      console.error('📥 [loadChatMessages] Server sync failed:', apiError);

      // If chat not found on server, clean up local data
      if (apiError instanceof Error && apiError.message && apiError.message.includes('Chat not found')) {
        console.log('🗑️ [loadChatMessages] Chat not found on server, cleaning up local data...');

        // Remove chat from Redux state
        store.dispatch(removeChat(chatId));

        // Remove chat and messages from SQLite
        await sqliteService.deleteChat(chatId);

        console.log('✅ [loadChatMessages] Cleaned up orphaned chat and messages');

        // Return empty result
        return {
          messages: [],
          source: 'cleaned-up',
          chatId,
        };
      }

      // Continue with local messages only for other errors
    }

    // Step 3: Combine and deduplicate messages
    const allMessages = [...formattedLocalMessages, ...apiMessages];
    const deduplicatedMessages = deduplicateMessages(allMessages);

    // Sort by timestamp (oldest first for proper chronological order)
    deduplicatedMessages.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    console.log(`📥 [loadChatMessages] Final result: ${deduplicatedMessages.length} messages`);
    console.log(`📥 [loadChatMessages] Server sync: ${serverSyncSuccessful ? 'Success' : 'Failed'}`);

    return {
      chatId,
      messages: deduplicatedMessages,
      source: serverSyncSuccessful ? 'server-synced' : 'local-only'
    };

  } catch (error) {
    console.error('📥 [loadChatMessages] Critical error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return rejectWithValue(`Failed to load messages: ${errorMessage}`);
  }
});

export const deleteChat = createAsyncThunk('chat/deleteChat', async (chatId: string, { dispatch, rejectWithValue }) => {
  try {
    console.log(`🗑️ [deleteChat] Deleting chat: ${chatId}`);

    // Delete from server
    await chatApiService.deleteChat(chatId);

    // Clean up socket state
    socketService.cleanupChatState(chatId);

    // Remove from Redux state
    dispatch(removeChat(chatId));

    // Delete from SQLite
    await sqliteService.deleteChat(chatId);

    console.log(`✅ [deleteChat] Chat deleted successfully: ${chatId}`);
    return { chatId };
  } catch (error) {
    console.error('❌ [deleteChat] Failed to delete chat:', error);
    return rejectWithValue(`Failed to delete chat: ${error}`);
  }
});

export const leaveChat = createAsyncThunk('chat/leaveChat', async (chatId: string, { dispatch, rejectWithValue }) => {
  try {
    console.log(`🚪 [leaveChat] Leaving chat: ${chatId}`);

    // Leave chat on server
    await chatApiService.leaveChat(chatId);

    // Clean up socket state
    socketService.cleanupChatState(chatId);

    // Remove from Redux state
    dispatch(removeChat(chatId));

    // Delete from SQLite
    await sqliteService.deleteChat(chatId);

    console.log(`✅ [leaveChat] Left chat successfully: ${chatId}`);
    return { chatId };
  } catch (error) {
    console.error('❌ [leaveChat] Failed to leave chat:', error);
    return rejectWithValue(`Failed to leave chat: ${error}`);
  }
});

// Force clean state for new chat creation
export const prepareForNewChat = createAsyncThunk('chat/prepareForNewChat', async (_, { dispatch }) => {
  try {
    console.log('🔄 [prepareForNewChat] Preparing for new chat creation...');

    // Clear all chat state
    dispatch(clearChatState());

    // Force socket reconnection for clean state
    socketService.forceReconnect();

    console.log('✅ [prepareForNewChat] Clean state prepared');
    return { success: true };
  } catch (error) {
    console.error('❌ [prepareForNewChat] Failed to prepare clean state:', error);
    throw error;
  }
});

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChats: (state, action: PayloadAction<any[]>) => {
      state.chats = action.payload;
    },
    mergeChats: (state, action: PayloadAction<any[]>) => {
      const incomingChats = action.payload;
      const existingChatMap = new Map(state.chats.map(c => [c.id, c]));

      incomingChats.forEach(incomingChat => {
        const existingChat = existingChatMap.get(incomingChat.id);
        if (existingChat) {
          const existingTime = new Date(existingChat.lastMessageTime || 0).getTime();
          const incomingTime = new Date(incomingChat.lastMessageTime || 0).getTime();
          if (incomingTime > existingTime) {
            Object.assign(existingChat, incomingChat);
          }
        } else {
          state.chats.push(incomingChat);
        }
      });

      state.chats.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
    },
    addChat: (state, action: PayloadAction<any>) => {
      const exists = state.chats.find(c => c.id === action.payload.id);
      if (!exists) {
        state.chats.unshift(action.payload);
      }
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      const { chatId } = message;
      const messageId = normalizeMessageId(message);

      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }
      const messageExists = state.messages[chatId].some(m => normalizeMessageId(m) === messageId);
      if (!messageExists) {
        state.messages[chatId].push(message);
      }

      const chatIndex = state.chats.findIndex(c => c.id === chatId);
      if (chatIndex !== -1) {
        const chatToUpdate = state.chats[chatIndex];
        chatToUpdate.lastMessage = message.text;
        chatToUpdate.lastMessageTime = message.createdAt;
        state.chats.splice(chatIndex, 1);
        state.chats.unshift(chatToUpdate);
      }
    },
    updateChat: (state, action: PayloadAction<any>) => { const index = state.chats.findIndex(c => c.id === action.payload.id); if (index !== -1) { state.chats[index] = { ...state.chats[index], ...action.payload }; } },
    updateChatLastMessage: (state, action: PayloadAction<any>) => { const { id } = action.payload; const index = state.chats.findIndex(c => c.id === id); if (index !== -1) { state.chats[index] = { ...state.chats[index], ...action.payload }; const updatedChat = state.chats[index]; state.chats.splice(index, 1); state.chats.unshift(updatedChat); } },
    setCurrentChat: (state, action: PayloadAction<any>) => { state.currentChat = action.payload; },
    updateMessageStatus: (state, action: PayloadAction<{ messageId: string; status: string }>) => { const { messageId, status } = action.payload; Object.keys(state.messages).forEach(chatId => { const msgIndex = state.messages[chatId].findIndex(m => m._id === messageId); if (msgIndex !== -1) { state.messages[chatId][msgIndex].status = status as any; } }); },
    replaceMessageId: (state, action: PayloadAction<{ tempId: string; serverId: string; chatId: string }>) => { const { tempId, serverId, chatId } = action.payload; if (state.messages[chatId]) { const msgIndex = state.messages[chatId].findIndex(m => m._id === tempId); if (msgIndex !== -1) { state.messages[chatId][msgIndex]._id = serverId; } state.messages[chatId] = deduplicateMessages(state.messages[chatId]); } },
    setMessagesForChat: (state, action: PayloadAction<{ chatId: string; messages: Message[] }>) => { const { chatId, messages } = action.payload; state.messages[chatId] = deduplicateMessages(messages); },
    updateMessage: (state, action: PayloadAction<{ messageId: string; content: string }>) => { const { messageId, content } = action.payload; Object.keys(state.messages).forEach(chatId => { const msgIndex = state.messages[chatId].findIndex(m => m._id === messageId); if (msgIndex !== -1) { state.messages[chatId][msgIndex].text = content; state.messages[chatId][msgIndex].isEdited = true; } }); },
    removeMessage: (state, action: PayloadAction<string>) => { Object.keys(state.messages).forEach(chatId => { state.messages[chatId] = state.messages[chatId].filter(m => m._id !== action.payload); }); },
    addReaction: (state, action: PayloadAction<{ messageId: string; emoji: string; userId: string }>) => { },
    removeReaction: (state, action: PayloadAction<{ messageId: string; emoji: string; userId: string }>) => { },
    markChatAsRead: (state, action: PayloadAction<string>) => { const chatId = action.payload; if (state.messages[chatId]) { state.messages[chatId].forEach(msg => { msg.status = 'read'; }); } },
    setTyping: (state, action: PayloadAction<{ userId: string; chatId: string; isTyping: boolean }>) => { const { userId, chatId, isTyping } = action.payload; if (!state.typingUsers[chatId]) { state.typingUsers[chatId] = []; } if (isTyping) { if (!state.typingUsers[chatId].includes(userId)) { state.typingUsers[chatId].push(userId); } } else { state.typingUsers[chatId] = state.typingUsers[chatId].filter(id => id !== userId); } },
    setOnlineStatus: (state, action: PayloadAction<{ userId: string; isOnline: boolean }>) => { const { userId, isOnline } = action.payload; if (isOnline) { if (!state.onlineUsers.includes(userId)) { state.onlineUsers.push(userId); } } else { state.onlineUsers = state.onlineUsers.filter(id => id !== userId); } },
    setLoading: (state, action: PayloadAction<boolean>) => { state.isLoading = action.payload; },
    setError: (state, action: PayloadAction<string | null>) => { state.error = action.payload; },
    clearChats: (state) => { state.chats = []; state.messages = {}; state.currentChat = null; },
    removeChat: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      state.chats = state.chats.filter(chat => chat.id !== chatId);
      delete state.messages[chatId];
      if (state.currentChat?.id === chatId) {
        state.currentChat = null;
      }
    },
    clearChatState: (state) => {
      state.chats = [];
      state.messages = {};
      state.currentChat = null;
      state.isLoading = false;
      state.error = null;
    },
    clearMessagesForChat: (state, action: PayloadAction<string>) => { const chatId = action.payload; if (state.messages[chatId]) { state.messages[chatId] = []; } },
    reconcileMessages: (state, action: PayloadAction<{ chatId: string; serverMessages: Message[] }>) => {
      const { chatId, serverMessages } = action.payload;
      const localMessages = state.messages[chatId] || [];

      // Create a map of server messages by ID
      const serverMessageMap = new Map(serverMessages.map(msg => [msg._id, msg]));

      // Update existing messages and add new ones
      const reconciledMessages: Message[] = [];
      const processedIds = new Set<string>();

      // First, process all server messages (authoritative)
      serverMessages.forEach(serverMsg => {
        reconciledMessages.push(serverMsg);
        processedIds.add(serverMsg._id);
      });

      // Then, add any local messages that aren't on server (temporary messages)
      localMessages.forEach(localMsg => {
        if (!processedIds.has(localMsg._id) && localMsg._id.startsWith('temp_')) {
          reconciledMessages.push(localMsg);
        }
      });

      // Sort by creation time
      reconciledMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      state.messages[chatId] = reconciledMessages;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadChatMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadChatMessages.fulfilled, (state, action) => {
        const { chatId, messages, source } = action.payload;
        state.messages[chatId] = messages;
        state.isLoading = false;
        state.error = null;
        console.log(`🎉 Redux: Loaded ${messages.length} messages for chat ${chatId} (${source})`);
      })
      .addCase(loadChatMessages.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
        console.error('🚨 Redux: Failed to load messages:', action.payload);
      });
  },
});

export const {
  setChats,
  mergeChats,
  addChat,
  updateChat,
  updateChatLastMessage,
  setCurrentChat,
  addMessage,
  updateMessageStatus,
  replaceMessageId,
  setMessagesForChat,
  updateMessage,
  removeMessage,
  addReaction,
  removeReaction,
  markChatAsRead,
  setTyping,
  setOnlineStatus,
  setLoading,
  setError,
  clearChats,
  removeChat,
  clearChatState,
  clearMessagesForChat,
  reconcileMessages,
} = chatSlice.actions;

export default chatSlice.reducer;