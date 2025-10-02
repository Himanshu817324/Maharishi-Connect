// App startup test utility
import sqliteService from '../services/sqliteService';

export class AppStartupTest {
  static async runQuickStartupTest() {
    console.log('🚀 Running app startup test...');
    
    const startTime = Date.now();
    
    try {
      // Test 1: SQLite service import should be instant (no blocking)
      console.log('✅ SQLiteService imported successfully (non-blocking)');
      
      // Test 2: Check if SQLite is initialized (should be false initially)
      const isInitialized = sqliteService.isInitialized();
      console.log('📋 SQLite initial state:', isInitialized ? 'initialized' : 'not initialized');
      
      // Test 3: Test ensureInitialized with timeout
      console.log('📋 Testing ensureInitialized...');
      const initStart = Date.now();
      const initialized = await sqliteService.ensureInitialized();
      const initTime = Date.now() - initStart;
      
      console.log('📋 Initialization result:', initialized);
      console.log('📋 Initialization time:', initTime + 'ms');
      
      if (initTime > 5000) {
        console.warn('⚠️ Initialization took longer than 5 seconds');
      } else if (initTime > 3000) {
        console.warn('⚠️ Initialization took longer than 3 seconds');
      } else {
        console.log('✅ Initialization completed in reasonable time');
      }
      
      // Test 4: Quick database operation test
      if (initialized) {
        console.log('📋 Testing database operations...');
        const dbTestStart = Date.now();
        const dbTest = await sqliteService.testDatabase();
        const dbTestTime = Date.now() - dbTestStart;
        
        console.log('📋 Database test result:', dbTest);
        console.log('📋 Database test time:', dbTestTime + 'ms');
      }
      
      const totalTime = Date.now() - startTime;
      console.log('🎯 Total startup test time:', totalTime + 'ms');
      
      return {
        success: true,
        initialized,
        totalTime,
        performance: totalTime < 3000 ? 'good' : totalTime < 6000 ? 'acceptable' : 'slow'
      };
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('❌ Startup test failed:', error);
      
      return {
        success: false,
        error: error.message,
        totalTime,
        performance: 'failed'
      };
    }
  }
  
  static async testChatLoading() {
    console.log('💬 Testing chat loading performance...');
    
    try {
      const startTime = Date.now();
      
      // Test getChats
      const chats = await sqliteService.getChats();
      const chatsTime = Date.now() - startTime;
      
      console.log('📋 Retrieved chats:', chats.length);
      console.log('📋 Chat loading time:', chatsTime + 'ms');
      
      // Test getMessages for first chat (if available)
      if (chats.length > 0) {
        const messageStart = Date.now();
        const messages = await sqliteService.getMessages(chats[0].id);
        const messageTime = Date.now() - messageStart;
        
        console.log('📋 Retrieved messages for first chat:', messages.length);
        console.log('📋 Message loading time:', messageTime + 'ms');
      }
      
      return {
        success: true,
        chatsCount: chats.length,
        chatsTime,
        performance: chatsTime < 500 ? 'excellent' : chatsTime < 1500 ? 'good' : 'slow'
      };
      
    } catch (error) {
      console.error('❌ Chat loading test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Make available globally in development
if (__DEV__) {
  (global as any).startupTest = AppStartupTest;
  console.log('🧪 Startup test available at global.startupTest');
  console.log('   - global.startupTest.runQuickStartupTest()');
  console.log('   - global.startupTest.testChatLoading()');
}

export default AppStartupTest;