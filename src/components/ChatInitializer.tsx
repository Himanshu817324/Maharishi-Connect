import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { chatInitializationService } from '@/services/chatInitializationService';

const ChatInitializer: React.FC = () => {
  const { user, isLoggedIn } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    console.log('🔌 ChatInitializer: isLoggedIn:', isLoggedIn, 'user:', !!user);
    if (isLoggedIn && user) {
      // Initialize chat services when user is authenticated
      initializeChatServices();
    } else {
      // Disconnect chat services when user is not authenticated
      disconnectChatServices();
    }
  }, [isLoggedIn, user]);

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
  return null;
};

export default ChatInitializer;
