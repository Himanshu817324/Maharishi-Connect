import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { messageService, MessageQueueItem } from '@/services/messageService';
import { MessageData } from '@/services/chatService';
import { mapServerStatusToClient } from '@/services/messageStatusService';

export interface MessageState {
  messages: { [chatId: string]: MessageData[] };
  currentChatMessages: MessageData[];
  currentChatId: string | null;
  loading: boolean;
  error: string | null;
  messageQueue: MessageQueueItem[];
  typingUsers: { [chatId: string]: string[] };
  lastFetch: { [chatId: string]: number };
  pagination: { [chatId: string]: { hasMore: boolean; isLoadingOlder: boolean } };
}

const initialState: MessageState = {
  messages: {},
  currentChatMessages: [],
  currentChatId: null,
  loading: false,
  error: null,
  messageQueue: [],
  typingUsers: {},
  lastFetch: {},
  pagination: {},
};

// Async thunks
export const fetchChatMessages = createAsyncThunk(
  'message/fetchChatMessages',
  async (params: {
    chatId: string;
    limit?: number;
    offset?: number;
    beforeMessageId?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await messageService.getChatMessages(
        params.chatId,
        {
          limit: params.limit,
          offset: params.offset,
          beforeMessageId: params.beforeMessageId,
        }
      );
      return { 
        chatId: params.chatId, 
        messages: response.messages,
        pagination: response.pagination || { hasMore: false, limit: 0, offset: 0 }
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch messages');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'message/sendMessage',
  async (params: {
    chatId: string;
    content: string;
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'file';
    mediaUrl?: string;
    mediaMetadata?: {
      filename: string;
      size: number;
      mimeType: string;
    };
    replyToMessageId?: string;
  }, { rejectWithValue }) => {
    try {
      const messageId = await messageService.sendMessage(
        params.chatId,
        params.content,
        params.messageType || 'text',
        {
          mediaUrl: params.mediaUrl,
          mediaMetadata: params.mediaMetadata,
          replyToMessageId: params.replyToMessageId,
        }
      );
      return { messageId, chatId: params.chatId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send message');
    }
  }
);

export const editMessage = createAsyncThunk(
  'message/editMessage',
  async (params: {
    messageId: string;
    content: string;
  }, { rejectWithValue }) => {
    try {
      const updatedMessage = await messageService.editMessage(
        params.messageId,
        params.content
      );
      return updatedMessage;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to edit message');
    }
  }
);

export const deleteMessage = createAsyncThunk(
  'message/deleteMessage',
  async (messageId: string, { rejectWithValue }) => {
    try {
      await messageService.deleteMessage(messageId);
      return messageId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete message');
    }
  }
);

export const markMessageAsRead = createAsyncThunk(
  'message/markMessageAsRead',
  async (messageId: string, { rejectWithValue }) => {
    try {
      await messageService.markMessageAsRead(messageId);
      return messageId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark message as read');
    }
  }
);

export const searchMessages = createAsyncThunk(
  'message/searchMessages',
  async (params: {
    q: string;
    chatId?: string;
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'file';
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }, { rejectWithValue }) => {
    try {
      const messages = await messageService.searchMessages(params);
      return messages;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to search messages');
    }
  }
);

export const addReaction = createAsyncThunk(
  'message/addReaction',
  async (params: {
    messageId: string;
    emoji: string;
  }, { rejectWithValue }) => {
    try {
      await messageService.addReaction(params.messageId, params.emoji);
      return { messageId: params.messageId, emoji: params.emoji };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add reaction');
    }
  }
);

export const removeReaction = createAsyncThunk(
  'message/removeReaction',
  async (params: {
    messageId: string;
    emoji: string;
  }, { rejectWithValue }) => {
    try {
      await messageService.removeReaction(params.messageId, params.emoji);
      return { messageId: params.messageId, emoji: params.emoji };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to remove reaction');
    }
  }
);

export const pinMessage = createAsyncThunk(
  'message/pinMessage',
  async (params: {
    chatId: string;
    messageId: string;
  }, { rejectWithValue }) => {
    try {
      await messageService.pinMessage(params.chatId, params.messageId);
      return { chatId: params.chatId, messageId: params.messageId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to pin message');
    }
  }
);

export const unpinMessage = createAsyncThunk(
  'message/unpinMessage',
  async (params: {
    chatId: string;
    messageId: string;
  }, { rejectWithValue }) => {
    try {
      await messageService.unpinMessage(params.chatId, params.messageId);
      return { chatId: params.chatId, messageId: params.messageId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to unpin message');
    }
  }
);

export const getPinnedMessages = createAsyncThunk(
  'message/getPinnedMessages',
  async (chatId: string, { rejectWithValue }) => {
    try {
      const messages = await messageService.getPinnedMessages(chatId);
      return { chatId, messages };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to get pinned messages');
    }
  }
);

const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    setCurrentChatMessages: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      console.log('🔄 Setting current chat messages for:', chatId, 'Messages count:', state.messages[chatId]?.length || 0);
      state.currentChatId = chatId;
      state.currentChatMessages = state.messages[chatId] || [];
    },
    clearCurrentChatMessages: (state) => {
      console.log('🧹 Clearing current chat messages');
      state.currentChatId = null;
      state.currentChatMessages = [];
    },
    setLoadingOlderMessages: (state, action: PayloadAction<{ chatId: string; isLoading: boolean }>) => {
      const { chatId, isLoading } = action.payload;
      if (!state.pagination[chatId]) {
        state.pagination[chatId] = { hasMore: true, isLoadingOlder: false };
      }
      state.pagination[chatId].isLoadingOlder = isLoading;
    },
    addMessage: (state, action: PayloadAction<MessageData>) => {
      const message = action.payload;
      const chatId = message.chat_id;

      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }

      // Map server status to client status
      const mappedMessage = {
        ...message,
        status: message.status ? mapServerStatusToClient(message.status) : 'sent'
      };

      // Check if message already exists
      const existingIndex = state.messages[chatId].findIndex(m => m.id === message.id);
      if (existingIndex >= 0) {
        state.messages[chatId][existingIndex] = mappedMessage;
      } else {
        state.messages[chatId].push(mappedMessage);
        // Sort messages by created_at
        state.messages[chatId].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      // Update current chat messages if this is the current chat
      if (state.currentChatId === chatId) {
        state.currentChatMessages = state.messages[chatId];
        console.log('🔄 Updated currentChatMessages for current chat:', chatId, 'Message count:', state.messages[chatId].length);
      }
    },
    addMessageAndCreateChat: (state, action: PayloadAction<{ message: MessageData; chat: any }>) => {
      const { message, chat } = action.payload;
      const chatId = message.chat_id;

      // Add message
      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }

      // Map server status to client status
      const mappedMessage = {
        ...message,
        status: message.status ? mapServerStatusToClient(message.status) : 'sent'
      };

      const existingIndex = state.messages[chatId].findIndex(m => m.id === message.id);
      if (existingIndex >= 0) {
        state.messages[chatId][existingIndex] = mappedMessage;
      } else {
        state.messages[chatId].push(mappedMessage);
        state.messages[chatId].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      // Update current chat messages if this is the current chat
      if (state.currentChatId === chatId) {
        state.currentChatMessages = state.messages[chatId];
        console.log('🔄 Updated currentChatMessages for current chat:', chatId, 'Message count:', state.messages[chatId].length);
      }
    },
    updateMessage: (state, action: PayloadAction<MessageData>) => {
      const message = action.payload;
      const chatId = message.chat_id;

      // Map server status to client status
      const mappedMessage = {
        ...message,
        status: message.status ? mapServerStatusToClient(message.status) : 'sent'
      };

      if (state.messages[chatId]) {
        const index = state.messages[chatId].findIndex(m => m.id === message.id);
        if (index >= 0) {
          state.messages[chatId][index] = mappedMessage;
        }
      }

      // Update current chat messages if this is the current chat
      if (state.currentChatId === chatId) {
        const index = state.currentChatMessages.findIndex(m => m.id === message.id);
        if (index >= 0) {
          state.currentChatMessages[index] = mappedMessage;
          console.log('🔄 Updated message in current chat:', chatId, 'Message ID:', message.id);
        }
      }
    },
    removeMessage: (state, action: PayloadAction<{ messageId: string; chatId: string }>) => {
      const { messageId, chatId } = action.payload;

      if (state.messages[chatId]) {
        state.messages[chatId] = state.messages[chatId].filter(m => m.id !== messageId);
      }

      // Update current chat messages if this is the current chat
      if (state.currentChatId === chatId) {
        state.currentChatMessages = state.currentChatMessages.filter(m => m.id !== messageId);
        console.log('🔄 Removed message from current chat:', chatId, 'Message ID:', messageId);
      }
    },
    clearChatMessages: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      state.messages[chatId] = [];
      if (state.currentChatId === chatId) {
        state.currentChatMessages = [];
        console.log('🔄 Cleared messages for current chat:', chatId);
      }
    },
    addToQueue: (state, action: PayloadAction<MessageQueueItem>) => {
      const existingIndex = state.messageQueue.findIndex(m => m.id === action.payload.id);
      if (existingIndex >= 0) {
        state.messageQueue[existingIndex] = action.payload;
      } else {
        state.messageQueue.push(action.payload);
      }
    },
    updateQueueItem: (state, action: PayloadAction<MessageQueueItem>) => {
      const index = state.messageQueue.findIndex(m => m.id === action.payload.id);
      if (index >= 0) {
        state.messageQueue[index] = action.payload;
      }
    },
    removeFromQueue: (state, action: PayloadAction<string>) => {
      state.messageQueue = state.messageQueue.filter(m => m.id !== action.payload);
    },
    setTypingUsers: (state, action: PayloadAction<{ chatId: string; users: string[] }>) => {
      const { chatId, users } = action.payload;
      state.typingUsers[chatId] = users;
    },
    addTypingUser: (state, action: PayloadAction<{ chatId: string; userId: string }>) => {
      const { chatId, userId } = action.payload;
      if (!state.typingUsers[chatId]) {
        state.typingUsers[chatId] = [];
      }
      if (!state.typingUsers[chatId].includes(userId)) {
        state.typingUsers[chatId].push(userId);
      }
    },
    removeTypingUser: (state, action: PayloadAction<{ chatId: string; userId: string }>) => {
      const { chatId, userId } = action.payload;
      if (state.typingUsers[chatId]) {
        state.typingUsers[chatId] = state.typingUsers[chatId].filter(id => id !== userId);
      }
    },
    clearTypingUsers: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      state.typingUsers[chatId] = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    clearAllMessages: (state) => {
      state.messages = {};
      state.currentChatMessages = [];
      state.currentChatId = null;
      state.messageQueue = [];
      state.typingUsers = {};
      state.lastFetch = {};
    },
    updateMessageStatus: (state, action: PayloadAction<{
      messageId: string;
      chatId: string;
      status: 'sent' | 'delivered' | 'seen' | 'sending' | 'failed';
      userId?: string;
      timestamp?: string;
    }>) => {
      const { messageId, chatId, status, userId, timestamp } = action.payload;
      console.log('📊 [Redux] updateMessageStatus called:', { messageId, chatId, status, userId, timestamp });
      console.log('📊 [Redux] Available chats:', Object.keys(state.messages));
      console.log('📊 [Redux] Messages in chat:', state.messages[chatId]?.length || 0);

      // Update message in the messages object
      if (state.messages[chatId]) {
        const messageIndex = state.messages[chatId].findIndex(m => m.id === messageId);
        console.log('📊 [Redux] Message index found:', messageIndex);

        if (messageIndex >= 0) {
          const message = state.messages[chatId][messageIndex];
          console.log('📊 [Redux] Found message:', { id: message.id, currentStatus: message.status });

          // Update status
          const oldStatus = message.status;
          message.status = status;
          console.log('📊 [Redux] Updated message status:', { messageId, oldStatus, newStatus: status });

          // Update read_by or delivered_to arrays
          if (status === 'seen' && userId && timestamp) {
            if (!message.read_by) {
              message.read_by = [];
            }
            // Check if user already marked as read
            const existingRead = message.read_by.find(r => r.user_id === userId);
            if (!existingRead) {
              message.read_by.push({
                user_id: userId,
                read_at: timestamp
              });
            }
          } else if (status === 'delivered' && userId && timestamp) {
            if (!message.delivered_to) {
              message.delivered_to = [];
            }
            // Check if user already marked as delivered
            const existingDelivered = message.delivered_to.find(d => d.user_id === userId);
            if (!existingDelivered) {
              message.delivered_to.push({
                user_id: userId,
                delivered_at: timestamp
              });
            }
          }

          console.log('📊 [Redux] Updated message status:', {
            messageId,
            chatId,
            status,
            userId,
            timestamp
          });
        }
      }

      // Update current chat messages if this is the current chat
      if (state.currentChatId === chatId) {
        const messageIndex = state.currentChatMessages.findIndex(m => m.id === messageId);
        if (messageIndex >= 0) {
          const message = state.currentChatMessages[messageIndex];

          // Update status
          const oldCurrentStatus = message.status;
          message.status = status;
          console.log('📊 [Redux] Updated current chat message status:', { messageId, oldStatus: oldCurrentStatus, newStatus: status });

          // Update read_by or delivered_to arrays
          if (status === 'seen' && userId && timestamp) {
            if (!message.read_by) {
              message.read_by = [];
            }
            const existingRead = message.read_by.find(r => r.user_id === userId);
            if (!existingRead) {
              message.read_by.push({
                user_id: userId,
                read_at: timestamp
              });
            }
          } else if (status === 'delivered' && userId && timestamp) {
            if (!message.delivered_to) {
              message.delivered_to = [];
            }
            const existingDelivered = message.delivered_to.find(d => d.user_id === userId);
            if (!existingDelivered) {
              message.delivered_to.push({
                user_id: userId,
                delivered_at: timestamp
              });
            }
          }

          console.log('📊 [Redux] Updated current chat message status:', {
            messageId,
            chatId,
            status,
            userId,
            timestamp
          });
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch chat messages
      .addCase(fetchChatMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { chatId, messages, pagination } = action.payload;
        
        // Initialize messages array if it doesn't exist
        if (!state.messages[chatId]) {
          state.messages[chatId] = [];
        }
        
        // Merge new messages with existing ones, avoiding duplicates
        const existingMessageIds = new Set(state.messages[chatId].map(m => m.id));
        const newMessages = messages.filter(msg => !existingMessageIds.has(msg.id));
        
        // Add new messages and sort by created_at
        state.messages[chatId] = [...state.messages[chatId], ...newMessages]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // Update pagination state
        state.pagination[chatId] = {
          hasMore: pagination.hasMore,
          isLoadingOlder: false,
        };
        
        state.lastFetch[chatId] = Date.now();
        state.error = null;
        
        console.log(`📱 [Redux] Messages loaded for chat ${chatId}:`, {
          existingCount: state.messages[chatId].length - newMessages.length,
          newCount: newMessages.length,
          totalCount: state.messages[chatId].length,
          hasMore: pagination.hasMore
        });
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Edit message
      .addCase(editMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editMessage.fulfilled, (state, action) => {
        state.loading = false;
        const message = action.payload;
        const chatId = message.chat_id;

        if (state.messages[chatId]) {
          const index = state.messages[chatId].findIndex(m => m.id === message.id);
          if (index >= 0) {
            state.messages[chatId][index] = message;
          }
        }

        state.error = null;
      })
      .addCase(editMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Delete message
      .addCase(deleteMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMessage.fulfilled, (state, action) => {
        state.loading = false;
        const messageId = action.payload;

        // Find and remove message from all chats
        Object.keys(state.messages).forEach(chatId => {
          state.messages[chatId] = state.messages[chatId].filter(m => m.id !== messageId);
        });

        state.error = null;
      })
      .addCase(deleteMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Mark message as read
      .addCase(markMessageAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markMessageAsRead.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(markMessageAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Search messages
      .addCase(searchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(searchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Add reaction
      .addCase(addReaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addReaction.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(addReaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Remove reaction
      .addCase(removeReaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeReaction.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(removeReaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Pin message
      .addCase(pinMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(pinMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(pinMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Unpin message
      .addCase(unpinMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unpinMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(unpinMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Get pinned messages
      .addCase(getPinnedMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPinnedMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(getPinnedMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentChatMessages,
  clearCurrentChatMessages,
  setLoadingOlderMessages,
  addMessage,
  addMessageAndCreateChat,
  updateMessage,
  removeMessage,
  clearChatMessages,
  addToQueue,
  updateQueueItem,
  removeFromQueue,
  setTypingUsers,
  addTypingUser,
  removeTypingUser,
  clearTypingUsers,
  clearError,
  clearAllMessages,
  updateMessageStatus,
} = messageSlice.actions;

export default messageSlice.reducer;
