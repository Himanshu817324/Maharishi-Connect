import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import sqliteService from '../services/sqliteService';

export const useChatInitialization = () => {
  const currentUser = useSelector(selectCurrentUser);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        console.log('🚀 Initializing chat system...');
        
        // Initialize SQLite database with timeout (non-blocking)
        if (!sqliteService.isInitialized()) {
          // Start initialization in background, don't wait for it
          sqliteService.init().then(() => {
            console.log('✅ SQLite initialized successfully');
          }).catch(error => {
            console.error('❌ SQLite initialization failed:', error);
          });
        }
        
        console.log('✅ Chat system initialization started');
      } catch (error) {
        console.error('❌ Error initializing chat system:', error);
      }
    };

    // Initialize immediately without waiting
    initializeChat();
  }, []);  // Only run once on mount

  return {
    isInitialized: !!currentUser?.id,
  };
};
