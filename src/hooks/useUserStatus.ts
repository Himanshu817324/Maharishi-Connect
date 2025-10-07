import { useState, useEffect, useCallback, useRef } from 'react';
import { userStatusService, UserStatus } from '@/services/userStatusService';

interface UseUserStatusOptions {
  userIds: string[];
  pollInterval?: number;
  autoStart?: boolean;
}

interface UseUserStatusReturn {
  userStatuses: Map<string, UserStatus>;
  isLoading: boolean;
  error: string | null;
  refreshStatus: (userIds?: string[]) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  addUser: (userId: string) => void;
  removeUser: (userId: string) => void;
  getUserStatus: (userId: string) => UserStatus | undefined;
  isUserOnline: (userId: string) => boolean;
  getLastSeen: (userId: string) => string | undefined;
}

export const useUserStatus = ({
  userIds,
  pollInterval = 30000,
  autoStart = true,
}: UseUserStatusOptions): UseUserStatusReturn => {
  const [userStatuses, setUserStatuses] = useState<Map<string, UserStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserIdsRef = useRef<Set<string>>(new Set(userIds));

  // Update current user IDs when prop changes
  useEffect(() => {
    currentUserIdsRef.current = new Set(userIds);
  }, [userIds]);

  // Refresh status for specific users or all users
  const refreshStatus = useCallback(async (userIdsToRefresh?: string[]) => {
    try {
      setIsLoading(true);
      setError(null);

      const targetUserIds = userIdsToRefresh || Array.from(currentUserIdsRef.current);
      
      if (targetUserIds.length === 0) {
        setIsLoading(false);
        return;
      }

      console.log(`🔄 Refreshing status for users:`, targetUserIds);
      
      const statusMap = await userStatusService.getMultipleUsersStatus(targetUserIds);
      
      setUserStatuses(prevStatuses => {
        const newStatuses = new Map(prevStatuses);
        statusMap.forEach((status, userId) => {
          newStatuses.set(userId, status);
        });
        return newStatuses;
      });

      console.log(`✅ Status refreshed for ${statusMap.size} users`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh status';
      console.error('❌ Error refreshing user status:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    console.log(`🔄 Starting status polling with ${pollInterval}ms interval`);
    
    pollingIntervalRef.current = setInterval(() => {
      refreshStatus();
    }, pollInterval);

    // Initial fetch
    refreshStatus();
  }, [pollInterval, refreshStatus]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('🛑 Status polling stopped');
    }
  }, []);

  // Add user to monitoring
  const addUser = useCallback((userId: string) => {
    if (!currentUserIdsRef.current.has(userId)) {
      currentUserIdsRef.current.add(userId);
      userStatusService.addUserToPolling(userId);
      
      // Fetch status for the new user
      refreshStatus([userId]);
      
      console.log(`➕ Added user ${userId} to status monitoring`);
    }
  }, [refreshStatus]);

  // Remove user from monitoring
  const removeUser = useCallback((userId: string) => {
    if (currentUserIdsRef.current.has(userId)) {
      currentUserIdsRef.current.delete(userId);
      userStatusService.removeUserFromPolling(userId);
      
      // Remove from local state
      setUserStatuses(prevStatuses => {
        const newStatuses = new Map(prevStatuses);
        newStatuses.delete(userId);
        return newStatuses;
      });
      
      console.log(`➖ Removed user ${userId} from status monitoring`);
    }
  }, []);

  // Get specific user status
  const getUserStatus = useCallback((userId: string): UserStatus | undefined => {
    return userStatuses.get(userId);
  }, [userStatuses]);

  // Check if user is online
  const isUserOnline = useCallback((userId: string): boolean => {
    const status = userStatuses.get(userId);
    return status?.isOnline || false;
  }, [userStatuses]);

  // Get user's last seen time
  const getLastSeen = useCallback((userId: string): string | undefined => {
    const status = userStatuses.get(userId);
    return status?.lastSeen;
  }, [userStatuses]);

  // Auto-start polling if enabled
  useEffect(() => {
    if (autoStart && userIds.length > 0) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [autoStart, userIds.length, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    userStatuses,
    isLoading,
    error,
    refreshStatus,
    startPolling,
    stopPolling,
    addUser,
    removeUser,
    getUserStatus,
    isUserOnline,
    getLastSeen,
  };
};

export default useUserStatus;

