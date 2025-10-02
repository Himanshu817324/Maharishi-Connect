import { store } from '../store';
import { addChat, mergeChats, removeChat, setLoading, setError } from '../store/slices/chatSlice';
import chatApiService from './chatApiService';
import sqliteService from './sqliteService';
import socketService from './socketService';
import { selectCurrentUser } from '../store/slices/authSlice';

interface ChatCreationData {
    participants: string[];
    name?: string;
    type: 'direct' | 'group';
    avatar?: string;
}

interface ChatCreationResult {
    success: boolean;
    chatId?: string;
    error?: string;
}

class ChatManagementService {
    private isInitialized = false;

    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('🔄 [ChatManagementService] Initializing...');

            // Ensure SQLite is initialized
            if (!sqliteService.isInitialized()) {
                await sqliteService.init();
            }

            this.isInitialized = true;
            console.log('✅ [ChatManagementService] Initialization complete');
        } catch (error) {
            console.error('❌ [ChatManagementService] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Create a new chat with comprehensive error handling and state management
     */
    async createChat(chatData: ChatCreationData): Promise<ChatCreationResult> {
        try {
            console.log('🔄 [ChatManagementService] Creating new chat:', chatData);

            const state = store.getState();
            const currentUser = selectCurrentUser(state);

            if (!currentUser?.id || !currentUser?.token) {
                throw new Error('User not authenticated');
            }

            // Set auth token
            chatApiService.setAuthToken(currentUser.token);

            // Step 1: Create chat on server
            const serverChat = await chatApiService.createChat({
                type: chatData.type,
                name: chatData.name || 'Chat',
                description: chatData.name || 'Chat',
                participants: chatData.participants
            });

            if (!serverChat?.id && !serverChat?._id) {
                throw new Error('Server did not return valid chat ID');
            }

            const chatId = serverChat.id || serverChat._id;
            console.log(`✅ [ChatManagementService] Chat created on server: ${chatId}`);

            // Step 2: Normalize chat data
            const normalizedChat = this.normalizeChat(serverChat, currentUser.id);

            // Step 3: Save to SQLite
            try {
                await sqliteService.saveChat({
                    id: normalizedChat.id,
                    name: normalizedChat.name,
                    type: normalizedChat.type || 'direct',
                    avatar: normalizedChat.avatar,
                    lastMessage: normalizedChat.lastMessage || '',
                    lastMessageTime: normalizedChat.lastMessageTime,
                    unreadCount: normalizedChat.unreadCount || 0,
                    participants: JSON.stringify(normalizedChat.participants || []),
                    createdAt: normalizedChat.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                console.log(`💾 [ChatManagementService] Chat saved to SQLite: ${chatId}`);
            } catch (sqliteError) {
                console.error(`❌ [ChatManagementService] Failed to save chat to SQLite:`, sqliteError);
                // Continue even if SQLite save fails
            }

            // Step 4: Add to Redux state
            store.dispatch(addChat(normalizedChat));
            console.log(`📱 [ChatManagementService] Chat added to Redux: ${chatId}`);

            // Step 5: Join socket room
            if (socketService.getConnectionStatus()) {
                socketService.joinChat(chatId);
                console.log(`🔌 [ChatManagementService] Joined socket room: ${chatId}`);
            }

            console.log(`✅ [ChatManagementService] Chat creation completed: ${chatId}`);
            return { success: true, chatId };

        } catch (error) {
            console.error('❌ [ChatManagementService] Chat creation failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Create a direct chat between two users
     */
    async createDirectChat(otherUserId: string): Promise<ChatCreationResult> {
        try {
            console.log(`🔄 [ChatManagementService] Creating direct chat with: ${otherUserId}`);

            const state = store.getState();
            const currentUser = selectCurrentUser(state);

            if (!currentUser?.id) {
                throw new Error('User not authenticated');
            }

            // Check if direct chat already exists
            const existingChat = await this.findExistingDirectChat(currentUser.id, otherUserId);
            if (existingChat) {
                console.log(`📱 [ChatManagementService] Direct chat already exists: ${existingChat.id}`);
                return { success: true, chatId: existingChat.id };
            }

            // Create new direct chat
            const chatData: ChatCreationData = {
                participants: [currentUser.id, otherUserId],
                type: 'direct'
            };

            return await this.createChat(chatData);

        } catch (error) {
            console.error('❌ [ChatManagementService] Direct chat creation failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Create a group chat
     */
    async createGroupChat(participants: string[], name: string, avatar?: string): Promise<ChatCreationResult> {
        try {
            console.log(`🔄 [ChatManagementService] Creating group chat: ${name}`);

            const state = store.getState();
            const currentUser = selectCurrentUser(state);

            if (!currentUser?.id) {
                throw new Error('User not authenticated');
            }

            // Ensure current user is included in participants
            const allParticipants = [...new Set([currentUser.id, ...participants])];

            const chatData: ChatCreationData = {
                participants: allParticipants,
                name,
                type: 'group',
                avatar
            };

            return await this.createChat(chatData);

        } catch (error) {
            console.error('❌ [ChatManagementService] Group chat creation failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Find existing direct chat between two users
     */
    private async findExistingDirectChat(userId1: string, userId2: string): Promise<any | null> {
        try {
            const state = store.getState();
            const chats = state.chat.chats;

            return chats.find(chat => {
                if (chat.type !== 'direct') return false;

                const participants = Array.isArray(chat.participants)
                    ? chat.participants
                    : JSON.parse(chat.participants || '[]');

                const participantIds = participants.map((p: any) =>
                    p?.user_id || p?.uid || p?.id || p
                );

                return participantIds.includes(userId1) && participantIds.includes(userId2);
            });
        } catch (error) {
            console.error('❌ [ChatManagementService] Error finding existing direct chat:', error);
            return null;
        }
    }

    /**
     * Normalize chat data for consistent format
     */
    private normalizeChat(chat: any, currentUserId: string): any {
        const id = chat?.id || chat?._id;
        const type = (chat?.type || chat?.chat_type) === 'direct' ? 'direct' : (chat?.type || 'group');
        const participants = chat?.participants || chat?.members || [];

        let name = chat?.name;
        if (!name && type === 'direct' && Array.isArray(participants)) {
            const other = participants.find((p: any) => {
                const participantId = p?.user_id || p?.uid || p?.id || p;
                return participantId !== currentUserId;
            });
            if (other) {
                name = other?.userDetails?.fullName ||
                    other?.fullName ||
                    other?.name ||
                    other?.user_name ||
                    other?.displayName ||
                    'Unknown User';

                // Only format phone number if no name is available
                if (name === 'Unknown User') {
                    const phoneNumber = other?.user_mobile || other?.phone;
                    if (phoneNumber) {
                        const normalizedNumber = phoneNumber.replace(/\D/g, '');
                        if (normalizedNumber.length === 10) {
                            name = `+91${normalizedNumber}`;
                        } else if (normalizedNumber.length > 10) {
                            name = `+91${normalizedNumber.slice(-10)}`;
                        } else {
                            name = phoneNumber;
                        }
                    }
                }
            } else {
                name = 'Unknown';
            }
        }

        // If still no name, use a more descriptive fallback
        if (!name || name === 'Unknown Chat') {
            if (type === 'direct') {
                name = 'Direct Message';
            } else {
                name = 'Group Chat';
            }
        }

        return {
            id,
            type,
            name: name || 'Unknown Chat',
            participants,
            avatar: chat?.avatar || chat?.icon || undefined,
            lastMessage: chat?.last_message_content || chat?.lastMessage || '',
            lastMessageTime: chat?.last_message_created_at || chat?.updated_at || chat?.created_at || chat?.lastMessageTime || null,
            unreadCount: chat?.unread_count ?? chat?.unreadCount ?? 0,
        };
    }

    /**
     * Handle chat deletion with comprehensive cleanup
     */
    async deleteChat(chatId: string): Promise<{ success: boolean; error?: string }> {
        try {
            console.log(`🗑️ [ChatManagementService] Deleting chat: ${chatId}`);

            // Step 1: Clean up socket state
            socketService.cleanupChatState(chatId);

            // Step 2: Remove from Redux state
            store.dispatch(removeChat(chatId));

            // Step 3: Delete from SQLite
            await sqliteService.deleteChat(chatId);

            // Step 4: Delete from server
            await chatApiService.deleteChat(chatId);

            console.log(`✅ [ChatManagementService] Chat deleted successfully: ${chatId}`);
            return { success: true };

        } catch (error) {
            console.error('❌ [ChatManagementService] Chat deletion failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Get service initialization status
     */
    isServiceInitialized(): boolean {
        return this.isInitialized;
    }
}

export default new ChatManagementService();
