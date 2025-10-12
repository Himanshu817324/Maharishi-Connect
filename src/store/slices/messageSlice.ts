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

// Utility function for enhanced duplicate detection
const findDuplicateMessage = (messages: MessageData[], message: MessageData): number => {
  return messages.findIndex(m => {
    // Primary check: exact ID match
    if (m.id === message.id) return true;
    
    // Secondary check: same content, sender, and timestamp (within 1 second)
    const timeDiff = Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime());
    return (
      m.content === message.content &&
      m.sender_id === message.sender_id &&
      timeDiff < 1000 && // Within 1 second
      m.message_type === message.message_type
    );
  });
};

// Utility function to remove duplicate messages by ID
const removeDuplicateMessages = (messages: MessageData[]): MessageData[] => {
  return messages.filter((message, index, array) => {
    return array.findIndex(m => m.id === message.id) === index;
  });
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
      state.currentChatId = chatId;
      
      // Get messages for this chat and remove duplicates
      const messages = state.messages[chatId] || [];
      const uniqueMessages = removeDuplicateMessages(messages);
      
      console.log('🔄 [setCurrentChatMessages] Setting current chat messages:', {
        chatId: chatId,
        originalCount: messages.length,
        uniqueCount: uniqueMessages.length,
        removedDuplicates: messages.length - uniqueMessages.length
      });
      
      state.currentChatMessages = uniqueMessages;
    },
    clearCurrentChatMessages: (state) => {
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

      // Add stack trace for debugging
      console.log('🔄 [addMessage] Called from:', new Error().stack?.split('\n')[2]?.trim());

      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }

      // Map server status to client status
      const mappedMessage = {
        ...message,
        status: message.status ? mapServerStatusToClient(message.status) : 'sent'
      };

      // Enhanced duplicate detection - check by ID, content, sender, and timestamp
      const existingIndex = findDuplicateMessage(state.messages[chatId], message);

      if (existingIndex >= 0) {
        console.log('🔄 [addMessage] Updating existing message:', {
          messageId: message.id,
          chatId: chatId,
          existingIndex: existingIndex,
          content: message.content,
          senderId: message.sender_id,
          timestamp: message.created_at
        });
        // Update existing message with new data (preserve optimistic status if needed)
        const existingMessage = state.messages[chatId][existingIndex];
        state.messages[chatId][existingIndex] = {
          ...mappedMessage,
          // Keep optimistic status if the existing message is still sending
          status: existingMessage.status === 'sending' ? existingMessage.status : mappedMessage.status
        };
      } else {
        console.log('🔄 [addMessage] Adding new message:', {
          messageId: message.id,
          chatId: chatId,
          content: message.content,
          senderId: message.sender_id,
          timestamp: message.created_at,
          totalMessagesInChat: state.messages[chatId].length
        });
        state.messages[chatId].push(mappedMessage);
        // Sort messages by created_at
        state.messages[chatId].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      // Update current chat messages if this is the current chat
      if (state.currentChatId === chatId) {
        // Remove duplicates from current chat messages
        const uniqueMessages = removeDuplicateMessages(state.messages[chatId]);
        state.currentChatMessages = uniqueMessages;
      }
    },
    addMessageAndCreateChat: (state, action: PayloadAction<{ message: MessageData; chat: any }>) => {
      const { message } = action.payload;
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
      }
    },
    clearChatMessages: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      state.messages[chatId] = [];
      if (state.currentChatId === chatId) {
        state.currentChatMessages = [];
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

      // Update message in the messages object
      if (state.messages[chatId]) {
        const messageIndex = state.messages[chatId].findIndex(m => m.id === messageId);

        if (messageIndex >= 0) {
          const message = state.messages[chatId][messageIndex];

          // Update status
          message.status = status;

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

        }
      }

      // Update current chat messages if this is the current chat
      if (state.currentChatId === chatId) {
        const messageIndex = state.currentChatMessages.findIndex(m => m.id === messageId);
        if (messageIndex >= 0) {
          const message = state.currentChatMessages[messageIndex];

          // Update status
          message.status = status;

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
        
        // Enhanced duplicate detection for fetched messages
        const newMessages: MessageData[] = [];
        
        for (const message of messages) {
          const mappedMessage = {
            ...message,
            status: message.status ? mapServerStatusToClient(message.status) : 'sent'
          };
          
          // Check if message already exists using enhanced detection
          const existingIndex = findDuplicateMessage(state.messages[chatId], message);
          
          if (existingIndex >= 0) {
            console.log('🔄 [fetchChatMessages] Updating existing message:', message.id);
            // Update existing message
            state.messages[chatId][existingIndex] = mappedMessage;
          } else {
            console.log('🔄 [fetchChatMessages] Adding new message:', message.id);
            newMessages.push(mappedMessage);
          }
        }
        
        // Add new messages and sort by created_at (only if needed)
        if (newMessages.length > 0) {
          state.messages[chatId] = [...state.messages[chatId], ...newMessages];
          // Only sort if we have more than 1 message
          if (state.messages[chatId].length > 1) {
            state.messages[chatId].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          }
        }
        
        // Update pagination state
        state.pagination[chatId] = {
          hasMore: pagination.hasMore,
          isLoadingOlder: false,
        };
        
        state.lastFetch[chatId] = Date.now();
        state.error = null;
        
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
      .addCase(sendMessage.fulfilled, (state, _action) => {
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
      .addCase(markMessageAsRead.fulfilled, (state, _action) => {
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
      .addCase(searchMessages.fulfilled, (state, _action) => {
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
      .addCase(addReaction.fulfilled, (state, _action) => {
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
      .addCase(removeReaction.fulfilled, (state, _action) => {
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
      .addCase(pinMessage.fulfilled, (state, _action) => {
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
      .addCase(unpinMessage.fulfilled, (state, _action) => {
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
      .addCase(getPinnedMessages.fulfilled, (state, _action) => {
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
