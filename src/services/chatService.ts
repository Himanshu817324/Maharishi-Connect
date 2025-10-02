// services/chatService.ts
import { store } from '../store';
import { addMessage, updateMessageStatus, replaceMessageId } from '../store/slices/chatSlice';
import socketService from './socketService';
import chatApiService from './chatApiService';
import sqliteService from './sqliteService';

class ChatService {
  private isInitialized = false;

  async initialize() {
    console.log('🚀 Initializing chat service...');
    try {
      // Initialize SQLite
      await sqliteService.init();
      this.isInitialized = true;
      console.log('✅ Chat service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize chat service:', error);
      throw error;
    }
  }

  async loadChats() {
    console.log('📥 Loading chats via chat service...');
    // This is handled by the ChatScreen component now
    // The initialization just ensures SQLite is ready
    return [];
  }

  isServiceInitialized() {
    return this.isInitialized;
  }

  async sendMessage(chatId: string, messageData: {
    content: string;
    messageType: string;
    mediaUrl?: string;
    replyToMessageId?: string;
  }, senderId: string) {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const optimisticMessage = {
      _id: clientId,
      text: messageData.content,
      chatId,
      senderId,
      createdAt: new Date().toISOString(),
      status: 'sending' as const,
      user: {
        _id: senderId,
        name: 'You'
      }
    };

    // Add to Redux immediately
    store.dispatch(addMessage(optimisticMessage));

    // Save to SQLite immediately
    await sqliteService.saveMessage({
      clientId,
      id: null,
      chatId,
      content: messageData.content,
      text: messageData.content,
      senderId,
      timestamp: optimisticMessage.createdAt,
      createdAt: optimisticMessage.createdAt,
      status: 'sending'
    });

    try {
      // Send via socket
      socketService.sendMessage({
        chatId,
        content: messageData.content,
        messageType: messageData.messageType,
        tempId: clientId,
        senderId,
        createdAt: optimisticMessage.createdAt
      });
      
      // Send via API
      const apiMessage = await chatApiService.sendMessage(chatId, messageData);
      const serverId = apiMessage?._id || apiMessage?.id;
      
      if (serverId) {
        // Update with server ID
        store.dispatch(replaceMessageId({ tempId: clientId, serverId, chatId }));
        store.dispatch(updateMessageStatus({ messageId: serverId, status: 'sent' }));
        
        // Update SQLite
        await sqliteService.updateMessageIdByClientId(clientId, serverId);
        await sqliteService.updateMessageStatus(serverId, 'sent');
      }
      
      return apiMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      store.dispatch(updateMessageStatus({ messageId: clientId, status: 'failed' }));
      await sqliteService.updateMessageStatus(clientId, 'failed');
      throw error;
    }
  }
}

export default new ChatService();