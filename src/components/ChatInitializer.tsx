import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { chatInitializationService } from '@/services/chatInitializationService';
import { useAppStartup } from '@/hooks/useAppStartup';

const ChatInitializer: React.FC = () => {
  const { user, isLoggedIn } = useSelector((state: RootState) => state.auth);

  // Initialize app startup process (including profile data fetching)
  const { isInitialized, isLoading } = useAppStartup();

  useEffect(() => {
    console.log('🔌 ChatInitializer: isLoggedIn:', isLoggedIn, 'user:', !!user);
    console.log('🔌 ChatInitializer: app startup status:', {
      isInitialized,
      isLoading,
    });

    if (isLoggedIn && user && isInitialized) {
      // Initialize chat services when user is authenticated and app startup is complete
      initializeChatServices();
    } else if (!isLoggedIn) {
      // Disconnect chat services when user is not authenticated
      disconnectChatServices();
    }
  }, [isLoggedIn, user, isInitialized]);

  const initializeChatServices = async () => {
    try {
      console.log('🚀 Initializing chat services for authenticated user...');
      await chatInitializationService.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize chat services:', error);
    }
  };

  const disconnectChatServices = async () => {
    try {
      console.log('🔌 Disconnecting chat services...');
      await chatInitializationService.disconnect();
    } catch (error) {
      console.error('❌ Failed to disconnect chat services:', error);
    }
  };

  // This component doesn't render anything - it just manages chat initialization
  // The useAppStartup hook handles profile data fetching during app startup
  return null;
};

export default ChatInitializer;
