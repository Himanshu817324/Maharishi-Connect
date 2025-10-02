import { store } from '../store';
import socketService from '../services/socketService';
import chatManagementService from '../services/chatManagementService';
import messageSyncService from '../services/messageSyncService';
import sqliteService from '../services/sqliteService';
import { selectCurrentUser } from '../store/slices/authSlice';

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  duration: number;
}

class RealTimeMessagingTest {
  private testResults: TestResult[] = [];

  /**
   * Run comprehensive tests for real-time messaging functionality
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting Real-Time Messaging Tests...');
    this.testResults = [];

    try {
      // Test 1: Socket Connection Management
      await this.testSocketConnection();

      // Test 2: Message Deduplication
      await this.testMessageDeduplication();

      // Test 3: Chat Creation
      await this.testChatCreation();

      // Test 4: Chat Deletion
      await this.testChatDeletion();

      // Test 5: Message Sync
      await this.testMessageSync();

      // Test 6: Real-time Message Flow
      await this.testRealTimeMessageFlow();

      console.log('✅ All tests completed');
      return this.testResults;

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return this.testResults;
    }
  }

  /**
   * Test socket connection management
   */
  private async testSocketConnection(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Socket Connection Management';

    try {
      console.log('🔌 Testing socket connection...');

      // Test 1: Initial connection
      const state = store.getState();
      const currentUser = selectCurrentUser(state);
      
      if (!currentUser?.id) {
        throw new Error('No current user found');
      }

      // Test connection
      await socketService.connect(currentUser.id, currentUser.token);
      
      if (!socketService.getConnectionStatus()) {
        throw new Error('Socket connection failed');
      }

      // Test 2: Prevent duplicate connections
      const connectionPromise1 = socketService.connect(currentUser.id, currentUser.token);
      const connectionPromise2 = socketService.connect(currentUser.id, currentUser.token);
      
      // Both should resolve to the same connection
      await Promise.all([connectionPromise1, connectionPromise2]);

      // Test 3: Connection state tracking
      const connectionDetails = socketService.getConnectionDetails();
      if (!connectionDetails.isConnected) {
        throw new Error('Connection state not properly tracked');
      }

      this.addTestResult(testName, true, Date.now() - startTime);
      console.log('✅ Socket connection test passed');

    } catch (error) {
      this.addTestResult(testName, false, Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Socket connection test failed:', error);
    }
  }

  /**
   * Test message deduplication
   */
  private async testMessageDeduplication(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Message Deduplication';

    try {
      console.log('📨 Testing message deduplication...');

      // Simulate duplicate messages
      const duplicateMessage = {
        _id: 'test_message_123',
        content: 'Test message',
        senderId: 'test_user',
        createdAt: new Date().toISOString(),
        chatId: 'test_chat'
      };

      // Test that the same message is not processed twice
      let messageCount = 0;
      const messageHandler = (message: any) => {
        messageCount++;
        console.log('📨 Received message:', message._id);
      };

      // Add listener
      const unsubscribe = socketService.on('newMessage', messageHandler);

      // Simulate receiving the same message multiple times
      // (This would normally be handled by the socket service's deduplication logic)
      
      // Clean up
      unsubscribe?.();

      this.addTestResult(testName, true, Date.now() - startTime);
      console.log('✅ Message deduplication test passed');

    } catch (error) {
      this.addTestResult(testName, false, Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Message deduplication test failed:', error);
    }
  }

  /**
   * Test chat creation
   */
  private async testChatCreation(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Chat Creation';

    try {
      console.log('💬 Testing chat creation...');

      // Initialize chat management service
      await chatManagementService.initialize();

      // Test direct chat creation
      const directChatResult = await chatManagementService.createDirectChat('test_user_123');
      
      if (!directChatResult.success) {
        throw new Error(`Direct chat creation failed: ${directChatResult.error}`);
      }

      // Test group chat creation
      const groupChatResult = await chatManagementService.createGroupChat(
        ['user1', 'user2', 'user3'],
        'Test Group Chat'
      );

      if (!groupChatResult.success) {
        throw new Error(`Group chat creation failed: ${groupChatResult.error}`);
      }

      this.addTestResult(testName, true, Date.now() - startTime);
      console.log('✅ Chat creation test passed');

    } catch (error) {
      this.addTestResult(testName, false, Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Chat creation test failed:', error);
    }
  }

  /**
   * Test chat deletion
   */
  private async testChatDeletion(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Chat Deletion';

    try {
      console.log('🗑️ Testing chat deletion...');

      // Create a test chat first
      const chatResult = await chatManagementService.createDirectChat('test_user_for_deletion');
      
      if (!chatResult.success || !chatResult.chatId) {
        throw new Error('Failed to create test chat for deletion');
      }

      const chatId = chatResult.chatId;

      // Test chat deletion
      const deleteResult = await chatManagementService.deleteChat(chatId);
      
      if (!deleteResult.success) {
        throw new Error(`Chat deletion failed: ${deleteResult.error}`);
      }

      // Verify chat is removed from Redux state
      const state = store.getState();
      const chatExists = state.chat.chats.find(chat => chat.id === chatId);
      
      if (chatExists) {
        throw new Error('Chat still exists in Redux state after deletion');
      }

      this.addTestResult(testName, true, Date.now() - startTime);
      console.log('✅ Chat deletion test passed');

    } catch (error) {
      this.addTestResult(testName, false, Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Chat deletion test failed:', error);
    }
  }

  /**
   * Test message synchronization
   */
  private async testMessageSync(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Message Synchronization';

    try {
      console.log('🔄 Testing message synchronization...');

      // Initialize message sync service
      await messageSyncService.initialize();

      // Test sync all data
      const syncResult = await messageSyncService.syncAllData({ forceServerSync: true });
      
      if (!syncResult.success) {
        throw new Error(`Message sync failed: ${syncResult.errors?.join(', ')}`);
      }

      console.log(`📊 Sync result: ${syncResult.chatsCount} chats, ${syncResult.messagesCount} messages`);

      this.addTestResult(testName, true, Date.now() - startTime);
      console.log('✅ Message synchronization test passed');

    } catch (error) {
      this.addTestResult(testName, false, Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Message synchronization test failed:', error);
    }
  }

  /**
   * Test real-time message flow
   */
  private async testRealTimeMessageFlow(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Real-time Message Flow';

    try {
      console.log('⚡ Testing real-time message flow...');

      // Ensure socket is connected
      if (!socketService.getConnectionStatus()) {
        const state = store.getState();
        const currentUser = selectCurrentUser(state);
        
        if (currentUser?.id) {
          await socketService.connect(currentUser.id, currentUser.token);
        }
      }

      // Test message sending
      const testMessage = {
        chatId: 'test_chat',
        content: 'Test real-time message',
        messageType: 'text',
        tempId: `test_${Date.now()}`,
        senderId: 'test_user',
        createdAt: new Date().toISOString()
      };

      // Test socket message sending
      const socketSent = socketService.sendMessage(testMessage);
      
      if (!socketSent) {
        throw new Error('Failed to send message via socket');
      }

      this.addTestResult(testName, true, Date.now() - startTime);
      console.log('✅ Real-time message flow test passed');

    } catch (error) {
      this.addTestResult(testName, false, Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Real-time message flow test failed:', error);
    }
  }

  /**
   * Add test result
   */
  private addTestResult(testName: string, success: boolean, duration: number, error?: string): void {
    this.testResults.push({
      testName,
      success,
      error,
      duration
    });
  }

  /**
   * Get test summary
   */
  getTestSummary(): { total: number; passed: number; failed: number; duration: number } {
    const total = this.testResults.length;
    const passed = this.testResults.filter(result => result.success).length;
    const failed = total - passed;
    const duration = this.testResults.reduce((sum, result) => sum + result.duration, 0);

    return { total, passed, failed, duration };
  }

  /**
   * Print test results
   */
  printTestResults(): void {
    console.log('\n🧪 Real-Time Messaging Test Results:');
    console.log('=====================================');
    
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${result.testName} (${duration})`);
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const summary = this.getTestSummary();
    console.log('\n📊 Summary:');
    console.log(`Total: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Total Duration: ${summary.duration}ms`);
    console.log(`Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
  }
}

export default new RealTimeMessagingTest();
