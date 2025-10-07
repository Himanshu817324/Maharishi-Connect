import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
  statusText: string;
}

export interface LastSeenResponse {
  status: string;
  lastSeen: string;
  isOnline: boolean;
}

export interface OnlineStatusResponse {
  status: string;
  isOnline: boolean;
  lastSeen: string;
  statusText: string;
}

class UserStatusService {
  private baseURL: string;
  private statusCache: Map<string, { status: UserStatus; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds cache
  private statusPollingInterval: NodeJS.Timeout | null = null;
  private watchedUsers: Set<string> = new Set();

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

  // Get user's last seen timestamp
  async getUserLastSeen(userId: string): Promise<LastSeenResponse> {
    try {
      console.log(`🔍 Getting last seen for user: ${userId}`);
      
      const response = await this.makeRequest<LastSeenResponse>(
        `/user/${userId}/last-seen`
      );

      console.log(`✅ Last seen response for ${userId}:`, response);
      return response;
    } catch (error) {
      console.error(`❌ Error getting last seen for user ${userId}:`, error);
      // Return default offline status if API is not available
      return {
        status: 'SUCCESS',
        lastSeen: new Date().toISOString(),
        isOnline: false,
      };
    }
  }

  // Check user's online status
  async getUserOnlineStatus(userId: string): Promise<OnlineStatusResponse> {
    try {
      console.log(`🔍 Getting online status for user: ${userId}`);
      
      const response = await this.makeRequest<OnlineStatusResponse>(
        `/user/${userId}/online-status`
      );

      console.log(`✅ Online status response for ${userId}:`, response);
      return response;
    } catch (error) {
      console.error(`❌ Error getting online status for user ${userId}:`, error);
      // Return default offline status if API is not available
      return {
        status: 'SUCCESS',
        isOnline: false,
        lastSeen: new Date().toISOString(),
        statusText: 'Offline',
      };
    }
  }

  // Get user status with caching
  async getUserStatus(userId: string, forceRefresh: boolean = false): Promise<UserStatus> {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = this.statusCache.get(userId);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
          console.log(`📱 Using cached status for user: ${userId}`);
          return cached.status;
        }
      }

      // Fetch fresh data
      const response = await this.getUserOnlineStatus(userId);
      
      const userStatus: UserStatus = {
        userId,
        isOnline: response.isOnline,
        lastSeen: response.lastSeen,
        statusText: response.statusText,
      };

      // Cache the result
      this.statusCache.set(userId, {
        status: userStatus,
        timestamp: Date.now(),
      });

      return userStatus;
    } catch (error) {
      console.error(`❌ Error getting user status for ${userId}:`, error);
      
      // Return cached data if available, even if expired
      const cached = this.statusCache.get(userId);
      if (cached) {
        console.log(`📱 Using expired cached status for user: ${userId}`);
        return cached.status;
      }

      // Return default offline status
      return {
        userId,
        isOnline: false,
        lastSeen: new Date().toISOString(),
        statusText: 'Offline',
      };
    }
  }

  // Get multiple users' status
  async getMultipleUsersStatus(userIds: string[]): Promise<Map<string, UserStatus>> {
    const statusMap = new Map<string, UserStatus>();
    
    try {
      // Fetch status for all users in parallel
      const promises = userIds.map(async (userId) => {
        try {
          const status = await this.getUserStatus(userId);
          statusMap.set(userId, status);
        } catch (error) {
          console.error(`❌ Error getting status for user ${userId}:`, error);
          // Add default offline status
          statusMap.set(userId, {
            userId,
            isOnline: false,
            lastSeen: new Date().toISOString(),
            statusText: 'Offline',
          });
        }
      });

      await Promise.all(promises);
      return statusMap;
    } catch (error) {
      console.error('❌ Error getting multiple users status:', error);
      return statusMap;
    }
  }

  // Start polling for specific users
  startStatusPolling(userIds: string[], onStatusUpdate?: (statusMap: Map<string, UserStatus>) => void) {
    console.log(`🔄 Starting status polling for users:`, userIds);
    
    // Add users to watched list
    userIds.forEach(userId => this.watchedUsers.add(userId));

    // Clear existing interval
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
    }

    // Poll every 30 seconds
    this.statusPollingInterval = setInterval(async () => {
      try {
        const statusMap = await this.getMultipleUsersStatus(Array.from(this.watchedUsers));
        onStatusUpdate?.(statusMap);
      } catch (error) {
        console.error('❌ Error in status polling:', error);
      }
    }, 30000);

    // Initial fetch
    this.getMultipleUsersStatus(Array.from(this.watchedUsers))
      .then(statusMap => onStatusUpdate?.(statusMap))
      .catch(error => console.error('❌ Error in initial status fetch:', error));
  }

  // Stop status polling
  stopStatusPolling() {
    console.log('🛑 Stopping status polling');
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
      this.statusPollingInterval = null;
    }
    this.watchedUsers.clear();
  }

  // Add user to polling
  addUserToPolling(userId: string) {
    this.watchedUsers.add(userId);
    console.log(`➕ Added user ${userId} to polling. Total watched: ${this.watchedUsers.size}`);
  }

  // Remove user from polling
  removeUserFromPolling(userId: string) {
    this.watchedUsers.delete(userId);
    console.log(`➖ Removed user ${userId} from polling. Total watched: ${this.watchedUsers.size}`);
  }

  // Clear cache
  clearCache() {
    this.statusCache.clear();
    console.log('🧹 User status cache cleared');
  }

  // Format last seen time for display
  formatLastSeen(lastSeen: string): string {
    try {
      const lastSeenDate = new Date(lastSeen);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000);

      if (diffInSeconds < 60) {
        return 'Just now';
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `Last seen ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `Last seen ${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `Last seen ${days} day${days > 1 ? 's' : ''} ago`;
      } else {
        return `Last seen ${lastSeenDate.toLocaleDateString()}`;
      }
    } catch (error) {
      console.error('❌ Error formatting last seen:', error);
      return 'Last seen recently';
    }
  }

  // Get status text for display
  getStatusDisplayText(status: UserStatus): string {
    if (status.isOnline) {
      return 'Online';
    } else {
      return this.formatLastSeen(status.lastSeen);
    }
  }

  // Check if user is currently being polled
  isUserBeingPolled(userId: string): boolean {
    return this.watchedUsers.has(userId);
  }

  // Get all watched users
  getWatchedUsers(): string[] {
    return Array.from(this.watchedUsers);
  }
}

// Export singleton instance
export const userStatusService = new UserStatusService();
export default userStatusService;

