import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatService, MessageData, MessageResponse } from './chatService';
import { socketService, SocketMessage } from './socketService';

export interface MessageQueueItem {
  id: string;
  chatId: string;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file';
  mediaUrl?: string;
  mediaMetadata?: {
    filename: string;
    size: number;
    mimeType: string;
  };
  replyToMessageId?: string;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'sending' | 'sent' | 'failed';
}

export interface MessageDeliveryStatus {
  messageId: string;
  chatId: string;
  deliveredTo: string[];
  deliveredAt: string;
}

class MessageService {
  private messageQueue: MessageQueueItem[] = [];
  private isProcessingQueue = false;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.loadMessageQueue();
  }

  // Load message queue from storage
  private async loadMessageQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('message_queue');
      if (stored) {
        this.messageQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading message queue:', error);
    }
  }

  // Save message queue to storage
  private async saveMessageQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('message_queue', JSON.stringify(this.messageQueue));
    } catch (error) {
      console.error('Error saving message queue:', error);
    }
  }

  // Add message to queue
  private addToQueue(messageData: Omit<MessageQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>): string {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queueItem: MessageQueueItem = {
      id,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      ...messageData,
    };

    this.messageQueue.push(queueItem);
    this.saveMessageQueue();
    return id;
  }

  // Process message queue
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.find(m => m.status === 'pending');
      if (!message) break;

      try {
        message.status = 'sending';
        await this.saveMessageQueue();

        // Try to send via Socket.IO first
        if (socketService.isSocketConnected()) {
          const socketMessage: SocketMessage = {
            chatId: message.chatId,
            content: message.content,
            messageType: message.messageType,
            mediaUrl: message.mediaUrl,
            mediaMetadata: message.mediaMetadata,
            replyToMessageId: message.replyToMessageId,
          };

          socketService.sendMessage(socketMessage);
          message.status = 'sent';
        } else {
          // Fallback to REST API
          await chatService.sendMessage(message.chatId, {
            content: message.content,
            messageType: message.messageType,
            mediaUrl: message.mediaUrl,
            mediaMetadata: message.mediaMetadata,
            replyToMessageId: message.replyToMessageId,
          });
          message.status = 'sent';
        }

        // Remove from queue after successful send
        this.messageQueue = this.messageQueue.filter(m => m.id !== message.id);
        await this.saveMessageQueue();

      } catch (error) {
        console.error('Error sending message:', error);
        message.retryCount++;
        
        if (message.retryCount >= this.maxRetries) {
          message.status = 'failed';
        } else {
          message.status = 'pending';
          // Exponential backoff
          setTimeout(() => {
            this.processQueue();
          }, this.retryDelay * Math.pow(2, message.retryCount));
        }
        
        await this.saveMessageQueue();
      }
    }

    this.isProcessingQueue = false;
  }

  // Send message (primary method)
  async sendMessage(
    chatId: string,
    content: string,
    messageType: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text',
    options: {
      mediaUrl?: string;
      mediaMetadata?: {
        filename: string;
        size: number;
        mimeType: string;
      };
      replyToMessageId?: string;
    } = {}
  ): Promise<string> {
    const messageId = this.addToQueue({
      chatId,
      content,
      messageType,
      mediaUrl: options.mediaUrl,
      mediaMetadata: options.mediaMetadata,
      replyToMessageId: options.replyToMessageId,
    });

    // Process queue immediately
    this.processQueue();

    return messageId;
  }

  // Send message via Socket.IO (immediate)
  sendMessageImmediate(
    chatId: string,
    content: string,
    messageType: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text',
    options: {
      mediaUrl?: string;
      mediaMetadata?: {
        filename: string;
        size: number;
        mimeType: string;
      };
      replyToMessageId?: string;
    } = {}
  ): void {
    if (!socketService.isSocketConnected()) {
      throw new Error('Socket not connected');
    }

    const socketMessage: SocketMessage = {
      chatId,
      content,
      messageType,
      mediaUrl: options.mediaUrl,
      mediaMetadata: options.mediaMetadata,
      replyToMessageId: options.replyToMessageId,
    };

    socketService.sendMessage(socketMessage);
  }

  // Get messages for a chat
  async getChatMessages(
    chatId: string,
    options: {
      limit?: number;
      offset?: number;
      beforeMessageId?: string;
    } = {}
  ): Promise<MessageData[]> {
    try {
      const response = await chatService.getChatMessages(chatId, options);
      return response.messages || [];
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw error;
    }
  }

  // Edit message
  async editMessage(messageId: string, content: string): Promise<MessageData> {
    try {
      const response = await chatService.editMessage(messageId, content);
      if (!response.data) {
        throw new Error('No message data returned');
      }
      return response.data;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  // Delete message
  async deleteMessage(messageId: string): Promise<void> {
    try {
      await chatService.deleteMessage(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Mark message as read
  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      await chatService.markMessageAsRead(messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  // Search messages
  async searchMessages(options: {
    q: string;
    chatId?: string;
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'file';
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<MessageData[]> {
    try {
      const response = await chatService.searchMessages(options);
      return response.messages || [];
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  // Add reaction
  async addReaction(messageId: string, emoji: string): Promise<void> {
    try {
      await chatService.addReaction(messageId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  // Remove reaction
  async removeReaction(messageId: string, emoji: string): Promise<void> {
    try {
      await chatService.removeReaction(messageId, emoji);
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  // Pin message
  async pinMessage(chatId: string, messageId: string): Promise<void> {
    try {
      await chatService.pinMessage(chatId, messageId);
    } catch (error) {
      console.error('Error pinning message:', error);
      throw error;
    }
  }

  // Unpin message
  async unpinMessage(chatId: string, messageId: string): Promise<void> {
    try {
      await chatService.unpinMessage(chatId, messageId);
    } catch (error) {
      console.error('Error unpinning message:', error);
      throw error;
    }
  }

  // Get pinned messages
  async getPinnedMessages(chatId: string): Promise<MessageData[]> {
    try {
      const response = await chatService.getPinnedMessages(chatId);
      return response.messages || [];
    } catch (error) {
      console.error('Error fetching pinned messages:', error);
      throw error;
    }
  }

  // Queue management
  getQueueStatus(): {
    total: number;
    pending: number;
    sending: number;
    sent: number;
    failed: number;
  } {
    const total = this.messageQueue.length;
    const pending = this.messageQueue.filter(m => m.status === 'pending').length;
    const sending = this.messageQueue.filter(m => m.status === 'sending').length;
    const sent = this.messageQueue.filter(m => m.status === 'sent').length;
    const failed = this.messageQueue.filter(m => m.status === 'failed').length;

    return { total, pending, sending, sent, failed };
  }

  // Clear failed messages
  async clearFailedMessages(): Promise<void> {
    this.messageQueue = this.messageQueue.filter(m => m.status !== 'failed');
    await this.saveMessageQueue();
  }

  // Retry failed messages
  async retryFailedMessages(): Promise<void> {
    this.messageQueue.forEach(message => {
      if (message.status === 'failed') {
        message.status = 'pending';
        message.retryCount = 0;
      }
    });
    await this.saveMessageQueue();
    this.processQueue();
  }

  // Get message by ID from queue
  getMessageFromQueue(messageId: string): MessageQueueItem | undefined {
    return this.messageQueue.find(m => m.id === messageId);
  }

  // Remove message from queue
  async removeFromQueue(messageId: string): Promise<void> {
    this.messageQueue = this.messageQueue.filter(m => m.id !== messageId);
    await this.saveMessageQueue();
  }
}

// Export singleton instance
export const messageService = new MessageService();
export default messageService;
