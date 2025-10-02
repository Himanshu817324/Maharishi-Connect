import React from 'react';
import { useChatInitialization } from '../hooks/useChatInitialization';

interface ChatInitializerProps {
  children: React.ReactNode;
}

const ChatInitializer: React.FC<ChatInitializerProps> = ({ children }) => {
  useChatInitialization();
  
  return <>{children}</>;
};

export default ChatInitializer;
