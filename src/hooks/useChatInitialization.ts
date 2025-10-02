import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import { setChats } from '../store/slices/chatSlice';
import sqliteService from '../services/sqliteService';
import socketService from '../services/socketService';
import chatService from '../services/chatService';

export const useChatInitialization = () => {
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();

  useEffect(() => {
    const initializeChat = async () => {
      try {
        console.log('🚀 Initializing chat system...');

        // Step 1: Initialize SQLite database
        if (!sqliteService.isInitialized()) {
          await sqliteService.init();
          console.log('✅ SQLite initialized successfully');
        }

        // Step 2: Initialize chat service
        await chatService.initialize();
        console.log('✅ Chat service initialized successfully');

        // Step 3: Load cached data if user is authenticated
        if (currentUser?.id) {
          console.log('🚀 Loading cached chats for session recovery...');
          try {
            const cachedChats = await sqliteService.getChats();
            if (cachedChats.length > 0) {
              // Normalize and format cached chats
              const normalizedChats = cachedChats.map(chat => ({
                id: chat.id,
                name: chat.name,
                type: chat.type || 'direct',
                lastMessage: chat.lastMessage || '',
                lastMessageTime: chat.lastMessageTime,
                unreadCount: chat.unreadCount || 0,
                participants: JSON.parse(chat.participants || '[]'),
                avatar: chat.avatar
              }));

              // Sort by last message time (most recent first)
              normalizedChats.sort((a, b) => {
                const timeA = new Date(a.lastMessageTime || 0).getTime();
                const timeB = new Date(b.lastMessageTime || 0).getTime();
                return timeB - timeA;
              });

              dispatch(setChats(normalizedChats));
              console.log(`✅ Session recovery: Loaded ${normalizedChats.length} cached chats`);
            }

            // Step 4: Connect socket for real-time updates
            try {
              await socketService.connect(currentUser.id, currentUser.token);
              console.log('✅ Socket connected for real-time updates');
            } catch (socketError) {
              console.error('❌ Socket connection failed (app will work offline):', socketError);
            }

          } catch (cacheError) {
            console.error('❌ Failed to load cached data:', cacheError);
          }
        }

        console.log('✅ Chat system initialization completed');
      } catch (error) {
        console.error('❌ Error initializing chat system:', error);
      }
    };

    // Initialize when component mounts or user changes
    initializeChat();
  }, [currentUser?.id, currentUser?.token, dispatch]);

  return {
    isInitialized: !!currentUser?.id && sqliteService.isInitialized(),
  };
};
