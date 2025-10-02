import React, { useEffect, useState } from 'react';
import { 
  FlatList, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../../../theme';
import CustomStatusBar from '../../../../components/atoms/ui/StatusBar';
import AvatarWithInitials from '../../../../components/atoms/ui/AvatarWithInitials';
import { fetchContacts, fetchMatchedContacts } from '../../../../services/contactService';
import { mergeLocalNames, extractContacts } from '../../../../utils/contacts';
import { apiService } from '../../../../services/apiService';
import chatApiService from '../../../../services/chatApiService';
import sqliteService from '../../../../services/sqliteService';
import { addChat } from '../../../../store/slices/chatSlice';
import { selectCurrentUser } from '../../../../store/slices/authSlice';
import ContactResolver from '../../../../utils/contactResolver';
import { Chat } from '../../../../types';
import socketService from '../../../../services/socketService';

interface User {
  _id: string;
  fullName: string;
  mobileNo: string;
  status: string;
  profilePicture: string | null;
  name: string;
  localName?: string | null;
}

export default function FilteredContactsScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const currentUser = useSelector(selectCurrentUser);
  const { chats } = useSelector((state: any) => state.chat);
  const [existingUsers, setExistingUsers] = useState<User[]>([]);
  const [nonExistingUsers, setNonExistingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('Loading contacts...');
  const [creatingChat, setCreatingChat] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingStep('Requesting permissions...');

      // Get local contacts
      setLoadingStep('Loading contacts from device...');
      const localContacts = await fetchContacts();
      
      if (localContacts.length === 0) {
        setError("No contacts found on your device");
        return;
      }

      // Test server connectivity first
      setLoadingStep('Testing server connection...');
      const isServerReachable = await apiService.testServerConnectivity();
      if (!isServerReachable) {
        setError("Cannot connect to server. Please check your internet connection and try again.");
        return;
      }

      // Check which contacts exist on the server
      setLoadingStep('Syncing with server...');
      let serverResponse;
      
      try {
        serverResponse = await fetchMatchedContacts(localContacts);
      } catch (serverError) {
        console.error('❌ Server sync failed:', serverError);
        
        // Check if it's a rate limiting error
        if (serverError instanceof Error && serverError.message.includes('Too many authentication attempts')) {
          console.log('🔄 Rate limiting detected, showing contacts without server sync...');
          setIsRateLimited(true);
          
          // Show all contacts as non-existing (invite only) when rate limited
          const allContactNumbers = extractContacts(localContacts);
          const nonExistingUsersList = allContactNumbers.map(number => {
            const localContact = localContacts.find(contact =>
              contact.phoneNumbers?.some((phoneNumber: any) =>
                phoneNumber.number.replace(/\D/g, "").slice(-10) === number
              )
            );
            
            return {
              _id: `non-existing-${number}`,
              fullName: localContact?.displayName || `+91${number}`,
              mobileNo: number,
              status: 'Not on Maharishi Connect',
              profilePicture: null,
              name: localContact?.displayName || `+91${number}`,
              localName: localContact?.displayName || null
            };
          });

          const sortedNonExistingUsers = nonExistingUsersList.sort((a, b) => 
            a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
          );

          setExistingUsers([]);
          setNonExistingUsers(sortedNonExistingUsers);
          
          console.log(`📊 Rate limited - showing ${sortedNonExistingUsers.length} contacts as invite-only`);
          
          // Show a helpful message to the user
          Alert.alert(
            "Server Temporarily Unavailable",
            "We're experiencing high traffic. You can still invite your contacts to join Maharishi Connect. Try refreshing in a few minutes to see who's already connected.",
            [{ text: "OK" }]
          );
          
          return;
        } else {
          // For other errors, show the error message
          throw serverError;
        }
      }
      
      // Merge local names with server data
      setLoadingStep('Processing results...');
      const users = serverResponse.users || [];
      console.log('🔍 Server response users:', users);
      console.log('🔍 Users count:', users.length);
      
      const usersWithLocalNames = mergeLocalNames(localContacts, users);
      console.log('🔍 Users with local names:', usersWithLocalNames);
      
      // Add server contact data to ContactResolver for better name resolution
      if (ContactResolver.isInitialized()) {
        ContactResolver.addServerContacts(usersWithLocalNames);
        console.log('🔍 Added server contacts to ContactResolver');
      }
      
      // Extract all contact numbers to find non-existing users
      const allContactNumbers = extractContacts(localContacts);
      const existingNumbers = new Set(usersWithLocalNames.map(user => user.mobileNo));
      
      // Create non-existing users list
      const nonExistingNumbers = allContactNumbers.filter(number => !existingNumbers.has(number));
      const nonExistingUsersList = nonExistingNumbers.map(number => {
        const localContact = localContacts.find(contact =>
          contact.phoneNumbers?.some((phoneNumber: any) =>
            phoneNumber.number.replace(/\D/g, "").slice(-10) === number
          )
        );
        
        return {
          _id: `non-existing-${number}`,
          fullName: localContact?.displayName || `+91${number}`,
          mobileNo: number,
          status: 'Not on Maharishi Connect',
          profilePicture: null,
          name: localContact?.displayName || `+91${number}`,
          localName: localContact?.displayName || null
        };
      });

      // Sort users lexicographically by name (case-insensitive)
      const sortedExistingUsers = usersWithLocalNames.sort((a, b) => 
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
      );
      const sortedNonExistingUsers = nonExistingUsersList.sort((a, b) => 
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
      );

      setExistingUsers(sortedExistingUsers);
      setNonExistingUsers(sortedNonExistingUsers);
      
      console.log(`📊 Found ${sortedExistingUsers.length} existing users and ${sortedNonExistingUsers.length} non-existing users`);
      console.log('📊 Existing users:', sortedExistingUsers.map(u => ({ name: u.name, mobileNo: u.mobileNo, status: u.status })));
      console.log('📊 Non-existing users:', sortedNonExistingUsers.map(u => ({ name: u.name, mobileNo: u.mobileNo })));
      
    } catch (err) {
      console.error('Error loading contacts:', err);
      
      let errorMessage = 'Failed to load contacts';
      if (err instanceof Error) {
        if (err.message.includes('Network request failed')) {
          errorMessage = 'Network error: Please check your internet connection';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Request timeout: Please try again';
        } else if (err.message.includes('CORS')) {
          errorMessage = 'Server configuration error: Please contact support';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppInvite = (phone: string, name: string) => {
    const message = `Hey ${name}, join me on Maharishi Connect! Download the app to stay connected.`;
    const url = `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert(
        "WhatsApp not installed", 
        "Please install WhatsApp to send invites, or copy the invite message manually."
      );
    });
  };

  // Helper function to generate deterministic chat ID for one-on-one chats
  const generateDirectChatId = (userId1: string, userId2: string): string => {
    // Sort user IDs to ensure consistent chat ID regardless of order
    const sortedIds = [userId1, userId2].sort();
    return `dm_${sortedIds[0]}_${sortedIds[1]}`;
  };

  // Helper function to check if a chat exists between two users
  const findExistingDirectChat = (chatList: any[], userId1: string, userId2: string) => {
    // First, try to find by deterministic ID
    const deterministicId = generateDirectChatId(userId1, userId2);
    const chatById = chatList.find((chat: any) => chat.id === deterministicId);
    if (chatById) return chatById;
    
    // Fallback: search by participants
    return chatList.find((chat: any) => {
      if (chat.type !== 'direct') return false;
      
      const participants = chat.participants || [];
      const participantIds = participants.map((p: any) => 
        typeof p === 'string' ? p : (p?.user_id || p?.uid || p?.id || p?._id)
      ).filter(Boolean);
      
      // Check if both users are in the participants array
      return participantIds.includes(userId1) && participantIds.includes(userId2) && participantIds.length === 2;
    });
  };

  const openChat = async (user: User) => {
    try {
      setCreatingChat(user._id);
      console.log("💬 Starting chat with:", user.name, user._id);
      
      if (!currentUser?.id) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      // Set auth token for API calls
      if (currentUser.token) {
        chatApiService.setAuthToken(currentUser.token);
      }

      // Generate deterministic chat ID for one-on-one chat
      const deterministicChatId = generateDirectChatId(currentUser.id, user._id);
      console.log("💬 Deterministic chat ID:", deterministicChatId);

      // Check if chat already exists via API first (most reliable)
      console.log("💬 Checking for existing chats via API...");
      
      try {
        // Get all user chats from server to check for existing direct message
        const allUserChats = await chatApiService.getUserChats();
        console.log("💬 All user chats from API:", allUserChats.length);
        
        // Look for existing direct chat with this user
        const existingChat = allUserChats.find((chat: any) => {
          if (chat.type !== 'direct') return false;
          
          const participants = chat.participants || [];
          const participantIds = participants.map((p: any) => 
            p?.user_id || p?.uid || p?.id || p
          ).filter(Boolean);
          
          return participantIds.includes(currentUser.id) && 
                 participantIds.includes(user._id) && 
                 participantIds.length === 2;
        });
        
        if (existingChat) {
          console.log("💬 Found existing chat via API:", existingChat.id);
          // Navigate to existing chat
          (navigation as any).navigate('ConversationScreen', {
            id: existingChat.id,
            name: user.name || user.fullName,
            avatar: user.profilePicture
          });
          return;
        }
        
        console.log("💬 No existing chat found via API, checking local data...");
      } catch (apiError) {
        console.log("💬 API check failed, falling back to local check:", apiError);
      }
      
      // Fallback: Check Redux store (faster)
      const existingChatFromRedux = findExistingDirectChat(chats, currentUser.id, user._id);
      if (existingChatFromRedux) {
        console.log("💬 Found existing chat in Redux:", existingChatFromRedux.id);
        // Navigate to existing chat
        (navigation as any).navigate('ConversationScreen', {
          id: existingChatFromRedux.id,
          name: user.name || user.fullName,
          avatar: user.profilePicture
        });
        return;
      }

      // Check SQLite as fallback
      if (sqliteService.isInitialized()) {
        const existingChats = await sqliteService.getChats();
        console.log("💬 Existing chats from SQLite:", existingChats.length);
        
        const existingChat = findExistingDirectChat(existingChats, currentUser.id, user._id);
        if (existingChat) {
          console.log("💬 Found existing chat in SQLite:", existingChat.id);
          // Add to Redux store if not already there
          dispatch(addChat(existingChat));
          // Navigate to existing chat
          (navigation as any).navigate('ConversationScreen', {
            id: existingChat.id,
            name: user.name || user.fullName,
            avatar: user.profilePicture
          });
          return;
        }
      }

      // Test server connection
      console.log("💬 Testing server connection...");
      const isServerReachable = await chatApiService.testConnection();
      if (!isServerReachable) {
        console.log("💬 Server not reachable, creating local chat only...");
        // Create local chat with deterministic ID
        const chatData = {
          id: deterministicChatId,
          _id: deterministicChatId,
          name: user.name || user.fullName,
          participants: [currentUser.id, user._id],
          type: 'direct',
          createdAt: new Date().toISOString(),
          lastMessage: '',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          isOnline: false
        };
        
        // Save to SQLite
        if (sqliteService.isInitialized()) {
          await sqliteService.saveChat(chatData);
        }
        
        // Add to Redux store
        dispatch(addChat(chatData));
        
        // Navigate to the chat
        (navigation as any).navigate('ConversationScreen', {
          id: deterministicChatId,
          name: user.name || user.fullName,
          avatar: user.profilePicture
        });
        return;
      }

      // Create new direct message chat using standard createChat API
      console.log("💬 Creating new direct message chat...");
      let chatData;
      let serverChatId = null;
      
      try {
        console.log("💬 Calling createChat API with user ID:", user._id);
        
        // Use the regular createChat API (createDirectMessage endpoint doesn't exist yet)
        chatData = await chatApiService.createChat({
          type: 'direct',
          name: user.name || user.fullName,
          description: `Direct message with ${user.name || user.fullName}`,
          participants: [currentUser.id, user._id]
        });
        console.log("💬 CreateChat response:", chatData);
        
        serverChatId = chatData?.id || chatData?._id || chatData?.chatId;
        
        if (!serverChatId) {
          throw new Error('No chat ID returned from server');
        }
        
      } catch (apiError) {
        console.error("💬 CreateChat API failed:", apiError);
        
        Alert.alert(
          "Error",
          "Failed to create chat. Please check your connection and try again.",
          [{ text: "OK" }]
        );
        return;
      }
      
      // We must have a server ID at this point
      console.log("💬 Using server chat ID:", serverChatId);
      
      // Join socket room with server-provided chat ID
      console.log("🔥 Joining socket room with server ID:", serverChatId);
      socketService.joinChat(serverChatId);
      
      // Create a properly formatted chat object for Redux (matching Chat interface)
      const formattedChat: Chat = {
        id: serverChatId,
        name: ContactResolver.resolveContactName(user.mobileNo || user._id, user.name || user.fullName),
        avatar: user.profilePicture || undefined,
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        isOnline: false,
        participants: [currentUser.id, user._id],
        messages: []
      };
      
      console.log("💬 Formatted chat object:", formattedChat);
      
      // Save to SQLite
      if (sqliteService.isInitialized()) {
        const sqliteChat = {
          id: serverChatId,
          _id: serverChatId,
          name: formattedChat.name,
          participants: [currentUser.id, user._id],
          type: 'direct',
          createdAt: new Date().toISOString(),
          lastMessage: '',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          isOnline: false
        };
        
        await sqliteService.saveChat(sqliteChat);
        console.log("💬 Chat saved to SQLite");
      } else {
        console.log("💬 SQLite not available, skipping save");
      }
      
      // Add to Redux store
      console.log("💬 Dispatching addChat with formatted chat");
      try {
        dispatch(addChat(formattedChat));
        console.log("💬 Successfully added chat to Redux store");
      } catch (reduxError) {
        console.error("💬 Error adding chat to Redux store:", reduxError);
        // Continue with navigation even if Redux fails
      }
      
      // Navigate to the new chat
      console.log("🚀 Navigating to chat with server ID:", serverChatId);
      (navigation as any).navigate('ConversationScreen', {
        id: serverChatId,
        name: user.name || user.fullName,
        avatar: user.profilePicture
      });
      
      console.log("💬 Successfully navigated to chat screen");
      
    } catch (chatError) {
      console.error("❌ Error creating chat:", chatError);
      Alert.alert(
        "Error", 
        "Failed to start chat. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setCreatingChat(null);
    }
  };

  const renderUserCard = (item: User, isExisting: boolean) => (
    <View style={[styles.contactItem, { backgroundColor: colors.card }]}>
      <View style={styles.avatarContainer}>
        <AvatarWithInitials
          name={item.name}
          profilePicture={item.profilePicture}
          size={56}
        />
      </View>
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.phoneNumber, { color: colors.subText }]}>
          +91{item.mobileNo}
        </Text>
        {isExisting && (
          <Text style={[styles.status, styles.statusText]}>
            {item.status || 'On Maharishi Connect'}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() =>
          isExisting ? openChat(item) : sendWhatsAppInvite(item.mobileNo, item.name)
        }
        style={[
          styles.actionButton,
          isExisting ? styles.messageButton : styles.inviteButton,
          creatingChat === item._id && styles.loadingButton
        ]}
        disabled={creatingChat === item._id}
      >
        {creatingChat === item._id ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.actionButtonText}>
            {isExisting ? 'Message' : 'Invite'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = (title: string, count: number) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {title} ({count})
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {loadingStep}
        </Text>
        <Text style={[styles.loadingSubtext, { color: colors.subText }]}>
          This may take a few moments...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, styles.errorTextColor]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={loadContacts}
        >
          <Text style={[styles.retryButtonText, { color: colors.textOnPrimary }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allUsers = [...existingUsers, ...nonExistingUsers];
  
  // Debug: Log the final state
  console.log('🎯 Final state - Existing users:', existingUsers.length);
  console.log('🎯 Final state - Non-existing users:', nonExistingUsers.length);
  console.log('🎯 Final state - All users:', allUsers.length);

  const renderFooter = () => (
    <View style={[styles.footer, { backgroundColor: colors.background }]}>
      {/* Divider */}
      <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
      
      {/* Footer content */}
      <View style={styles.footerContent}>
        <Text style={[styles.footerTitle, { color: colors.text }]}>
          Invite Friends to Maharishi Connect
        </Text>
        <Text style={[styles.footerSubtitle, { color: colors.subText }]}>
          Help your friends discover the best way to stay connected
        </Text>
        
        {/* Invite stats */}
        <View style={styles.footerStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {existingUsers.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>
              Already connected
            </Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.inviteStatNumber]}>
              {nonExistingUsers.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>
              Ready to invite
            </Text>
          </View>
        </View>
        
        {/* Call to action */}
        <View style={[styles.footerCTA, { backgroundColor: colors.card }]}>
          <Text style={[styles.ctaText, { color: colors.text }]}>
            📱 Tap "Invite" to send WhatsApp messages
          </Text>
          <Text style={[styles.ctaSubtext, { color: colors.subText }]}>
            Your friends will get a personalized invite to join Maharishi Connect
          </Text>
        </View>
        
        {/* Additional encouragement */}
        <View style={styles.footerEncouragement}>
          <Text style={[styles.encouragementText, { color: colors.subText }]}>
            The more friends you invite, the better your experience becomes! 🌟
          </Text>
        </View>
        
        {/* Rate limiting notice */}
        {isRateLimited && (
          <View style={styles.rateLimitNotice}>
            <Text style={[styles.rateLimitText, { color: colors.subText }]}>
              ⚠️ Server temporarily unavailable. Showing invite-only mode.
            </Text>
            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setIsRateLimited(false);
                loadContacts();
              }}
            >
              <Text style={[styles.refreshButtonText, { color: colors.textOnPrimary }]}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomStatusBar />
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Find Friends
        </Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>
          Connect with your contacts on Maharishi Connect
        </Text>
        {/* Debug info */}
        <Text style={[styles.debugText, { color: colors.subText }]}>
          Debug: {existingUsers.length} registered, {nonExistingUsers.length} to invite
        </Text>
      </View>

      <FlatList
        data={allUsers}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const isExisting = existingUsers.some(u => u.mobileNo === item.mobileNo);
          
          // Show "On Maharishi Connect" header for the first existing user
          const showExistingHeader = isExisting && existingUsers.findIndex(u => u.mobileNo === item.mobileNo) === 0;
          
          // Show "Invite to Maharishi Connect" header for the first non-existing user
          const showNonExistingHeader = !isExisting && nonExistingUsers.findIndex(u => u.mobileNo === item.mobileNo) === 0;
          
          return (
            <>
              {showExistingHeader && existingUsers.length > 0 && renderSectionHeader("On Maharishi Connect", existingUsers.length)}
              {showNonExistingHeader && nonExistingUsers.length > 0 && renderSectionHeader("Invite to Maharishi Connect", nonExistingUsers.length)}
              {renderUserCard(item, isExisting)}
            </>
          );
        }}
        style={styles.contactsList}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  debugText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  contactsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    paddingVertical: 20,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarContainer: {
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 15,
    marginBottom: 2,
  },
  status: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    marginTop: 16,
  },
  footerDivider: {
    height: 1,
    marginBottom: 24,
  },
  footerContent: {
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  footerSubtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  footerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  footerCTA: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  ctaSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerEncouragement: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  encouragementText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  statusText: {
    color: '#4CAF50',
  },
  messageButton: {
    backgroundColor: '#2E7D32',
  },
  inviteButton: {
    backgroundColor: '#25D366',
  },
  loadingButton: {
    opacity: 0.7,
  },
  errorTextColor: {
    color: '#ff4444',
  },
  inviteStatNumber: {
    color: '#25D366',
  },
  rateLimitNotice: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFEAA7',
    alignItems: 'center',
  },
  rateLimitText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
