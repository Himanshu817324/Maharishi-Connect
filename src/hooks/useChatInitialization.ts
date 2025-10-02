import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import { setLoading, setError } from '../store/slices/chatSlice';
import messageSyncService from '../services/messageSyncService';
import socketService from '../services/socketService';
import chatService from '../services/chatService';

export const useChatInitialization = () => {
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();

  const initializeChat = useCallback(async () => {
    if (!currentUser?.id || !currentUser?.token) {
      console.log('🚀 [useChatInitialization] No user authenticated, skipping initialization');
      return;
    }

    try {
      console.log('🚀 [useChatInitialization] Starting chat system initialization...');
      dispatch(setLoading(true));

      // Step 1: Initialize message sync service
      await messageSyncService.initialize();
      console.log('✅ [useChatInitialization] Message sync service initialized');

      // Step 2: Initialize chat service
      await chatService.initialize();
      console.log('✅ [useChatInitialization] Chat service initialized');

      // Step 3: Connect socket for real-time updates
      try {
        if (!socketService.getConnectionStatus()) {
          await socketService.connect(currentUser.id, currentUser.token);
          console.log('✅ [useChatInitialization] Socket connected for real-time updates');
        } else {
          console.log('✅ [useChatInitialization] Socket already connected');
        }
      } catch (socketError) {
        console.error('❌ [useChatInitialization] Socket connection failed (app will work offline):', socketError);
      }

      // Step 4: Perform full data synchronization (server first, then local fallback)
      console.log('🔄 [useChatInitialization] Starting full data synchronization...');
      const syncResult = await messageSyncService.syncAllData({
        forceServerSync: true,
        backgroundSync: false
      });

      if (syncResult.success) {
        console.log(`✅ [useChatInitialization] Sync completed successfully:`);
        console.log(`   📊 Chats: ${syncResult.chatsCount}`);
        console.log(`   📊 Messages: ${syncResult.messagesCount}`);
        console.log(`   📊 Source: ${syncResult.source}`);
      } else {
        console.error('❌ [useChatInitialization] Sync failed:', syncResult.errors);
        dispatch(setError('Failed to sync data. Using offline mode.'));
      }

      // Step 5: Start background sync
      messageSyncService.startBackgroundSync(120000); // Sync every 2 minutes
      console.log('🔄 [useChatInitialization] Background sync started');

      console.log('✅ [useChatInitialization] Chat system initialization completed');
    } catch (error) {
      console.error('❌ [useChatInitialization] Error initializing chat system:', error);
      dispatch(setError('Failed to initialize chat system. Please restart the app.'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [currentUser?.id, currentUser?.token, dispatch]);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 [useChatInitialization] Cleaning up...');
      messageSyncService.stopBackgroundSync();
    };
  }, []);

  return {
    isInitialized: !!currentUser?.id && messageSyncService.getSyncStatus().isInitialized,
    syncStatus: messageSyncService.getSyncStatus(),
  };
};
