import { useEffect, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState, AppStateStatus } from 'react-native';
import { selectCurrentUser, updateUserProfile } from '../store/slices/authSlice';

interface AppStartupStatus {
    isInitialized: boolean;
    isLoading: boolean;
    lastUpdateTime: number;
}

export const useAppStartup = () => {
    const currentUser = useSelector(selectCurrentUser);
    const dispatch = useDispatch();
    const [startupStatus, setStartupStatus] = useState<AppStartupStatus>({
        isInitialized: false,
        isLoading: false,
        lastUpdateTime: 0,
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
            setStartupStatus(prev => ({ ...prev, isLoading: true }));

            // App initialization completed
            setStartupStatus({
                isInitialized: true,
                isLoading: false,
                lastUpdateTime: Date.now(),
            });

            console.log('✅ [useAppStartup] App initialization completed successfully');

        } catch (error) {
            console.error('❌ [useAppStartup] App initialization failed:', error);

            setStartupStatus({
                isInitialized: false,
                isLoading: false,
                lastUpdateTime: 0,
            });
        }
    }, [currentUser?.id, currentUser?.token, dispatch]);

    // Handle app state changes (foreground/background)
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && currentUser?.id) {
                console.log('🔄 [useAppStartup] App became active');
                setStartupStatus(prev => ({
                    ...prev,
                    lastUpdateTime: Date.now(),
                }));
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, [currentUser?.id]);

    // Initialize on mount
    useEffect(() => {
        initializeApp();
    }, [initializeApp]);

    // Force refresh function
    const forceRefresh = useCallback(async () => {
        if (!currentUser?.id) return;

        try {
            setStartupStatus(prev => ({ ...prev, isLoading: true }));
            console.log('🔄 [useAppStartup] Force refresh triggered...');

            // Perform any necessary refresh operations here
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate refresh

            setStartupStatus(prev => ({
                ...prev,
                lastUpdateTime: Date.now(),
            }));
            console.log('✅ [useAppStartup] Force refresh completed');
        } catch (error) {
            console.error('❌ [useAppStartup] Force refresh failed:', error);
        } finally {
            setStartupStatus(prev => ({ ...prev, isLoading: false }));
        }
    }, [currentUser?.id]);

    return {
        ...startupStatus,
        forceRefresh,
    };
};