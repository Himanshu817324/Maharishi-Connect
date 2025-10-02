// User service for MongoDB operations (main user data)
const BASE_URL = 'https://api.maharishiconnect.com/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class UserService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('User API request failed:', error);
      throw error;
    }
  }

  // User profile operations (MongoDB)
  async getUserProfile(userId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/users/${userId}`);
    return response.data;
  }

  async updateUserProfile(userId: string, profileData: any): Promise<any> {
    const response = await this.makeRequest<any>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return response.data;
  }

  async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.makeRequest(`/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isOnline }),
    });
  }

  async searchUsers(query: string): Promise<any[]> {
    const response = await this.makeRequest<any[]>(
      `/users/search?q=${encodeURIComponent(query)}`
    );
    return response.data;
  }

  async getUsersByPhoneNumbers(phoneNumbers: string[]): Promise<any[]> {
    const response = await this.makeRequest<any[]>('/users/by-phones', {
      method: 'POST',
      body: JSON.stringify({ phoneNumbers }),
    });
    return response.data;
  }

  async createUser(userData: any): Promise<any> {
    const response = await this.makeRequest<any>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.makeRequest(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // User authentication (MongoDB)
  async authenticateUser(phone: string, otp: string): Promise<any> {
    const response = await this.makeRequest<any>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
    return response.data;
  }

  async sendOTP(phone: string): Promise<void> {
    await this.makeRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  // User contacts and relationships (MongoDB)
  async getContacts(userId: string): Promise<any[]> {
    const response = await this.makeRequest<any[]>(`/users/${userId}/contacts`);
    return response.data;
  }

  async addContact(userId: string, contactId: string): Promise<void> {
    await this.makeRequest(`/users/${userId}/contacts`, {
      method: 'POST',
      body: JSON.stringify({ contactId }),
    });
  }

  async removeContact(userId: string, contactId: string): Promise<void> {
    await this.makeRequest(`/users/${userId}/contacts/${contactId}`, {
      method: 'DELETE',
    });
  }

  // User settings (MongoDB)
  async getUserSettings(userId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/users/${userId}/settings`);
    return response.data;
  }

  async updateUserSettings(userId: string, settings: any): Promise<any> {
    const response = await this.makeRequest<any>(`/users/${userId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return response.data;
  }

  // User preferences (MongoDB)
  async getUserPreferences(userId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/users/${userId}/preferences`);
    return response.data;
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<any> {
    const response = await this.makeRequest<any>(`/users/${userId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
    return response.data;
  }
}

export default new UserService();
