// Updated socket service using optimized Socket.IO
// This maintains compatibility with your existing backend

import OptimizedSocketIO, { createOptimizedSocketIO } from './optimizedSocketIO';
import { logger } from '@/utils/logger';

class SocketService {
  private socket: OptimizedSocketIO | null = null;
  private isInitialized = false;

  async initialize(url: string, token?: string): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Socket service already initialized');
      return;
    }

    try {
      this.socket = createOptimizedSocketIO({
        url,
        options: {
          auth: {
            token: token
          }
        },
        onConnect: () => {
          logger.info('Socket connected successfully');
          console.log('🔌 [SocketService] Socket connected successfully');
        },
        onDisconnect: () => {
          logger.warn('Socket disconnected');
          console.log('🔌 [SocketService] Socket disconnected');
        },
        onError: (error) => {
          logger.error('Socket error:', error);
          console.log('🔌 [SocketService] Socket error:', error);
        },
        onMessage: (event, data) => {
          logger.debug(`Received message: ${event}`, data);
          console.log('🔌 [SocketService] Received message:', event, data);
        }
      });

      await this.socket.connect();
      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize socket:', error);
      throw error;
    }
  }

  // Message sending
  sendMessage(chatId: string, content: string, messageType: string = 'text'): void {
    if (!this.socket?.isConnected) {
      logger.warn('Socket not connected, cannot send message');
      return;
    }

    console.log('📤 [SocketService] Sending message immediately:', { chatId, content, messageType });
    this.socket.emit('send_message', {
      chatId: chatId,
      content,
      messageType: messageType,
      timestamp: new Date().toISOString()
    });
    console.log('✅ [SocketService] Message sent via socket');
  }

  // Typing indicators
  startTyping(chatId: string): void {
    if (!this.socket?.isConnected) return;
    
    this.socket.emit('typing_start', {
      chatId: chatId
    });
  }

  stopTyping(chatId: string): void {
    if (!this.socket?.isConnected) return;
    
    this.socket.emit('typing_stop', {
      chatId: chatId
    });
  }

  // Message status updates
  markAsRead(messageId: string, chatId: string): void {
    if (!this.socket?.isConnected) return;
    
    this.socket.emit('mark_read', { 
      message_id: messageId, 
      chat_id: chatId 
    });
  }

  // Event listeners
  onNewMessage(callback: (message: any) => void): void {
    this.socket?.on('new_message', callback);
  }

  onTypingStart(callback: (data: any) => void): void {
    this.socket?.on('typing_start', callback);
  }

  onTypingStop(callback: (data: any) => void): void {
    this.socket?.on('typing_stop', callback);
  }

  onMessageStatusUpdate(callback: (data: any) => void): void {
    this.socket?.on('message_status_update', callback);
  }

  onChatCreated(callback: (chat: any) => void): void {
    this.socket?.on('chat_created', callback);
  }

  addChatCreatedListener(callback: (chat: any) => void): () => void {
    this.socket?.on('chatCreated', callback);
    return () => this.socket?.off('chatCreated', callback);
  }

  // Additional listener methods
  addConnectionListener(callback: (connected: boolean) => void): () => void {
    const connectHandler = () => callback(true);
    const disconnectHandler = () => callback(false);
    
    this.socket?.on('connect', connectHandler);
    this.socket?.on('disconnect', disconnectHandler);
    
    return () => {
      this.socket?.off('connect', connectHandler);
      this.socket?.off('disconnect', disconnectHandler);
    };
  }

  addMessageListener(callback: (message: any) => void): () => void {
    console.log('🔌 [SocketService] Adding message listener, socket connected:', this.socket?.isConnected);
    this.socket?.on('newMessage', callback);
    return () => {
      console.log('🔌 [SocketService] Removing message listener');
      this.socket?.off('newMessage', callback);
    };
  }

  addMessageSentListener(callback: (message: any) => void): () => void {
    this.socket?.on('messageSent', callback);
    return () => this.socket?.off('messageSent', callback);
  }

  addMessageDeliveredListener(callback: (data: any) => void): () => void {
    this.socket?.on('messageDelivered', callback);
    return () => this.socket?.off('messageDelivered', callback);
  }

  addJoinedChatListener(callback: (data: any) => void): () => void {
    this.socket?.on('joinedChat', callback);
    return () => this.socket?.off('joinedChat', callback);
  }

  addUserOnlineListener(callback: (userData: any) => void): () => void {
    this.socket?.on('userOnline', callback);
    return () => this.socket?.off('userOnline', callback);
  }

  addUserOfflineListener(callback: (userData: any) => void): () => void {
    this.socket?.on('userOffline', callback);
    return () => this.socket?.off('userOffline', callback);
  }

  // Chat management
  joinChat(chatId: string): void {
    this.socket?.emit('join_chat', chatId);
  }

  addTypingListener(callback: (data: any) => void): () => void {
    this.socket?.on('user_typing', callback);
    return () => this.socket?.off('user_typing', callback);
  }

  // Read receipts
  addReadReceiptListener(callback: (data: any) => void): () => void {
    this.socket?.on('read_receipt', callback);
    return () => this.socket?.off('read_receipt', callback);
  }

  markMessageAsSeen(messageId: string): void {
    this.socket?.emit('mark_message_seen', { message_id: messageId });
  }

  markChatAsRead(chatId: string): void {
    this.socket?.emit('mark_chat_read', { chat_id: chatId });
  }

  // Message status
  addMessageStatusListener(callback: (data: any) => void): () => void {
    this.socket?.on('message_status', callback);
    return () => this.socket?.off('message_status', callback);
  }

  markMessageAsDelivered(messageId: string): void {
    this.socket?.emit('mark_message_delivered', { message_id: messageId });
  }

  // Connection management
  async connect(): Promise<void> {
    if (this.socket) {
      return this.socket.connect();
    }
    throw new Error('Socket not initialized');
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
    }
  }

  async reconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      await this.socket.connect();
    } else {
      throw new Error('Socket not initialized');
    }
  }

  isSocketConnected(): boolean {
    return this.socket?.isConnected || false;
  }

  get isConnected(): boolean {
    return this.socket?.isConnected || false;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }

  // Additional event listeners from reference implementation
  addChatJoinedListener(callback: (data: any) => void): () => void {
    this.socket?.on('chatJoined', callback);
    return () => this.socket?.off('chatJoined', callback);
  }

  addChatLeftListener(callback: (data: any) => void): () => void {
    this.socket?.on('chatLeft', callback);
    return () => this.socket?.off('chatLeft', callback);
  }

  addMessageReactionListener(callback: (data: any) => void): () => void {
    this.socket?.on('messageReaction', callback);
    return () => this.socket?.off('messageReaction', callback);
  }

  addMessagePinnedListener(callback: (data: any) => void): () => void {
    this.socket?.on('messagePinned', callback);
    return () => this.socket?.off('messagePinned', callback);
  }

  addChatArchivedListener(callback: (data: any) => void): () => void {
    this.socket?.on('chatArchived', callback);
    return () => this.socket?.off('chatArchived', callback);
  }

  addErrorListener(callback: (error: any) => void): () => void {
    this.socket?.on('error', callback);
    return () => this.socket?.off('error', callback);
  }
}

// Singleton instance
export const socketService = new SocketService();
export default socketService;