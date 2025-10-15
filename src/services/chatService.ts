import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CreateChatRequest {
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  participants: string[];
}

export interface ChatResponse {
  status: string;
  message?: string;
  chat?: ChatData;
  chats?: ChatData[];
}

export interface ChatData {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants: Array<{
    user_id: string;
    role: 'admin' | 'member';
    joined_at: string;
    userDetails: {
      user_id: string;
      fullName: string;
      profilePicture?: string;
      // Local contact data
      localName?: string;
      localProfilePicture?: string;
      phoneNumber?: string;
    };
  }>;
  last_message?: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    message_type?: 'text' | 'image' | 'video' | 'audio' | 'file';
  };
  unread_count?: number;
  is_archived?: boolean;
  archived_at?: string;
}

export interface MessageResponse {
  status: string;
  message?: string;
  data?: MessageData;
  messages?: MessageData[];
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface MessageData {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file';
  media_url?: string;
  media_metadata?: {
    filename: string;
    size: number;
    mimeType: string;
    // File-specific metadata
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    s3Key?: string;
    // Media-specific metadata
    duration?: number; // For videos and audio
    width?: number; // For images and videos
    height?: number; // For images and videos
  };
  reply_to_message_id?: string;
  created_at: string;
  edited_at?: string;
  sender: {
    user_id: string;
    fullName: string;
    profilePicture?: string;
  };
  // Message status tracking
  status?: 'sending' | 'sent' | 'delivered' | 'seen' | 'failed';
  sent_at?: string;
  delivered_at?: string;
  seen_at?: string;
  failed_at?: string;
  error?: string;
  read_by?: Array<{
    user_id: string;
    read_at: string;
  }>;
  delivered_to?: Array<{
    user_id: string;
    delivered_at: string;
  }>;
}

export interface SearchResponse {
  status: string;
  messages: MessageData[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ReactionResponse {
  status: string;
  message?: string;
  data?: {
    message_id: string;
    user_id: string;
    emoji: string;
    created_at: string;
  };
}

export interface PinResponse {
  status: string;
  message: string;
}

export interface InviteResponse {
  status: string;
  message: string;
  data?: {
    invite_code: string;
    chat_id: string;
    created_by: string;
    max_uses: number;
    expires_at: string;
    created_at: string;
  };
}

class ChatService {
  private baseURL: string;

  constructor() {
    this.baseURL = 'https://api.maharishiconnect.com/api';
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    const url = `${this.baseURL}${endpoint}`;


    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });


    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ [makeRequest] API error:`, errorData);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData;
  }

  // Chat Management
  async createChat(chatData: CreateChatRequest): Promise<ChatResponse> {
    try {
      return await this.makeRequest<ChatResponse>('/chat/create', {
        method: 'POST',
        body: JSON.stringify(chatData),
      });
    } catch (error) {
      console.error('❌ [createChat] API Error:', error);
      return {
        status: 'ERROR',
        message: 'Failed to create chat',
      };
    }
  }

  // Create direct chat by phone number (uses JWT token for authentication)
  async createDirectChatByPhone(phoneNumber: string): Promise<ChatResponse> {
    try {

      // First, get the user ID for this phone number
      const contactResponse = await this.checkContacts([phoneNumber]);

      if (contactResponse.users.length === 0) {
        throw new Error('User not found with this phone number');
      }

      const user = contactResponse.users[0];

      // Use firebaseUid if available, otherwise extract from profile picture
      let correctUserId = user._id;

      if (user.firebaseUid) {
        // Use firebaseUid directly if available
        correctUserId = user.firebaseUid;
      } else if (user.profilePicture) {
        // Fallback to profile picture extraction
        const profilePictureMatch = user.profilePicture.match(/profile-images\/([^/]+)\//);
        if (profilePictureMatch) {
          const extractedUserId = profilePictureMatch[1];
          if (extractedUserId !== user._id) {
            correctUserId = extractedUserId;
          }
        }
      } else {
      }

      // Get local contact data
      const { contactService } = await import('./contactService');
      const localContact = await contactService.getUserByPhoneNumber(phoneNumber);


      // Create chat using the existing /chat/create endpoint
      const response = await this.makeRequest<ChatResponse>('/chat/create', {
        method: 'POST',
        body: JSON.stringify({
          type: 'direct',
          participants: [correctUserId],
        }),
      });

      // Add local contact data to the response
      if (response.status === 'SUCCESS' && response.chat) {
        response.chat.participants = response.chat.participants.map(participant => {
          if (participant.user_id === correctUserId && localContact) {
            return {
              ...participant,
              userDetails: {
                ...participant.userDetails,
                localName: localContact.localName,
                localProfilePicture: localContact.localProfilePicture,
                phoneNumber: localContact.phoneNumber,
              }
            };
          }
          return participant;
        });
      }

      return response;
    } catch (error) {
      console.error('❌ [createDirectChatByPhone] API Error:', error);
      return {
        status: 'ERROR',
        message: 'Failed to create direct chat',
      };
    }
  }

  async getUserChats(): Promise<ChatResponse> {
    try {
      const response = await this.makeRequest<ChatResponse>('/chat/user-chats');


      // Map local contact data to chat participants and fetch last messages
      if (response.status === 'SUCCESS' && response.chats) {
        const { contactService } = await import('./contactService');

        // Get all device contacts for mapping
        const deviceContacts = await contactService.getContactsWithStatus();
        const allContacts = [...deviceContacts.existingUsers, ...deviceContacts.nonUsers.map(nonUser => ({
          user_id: nonUser.phoneNumber,
          fullName: nonUser.name || 'Unknown',
          phoneNumber: nonUser.phoneNumber,
          localName: nonUser.name,
          localProfilePicture: undefined,
          localEmail: undefined,
        }))];

        // Batch fetch last messages for all chats that don't have them
        const chatsWithoutLastMessage = response.chats.filter(chat => !chat.last_message);

        // Batch fetch last messages for all chats at once
        if (chatsWithoutLastMessage.length > 0) {
          try {
            const lastMessagesPromises = chatsWithoutLastMessage.map(async (chat) => {
              try {
                const messagesResponse = await this.getChatMessages(chat.id, {
                  limit: 1,
                  orderBy: 'created_at_desc'
                });

                if (messagesResponse.messages && messagesResponse.messages.length > 0) {
                  const latestMessage = messagesResponse.messages[0];
                  return {
                    chatId: chat.id,
                    lastMessage: {
                      id: latestMessage.id,
                      content: latestMessage.content,
                      sender_id: latestMessage.sender_id,
                      created_at: latestMessage.created_at,
                      message_type: latestMessage.message_type,
                    }
                  };
                }
                return { chatId: chat.id, lastMessage: null };
              } catch (error) {
                return { chatId: chat.id, lastMessage: null };
              }
            });

            const lastMessagesResults = await Promise.all(lastMessagesPromises);
            const lastMessagesMap = new Map(
              lastMessagesResults.map(result => [result.chatId, result.lastMessage])
            );


            // Update each chat with local contact data and last message
            response.chats = response.chats.map((chat) => {
              const lastMessage = chat.last_message || lastMessagesMap.get(chat.id);

              return {
                ...chat,
                last_message: lastMessage || undefined,
                participants: chat.participants.map(participant => {
                  // Find local contact data for this participant
                  const localContact = allContacts.find(contact => {
                    if (!contact.phoneNumber) return false;
                    // Try to match by phone number
                    let cleaned = contact.phoneNumber.replace(/[^\d+]/g, '');
                    if (cleaned.startsWith('+91')) {
                      cleaned = cleaned.substring(3);
                    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
                      cleaned = cleaned.substring(2);
                    }

                    // Check if this participant has a phone number we can match
                    // For now, we'll match by user_id or try to find by name
                    return contact.user_id === participant.user_id ||
                      contact.fullName === participant.userDetails.fullName;
                  });

                  if (localContact) {
                    return {
                      ...participant,
                      userDetails: {
                        ...participant.userDetails,
                        localName: localContact.localName || localContact.fullName,
                        localProfilePicture: localContact.localProfilePicture,
                        phoneNumber: localContact.phoneNumber,
                      }
                    };
                  }

                  return participant;
                })
              };
            });
          } catch (error) {
            // Continue with original chats if batch fetch fails
          }
        } else {
          // Update each chat with local contact data (no last message fetching needed)
          response.chats = response.chats.map((chat) => {
            return {
              ...chat,
              participants: chat.participants.map(participant => {
                // Find local contact data for this participant
                const localContact = allContacts.find(contact => {
                  if (!contact.phoneNumber) return false;
                  // Try to match by phone number
                  let cleaned = contact.phoneNumber.replace(/[^\d+]/g, '');
                  if (cleaned.startsWith('+91')) {
                    cleaned = cleaned.substring(3);
                  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
                    cleaned = cleaned.substring(2);
                  }

                  // Check if this participant has a phone number we can match
                  // For now, we'll match by user_id or try to find by name
                  return contact.user_id === participant.user_id ||
                    contact.fullName === participant.userDetails.fullName;
                });

                if (localContact) {
                  return {
                    ...participant,
                    userDetails: {
                      ...participant.userDetails,
                      localName: localContact.localName || localContact.fullName,
                      localProfilePicture: localContact.localProfilePicture,
                      phoneNumber: localContact.phoneNumber,
                    }
                  };
                }

                return participant;
              })
            };
          });
        }
      }

      return response;
    } catch (error) {
      console.error('❌ [getUserChats] API call failed:', error);
      return {
        status: 'ERROR',
        message: 'Failed to load chats',
      };
    }
  }

  async getChatDetails(chatId: string): Promise<ChatResponse> {
    return this.makeRequest<ChatResponse>(`/chat/${chatId}`);
  }

  async getChatDetailsByMessage(message: MessageData): Promise<ChatResponse> {
    // Try to get chat details from the message's chat_id
    try {
      return await this.getChatDetails(message.chat_id);
    } catch (error) {
      console.error('Failed to get chat details for message:', error);
      // Return a minimal chat object if we can't fetch details
      return {
        status: 'OK',
        chat: {
          id: message.chat_id,
          type: 'direct' as const,
          name: message.sender.fullName || 'Unknown User',
          created_by: message.sender_id,
          created_at: message.created_at,
          updated_at: message.created_at,
          participants: [
            {
              user_id: message.sender_id,
              role: 'member' as const,
              joined_at: message.created_at,
              userDetails: {
                user_id: message.sender_id,
                fullName: message.sender.fullName || 'Unknown User',
                profilePicture: message.sender.profilePicture,
              },
            },
          ],
          last_message: {
            id: message.id,
            content: message.content,
            sender_id: message.sender_id,
            created_at: message.created_at,
          },
          unread_count: 1,
        },
      };
    }
  }

  async joinChat(chatId: string): Promise<ChatResponse> {
    return this.makeRequest<ChatResponse>(`/chat/${chatId}/join`, {
      method: 'POST',
    });
  }

  async leaveChat(chatId: string): Promise<ChatResponse> {
    return this.makeRequest<ChatResponse>(`/chat/${chatId}/leave`, {
      method: 'POST',
    });
  }

  async deleteChat(chatId: string): Promise<ChatResponse> {
    return this.makeRequest<ChatResponse>(`/chat/${chatId}`, {
      method: 'DELETE',
    });
  }

  // Message Operations
  async sendMessage(
    chatId: string,
    messageData: {
      content: string;
      messageType: 'text' | 'image' | 'video' | 'audio' | 'file';
      mediaUrl?: string;
      mediaMetadata?: {
        filename: string;
        size: number;
        mimeType: string;
      };
      replyToMessageId?: string;
    }
  ): Promise<MessageResponse> {
    return this.makeRequest<MessageResponse>(`/chat/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async getChatMessages(
    chatId: string,
    options: {
      limit?: number;
      offset?: number;
      beforeMessageId?: string;
      orderBy?: 'created_at' | 'created_at_desc';
    } = {}
  ): Promise<MessageResponse> {
    try {
      // Validate chatId
      if (!chatId) {
        throw new Error('Chat ID is required');
      }

      // No test chats - all chats should come from the server

      const params = new URLSearchParams();

      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.beforeMessageId) params.append('beforeMessageId', options.beforeMessageId);
      if (options.orderBy) params.append('orderBy', options.orderBy);

      const queryString = params.toString();
      const endpoint = `/chat/${chatId}/messages${queryString ? `?${queryString}` : ''}`;


      const response = await this.makeRequest<MessageResponse>(endpoint);

      return response;
    } catch (error) {
      console.error('❌ [getChatMessages] API Error:', error);
      return {
        status: 'ERROR',
        message: 'Failed to load messages',
      };
    }
  }

  async editMessage(
    messageId: string,
    content: string
  ): Promise<MessageResponse> {
    return this.makeRequest<MessageResponse>(`/chat/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteMessage(messageId: string): Promise<MessageResponse> {
    return this.makeRequest<MessageResponse>(`/chat/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async markMessageAsRead(messageId: string): Promise<MessageResponse> {
    return this.makeRequest<MessageResponse>(`/chat/messages/${messageId}/read`, {
      method: 'POST',
    });
  }

  // Message Search
  async searchMessages(options: {
    q: string;
    chatId?: string;
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'file';
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<SearchResponse> {
    const params = new URLSearchParams();

    params.append('q', options.q);
    if (options.chatId) params.append('chatId', options.chatId);
    if (options.messageType) params.append('messageType', options.messageType);
    if (options.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options.dateTo) params.append('dateTo', options.dateTo);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    return this.makeRequest<SearchResponse>(`/chat/search?${params.toString()}`);
  }

  // Message Interactions
  async addReaction(messageId: string, emoji: string): Promise<ReactionResponse> {
    return this.makeRequest<ReactionResponse>(`/chat/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  async removeReaction(messageId: string, emoji: string): Promise<ReactionResponse> {
    return this.makeRequest<ReactionResponse>(`/chat/messages/${messageId}/reactions`, {
      method: 'DELETE',
      body: JSON.stringify({ emoji }),
    });
  }

  // Message Pinning
  async pinMessage(chatId: string, messageId: string): Promise<PinResponse> {
    return this.makeRequest<PinResponse>(`/chat/${chatId}/messages/${messageId}/pin`, {
      method: 'POST',
    });
  }

  async unpinMessage(chatId: string, messageId: string): Promise<PinResponse> {
    return this.makeRequest<PinResponse>(`/chat/${chatId}/messages/${messageId}/pin`, {
      method: 'DELETE',
    });
  }

  async getPinnedMessages(chatId: string): Promise<MessageResponse> {
    return this.makeRequest<MessageResponse>(`/chat/${chatId}/pinned-messages`);
  }

  // Chat Archiving
  async archiveChat(chatId: string): Promise<ChatResponse> {
    return this.makeRequest<ChatResponse>(`/chat/${chatId}/archive`, {
      method: 'POST',
    });
  }

  async unarchiveChat(chatId: string): Promise<ChatResponse> {
    return this.makeRequest<ChatResponse>(`/chat/${chatId}/unarchive`, {
      method: 'POST',
    });
  }

  async getArchivedChats(): Promise<ChatResponse> {
    return this.makeRequest<ChatResponse>('/chat/archived');
  }

  // Chat Invites
  async createChatInvite(
    chatId: string,
    options: {
      maxUses?: number;
      expiresAt?: string;
    } = {}
  ): Promise<InviteResponse> {
    return this.makeRequest<InviteResponse>(`/chat/${chatId}/invites`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async useChatInvite(inviteCode: string): Promise<InviteResponse> {
    return this.makeRequest<InviteResponse>(`/chat/invites/${inviteCode}/use`, {
      method: 'POST',
    });
  }

  // Check which contacts are existing users
  async checkContacts(phoneNumbers: string[]): Promise<{
    message: string;
    users: Array<{
      _id: string;
      firebaseUid?: string;
      fullName: string;
      mobileNo: string;
      status: string;
      profilePicture: string | null;
    }>;
  }> {
    try {

      // Clean and validate phone numbers - send ALL contacts to backend
      const cleanedPhoneNumbers = phoneNumbers
        .map(phone => phone?.toString().trim())
        .filter(phone => phone && phone.length > 0);
      // Backend will handle all contacts at once



      const response = await this.makeRequest<{
        message: string;
        users: Array<{
          _id: string;
          fullName: string;
          mobileNo: string;
          status: string;
          profilePicture: string | null;
        }>;
      }>('/user/check-contacts', {
        method: 'POST',
        body: JSON.stringify({
          contacts: cleanedPhoneNumbers
        }),
      });

      return response;
    } catch (error) {
      console.error('❌ API checkContacts failed:', error);

      // If it's a 502 error (Bad Gateway), it might be temporary
      if (error instanceof Error && error.message?.includes('502')) {
        throw new Error('Server temporarily unavailable. Please try again in a moment.');
      }

      // Re-throw other errors
      throw error;
    }
  }


  // Message status management methods
  async updateMessageStatus(
    messageId: string,
    status: 'sending' | 'sent' | 'delivered' | 'seen' | 'failed',
    error?: string
  ): Promise<{ status: string; data: MessageData }> {
    try {

      const response = await this.makeRequest<MessageResponse>(
        `/chat/messages/${messageId}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({
            status,
            error,
            timestamp: new Date().toISOString(),
          }),
        }
      );

      return {
        status: response.status,
        data: response.data!,
      };
    } catch (error) {
      console.error(`❌ Error updating message status for ${messageId}:`, error);
      throw error;
    }
  }

  async markMessageAsDelivered(messageId: string): Promise<void> {
    try {
      await this.updateMessageStatus(messageId, 'delivered');
    } catch (error) {
      console.error(`❌ Error marking message as delivered:`, error);
      throw error;
    }
  }

  async markMessageAsSeen(messageId: string): Promise<void> {
    try {
      await this.updateMessageStatus(messageId, 'seen');
    } catch (error) {
      console.error(`❌ Error marking message as seen:`, error);
      throw error;
    }
  }

  async markMessageAsFailed(messageId: string, errorMessage: string): Promise<void> {
    try {
      await this.updateMessageStatus(messageId, 'failed', errorMessage);
    } catch (err) {
      console.error(`❌ Error marking message as failed:`, err);
      throw err;
    }
  }

  async getMessageStatus(messageId: string): Promise<MessageData> {
    try {

      const response = await this.makeRequest<MessageResponse>(
        `/chat/messages/${messageId}/status`
      );

      return response.data!;
    } catch (error) {
      console.error(`❌ Error getting message status for ${messageId}:`, error);
      throw error;
    }
  }

  async getMessageReadReceipts(messageId: string): Promise<Array<{ userId: string; readAt: string }>> {
    try {

      const response = await this.makeRequest<{ status: string; data: Array<{ userId: string; readAt: string }> }>(
        `/chat/messages/${messageId}/read-receipts`
      );

      return response.data;
    } catch (error) {
      console.error(`❌ Error getting read receipts for ${messageId}:`, error);
      return [];
    }
  }

  async getMessageDeliveryReceipts(messageId: string): Promise<Array<{ userId: string; deliveredAt: string }>> {
    try {

      const response = await this.makeRequest<{ status: string; data: Array<{ userId: string; deliveredAt: string }> }>(
        `/chat/messages/${messageId}/delivery-receipts`
      );

      return response.data;
    } catch (error) {
      console.error(`❌ Error getting delivery receipts for ${messageId}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();
export default chatService;
