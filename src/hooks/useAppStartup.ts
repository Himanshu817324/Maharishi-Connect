import { useEffect, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState, AppStateStatus } from 'react-native';
import { selectCurrentUser, updateUserProfile } from '../store/slices/authSlice';
import { setLoading, setError, clearChatState } from '../store/slices/chatSlice';
import messageSyncService from '../services/messageSyncService';
import socketService from '../services/socketService';

interface AppStartupStatus {
    isInitialized: boolean;
    isSyncing: boolean;
    lastSyncTime: number;
    syncSource: 'server' | 'local' | 'hybrid' | null;
}

export const useAppStartup = () => {
    const currentUser = useSelector(selectCurrentUser);
    const dispatch = useDispatch();
    const [startupStatus, setStartupStatus] = useState<AppStartupStatus>({
        isInitialized: false,
        isSyncing: false,
        lastSyncTime: 0,
        syncSource: null,
    });

    const initializeApp = useCallback(async () => {
        if (!currentUser?.id || !currentUser?.token) {
            console.log('🚀 [useAppStartup] No user authenticated, skipping initialization');
            return;
        }

        // Check if we have complete profile data, if not, fetch it
        if (currentUser.id && currentUser.token && (!currentUser.fullName || !currentUser.country)) {
            try {
                console.log('🚀 [useAppStartup] Fetching complete user profile data...');
                console.log('🚀 [useAppStartup] Current user data:', {
                    id: currentUser.id,
                    fullName: currentUser.fullName,
                    country: currentUser.country,
                    hasToken: !!currentUser.token
                });

                const { apiService } = await import('../services/apiService');
                const profileData = await apiService.getUserProfile(currentUser.id, currentUser.token);

                console.log('🚀 [useAppStartup] Profile API response:', profileData);

                if (profileData.user || profileData.data) {
                    const userProfile = profileData.user || profileData.data;
                    const location = userProfile.location || {};

                    console.log('🚀 [useAppStartup] Extracted user profile:', {
                        fullName: userProfile.fullName,
                        country: location.country,
                        state: location.state,
                        status: userProfile.status,
                        profilePicture: userProfile.profilePicture
                    });

                    // Update user profile data in Redux
                    dispatch(updateUserProfile({
                        fullName: userProfile.fullName || '',
                        avatar: userProfile.profilePicture || '',
                        country: location.country || '',
                        state: location.state || '',
                        status: userProfile.status || '',
                        isVerified: userProfile.isVerified || currentUser.isVerified,
                    }));

                    console.log('✅ [useAppStartup] User profile data updated successfully');
                } else {
                    console.log('⚠️ [useAppStartup] No user profile data found in API response');
                }
            } catch (error) {
                console.error('❌ [useAppStartup] Error fetching user profile:', error);
                console.log('⚠️ [useAppStartup] Continuing with existing user data');
            }
        } else {
            console.log('ℹ️ [useAppStartup] User already has complete profile data, skipping fetch');
        }

        try {
            console.log('🚀 [useAppStartup] Starting app initialization...');
            setStartupStatus(prev => ({ ...prev, isSyncing: true }));
            dispatch(setLoading(true));

            // Step 1: Initialize message sync service
            await messageSyncService.initialize();
            console.log('✅ [useAppStartup] Message sync service initialized');

            // Step 2: Skip global socket connection - will be connected on-demand when user opens chat screens
            console.log('✅ [useAppStartup] Socket connection deferred to chat screens for better resource management');

            // Step 3: Perform full data synchronization (server first, then local fallback)
            console.log('🔄 [useAppStartup] Starting full data synchronization...');
            const syncResult = await messageSyncService.syncAllData({
                forceServerSync: true,
                backgroundSync: false
            });

            if (syncResult.success) {
                console.log(`✅ [useAppStartup] Sync completed successfully:`);
                console.log(`   📊 Chats: ${syncResult.chatsCount}`);
                console.log(`   📊 Messages: ${syncResult.messagesCount}`);
                console.log(`   📊 Source: ${syncResult.source}`);

                setStartupStatus({
                    isInitialized: true,
                    isSyncing: false,
                    lastSyncTime: Date.now(),
                    syncSource: syncResult.source,
                });
            } else {
                console.error('❌ [useAppStartup] Sync failed:', syncResult.errors);
                dispatch(setError('Failed to sync data. Using offline mode.'));

                setStartupStatus({
                    isInitialized: true,
                    isSyncing: false,
                    lastSyncTime: 0,
                    syncSource: 'local',
                });
            }

            // Step 4: Start background sync
            messageSyncService.startBackgroundSync(120000); // Sync every 2 minutes
            console.log('🔄 [useAppStartup] Background sync started');

        } catch (error) {
            console.error('❌ [useAppStartup] App initialization failed:', error);
            dispatch(setError('Failed to initialize app. Please restart.'));

            setStartupStatus({
                isInitialized: false,
                isSyncing: false,
                lastSyncTime: 0,
                syncSource: null,
            });
        } finally {
            dispatch(setLoading(false));
        }
    }, [currentUser?.id, currentUser?.token, dispatch]);

    // Handle app state changes (foreground/background)
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && currentUser?.id) {
                console.log('🔄 [useAppStartup] App became active, performing sync...');

                try {
                    const syncResult = await messageSyncService.syncAllData({
                        forceServerSync: true,
                        backgroundSync: true
                    });

                    if (syncResult.success) {
                        setStartupStatus(prev => ({
                            ...prev,
                            lastSyncTime: Date.now(),
                            syncSource: syncResult.source,
                        }));
                        console.log(`✅ [useAppStartup] Background sync completed: ${syncResult.source}`);
                    }
                } catch (error) {
                    console.error('❌ [useAppStartup] Background sync failed:', error);
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, [currentUser?.id]);

    // Initialize on mount
    useEffect(() => {
        initializeApp();
    }, [initializeApp]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('🧹 [useAppStartup] Cleaning up...');
            messageSyncService.stopBackgroundSync();
        };
    }, []);

    // Force sync function
    const forceSync = useCallback(async () => {
        if (!currentUser?.id) return;

        try {
            setStartupStatus(prev => ({ ...prev, isSyncing: true }));
            console.log('🔄 [useAppStartup] Force sync triggered...');

            const syncResult = await messageSyncService.syncAllData({
                forceServerSync: true,
                backgroundSync: false
            });

            if (syncResult.success) {
                setStartupStatus(prev => ({
                    ...prev,
                    lastSyncTime: Date.now(),
                    syncSource: syncResult.source,
                }));
                console.log(`✅ [useAppStartup] Force sync completed: ${syncResult.source}`);
            }
        } catch (error) {
            console.error('❌ [useAppStartup] Force sync failed:', error);
        } finally {
            setStartupStatus(prev => ({ ...prev, isSyncing: false }));
        }
    }, [currentUser?.id]);

    // Sync specific chat
    const syncChat = useCallback(async (chatId: string) => {
        if (!currentUser?.id) return;

        try {
            console.log(`🔄 [useAppStartup] Syncing chat: ${chatId}`);
            await messageSyncService.forceSyncChat(chatId);
        } catch (error) {
            console.error(`❌ [useAppStartup] Failed to sync chat ${chatId}:`, error);
        }
    }, [currentUser?.id]);

    return {
        ...startupStatus,
        forceSync,
        syncChat,
    };
};
