// Replace these URLs with your actual backend endpoints
const BASE_URL = 'https://api.maharishiconnect.com/api';

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  chat?: any;
  chats?: any[];
  status?: string;
}

class ChatApiService {
  private getAuthHeaders(): Record<string, string> {
    // Get auth token from Redux store
    // Note: This is a simplified approach. In a real app, you might want to pass the token
    // or use a different method to access the Redux store from a service
    const token = this.getStoredToken();

    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private authToken: string | null = null;

  private getStoredToken(): string | null {
    return this.authToken;
  }

  // Method to set token (call this when user logs in)
  setAuthToken(token: string): void {
    this.authToken = token;
    console.log('Auth token set for chat API service');
  }

  // Method to clear token (call this when user logs out)
  clearAuthToken(): void {
    this.authToken = null;
    console.log('Auth token cleared for chat API service');
  }

  // Test server connectivity
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('Server connection test failed:', error);
      return false;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
        ...options,
      });


      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error(`Non-JSON response received:`, textResponse);
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Chat endpoints
  async createChat(chatData: {
    type: string;
    name: string;
    description: string;
    participants: string[];
  }): Promise<any> {
    const response = await this.makeRequest<any>('/chat/create', {
      method: 'POST',
      body: JSON.stringify(chatData),
    });

    // Handle different response formats
    if (response.data) {
      return response.data;
    } else if (response.chat) {
      return response.chat;
    } else {
      return response;
    }
  }

  async createDirectMessage(participantId: string): Promise<any> {
    const response = await this.makeRequest<any>('/chat/direct-message', {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });

    // Handle different response formats
    if (response.data) {
      return response.data;
    } else if (response.chat) {
      return response.chat;
    } else {
      return response;
    }
  }

  async getUserChats(): Promise<any[]> {
    const response = await this.makeRequest<any[]>('/chat/user-chats');

    // Handle different response formats
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (Array.isArray(response)) {
      return response;
    } else if (response.chats && Array.isArray(response.chats)) {
      return response.chats;
    } else {
      console.log('Unexpected response format for getUserChats:', response);
      return [];
    }
  }

  async getChatDetails(chatId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/${chatId}`);
    return response.data;
  }

  async getChat(chatId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/${chatId}`);

    // Handle different response formats
    if (response.data) {
      return response.data;
    } else if (response.chat) {
      return response.chat;
    } else {
      return response;
    }
  }

  async joinChat(chatId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/${chatId}/join`, {
      method: 'POST',
    });
    return response.data;
  }

  // Message endpoints
  async sendMessage(chatId: string, messageData: {
    content: string;
    messageType: string;
    mediaUrl?: string;
    mediaMetadata?: object;
    replyToMessageId?: string;
  }): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
    // server should return { data: { message: {...} } } or { _id: '...' }
    // normalize:
    const msg = response.data?.message || response.data || response.message || response;
    return msg;
  }

  async getMessages(chatId: string, options?: {
    limit?: number;
    offset?: number;
    beforeMessageId?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.beforeMessageId) params.append('beforeMessageId', options.beforeMessageId);

    const queryString = params.toString();
    const endpoint = queryString ? `/chat/${chatId}/messages?${queryString}` : `/chat/${chatId}/messages`;

    const response = await this.makeRequest<any[]>(endpoint);
    return response.data || [];
  }

  async getChatMessages(chatId: string, options?: {
    limit?: number;
    offset?: number;
    beforeMessageId?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.beforeMessageId) params.append('beforeMessageId', options.beforeMessageId);

    const queryString = params.toString();
    const endpoint = queryString ? `/chat/${chatId}/messages?${queryString}` : `/chat/${chatId}/messages`;

    const response = await this.makeRequest<any[]>(endpoint);
    return response.data || [];
  }

  async editMessage(messageId: string, content: string): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
    return response.data;
  }

  async deleteMessage(messageId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/messages/${messageId}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  async addReaction(messageId: string, emoji: string): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
    return response.data;
  }

  async removeReaction(messageId: string, emoji: string): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/messages/${messageId}/reactions`, {
      method: 'DELETE',
      body: JSON.stringify({ emoji }),
    });
    return response.data;
  }

  async markMessageAsRead(messageId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/messages/${messageId}/read`, {
      method: 'POST',
    });
    return response.data;
  }

  // Additional methods for better message handling
  async markAllMessagesAsRead(chatId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/${chatId}/messages/read-all`, {
      method: 'POST',
    });
    return response.data;
  }

  async getUnreadMessageCount(chatId?: string): Promise<number> {
    const endpoint = chatId ? `/chat/${chatId}/unread-count` : '/chat/unread-count';
    const response = await this.makeRequest<{ count: number }>(endpoint);
    return response.data?.count || 0;
  }

  // Chat invite endpoints
  async createChatInvite(chatId: string, inviteData: {
    maxUses: number;
    expiresAt: string;
  }): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/${chatId}/invites`, {
      method: 'POST',
      body: JSON.stringify(inviteData),
    });
    return response.data;
  }

  async useChatInvite(inviteCode: string): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/invites/${inviteCode}/use`, {
      method: 'POST',
    });
    return response.data;
  }

  // User endpoints (MongoDB - main user data)
  async getUsers(): Promise<any[]> {
    const response = await this.makeRequest<any[]>('/users');
    return response.data || [];
  }

  async getUser(userId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/users/${userId}`);
    return response.data;
  }

  async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.makeRequest(`/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isOnline }),
    });
  }

  async updateUserProfile(userId: string, profileData: any): Promise<any> {
    const response = await this.makeRequest<any>(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return response.data;
  }

  // Search endpoints
  async searchMessages(query: string, chatId?: string): Promise<any[]> {
    const endpoint = chatId
      ? `/search/messages?q=${encodeURIComponent(query)}&chatId=${chatId}`
      : `/search/messages?q=${encodeURIComponent(query)}`;

    const response = await this.makeRequest<any[]>(endpoint);
    return response.data || [];
  }

  async searchChats(query: string): Promise<any[]> {
    const response = await this.makeRequest<any[]>(
      `/search/chats?q=${encodeURIComponent(query)}`
    );
    return response.data || [];
  }

  async deleteChat(chatId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/${chatId}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  async leaveChat(chatId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/chat/${chatId}/leave`, {
      method: 'POST',
    });
    return response.data;
  }
}

export default new ChatApiService();

