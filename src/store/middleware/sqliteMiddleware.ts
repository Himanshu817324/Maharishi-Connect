// SQLite middleware for Redux
import { Middleware } from '@reduxjs/toolkit';
import sqliteService from '../../services/sqliteService';

const sqliteMiddleware: Middleware = (store) => (next) => async (action) => {
  // Process the action first
  const result = next(action);

  // Handle SQLite side effects after state is updated
  try {
    switch (action.type) {
      case 'chat/addMessage':
        await handleMessageSave(action.payload);
        break;

      case 'chat/updateMessageStatus':
        await handleMessageStatusUpdate(action.payload);
        break;

      case 'chat/replaceMessageId':
        await handleMessageIdUpdate(action.payload);
        break;

      case 'chat/markChatAsRead':
        await handleMarkChatAsRead(action.payload);
        break;

      default:
        // No SQLite operation needed
        break;
    }
  } catch (error) {
    console.error('SQLite middleware error:', error);
  }

  return result;
};

// Helper functions
async function handleMessageSave(message: any) {
  try {
    // Ensure SQLite is initialized
    const initialized = await sqliteService.ensureInitialized();
    if (!initialized) {
      console.error('[MIDDLEWARE] SQLite not initialized, cannot save message');
      return;
    }

    // Check if message already exists
    const exists = await sqliteService.messageExists(message._id, message._id);
    if (exists) {
      console.log('[MIDDLEWARE] Message already saved, skipping');
      return;
    }

    // Prepare message data for SQLite
    const messageForSqlite = {
      id: message._id, // server id (same as client initially)
      clientId: message._id, // client id (primary key)
      chatId: message.chatId,
      content: message.text,
      text: message.text,
      senderId: message.senderId,
      timestamp: message.createdAt,
      createdAt: message.createdAt,
      status: message.status || 'sent',
      reactions: JSON.stringify(message.reactions || {}),
      updatedAt: new Date().toISOString(),
    };

    await sqliteService.saveMessage(messageForSqlite);
  } catch (error) {
    console.error('[MIDDLEWARE] Error saving message to SQLite:', error);
  }
}

async function handleMessageStatusUpdate({ messageId, status }: { messageId: string; status: string }) {
  try {
    await sqliteService.updateMessageStatus(messageId, status);
  } catch (error) {
    console.error('[MIDDLEWARE] Error updating message status:', error);
  }
}

async function handleMessageIdUpdate({ tempId, serverId }: { tempId: string; serverId: string }) {
  try {
    await sqliteService.updateMessageIdByClientId(tempId, serverId);
  } catch (error) {
    console.error('[MIDDLEWARE] Error updating message ID:', error);
  }
}

async function handleMarkChatAsRead(chatId: string) {
  try {
    await sqliteService.markChatAsRead(chatId);
  } catch (error) {
    console.error('[MIDDLEWARE] Error marking chat as read:', error);
  }
}

export default sqliteMiddleware;
