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
        },
        onDisconnect: () => {
          logger.warn('Socket disconnected');
        },
        onError: (error) => {
          logger.error('Socket error:', error);
        },
        onMessage: (event, data) => {
          logger.debug(`Received message: ${event}`, data);
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
      chat_id: chatId,
      content,
      message_type: messageType,
      timestamp: new Date().toISOString()
    });
    console.log('✅ [SocketService] Message sent via socket');
  }

  // Typing indicators
  startTyping(chatId: string): void {
    if (!this.socket?.isConnected) return;
    
    this.socket.emit('start_typing', { chat_id: chatId });
  }

  stopTyping(chatId: string): void {
    if (!this.socket?.isConnected) return;
    
    this.socket.emit('stop_typing', { chat_id: chatId });
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

  addChatCreatedListener(callback: (chat: any) => void): void {
    this.socket?.on('chat_created', callback);
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
    this.socket?.on('new_message', callback);
    return () => this.socket?.off('new_message', callback);
  }

  addMessageSentListener(callback: (message: any) => void): () => void {
    this.socket?.on('message_sent', callback);
    return () => this.socket?.off('message_sent', callback);
  }

  addMessageDeliveredListener(callback: (data: any) => void): () => void {
    this.socket?.on('message_delivered', callback);
    return () => this.socket?.off('message_delivered', callback);
  }

  addJoinedChatListener(callback: (data: any) => void): () => void {
    this.socket?.on('joined_chat', callback);
    return () => this.socket?.off('joined_chat', callback);
  }

  addUserOnlineListener(callback: (userData: any) => void): () => void {
    this.socket?.on('user_online', callback);
    return () => this.socket?.off('user_online', callback);
  }

  addUserOfflineListener(callback: (userData: any) => void): () => void {
    this.socket?.on('user_offline', callback);
    return () => this.socket?.off('user_offline', callback);
  }

  // Chat management
  joinChat(chatId: string): void {
    this.socket?.emit('join_chat', { chat_id: chatId });
  }

  addTypingListener(callback: (data: any) => void): () => void {
    this.socket?.on('typing', callback);
    return () => this.socket?.off('typing', callback);
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
}

// Singleton instance
export const socketService = new SocketService();
export default socketService;