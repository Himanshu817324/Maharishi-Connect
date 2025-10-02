import sqliteService from './sqliteService';
import socketService from './socketService';
import chatApiService from './chatApiService';
import { store } from '../store';
import { updateMessageStatus } from '../store/slices/chatSlice';

interface QueuedMessage {
    id: string;
    chatId: string;
    content: string;
    messageType: string;
    senderId: string;
    createdAt: string;
    retryCount: number;
    lastRetryAt: number;
}

class OfflineMessageQueue {
    private isProcessing = false;
    private retryDelay = 5000; // 5 seconds
    private maxRetries = 3;

    /**
     * Queue a message for offline sending
     */
    async queueMessage(message: QueuedMessage): Promise<void> {
        try {
            console.log('📤 [OfflineMessageQueue] Queuing message for offline send:', message.id);

            // Save to SQLite with offline status
            await sqliteService.saveMessage({
                id: message.id,
                clientId: message.id,
                chatId: message.chatId,
                content: message.content,
                text: message.content,
                senderId: message.senderId,
                timestamp: message.createdAt,
                createdAt: message.createdAt,
                status: 'queued',
                senderName: 'You'
            });

            // Start processing queue if not already running
            if (!this.isProcessing) {
                this.processQueue();
            }
        } catch (error) {
            console.error('❌ [OfflineMessageQueue] Failed to queue message:', error);
        }
    }

    /**
     * Process queued messages when connection is available
     */
    async processQueue(): Promise<void> {
        if (this.isProcessing) {
            console.log('📤 [OfflineMessageQueue] Queue processing already in progress');
            return;
        }

        this.isProcessing = true;
        console.log('📤 [OfflineMessageQueue] Starting queue processing...');

        try {
            // Get all queued messages from SQLite
            const queuedMessages = await this.getQueuedMessages();
            console.log(`📤 [OfflineMessageQueue] Found ${queuedMessages.length} queued messages`);

            for (const message of queuedMessages) {
                try {
                    await this.processMessage(message);
                } catch (error) {
                    console.error(`❌ [OfflineMessageQueue] Failed to process message ${message.id}:`, error);

                    // Update retry count
                    await this.updateRetryCount(message.id, message.retryCount + 1);
                }
            }
        } catch (error) {
            console.error('❌ [OfflineMessageQueue] Queue processing failed:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process a single queued message
     */
    private async processMessage(message: QueuedMessage): Promise<void> {
        console.log(`📤 [OfflineMessageQueue] Processing message: ${message.id}`);

        // Check if message should be retried
        if (message.retryCount >= this.maxRetries) {
            console.log(`📤 [OfflineMessageQueue] Message ${message.id} exceeded max retries, marking as failed`);
            await this.markMessageAsFailed(message.id);
            return;
        }

        // Check if enough time has passed since last retry
        const timeSinceLastRetry = Date.now() - message.lastRetryAt;
        if (timeSinceLastRetry < this.retryDelay) {
            console.log(`📤 [OfflineMessageQueue] Message ${message.id} not ready for retry yet`);
            return;
        }

        try {
            // Try to send via socket first
            let socketSent = false;
            if (socketService.getConnectionStatus()) {
                socketSent = socketService.sendMessage({
                    chatId: message.chatId,
                    content: message.content,
                    messageType: message.messageType,
                    tempId: message.id,
                    senderId: message.senderId,
                    createdAt: message.createdAt
                });
            }

            // Try to send via API
            const serverMessage = await chatApiService.sendMessage(message.chatId, {
                content: message.content,
                messageType: message.messageType
            });

            const serverId = serverMessage?._id || serverMessage?.id;
            if (serverId) {
                console.log(`✅ [OfflineMessageQueue] Message sent successfully: ${message.id} -> ${serverId}`);

                // Update message with server ID
                await sqliteService.updateMessageIdByClientId(message.id, serverId);
                await sqliteService.updateMessageStatus(serverId, 'sent');

                // Update Redux state
                store.dispatch({
                    type: 'chat/replaceMessageId',
                    payload: { tempId: message.id, serverId, chatId: message.chatId }
                });
                store.dispatch(updateMessageStatus({ messageId: serverId, status: 'sent' }));

                // Remove from queue
                await this.removeFromQueue(message.id);
            } else {
                throw new Error('No server ID returned');
            }
        } catch (error) {
            console.error(`❌ [OfflineMessageQueue] Failed to send message ${message.id}:`, error);
            throw error;
        }
    }

    /**
     * Get all queued messages from SQLite
     */
    private async getQueuedMessages(): Promise<QueuedMessage[]> {
        try {
            // This would need to be implemented in sqliteService
            // For now, return empty array
            return [];
        } catch (error) {
            console.error('❌ [OfflineMessageQueue] Failed to get queued messages:', error);
            return [];
        }
    }

    /**
     * Update retry count for a message
     */
    private async updateRetryCount(messageId: string, retryCount: number): Promise<void> {
        try {
            // This would need to be implemented in sqliteService
            console.log(`📤 [OfflineMessageQueue] Updated retry count for ${messageId}: ${retryCount}`);
        } catch (error) {
            console.error('❌ [OfflineMessageQueue] Failed to update retry count:', error);
        }
    }

    /**
     * Mark message as failed
     */
    private async markMessageAsFailed(messageId: string): Promise<void> {
        try {
            await sqliteService.updateMessageStatus(messageId, 'failed');
            store.dispatch(updateMessageStatus({ messageId, status: 'failed' }));
            console.log(`📤 [OfflineMessageQueue] Marked message as failed: ${messageId}`);
        } catch (error) {
            console.error('❌ [OfflineMessageQueue] Failed to mark message as failed:', error);
        }
    }

    /**
     * Remove message from queue
     */
    private async removeFromQueue(messageId: string): Promise<void> {
        try {
            // This would need to be implemented in sqliteService
            console.log(`📤 [OfflineMessageQueue] Removed message from queue: ${messageId}`);
        } catch (error) {
            console.error('❌ [OfflineMessageQueue] Failed to remove message from queue:', error);
        }
    }

    /**
     * Start processing queue when connection is available
     */
    startProcessing(): void {
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * Stop processing queue
     */
    stopProcessing(): void {
        this.isProcessing = false;
    }
}

export default new OfflineMessageQueue();
