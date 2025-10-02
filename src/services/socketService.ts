import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import {
  addMessage,
  updateMessageStatus,
  setTyping,
  setOnlineStatus,
  addChat,
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
      name = other?.userDetails?.fullName || other?.fullName || other?.name || 'Unknown User';
    } else {
      name = 'Unknown';
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
  private typingTimeouts = new Map<string, NodeJS.Timeout>();
  private isTyping = false;

  connect(userId: string, token?: string): Promise<void> {
    if (this.socket?.connected) {
      this.isConnected = true;
      this.connectionStatus = 'connected';
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to socket server...');
      this.connectionStatus = 'connecting';

      this.socket = io('https://api.maharishiconnect.com', {
        auth: { userId, token },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });

      const onConnect = () => {
        console.log('✅ Socket connected successfully');
        this.isConnected = true;
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        this.socket?.off('connect_error', onConnectError);
        resolve();
      };

      const onConnectError = (err: any) => {
        console.error('❌ Socket connect error:', err);
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
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

        const formattedMessage = {
          _id: message._id || message.id,
          text: message.content || message.text,
          createdAt: message.created_at || message.createdAt || new Date().toISOString(),
          user: {
            _id: message.sender_id || message.senderId || message.user?._id,
            name: message.sender_name || message.senderName || message.user?.name || 'Unknown',
            avatar: message.sender_avatar || message.senderAvatar || message.user?.avatar,
          },
          chatId: message.chat_id || message.chatId,
          senderId: message.sender_id || message.senderId,
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
        
        store.dispatch(addMessage(formattedMessage as any));
      };

      this.socket?.off('newMessage');
      this.socket?.off('message');
      this.socket?.off('new_message');

      this.socket?.on('newMessage', handleIncoming);
      this.socket?.on('message', handleIncoming);
      this.socket?.on('new_message', handleIncoming);

      this.socket.on('messageDelivered', (data) => {
        store.dispatch(updateMessageStatus({ messageId: data.messageId, status: 'delivered' }));
      });
      this.socket.on('messageRead', (data) => {
        store.dispatch(updateMessageStatus({ messageId: data.messageId, status: 'read' }));
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
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  sendMessage(message: any) {
    if (this.socket?.connected) {
      console.log('📤 Sending message via socket:', message.tempId || message._id);
      this.socket.emit('message', message);
      return true;
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
    return this.isConnected;
  }

  getConnectionStatusString() {
    return this.connectionStatus;
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler);
    return () => this.socket?.off(event, handler);
  }

  addMessageListener(handler: (message: any) => void) {
    if (this.socket) this.socket.on('message', handler);
  }

  removeMessageListener(handler: (message: any) => void) {
    if (this.socket) this.socket.off('message', handler);
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
    if (this.socket) this.socket.on('messageReactionAdded', handler);
  }

  onMessageReactionRemoved(handler: (data: { messageId: string; emoji: string; userId: string }) => void) {
    if (this.socket) this.socket.on('messageReactionRemoved', handler);
  }
}

export default new SocketService();