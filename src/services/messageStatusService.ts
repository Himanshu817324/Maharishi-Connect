import AsyncStorage from '@react-native-async-storage/async-storage';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen' | 'failed';

// Server status mapping - server sends 'read' but client expects 'seen'
export const mapServerStatusToClient = (serverStatus: string): MessageStatus => {
  switch (serverStatus) {
    case 'read':
      return 'seen';
    case 'sending':
    case 'sent':
    case 'delivered':
    case 'seen':
    case 'failed':
      return serverStatus as MessageStatus;
    default:
      console.warn(`Unknown server status: ${serverStatus}, defaulting to 'sent'`);
      return 'sent';
  }
};

export interface MessageStatusUpdate {
  messageId: string;
  status: MessageStatus;
  timestamp: string;
  userId?: string;
  error?: string;
}

export interface MessageStatusData {
  messageId: string;
  status: MessageStatus;
  sentAt?: string;
  deliveredAt?: string;
  seenAt?: string;
  failedAt?: string;
  error?: string;
  readBy: string[]; // Array of user IDs who have read the message
  deliveredTo: string[]; // Array of user IDs who have received the message
}

class MessageStatusService {
  private baseURL: string;
  private statusCache: Map<string, MessageStatusData> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  constructor() {
    this.baseURL = 'https://api.maharishiconnect.com/api';
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get message status
  async getMessageStatus(messageId: string): Promise<MessageStatusData> {
    try {
      console.log(`🔍 Getting message status for: ${messageId}`);

      // Check cache first
      const cached = this.statusCache.get(messageId);
      if (cached && Date.now() - new Date(cached.sentAt || '').getTime() < this.CACHE_DURATION) {
        console.log(`📱 Using cached status for message: ${messageId}`);
        return cached;
      }

      const response = await this.makeRequest<{ status: string; data: MessageStatusData }>(
        `/chat/messages/${messageId}/status`
      );

      console.log(`✅ Message status response for ${messageId}:`, response);

      // Cache the result
      this.statusCache.set(messageId, response.data);

      return response.data;
    } catch (error) {
      console.error(`❌ Error getting message status for ${messageId}:`, error);

      // Return cached data if available
      const cached = this.statusCache.get(messageId);
      if (cached) {
        console.log(`📱 Using expired cached status for message: ${messageId}`);
        return cached;
      }

      // Return default status
      return {
        messageId,
        status: 'sending',
        readBy: [],
        deliveredTo: [],
      };
    }
  }

  // Update message status
  async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    error?: string
  ): Promise<{ status: string; data: MessageStatusData }> {
    try {
      console.log(`🔄 Updating message status for ${messageId} to ${status}`);

      const response = await this.makeRequest<{ status: string; data: MessageStatusData }>(
        `/chat/messages/${messageId}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({
            status,
            error,
            timestamp: new Date().toISOString(),
          }),
        }
      );

      console.log(`✅ Message status updated for ${messageId}:`, response);

      // Update cache
      this.statusCache.set(messageId, response.data);

      return response;
    } catch (error) {
      console.error(`❌ Error updating message status for ${messageId}:`, error);
      throw error;
    }
  }

  // Mark message as delivered
  async markMessageAsDelivered(messageId: string): Promise<void> {
    try {
      await this.updateMessageStatus(messageId, 'delivered');
      console.log(`✅ Message ${messageId} marked as delivered`);
    } catch (error) {
      console.error(`❌ Error marking message as delivered:`, error);
      throw error;
    }
  }

  // Mark message as seen
  async markMessageAsSeen(messageId: string): Promise<void> {
    try {
      await this.updateMessageStatus(messageId, 'seen');
      console.log(`✅ Message ${messageId} marked as seen`);
    } catch (error) {
      console.error(`❌ Error marking message as seen:`, error);
      throw error;
    }
  }

  // Mark message as failed
  async markMessageAsFailed(messageId: string, error: string): Promise<void> {
    try {
      await this.updateMessageStatus(messageId, 'failed', error);
      console.log(`❌ Message ${messageId} marked as failed:`, error);
    } catch (err) {
      console.error(`❌ Error marking message as failed:`, err);
      throw err;
    }
  }

  // Get multiple messages status
  async getMultipleMessagesStatus(messageIds: string[]): Promise<Map<string, MessageStatusData>> {
    const statusMap = new Map<string, MessageStatusData>();

    try {
      console.log(`🔍 Getting status for ${messageIds.length} messages`);

      const response = await this.makeRequest<{ status: string; data: MessageStatusData[] }>(
        `/chat/messages/status/batch`,
        {
          method: 'POST',
          body: JSON.stringify({ messageIds }),
        }
      );

      response.data.forEach(statusData => {
        statusMap.set(statusData.messageId, statusData);
        this.statusCache.set(statusData.messageId, statusData);
      });

      console.log(`✅ Retrieved status for ${statusMap.size} messages`);
      return statusMap;
    } catch (error) {
      console.error('❌ Error getting multiple messages status:', error);
      return statusMap;
    }
  }

  // Get message read receipts
  async getMessageReadReceipts(messageId: string): Promise<{ userId: string; readAt: string }[]> {
    try {
      console.log(`🔍 Getting read receipts for message: ${messageId}`);

      const response = await this.makeRequest<{ status: string; data: { userId: string; readAt: string }[] }>(
        `/chat/messages/${messageId}/read-receipts`
      );

      console.log(`✅ Read receipts for ${messageId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Error getting read receipts for ${messageId}:`, error);
      return [];
    }
  }

  // Get message delivery receipts
  async getMessageDeliveryReceipts(messageId: string): Promise<{ userId: string; deliveredAt: string }[]> {
    try {
      console.log(`🔍 Getting delivery receipts for message: ${messageId}`);

      const response = await this.makeRequest<{ status: string; data: { userId: string; deliveredAt: string }[] }>(
        `/chat/messages/${messageId}/delivery-receipts`
      );

      console.log(`✅ Delivery receipts for ${messageId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Error getting delivery receipts for ${messageId}:`, error);
      return [];
    }
  }

  // Clear cache
  clearCache(): void {
    this.statusCache.clear();
    console.log('🧹 Message status cache cleared');
  }

  // Get status display text
  getStatusDisplayText(status: MessageStatus): string {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'seen':
        return 'Seen';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  }

  // Get status color
  getStatusColor(status: MessageStatus): string {
    switch (status) {
      case 'sending':
        return '#FFA500'; // Orange for timer/clock
      case 'sent':
        return '#FFD54F'; // Gray for single tick
      case 'delivered':
        return '#FFEB7A'; // Darker gray for double tick
      case 'seen':
        return '#4CAF50'; // Maroon for seen (matches theme primary)
      case 'failed':
        return '#F44336'; // Red for failed
      default:
        return '#757575'; // Dark gray
    }
  }

  // Get status icon
  getStatusIcon(status: MessageStatus): string {
    switch (status) {
      case 'sending':
        return 'time-outline'; // Timer/clock icon for sending
      case 'sent':
        return 'checkmark'; // Single gray tick for sent
      case 'delivered':
        return 'checkmark-done'; // Double tick for delivered
      case 'seen':
        return 'checkmark-done'; // Blue tick for seen (same as delivered but different color)
      case 'failed':
        return 'close-circle-outline'; // Failed icon
      default:
        return 'help-circle-outline';
    }
  }

  // Check if message is in final state
  isFinalStatus(status: MessageStatus): boolean {
    return ['delivered', 'seen', 'failed'].includes(status);
  }

  // Check if message can be retried
  canRetry(status: MessageStatus): boolean {
    return status === 'failed';
  }
}

// Export singleton instance
export const messageStatusService = new MessageStatusService();
export default messageStatusService;

