import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { chatService, ChatData } from '@/services/chatService';

export interface ChatState {
  chats: ChatData[];
  currentChat: ChatData | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

const initialState: ChatState = {
  chats: [],
  currentChat: null,
  loading: false,
  error: null,
  lastFetch: null,
};

// Async thunks
export const fetchUserChats = createAsyncThunk(
  'chat/fetchUserChats',
  async (forceRefresh: boolean = false, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { chat: { lastFetch: number; chats: any[] } };
      const now = Date.now();
      const timeSinceLastFetch = now - (state.chat.lastFetch || 0);

      // If not forced and we have recent data, return existing chats
      if (!forceRefresh && timeSinceLastFetch < 5000 && state.chat.chats.length > 0) {
        console.log('📱 [Redux] Skipping fetch - recent data available');
        return state.chat.chats;
      }

      const response = await chatService.getUserChats();
      if (response.status === 'SUCCESS') {
        return response.chats || [];
      } else {
        throw new Error(response.message || 'Failed to fetch chats');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch chats');
    }
  }
);

export const createChat = createAsyncThunk(
  'chat/createChat',
  async (chatData: {
    type: 'direct' | 'group';
    name?: string;
    description?: string;
    participants: string[];
  }, { rejectWithValue }) => {
    try {
      const response = await chatService.createChat(chatData);
      if (response.status === 'SUCCESS' && response.chat) {
        return response.chat;
      } else {
        throw new Error(response.message || 'Failed to create chat');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create chat');
    }
  }
);

export const getChatDetails = createAsyncThunk(
  'chat/getChatDetails',
  async (chatId: string, { rejectWithValue }) => {
    try {
      const response = await chatService.getChatDetails(chatId);
      if (response.status === 'SUCCESS' && response.chat) {
        return response.chat;
      } else {
        throw new Error(response.message || 'Failed to get chat details');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to get chat details');
    }
  }
);

export const joinChat = createAsyncThunk(
  'chat/joinChat',
  async (chatId: string, { rejectWithValue }) => {
    try {
      const response = await chatService.joinChat(chatId);
      if (response.status === 'SUCCESS') {
        return chatId;
      } else {
        throw new Error(response.message || 'Failed to join chat');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to join chat');
    }
  }
);

export const leaveChat = createAsyncThunk(
  'chat/leaveChat',
  async (chatId: string, { rejectWithValue }) => {
    try {
      const response = await chatService.leaveChat(chatId);
      if (response.status === 'SUCCESS') {
        return chatId;
      } else {
        throw new Error(response.message || 'Failed to leave chat');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to leave chat');
    }
  }
);

export const deleteChat = createAsyncThunk(
  'chat/deleteChat',
  async (chatId: string, { rejectWithValue }) => {
    try {
      const response = await chatService.deleteChat(chatId);
      if (response.status === 'SUCCESS') {
        return chatId;
      } else {
        throw new Error(response.message || 'Failed to delete chat');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete chat');
    }
  }
);

export const archiveChat = createAsyncThunk(
  'chat/archiveChat',
  async (chatId: string, { rejectWithValue }) => {
    try {
      const response = await chatService.archiveChat(chatId);
      if (response.status === 'SUCCESS') {
        return chatId;
      } else {
        throw new Error(response.message || 'Failed to archive chat');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to archive chat');
    }
  }
);

export const unarchiveChat = createAsyncThunk(
  'chat/unarchiveChat',
  async (chatId: string, { rejectWithValue }) => {
    try {
      const response = await chatService.unarchiveChat(chatId);
      if (response.status === 'SUCCESS') {
        return chatId;
      } else {
        throw new Error(response.message || 'Failed to unarchive chat');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to unarchive chat');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentChat: (state, action: PayloadAction<ChatData | null>) => {
      state.currentChat = action.payload;
    },
    clearCurrentChat: (state) => {
      state.currentChat = null;
    },
    addChat: (state, action: PayloadAction<ChatData>) => {
      const existingIndex = state.chats.findIndex(chat => chat.id === action.payload.id);
      if (existingIndex >= 0) {
        // Update existing chat
        state.chats[existingIndex] = action.payload;
      } else {
        // Add new chat
        state.chats.push(action.payload);
      }

      // Re-sort chats to maintain proper order (unread priority + activity)
      state.chats.sort((a, b) => {
        // First priority: Unread chats come first
        const aHasUnread = (a.unread_count || 0) > 0;
        const bHasUnread = (b.unread_count || 0) > 0;

        if (aHasUnread && !bHasUnread) return -1; // a comes first
        if (!aHasUnread && bHasUnread) return 1;  // b comes first

        // If both have unread or both don't have unread, sort by activity
        const getLastActivity = (chat: any) => {
          const updated = new Date(chat.updated_at || 0).getTime();
          const lastMessage = chat.last_message?.created_at ? new Date(chat.last_message.created_at).getTime() : 0;
          const created = new Date(chat.created_at || 0).getTime();
          return Math.max(updated, lastMessage, created);
        };

        const aActivity = getLastActivity(a);
        const bActivity = getLastActivity(b);

        return bActivity - aActivity; // Most recent first
      });
    },
    updateChat: (state, action: PayloadAction<ChatData>) => {
      const index = state.chats.findIndex(chat => chat.id === action.payload.id);
      if (index >= 0) {
        state.chats[index] = action.payload;
      }
      if (state.currentChat?.id === action.payload.id) {
        state.currentChat = action.payload;
      }
    },
    removeChat: (state, action: PayloadAction<string>) => {
      state.chats = state.chats.filter(chat => chat.id !== action.payload);
      if (state.currentChat?.id === action.payload) {
        state.currentChat = null;
      }
    },
    updateChatLastMessage: (state, action: PayloadAction<{
      chatId: string;
      lastMessage: {
        id: string;
        content: string;
        sender_id: string;
        created_at: string;
        message_type?: 'text' | 'image' | 'video' | 'audio' | 'file';
      };
    }>) => {
      console.log('📱 [Redux] Updating last message for chat:', action.payload.chatId, 'with message:', action.payload.lastMessage);

      const chat = state.chats.find(c => c.id === action.payload.chatId);
      if (chat) {
        chat.last_message = action.payload.lastMessage;
        chat.updated_at = new Date().toISOString();

        // Re-sort chats to maintain proper order (unread priority + activity)
        state.chats.sort((a, b) => {
          // First priority: Unread chats come first
          const aHasUnread = (a.unread_count || 0) > 0;
          const bHasUnread = (b.unread_count || 0) > 0;

          if (aHasUnread && !bHasUnread) return -1; // a comes first
          if (!aHasUnread && bHasUnread) return 1;  // b comes first

          // If both have unread or both don't have unread, sort by activity
          const getLastActivity = (chat: any) => {
            const updated = new Date(chat.updated_at || 0).getTime();
            const lastMessage = chat.last_message?.created_at ? new Date(chat.last_message.created_at).getTime() : 0;
            const created = new Date(chat.created_at || 0).getTime();
            return Math.max(updated, lastMessage, created);
          };

          const aActivity = getLastActivity(a);
          const bActivity = getLastActivity(b);

          return bActivity - aActivity; // Most recent first
        });

        console.log('📱 [Redux] Re-sorted chats after last message update');
      }
      if (state.currentChat?.id === action.payload.chatId) {
        state.currentChat.last_message = action.payload.lastMessage;
        state.currentChat.updated_at = new Date().toISOString();
      }
    },
    incrementUnreadCount: (state, action: PayloadAction<string>) => {
      const chat = state.chats.find(c => c.id === action.payload);
      if (chat) {
        // Use atomic increment to prevent race conditions
        const currentCount = chat.unread_count || 0;
        chat.unread_count = currentCount + 1;
        console.log('🔔 Incremented unread count for chat:', action.payload, 'from', currentCount, 'to', chat.unread_count);
      }
      if (state.currentChat?.id === action.payload) {
        const currentCount = state.currentChat.unread_count || 0;
        state.currentChat.unread_count = currentCount + 1;
        console.log('🔔 Incremented unread count for current chat:', action.payload, 'from', currentCount, 'to', state.currentChat.unread_count);
      }
    },
    clearUnreadCount: (state, action: PayloadAction<string>) => {
      const chat = state.chats.find(c => c.id === action.payload);
      if (chat) {
        console.log('🔔 Clearing unread count for chat:', action.payload, 'from', chat.unread_count, 'to 0');
        chat.unread_count = 0;
        // Don't update updated_at - this should only reflect actual message activity
      }
      if (state.currentChat?.id === action.payload) {
        console.log('🔔 Clearing unread count for current chat:', action.payload);
        state.currentChat.unread_count = 0;
        // Don't update updated_at - this should only reflect actual message activity
      }
    },
    setUnreadCount: (state, action: PayloadAction<{ chatId: string; count: number }>) => {
      const chat = state.chats.find(c => c.id === action.payload.chatId);
      if (chat) {
        console.log('🔔 Setting unread count for chat:', action.payload.chatId, 'to', action.payload.count);
        chat.unread_count = action.payload.count;
        // Don't update updated_at - this should only reflect actual message activity
      }
      if (state.currentChat?.id === action.payload.chatId) {
        state.currentChat.unread_count = action.payload.count;
        // Don't update updated_at - this should only reflect actual message activity
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    clearChats: (state) => {
      state.chats = [];
      state.currentChat = null;
      state.lastFetch = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user chats
      .addCase(fetchUserChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserChats.fulfilled, (state, action) => {
        state.loading = false;

        // Only update chats if we don't have recent data or if this is a forced refresh
        const now = Date.now();
        const timeSinceLastFetch = now - (state.lastFetch || 0);
        const shouldUpdate = timeSinceLastFetch > 5000 || state.chats.length === 0; // 5 seconds or no chats

        if (!shouldUpdate) {
          console.log('📱 [Redux] Skipping chat update - recent data available');
          return;
        }

        // Sort chats with unread priority, then by most recent activity
        console.log('📱 [Redux] Updating chats - sorting before:', action.payload.map(c => ({
          id: c.id,
          name: c.name || 'Direct Chat',
          updated_at: c.updated_at,
          created_at: c.created_at,
          last_message: c.last_message?.created_at,
          unread_count: c.unread_count
        })));

        const sortedChats = action.payload.sort((a, b) => {
          // First priority: Unread chats come first
          const aHasUnread = (a.unread_count || 0) > 0;
          const bHasUnread = (b.unread_count || 0) > 0;

          if (aHasUnread && !bHasUnread) return -1; // a comes first
          if (!aHasUnread && bHasUnread) return 1;  // b comes first

          // If both have unread or both don't have unread, sort by activity
          // Use the most recent of: updated_at, last_message.created_at, or created_at
          const getLastActivity = (chat: any) => {
            const updated = new Date(chat.updated_at || 0).getTime();
            const lastMessage = chat.last_message?.created_at ? new Date(chat.last_message.created_at).getTime() : 0;
            const created = new Date(chat.created_at || 0).getTime();
            return Math.max(updated, lastMessage, created);
          };

          const aActivity = getLastActivity(a);
          const bActivity = getLastActivity(b);

          return bActivity - aActivity; // Most recent first
        });

        // Merge with existing chats to preserve real-time updates
        const existingChatsMap = new Map(state.chats.map(chat => [chat.id, chat]));
        const mergedChats = sortedChats.map(serverChat => {
          const existingChat = existingChatsMap.get(serverChat.id);
          if (existingChat) {
            // Preserve real-time updates by keeping the more recent version
            const existingUpdated = new Date(existingChat.updated_at || existingChat.created_at || 0).getTime();
            const serverUpdated = new Date(serverChat.updated_at || serverChat.created_at || 0).getTime();

            if (existingUpdated >= serverUpdated) {
              console.log('📱 [Redux] Keeping existing chat data for:', serverChat.id);
              return existingChat;
            }
          }
          return serverChat;
        });

        state.chats = mergedChats;

        console.log('📱 [Redux] Final chats after merge:', state.chats.map(c => ({
          id: c.id,
          name: c.name || 'Direct Chat',
          updated_at: c.updated_at,
          created_at: c.created_at,
          last_message: c.last_message?.created_at
        })));

        state.lastFetch = now;
        state.error = null;
      })
      .addCase(fetchUserChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create chat
      .addCase(createChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createChat.fulfilled, (state, action) => {
        state.loading = false;
        // Add new chat and maintain proper sorting
        state.chats.push(action.payload);

        // Re-sort chats to maintain proper order (unread priority + activity)
        state.chats.sort((a, b) => {
          // First priority: Unread chats come first
          const aHasUnread = (a.unread_count || 0) > 0;
          const bHasUnread = (b.unread_count || 0) > 0;

          if (aHasUnread && !bHasUnread) return -1; // a comes first
          if (!aHasUnread && bHasUnread) return 1;  // b comes first

          // If both have unread or both don't have unread, sort by activity
          const getLastActivity = (chat: any) => {
            const updated = new Date(chat.updated_at || 0).getTime();
            const lastMessage = chat.last_message?.created_at ? new Date(chat.last_message.created_at).getTime() : 0;
            const created = new Date(chat.created_at || 0).getTime();
            return Math.max(updated, lastMessage, created);
          };

          const aActivity = getLastActivity(a);
          const bActivity = getLastActivity(b);

          return bActivity - aActivity; // Most recent first
        });

        state.error = null;
      })
      .addCase(createChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Get chat details
      .addCase(getChatDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getChatDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentChat = action.payload;
        state.error = null;
      })
      .addCase(getChatDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Join chat
      .addCase(joinChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(joinChat.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(joinChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Leave chat
      .addCase(leaveChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(leaveChat.fulfilled, (state, action) => {
        state.loading = false;
        state.chats = state.chats.filter(chat => chat.id !== action.payload);
        if (state.currentChat?.id === action.payload) {
          state.currentChat = null;
        }
        state.error = null;
      })
      .addCase(leaveChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Delete chat
      .addCase(deleteChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteChat.fulfilled, (state, action) => {
        state.loading = false;
        state.chats = state.chats.filter(chat => chat.id !== action.payload);
        if (state.currentChat?.id === action.payload) {
          state.currentChat = null;
        }
        state.error = null;
      })
      .addCase(deleteChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Archive chat
      .addCase(archiveChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(archiveChat.fulfilled, (state, action) => {
        state.loading = false;
        const chat = state.chats.find(c => c.id === action.payload);
        if (chat) {
          chat.is_archived = true;
          chat.archived_at = new Date().toISOString();
        }
        state.error = null;
      })
      .addCase(archiveChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Unarchive chat
      .addCase(unarchiveChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unarchiveChat.fulfilled, (state, action) => {
        state.loading = false;
        const chat = state.chats.find(c => c.id === action.payload);
        if (chat) {
          chat.is_archived = false;
          chat.archived_at = undefined;
        }
        state.error = null;
      })
      .addCase(unarchiveChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentChat,
  clearCurrentChat,
  addChat,
  updateChat,
  removeChat,
  updateChatLastMessage,
  incrementUnreadCount,
  clearUnreadCount,
  setUnreadCount,
  clearError,
  clearChats,
} = chatSlice.actions;

export default chatSlice.reducer;
