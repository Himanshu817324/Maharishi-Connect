import { useEffect, useState } from 'react';
import { chatInitializationService } from '@/services/chatInitializationService';

interface ChatInitializationState {
  isInitialized: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}

export const useChatInitialization = (): ChatInitializationState => {
  const [state, setState] = useState<ChatInitializationState>({
    isInitialized: false,
    isConnecting: false,
    isConnected: false,
    error: null,
  });

  useEffect(() => {
    initializeChat();
    
    return () => {
      // Cleanup on unmount
      chatInitializationService.disconnect();
    };
  }, []);

  const initializeChat = async () => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));
      
      await chatInitializationService.initialize();
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isConnecting: false,
        isConnected: chatInitializationService.getConnectionStatus(),
      }));
      
    } catch (error: any) {
      console.error('Chat initialization error:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to initialize chat services',
      }));
    }
  };

  const retryConnection = async () => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));
      
      await chatInitializationService.retryConnection();
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isConnecting: false,
        isConnected: chatInitializationService.getConnectionStatus(),
      }));
      
    } catch (error: any) {
      console.error('Chat retry error:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to retry connection',
      }));
    }
  };

  return {
    ...state,
    retryConnection,
  };
};
