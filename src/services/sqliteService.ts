import SQLite from 'react-native-sqlite-storage';

// Timeout wrapper for SQLite operations
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`SQLite operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

class SQLiteService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initializationPromise: Promise<void> | null = null;
  private isInitializing: boolean = false;

  async init() {
    if (this.isInitializing) {
      await this.initializationPromise;
      return;
    }

    if (this.db) {
      return;
    }

    this.isInitializing = true;
    try {
      this.db = await SQLite.openDatabase({
        name: 'MaharishiConnect.db',
        location: 'default',
      });

      await this.createTables();
      await this.testDatabase();

    } catch (error) {
      console.error('Error initializing SQLite:', error);
      this.db = null;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  isInitialized(): boolean {
    return this.db !== null;
  }

  async ensureInitialized(): Promise<boolean> {
    if (this.db) {
      return true;
    }

    if (this.isInitializing) {
      let attempts = 0;
      while (this.isInitializing && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      return this.db !== null;
    }

    try {
      await this.init();
      return this.db !== null;
    } catch (error) {
      console.error('Failed to initialize SQLite:', error);
      return false;
    }
  }

  private async createTables() {
    if (!this.db) return;

    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT,
        clientId TEXT UNIQUE NOT NULL,
        chatId TEXT NOT NULL,
        content TEXT NOT NULL,
        senderId TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL,
        reactions TEXT DEFAULT '{}',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        PRIMARY KEY (clientId)
      );
    `;

    const createChatsTable = `
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT,
        lastMessage TEXT,
        lastMessageTime TEXT,
        unreadCount INTEGER DEFAULT 0,
        isOnline INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `;

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT,
        isOnline INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `;

    await this.db.executeSql(createMessagesTable);
    await this.db.executeSql(createChatsTable);
    await this.db.executeSql(createUsersTable);

    // Add unique indexes
    await this.addUniqueIndexes();
  }

  private async addUniqueIndexes() {
    if (!this.db) return;

    try {
      await this.db.executeSql(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_clientId 
        ON messages(clientId)
      `);

      await this.db.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_messages_id 
        ON messages(id) WHERE id IS NOT NULL
      `);

      await this.db.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_messages_chatId 
        ON messages(chatId)
      `);

      console.log('Unique indexes created');
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }

  async messageExists(messageId: string, clientId?: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      const query = `
        SELECT COUNT(*) as count FROM messages 
        WHERE id = ? OR clientId = ? OR clientId = ?
      `;

      const result = await new Promise<any>((resolve, reject) => {
        this.db!.transaction((tx) => {
          tx.executeSql(
            query,
            [messageId, messageId, clientId || messageId],
            (tx, results) => resolve(results),
            (tx, error) => {
              reject(error);
              return false;
            }
          );
        });
      });

      if (result?.rows?.length > 0) {
        return result.rows.item(0).count > 0;
      }
      return false;
    } catch (error) {
      console.error('Error checking message existence:', error);
      return false;
    }
  }

  async saveMessage(message: any) {
    try {
      const initialized = await withTimeout(this.ensureInitialized(), 3000);

      if (!initialized || !this.db) {
        console.error('SQLite database not initialized');
        return;
      }

      // Generate consistent IDs
      const serverId = message.id || message._id;
      const clientId = message.clientId || message.tempId || serverId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Check if message already exists
      const exists = await this.messageExists(serverId, clientId);
      if (exists) {
        console.log('Message already exists, skipping:', clientId);
        return;
      }

      const query = `
        INSERT INTO messages 
        (id, clientId, chatId, content, senderId, timestamp, status, reactions, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        serverId === clientId ? null : serverId,
        clientId,
        message.chatId,
        message.text || message.content,
        message.senderId || message.user?._id,
        message.timestamp || message.createdAt || new Date().toISOString(),
        message.status || 'sent',
        typeof message.reactions === 'string' ? message.reactions : JSON.stringify(message.reactions || {}),
        message.createdAt || new Date().toISOString(),
        message.updatedAt || new Date().toISOString(),
      ];

      if (!params[2] || !params[3] || !params[4]) {
        console.error('Missing required message data');
        return;
      }

      await new Promise<void>((resolve, reject) => {
        this.db!.transaction((tx) => {
          tx.executeSql(
            query,
            params,
            () => {
              console.log('Message saved:', clientId);
              resolve();
            },
            (tx, error) => {
              console.error('Transaction error:', error);
              reject(error);
              return false;
            }
          );
        }, (error) => {
          console.error('Transaction failed:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error saving message to SQLite:', error);
    }
  }

  async updateMessageIdByClientId(clientId: string, serverId: string) {
    const initialized = await this.ensureInitialized();
    if (!initialized || !this.db) {
      console.error('SQLite database not initialized');
      return;
    }

    try {
      const query = `
        UPDATE messages
        SET id = ?, updatedAt = ?
        WHERE clientId = ?
      `;
      await this.db.executeSql(query, [serverId, new Date().toISOString(), clientId]);
    } catch (error) {
      console.error('Error updating message ID by clientId:', error);
    }
  }

  async getMessages(chatId: string): Promise<any[]> {
    try {
      const initialized = await withTimeout(this.ensureInitialized(), 3000);
      if (!initialized || !this.db) {
        console.error('SQLite database not initialized');
        return [];
      }

      if (!chatId) {
        console.error('No chatId provided to getMessages');
        return [];
      }

      const query = `
        SELECT * FROM messages 
        WHERE chatId = ? 
        ORDER BY timestamp ASC
      `;

      const result = await new Promise((resolve, reject) => {
        this.db!.transaction((tx) => {
          tx.executeSql(
            query,
            [chatId],
            (tx, results) => resolve(results),
            (tx, error) => {
              console.error('Transaction error:', error);
              reject(error);
              return false;
            }
          );
        }, (error) => {
          console.error('Transaction failed:', error);
          reject(error);
        });
      });

      if (!result || !result.rows) {
        console.log('No messages found for chatId:', chatId);
        return [];
      }

      const messages = [];
      for (let i = 0; i < result.rows.length; i++) {
        try {
          const message = result.rows.item(i);
          if (message.reactions && typeof message.reactions === 'string') {
            try {
              message.reactions = JSON.parse(message.reactions);
            } catch (parseError) {
              console.warn('Failed to parse reactions for message:', message.id || message.clientId);
              message.reactions = {};
            }
          }
          messages.push(message);
        } catch (itemError) {
          console.error('Error processing message item:', itemError);
        }
      }

      console.log('Retrieved messages from SQLite:', messages.length, 'for chatId:', chatId);
      return messages;
    } catch (error) {
      if (error.message && error.message.includes('timed out')) {
        console.error('SQLite getMessages timed out for chatId:', chatId);
      } else {
        console.error('Error getting messages from SQLite:', error);
      }
      return [];
    }
  }

  async saveChat(chat: any) {
    const initialized = await this.ensureInitialized();
    if (!initialized || !this.db) {
      console.error('SQLite database not initialized');
      return;
    }

    if (!chat || !chat.id) {
      console.error('Invalid chat data provided:', chat);
      return;
    }

    try {
      const query = `
        INSERT OR REPLACE INTO chats 
        (id, name, avatar, lastMessage, lastMessageTime, unreadCount, isOnline, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        chat.id,
        chat.name || 'Unknown Chat',
        chat.avatar || '',
        chat.lastMessage || '',
        chat.lastMessageTime || '',
        chat.unreadCount || 0,
        chat.isOnline ? 1 : 0,
        chat.createdAt || new Date().toISOString(),
        chat.updatedAt || new Date().toISOString(),
      ];

      await this.db.executeSql(query, params);
      console.log('Chat saved to SQLite:', chat.id);
    } catch (error) {
      console.error('Error saving chat to SQLite:', error);
    }
  }

  async getChats(): Promise<any[]> {
    try {
      const initialized = await withTimeout(this.ensureInitialized(), 3000);
      if (!initialized || !this.db) {
        console.error('SQLite database not initialized');
        return [];
      }

      const query = `
        SELECT * FROM chats 
        ORDER BY lastMessageTime DESC
      `;

      const result = await withTimeout(this.db.executeSql(query), 2000);

      let results;
      if (Array.isArray(result)) {
        results = result[0];
      } else {
        results = result;
      }

      if (!results || !results.rows) {
        return [];
      }

      const chats = [];
      for (let i = 0; i < results.rows.length; i++) {
        chats.push(results.rows.item(i));
      }

      return chats;
    } catch (error) {
      if (error.message && error.message.includes('timed out')) {
        console.error('SQLite getChats timed out');
      } else {
        console.error('Error getting chats from SQLite:', error);
      }
      return [];
    }
  }

  async getChat(chatId: string): Promise<any | null> {
    const initialized = await this.ensureInitialized();
    if (!initialized || !this.db) {
      console.error('SQLite database not initialized');
      return null;
    }

    try {
      const query = `SELECT * FROM chats WHERE id = ?`;
      const result = await this.db.executeSql(query, [chatId]);

      let results;
      if (Array.isArray(result)) {
        results = result[0];
      } else {
        results = result;
      }

      if (results && results.rows && results.rows.length > 0) {
        return results.rows.item(0);
      }

      return null;
    } catch (error) {
      console.error('Error getting chat from SQLite:', error);
      return null;
    }
  }

  async saveUser(user: any) {
    if (!this.db) return;

    const query = `
      INSERT OR REPLACE INTO users 
      (id, name, avatar, isOnline, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.db.executeSql(query, [
      user.id,
      user.name,
      user.avatar || '',
      user.isOnline ? 1 : 0,
      new Date().toISOString(),
      new Date().toISOString(),
    ]);
  }

  async getUser(userId: string): Promise<any | null> {
    if (!this.db) return null;

    const query = `SELECT * FROM users WHERE id = ?`;
    const [results] = await this.db.executeSql(query, [userId]);

    if (results.rows.length > 0) {
      return results.rows.item(0);
    }

    return null;
  }

  async updateMessageStatus(messageId: string, status: string) {
    const initialized = await this.ensureInitialized();
    if (!initialized || !this.db) {
      console.error('SQLite database not initialized');
      return;
    }

    try {
      let query = `
        UPDATE messages 
        SET status = ?, updatedAt = ? 
        WHERE id = ?
      `;

      const result = await this.db.executeSql(query, [status, new Date().toISOString(), messageId]);

      if (result && result.length > 0 && result[0]?.rowsAffected === 0) {
        query = `
          UPDATE messages 
          SET status = ?, updatedAt = ? 
          WHERE clientId = ?
        `;
        await this.db.executeSql(query, [status, new Date().toISOString(), messageId]);
      }

      console.log('Updated message status:', messageId, '->', status);
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  }

  async updateChatLastMessage(chatId: string, lastMessage: string, lastMessageTime: string) {
    if (!this.db) return;

    const query = `
      UPDATE chats 
      SET lastMessage = ?, lastMessageTime = ?, updatedAt = ? 
      WHERE id = ?
    `;

    await this.db.executeSql(query, [lastMessage, lastMessageTime, new Date().toISOString(), chatId]);
  }

  async updateUnreadCount(chatId: string, count: number) {
    if (!this.db) return;

    const query = `
      UPDATE chats 
      SET unreadCount = ?, updatedAt = ? 
      WHERE id = ?
    `;

    await this.db.executeSql(query, [count, new Date().toISOString(), chatId]);
  }

  async updateMessage(messageId: string, updates: any) {
    if (!this.db) return;

    try {
      let query = `
        UPDATE messages 
        SET content = ?, updatedAt = ? 
        WHERE id = ?
      `;

      const result = await this.db.executeSql(query, [updates.content, new Date().toISOString(), messageId]);

      if (result[0]?.rowsAffected === 0) {
        query = `
          UPDATE messages 
          SET content = ?, updatedAt = ? 
          WHERE clientId = ?
        `;
        await this.db.executeSql(query, [updates.content, new Date().toISOString(), messageId]);
      }

      console.log('Updated message content:', messageId);
    } catch (error) {
      console.error('Error updating message:', error);
    }
  }

  async deleteMessage(messageId: string) {
    if (!this.db) return;

    try {
      let query = `DELETE FROM messages WHERE id = ?`;
      const result = await this.db.executeSql(query, [messageId]);

      if (result[0]?.rowsAffected === 0) {
        query = `DELETE FROM messages WHERE clientId = ?`;
        await this.db.executeSql(query, [messageId]);
      }

      console.log('Deleted message:', messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }

  async addReaction(messageId: string, emoji: string) {
    if (!this.db) return;

    try {
      let getQuery = `SELECT reactions FROM messages WHERE id = ?`;
      let [getResult] = await this.db.executeSql(getQuery, [messageId]);

      if (getResult.rows.length === 0) {
        getQuery = `SELECT reactions FROM messages WHERE clientId = ?`;
        [getResult] = await this.db.executeSql(getQuery, [messageId]);
      }

      let reactions = {};
      if (getResult.rows.length > 0) {
        const currentReactions = getResult.rows.item(0).reactions;
        if (currentReactions) {
          try {
            reactions = JSON.parse(currentReactions);
          } catch (e) {
            reactions = {};
          }
        }
      }

      reactions[emoji] = (reactions[emoji] || 0) + 1;

      let updateQuery = `
        UPDATE messages 
        SET reactions = ?, updatedAt = ? 
        WHERE id = ?
      `;

      const result = await this.db.executeSql(updateQuery, [JSON.stringify(reactions), new Date().toISOString(), messageId]);

      if (result[0]?.rowsAffected === 0) {
        updateQuery = `
          UPDATE messages 
          SET reactions = ?, updatedAt = ? 
          WHERE clientId = ?
        `;
        await this.db.executeSql(updateQuery, [JSON.stringify(reactions), new Date().toISOString(), messageId]);
      }

      console.log('Added reaction:', emoji, 'to message:', messageId);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }

  async removeReaction(messageId: string, emoji: string) {
    if (!this.db) return;

    try {
      let getQuery = `SELECT reactions FROM messages WHERE id = ?`;
      let [getResult] = await this.db.executeSql(getQuery, [messageId]);

      if (getResult.rows.length === 0) {
        getQuery = `SELECT reactions FROM messages WHERE clientId = ?`;
        [getResult] = await this.db.executeSql(getQuery, [messageId]);
      }

      let reactions = {};
      if (getResult.rows.length > 0) {
        const currentReactions = getResult.rows.item(0).reactions;
        if (currentReactions) {
          try {
            reactions = JSON.parse(currentReactions);
          } catch (e) {
            reactions = {};
          }
        }
      }

      if (reactions[emoji]) {
        reactions[emoji] = Math.max(reactions[emoji] - 1, 0);
        if (reactions[emoji] === 0) {
          delete reactions[emoji];
        }
      }

      let updateQuery = `
        UPDATE messages 
        SET reactions = ?, updatedAt = ? 
        WHERE id = ?
      `;

      const result = await this.db.executeSql(updateQuery, [JSON.stringify(reactions), new Date().toISOString(), messageId]);

      if (result[0]?.rowsAffected === 0) {
        updateQuery = `
          UPDATE messages 
          SET reactions = ?, updatedAt = ? 
          WHERE clientId = ?
        `;
        await this.db.executeSql(updateQuery, [JSON.stringify(reactions), new Date().toISOString(), messageId]);
      }

      console.log('Removed reaction:', emoji, 'from message:', messageId);
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }

  async markMessageAsRead(messageId: string) {
    if (!this.db) return;

    try {
      let query = `
        UPDATE messages 
        SET status = 'read', updatedAt = ? 
        WHERE id = ?
      `;

      const result = await this.db.executeSql(query, [new Date().toISOString(), messageId]);

      if (result[0]?.rowsAffected === 0) {
        query = `
          UPDATE messages 
          SET status = 'read', updatedAt = ? 
          WHERE clientId = ?
        `;
        await this.db.executeSql(query, [new Date().toISOString(), messageId]);
      }

      console.log('Marked message as read:', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  async clearAllData() {
    if (!this.db) return;

    await this.db.executeSql('DELETE FROM messages');
    await this.db.executeSql('DELETE FROM chats');
    await this.db.executeSql('DELETE FROM users');
  }

  async testDatabase(): Promise<boolean> {
    try {
      console.log('Testing SQLite database...');

      const initialized = await this.ensureInitialized();
      if (!initialized || !this.db) {
        console.error('Database not initialized');
        return false;
      }

      const result = await this.db.executeSql('SELECT COUNT(*) as count FROM messages');
      if (result && result.length > 0 && result[0].rows && result[0].rows.length > 0) {
        const count = result[0].rows.item(0).count;
        console.log('Database test successful. Message count:', count);
        return true;
      } else {
        console.log('Database test successful. No messages yet.');
        return true;
      }
    } catch (error) {
      console.error('Database test failed:', error);
      return false;
    }
  }

  async getMessageCount(chatId?: string): Promise<number> {
    try {
      const initialized = await this.ensureInitialized();
      if (!initialized || !this.db) {
        console.error('SQLite not initialized for getMessageCount');
        return 0;
      }

      let query = 'SELECT COUNT(*) as count FROM messages';
      const params: any[] = [];

      if (chatId) {
        query += ' WHERE chatId = ?';
        params.push(chatId);
      }

      const result = await new Promise((resolve, reject) => {
        this.db!.transaction((tx) => {
          tx.executeSql(
            query,
            params,
            (tx, results) => resolve(results),
            (tx, error) => {
              reject(error);
              return false;
            }
          );
        }, (error) => reject(error));
      });

      if (result && result.rows && result.rows.length > 0) {
        return result.rows.item(0).count;
      }
      return 0;
    } catch (error) {
      console.error('Error getting message count:', error);
      return 0;
    }
  }

  // ✅ Delete all chats (but keep the table structure)
async deleteAllChats() {
  if (!this.db) return;

  try {
    await this.db.executeSql('DELETE FROM chats');
    console.log('✅ All chats deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting all chats:', error);
  }
}

// ✅ Cleanup duplicate messages
async cleanupDuplicateMessages() {
  if (!this.db) return;

  const query = `
    DELETE FROM messages 
    WHERE rowid NOT IN (
      SELECT MIN(rowid) 
      FROM messages 
      GROUP BY COALESCE(id, clientId)
    )
  `;

  try {
    await this.db.executeSql(query);
    console.log('✅ Cleaned up duplicate messages');
  } catch (error) {
    console.error('❌ Error cleaning up duplicate messages:', error);
  }
}





  async saveChatWithMessages(chat: any, messages: any[] = []) {
    if (!this.db) return;

    try {
      await this.saveChat(chat);

      for (const message of messages) {
        await this.saveMessage(message);
      }

      console.log('Chat with messages saved successfully');
    } catch (error) {
      console.error('Error saving chat with messages:', error);
    }
  }

  async getChatWithMessages(chatId: string): Promise<any | null> {
    if (!this.db) return null;

    try {
      const chat = await this.getChat(chatId);
      if (!chat) return null;

      const messages = await this.getMessages(chatId);

      return {
        ...chat,
        messages: messages
      };
    } catch (error) {
      console.error('Error getting chat with messages:', error);
      return null;
    }
  }

  async markChatAsRead(chatId: string) {
    if (!this.db) return;

    const query = `
      UPDATE chats 
      SET unreadCount = 0, updatedAt = ? 
      WHERE id = ?
    `;

    await this.db.executeSql(query, [new Date().toISOString(), chatId]);
  }

  async getUnreadChats(): Promise<any[]> {
    if (!this.db) return [];

    try {
      const query = `
        SELECT * FROM chats 
        WHERE unreadCount > 0 
        ORDER BY lastMessageTime DESC
      `;

      const result = await this.db.executeSql(query);

      let results;
      if (Array.isArray(result)) {
        results = result[0];
      } else {
        results = result;
      }

      if (!results || !results.rows) {
        return [];
      }

      const chats = [];
      for (let i = 0; i < results.rows.length; i++) {
        chats.push(results.rows.item(i));
      }

      return chats;
    } catch (error) {
      console.error('Error getting unread chats:', error);
      return [];
    }
  }

  async searchChats(query: string): Promise<any[]> {
    if (!this.db) return [];

    try {
      const searchQuery = `%${query.toLowerCase()}%`;
      const sqlQuery = `
        SELECT * FROM chats 
        WHERE LOWER(name) LIKE ? OR LOWER(lastMessage) LIKE ?
        ORDER BY lastMessageTime DESC
      `;

      const result = await this.db.executeSql(sqlQuery, [searchQuery, searchQuery]);

      let results;
      if (Array.isArray(result)) {
        results = result[0];
      } else {
        results = result;
      }

      if (!results || !results.rows) {
        return [];
      }

      const chats = [];
      for (let i = 0; i < results.rows.length; i++) {
        chats.push(results.rows.item(i));
      }

      return chats;
    } catch (error) {
      console.error('Error searching chats:', error);
      return [];
    }
  }

  async searchMessages(query: string, chatId?: string): Promise<any[]> {
    if (!this.db) return [];

    try {
      const searchQuery = `%${query.toLowerCase()}%`;
      let sqlQuery = `
        SELECT * FROM messages 
        WHERE LOWER(content) LIKE ?
      `;
      const params = [searchQuery];

      if (chatId) {
        sqlQuery += ` AND chatId = ?`;
        params.push(chatId);
      }

      sqlQuery += ` ORDER BY timestamp DESC`;

      const result = await this.db.executeSql(sqlQuery, params);

      let results;
      if (Array.isArray(result)) {
        results = result[0];
      } else {
        results = result;
      }

      if (!results || !results.rows) {
        return [];
      }

      const messages = [];
      for (let i = 0; i < results.rows.length; i++) {
        messages.push(results.rows.item(i));
      }

      return messages;
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }
}

export default new SQLiteService();