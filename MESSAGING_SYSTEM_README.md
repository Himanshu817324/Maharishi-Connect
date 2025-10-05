# 💬 Maharishi Connect - Real-time Messaging System

This document provides a comprehensive overview of the real-time messaging system implemented in the Maharishi Connect React Native app.

## 🏗️ Architecture Overview

The messaging system is built with a robust architecture that supports both real-time communication via Socket.IO and REST API fallbacks for reliability.

### Core Components

1. **Socket.IO Service** (`src/services/socketService.ts`)
   - Real-time bidirectional communication
   - Automatic reconnection handling
   - Event-based message handling
   - Connection status management

2. **Chat Service** (`src/services/chatService.ts`)
   - REST API integration for chat operations
   - Chat creation, management, and retrieval
   - Message operations (send, edit, delete)
   - Search and filtering capabilities

3. **Message Service** (`src/services/messageService.ts`)
   - Message queue management
   - Offline message handling
   - Automatic retry mechanisms
   - Media message support

4. **Contact Service** (`src/services/contactService.ts`)
   - Contact management and caching
   - Search functionality
   - Contact grouping and filtering

5. **Redux Store** (`src/store/slices/`)
   - Centralized state management
   - Real-time state updates
   - Optimistic UI updates

## 🚀 Features

### Real-time Messaging
- ✅ Instant message delivery via Socket.IO
- ✅ Message delivery confirmations
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Automatic reconnection

### Message Types
- ✅ Text messages
- ✅ Image messages (with preview)
- ✅ Video messages
- ✅ Audio messages
- ✅ File attachments
- ✅ Message replies

### Chat Management
- ✅ Direct chats (1-on-1)
- ✅ Group chats
- ✅ Chat creation and joining
- ✅ Chat archiving
- ✅ Chat invites

### Advanced Features
- ✅ Message search
- ✅ Message reactions
- ✅ Message pinning
- ✅ Message editing and deletion
- ✅ Offline message queue
- ✅ Message delivery status

## 📱 User Interface

### Screens
1. **ChatScreen** - Main chat list with all conversations
2. **ConversationScreen** - Individual chat conversation
3. **FilteredContactsScreen** - Contact selection for new chats

### Components
1. **MessageBubble** - Individual message display
2. **ChatInput** - Message input with media options
3. **ChatHeader** - Chat information and actions
4. **DateHeader** - Date separators in conversations

## 🔧 Technical Implementation

### Socket.IO Events

#### Client → Server
- `send_message` - Send a new message
- `create_chat` - Create a new chat
- `join_chat` - Join a chat room
- `debug_room_status` - Debug room information
- `debug_message_delivery` - Debug message delivery
- `get_system_status` - Get system status

#### Server → Client
- `newMessage` - New message received
- `messageSent` - Message sent confirmation
- `messageDelivered` - Message delivery confirmation
- `chatCreated` - New chat created
- `joinedChat` - Successfully joined chat
- `userOnline` - User came online
- `userOffline` - User went offline
- `room_debug` - Room debug information
- `message_debug` - Message debug information
- `system_status` - System status information

### REST API Endpoints

#### Chat Management
- `POST /api/chat/create` - Create new chat
- `GET /api/chat/user-chats` - Get user's chats
- `GET /api/chat/:chatId` - Get chat details
- `POST /api/chat/:chatId/join` - Join chat
- `POST /api/chat/:chatId/leave` - Leave chat
- `DELETE /api/chat/:chatId` - Delete chat

#### Message Operations
- `POST /api/chat/:chatId/messages` - Send message
- `GET /api/chat/:chatId/messages` - Get chat messages
- `PUT /api/chat/messages/:messageId` - Edit message
- `DELETE /api/chat/messages/:messageId` - Delete message
- `POST /api/chat/messages/:messageId/read` - Mark as read

#### Advanced Features
- `GET /api/chat/search` - Search messages
- `POST /api/chat/messages/:messageId/reactions` - Add reaction
- `DELETE /api/chat/messages/:messageId/reactions` - Remove reaction
- `POST /api/chat/:chatId/messages/:messageId/pin` - Pin message
- `DELETE /api/chat/:chatId/messages/:messageId/pin` - Unpin message
- `GET /api/chat/:chatId/pinned-messages` - Get pinned messages

### State Management

#### Chat Slice (`src/store/slices/chatSlice.ts`)
```typescript
interface ChatState {
  chats: ChatData[];
  currentChat: ChatData | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}
```

#### Message Slice (`src/store/slices/messageSlice.ts`)
```typescript
interface MessageState {
  messages: { [chatId: string]: MessageData[] };
  currentChatMessages: MessageData[];
  loading: boolean;
  error: string | null;
  messageQueue: MessageQueueItem[];
  typingUsers: { [chatId: string]: string[] };
  lastFetch: { [chatId: string]: number };
}
```

## 🛠️ Setup and Configuration

### Environment Configuration

The system automatically detects the environment and uses appropriate URLs:

```typescript
// Development
const baseURL = 'http://localhost:3000';

// Production
const baseURL = 'https://api.maharishiconnect.com';
```

### Authentication

All API calls and Socket.IO connections require JWT authentication:

```typescript
const token = await AsyncStorage.getItem('auth_token');
```

### Initialization

The chat system is automatically initialized when a user is authenticated:

```typescript
// In App.tsx
<ChatInitializer />
```

## 📊 Performance Optimizations

### Caching
- Contact list caching (5-minute TTL)
- Message queue persistence
- Chat list caching

### Offline Support
- Message queue for offline messages
- Automatic retry mechanisms
- Graceful degradation to REST API

### Memory Management
- Automatic cleanup of event listeners
- Efficient Redux state updates
- Optimized FlatList rendering

## 🧪 Testing

### Test Suite
Run the comprehensive test suite:

```typescript
import MessagingTest from './src/utils/messagingTest';

// Run all tests
const results = await MessagingTest.runAllTests();

// Test specific functionality
await MessagingTest.testSocketConnection();
await MessagingTest.testSendMessage(chatId, 'Hello!');
await MessagingTest.testCreateChat([userId1, userId2]);
```

### Test Coverage
- ✅ Socket.IO connection
- ✅ Chat service operations
- ✅ Message service functionality
- ✅ Contact service operations
- ✅ Socket event handling
- ✅ Message sending
- ✅ Chat creation

## 🚨 Error Handling

### Connection Errors
- Automatic reconnection with exponential backoff
- Fallback to REST API when Socket.IO fails
- User-friendly error messages

### Message Errors
- Retry failed messages up to 3 times
- Queue management for offline messages
- Graceful error recovery

### API Errors
- Comprehensive error logging
- User notification system
- Fallback mechanisms

## 🔒 Security

### Authentication
- JWT token validation
- Secure token storage
- Automatic token refresh

### Data Protection
- Encrypted message transmission
- Secure file uploads
- Privacy controls

## 📈 Monitoring and Analytics

### Connection Monitoring
- Real-time connection status
- Reconnection attempts tracking
- Performance metrics

### Message Analytics
- Delivery rates
- Response times
- Error tracking

## 🚀 Deployment

### Production Checklist
- [ ] Update API endpoints
- [ ] Configure Socket.IO server
- [ ] Set up SSL certificates
- [ ] Configure rate limiting
- [ ] Set up monitoring
- [ ] Test all features

### Environment Variables
```bash
# Development
REACT_NATIVE_API_URL=http://localhost:3000
REACT_NATIVE_SOCKET_URL=http://localhost:3000

# Production
REACT_NATIVE_API_URL=https://api.maharishiconnect.com
REACT_NATIVE_SOCKET_URL=https://api.maharishiconnect.com
```

## 📚 API Documentation

For complete API documentation, refer to the comprehensive API documentation provided in the project requirements.

## 🤝 Contributing

When contributing to the messaging system:

1. Follow the existing code structure
2. Add comprehensive tests
3. Update documentation
4. Ensure backward compatibility
5. Test on both iOS and Android

## 📞 Support

For issues or questions regarding the messaging system:

1. Check the test suite results
2. Review the error logs
3. Verify network connectivity
4. Check authentication status
5. Review the API documentation

---

**Built with ❤️ for Maharishi Connect**
