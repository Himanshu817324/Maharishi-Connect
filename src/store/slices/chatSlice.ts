import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import chatApiService from '@/services/chatApiService';
import sqliteService from '@/services/sqliteService';

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
      if (!existing || (msg._id && !msg._id.startsWith('temp_'))) {
        messageMap.set(id, msg);
      }
    }
  }
  return Array.from(messageMap.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export const loadChatMessages = createAsyncThunk('chat/loadChatMessages', async (chatId: string, { rejectWithValue }) => {
  try {
    const localMessages = await sqliteService.getMessages(chatId);
    const formattedLocalMessages: Message[] = localMessages.map(msg => ({ _id: msg.id || msg.clientId || msg._id, text: msg.content || msg.text, chatId, senderId: msg.senderId, createdAt: msg.createdAt || msg.timestamp, status: msg.status || 'sent', user: { _id: msg.senderId, name: msg.senderName || 'User' } }));
    let apiMessages: Message[] = [];
    try {
      const rawApiMessages = await chatApiService.getChatMessages(chatId);
      apiMessages = rawApiMessages.map(msg => ({ _id: msg._id || msg.id, text: msg.content || msg.text, chatId, senderId: msg.senderId, createdAt: msg.createdAt, status: msg.status || 'sent', user: { _id: msg.senderId, name: msg.senderName || 'User' } }));
      for (const msg of apiMessages) { await sqliteService.saveMessage({ id: msg._id, clientId: msg._id, chatId, content: msg.text, text: msg.text, senderId: msg.senderId, timestamp: msg.createdAt, createdAt: msg.createdAt, status: msg.status }); }
    } catch (apiError) { console.error('API load error:', apiError); }
    const allMessages = [...formattedLocalMessages, ...apiMessages];
    const deduplicatedMessages = deduplicateMessages(allMessages);
    return { chatId, messages: deduplicatedMessages };
  } catch (error) { return rejectWithValue('Failed to load messages'); }
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
    clearMessagesForChat: (state, action: PayloadAction<string>) => { const chatId = action.payload; if (state.messages[chatId]) { state.messages[chatId] = []; } },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadChatMessages.pending, (state) => { state.isLoading = true; })
      .addCase(loadChatMessages.fulfilled, (state, action) => { const { chatId, messages } = action.payload; state.messages[chatId] = messages; state.isLoading = false; state.error = null; })
      .addCase(loadChatMessages.rejected, (state, action) => { state.error = action.payload as string; state.isLoading = false; });
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
  clearMessagesForChat,
} = chatSlice.actions;

export default chatSlice.reducer;