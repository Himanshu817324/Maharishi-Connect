// src/hooks/useAuthPersistence.ts
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { loadAuthState } from '../utils/storage';
import { restoreAuthState } from '../store/slices/authSlice';

export const useAuthPersistence = () => {
  const dispatch = useDispatch();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth state from AsyncStorage...');
        const storedAuthState = await loadAuthState();
        
        if (storedAuthState) {
          console.log('✅ Found stored auth state:', {
            isLoggedIn: storedAuthState.isLoggedIn,
            profileCompleted: storedAuthState.profileCompleted,
            hasUser: !!storedAuthState.user,
            hasSeenOnboarding: storedAuthState.hasSeenOnboarding,
          });
          console.log('✅ Stored user data:', storedAuthState.user);
          
          // Restore the auth state to Redux
          dispatch(restoreAuthState(storedAuthState));
        } else {
          console.log('ℹ️ No stored auth state found - user will need to login');
        }
        
        // Mark as initialized regardless of whether we found stored state
        setIsInitialized(true);
        console.log('✅ Auth persistence initialization completed');
      } catch (error) {
        console.error('❌ Error initializing auth state:', error);
        // Still mark as initialized even if there was an error
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [dispatch]);

  return isInitialized;
};
