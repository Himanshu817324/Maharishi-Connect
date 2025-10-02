// services/chatService.ts
import { store } from '../store';
import { addMessage, updateMessageStatus, replaceMessageId } from '../store/slices/chatSlice';
import socketService from './socketService';
import chatApiService from './chatApiService';
import sqliteService from './sqliteService';
import logger from '../utils/logger';

class ChatService {
  private isInitialized = false;

  async initialize() {
    logger.info('Initializing chat service...');
    try {
      // Initialize SQLite
      await sqliteService.init();
      this.isInitialized = true;
      logger.info('Chat service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize chat service', error);
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
  }, senderId: string, retryCount = 0): Promise<any> {
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
      // Enhanced connection checking for release builds
      const isSocketConnected = socketService.getConnectionStatus();
      if (!isSocketConnected && retryCount === 0) {
        logger.warn('Socket not connected, attempting reconnection...');
        // Wait a brief moment for potential socket reconnection
        await new Promise<void>(resolve => setTimeout(resolve, 1000));
      }

      // Send via socket with retry logic
      const socketSent = socketService.sendMessage({
        chatId,
        content: messageData.content,
        messageType: messageData.messageType,
        tempId: clientId,
        senderId,
        createdAt: optimisticMessage.createdAt
      });

      if (!socketSent && retryCount === 0) {
        logger.warn('Socket send failed, will retry via API only');
      }

      // Send via API with enhanced error handling
      let apiMessage;
      try {
        apiMessage = await chatApiService.sendMessage(chatId, messageData);
      } catch (apiError) {
        logger.error('API send failed', apiError);

        // Retry logic for API failures (common in release builds)
        if (retryCount < 2) {
          logger.info(`Retrying API send (attempt ${retryCount + 1}/3)...`);
          await new Promise<void>(resolve => setTimeout(resolve, 1500 * (retryCount + 1)));
          return this.sendMessage(chatId, messageData, senderId, retryCount + 1);
        }
        throw apiError;
      }

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
      logger.error(`Error sending message (attempt ${retryCount + 1})`, error);

      // Enhanced retry logic for first-attempt failures
      if (retryCount < 2) {
        logger.info(`Retrying message send (attempt ${retryCount + 1}/3)...`);
        // Progressive backoff: 1s, 2s, 3s
        await new Promise<void>(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.sendMessage(chatId, messageData, senderId, retryCount + 1);
      }

      // Final failure after all retries
      logger.error('Message send failed after all retries', { chatId, messageId: clientId });
      store.dispatch(updateMessageStatus({ messageId: clientId, status: 'failed' }));
      await sqliteService.updateMessageStatus(clientId, 'failed');
      throw error;
    }
  }
}

export default new ChatService();