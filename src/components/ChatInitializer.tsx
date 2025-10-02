import React from 'react';
import { useAppStartup } from '../hooks/useAppStartup';

interface ChatInitializerProps {
  children: React.ReactNode;
}

const ChatInitializer: React.FC<ChatInitializerProps> = ({ children }) => {
  const { isInitialized, isSyncing, syncSource } = useAppStartup();

  // You can add loading indicators or sync status here if needed
  console.log(
    `🚀 [ChatInitializer] Status: initialized=${isInitialized}, syncing=${isSyncing}, source=${syncSource}`,
  );

  return <>{children}</>;
};

export default ChatInitializer;
