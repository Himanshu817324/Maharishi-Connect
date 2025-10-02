// src/hooks/useAuthPersistence.ts
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { loadAuthState } from '../utils/storage';
import { restoreAuthState } from '../store/slices/authSlice';

export const useAuthPersistence = () => {
  const dispatch = useDispatch();

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
          });
          
          // Restore the auth state to Redux
          dispatch(restoreAuthState(storedAuthState));
        } else {
          console.log('ℹ️ No stored auth state found');
        }
      } catch (error) {
        console.error('❌ Error initializing auth state:', error);
      }
    };

    initializeAuth();
  }, [dispatch]);
};
