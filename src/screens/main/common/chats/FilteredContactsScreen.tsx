import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  startTransition,
} from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Image,
  VirtualizedList,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import {
  moderateScale,
  responsiveFont,
  wp,
  hp,
  dimensions,
} from '@/theme/responsive';
import {
  contactService,
  Contact,
  ContactGroup,
} from '@/services/contactService';
import { chatService } from '@/services/chatService';
import { useContactsPermission } from '@/hooks/useContactsPermission';
import { addChat } from '@/store/slices/chatSlice';
import { AppDispatch, RootState } from '@/store';
import CustomHeader from '@/components/atoms/ui/CustomHeader';

const FilteredContactsScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const {
    hasPermission,
    isLoading: permissionLoading,
    requestPermission,
  } = useContactsPermission();
  const [permissionRequested, setPermissionRequested] = useState(false);

  const [existingUsers, setExistingUsers] = useState<Contact[]>([]);
  const [nonUsers, setNonUsers] = useState<
    Array<{ phoneNumber: string; name?: string }>
  >([]);
  const [filteredExistingUsers, setFilteredExistingUsers] = useState<Contact[]>(
    [],
  );
  const [filteredNonUsers, setFilteredNonUsers] = useState<
    Array<{ phoneNumber: string; name?: string }>
  >([]);
  const [groupedExistingUsers, setGroupedExistingUsers] = useState<
    ContactGroup[]
  >([]);
  const [groupedNonUsers, setGroupedNonUsers] = useState<ContactGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('Starting...');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set(),
  );
  const [isMultiSelect, _setIsMultiSelect] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [hasData, setHasData] = useState(false);

  // Filter out current user from contacts
  const filterCurrentUser = useCallback(
    (contacts: Contact[]) => {
      if (!user?.id && !user?.firebaseUid) {
        return contacts;
      }

      return contacts.filter(contact => {
        const isCurrentUser =
          contact.user_id === user.id ||
          contact.user_id === user.firebaseUid ||
          contact.phoneNumber === user.phone;

        if (isCurrentUser) {
          console.log('🚫 Filtering out current user:', {
            contactId: contact.user_id,
            contactName: contact.fullName,
            contactPhone: contact.phoneNumber,
            currentUserId: user.id,
            currentUserFirebaseUid: user.firebaseUid,
            currentUserPhone: user.phone,
          });
        }

        return !isCurrentUser;
      });
    },
    [user],
  );

  // Make UI interactive as soon as contacts are available, even if grouping is in progress
  const isLoading = loading || permissionLoading;
  const isGrouping = !initialLoadComplete && !loading && !permissionLoading;

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      setInitialLoadComplete(false);
      setHasData(false);
      setLoadingPhase('Checking permissions...');

      if (!hasPermission && !permissionRequested) {
        setLoadingPhase('Requesting contacts permission...');
        setPermissionRequested(true);
        const result = await requestPermission();
        if (!result.granted) {
          console.log('❌ Contacts permission denied');
          setLoadingPhase('Permission denied');
          setLoading(false);
          setInitialLoadComplete(true);
          return;
        }
      } else if (!hasPermission && permissionRequested) {
        console.log('❌ Contacts permission already requested and denied');
        setLoadingPhase('Permission denied');
        setLoading(false);
        setInitialLoadComplete(true);
        return;
      }

      setLoadingPhase('Loading device contacts...');
      console.log('🔍 Loading contacts with user status...');

      // Start loading contacts in background
      const contactsPromise = contactService.getContactsWithStatus();

      // Show immediate feedback to user
      setLoadingPhase('Processing contacts...');

      // Wait for contacts to load
      const { existingUsers: users, nonUsers: nonUsersList } =
        await contactsPromise;

      // Filter out current user from existing users
      const filteredUsers = filterCurrentUser(users);

      // ✅ OPTIMIZED: Batch all state updates to prevent multiple re-renders
      startTransition(() => {
        setExistingUsers(filteredUsers);
        setNonUsers(nonUsersList);
        setFilteredExistingUsers(filteredUsers);
        setFilteredNonUsers(nonUsersList);
        setHasData(true);
        setInitialLoadComplete(true);
      });

      setLoadingPhase('Finalizing...');
    } catch (error) {
      console.error('Error loading contacts:', error);
      setLoadingPhase('Error loading contacts');
      Alert.alert(
        'Connection Error',
        'Failed to load contacts. This might be due to a server issue. Please try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: loadContacts },
        ],
      );
      setInitialLoadComplete(true);
    } finally {
      setLoading(false);
    }
  }, [
    hasPermission,
    requestPermission,
    permissionRequested,
    filterCurrentUser,
  ]);

  // ✅ OPTIMIZED: Memoized search with batched state updates
  const searchContacts = useCallback(
    async (query: string) => {
      try {
        const lowercaseQuery = query.toLowerCase();

        const filteredUsers = existingUsers.filter(
          contact =>
            contact.fullName.toLowerCase().includes(lowercaseQuery) ||
            contact.email?.toLowerCase().includes(lowercaseQuery) ||
            contact.phoneNumber?.includes(query),
        );

        const filteredNonUsersList = nonUsers.filter(
          contact =>
            contact.name?.toLowerCase().includes(lowercaseQuery) ||
            contact.phoneNumber.includes(query),
        );

        // ✅ OPTIMIZED: Batch state updates to prevent re-renders
        startTransition(() => {
          setFilteredExistingUsers(filteredUsers);
          setFilteredNonUsers(filteredNonUsersList);
        });
      } catch (error) {
        console.error('Error searching contacts:', error);
      }
    },
    [existingUsers, nonUsers],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasData(false);
    try {
      // Force refresh contacts (bypass cache)
      const { existingUsers: users, nonUsers: nonUsersList } =
        await contactService.refreshContacts();

      // Filter out current user from existing users
      const filteredUsers = filterCurrentUser(users);

      setExistingUsers(filteredUsers);
      setNonUsers(nonUsersList);
      setFilteredExistingUsers(filteredUsers);
      setFilteredNonUsers(nonUsersList);
      setHasData(true);
    } catch (error) {
      console.error('Error refreshing contacts:', error);
    } finally {
      setRefreshing(false);
    }
  }, [filterCurrentUser]);

  useEffect(() => {
    // Add a small delay to prevent rapid re-execution
    const timeoutId = setTimeout(() => {
      loadContacts();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [loadContacts]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchContacts(searchQuery);
    } else {
      setFilteredExistingUsers(existingUsers);
      setFilteredNonUsers(nonUsers);
    }
  }, [searchQuery, existingUsers, nonUsers, searchContacts]);

  useEffect(() => {
    // Only group if we have data and initial load is complete
    if (
      !initialLoadComplete ||
      (filteredExistingUsers.length === 0 && filteredNonUsers.length === 0)
    ) {
      return;
    }

    // Use requestAnimationFrame to prevent blocking the UI
    requestAnimationFrame(() => {
      setLoadingPhase('Organizing contacts...');

      // Group existing users
      const groupedExisting = contactService.groupContactsAlphabetically(
        filteredExistingUsers,
      );
      setGroupedExistingUsers(groupedExisting);

      // Group non-users in next frame to prevent blocking
      requestAnimationFrame(() => {
        const groupedNonUsersData = contactService.groupContactsAlphabetically(
          filteredNonUsers.map(nonUser => ({
            user_id: nonUser.phoneNumber,
            fullName: nonUser.name || 'Unknown',
            phoneNumber: nonUser.phoneNumber,
          })),
        );
        setGroupedNonUsers(groupedNonUsersData);

        setLoadingPhase('Complete');
      });
    });
  }, [filteredExistingUsers, filteredNonUsers, initialLoadComplete]);

  const handleContactSelect = async (contact: Contact) => {
    console.log('📱 Contact selected:', {
      user_id: contact.user_id,
      fullName: contact.fullName,
      phoneNumber: contact.phoneNumber,
      isMultiSelect,
    });

    if (isMultiSelect) {
      const newSelected = new Set(selectedContacts);
      if (newSelected.has(contact.user_id)) {
        newSelected.delete(contact.user_id);
      } else {
        newSelected.add(contact.user_id);
      }
      setSelectedContacts(newSelected);
    } else {
      await createDirectChatByPhone(contact.phoneNumber || '');
    }
  };

  const createDirectChatByPhone = async (phoneNumber: string) => {
    try {
      setIsCreatingChat(true);
      console.log(`🔍 Creating chat for phone number: ${phoneNumber}`);

      const response = await chatService.createDirectChatByPhone(phoneNumber);

      if (response.status === 'SUCCESS' && response.chat) {
        console.log(`✅ Chat created successfully:`, {
          chatId: response.chat.id,
          participants: response.chat.participants?.map(p => p.user_id),
          phoneNumber,
        });

        // Add the new chat to Redux store
        dispatch(addChat(response.chat));
        console.log(`📱 Added chat to Redux store:`, response.chat.id);

        console.log(
          `🚀 Navigating to ConversationScreen with chat:`,
          response.chat.id,
        );
        navigation.goBack();
        (navigation as any).navigate('ConversationScreen', {
          chat: response.chat,
        });
      } else {
        throw new Error(response.message || 'Failed to create chat');
      }
    } catch (error) {
      console.error('Error creating chat by phone:', error);
      Alert.alert('Error', 'Failed to create chat. Please try again.');
    } finally {
      setIsCreatingChat(false);
    }
  };

  const createGroupChat = async () => {
    if (selectedContacts.size < 2) {
      Alert.alert(
        'Error',
        'Please select at least 2 contacts to create a group chat.',
      );
      return;
    }

    Alert.prompt(
      'Create Group Chat',
      'Enter group name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async (groupName?: string) => {
            if (!groupName || !groupName.trim()) {
              Alert.alert('Error', 'Please enter a group name.');
              return;
            }

            try {
              const response = await chatService.createChat({
                type: 'group',
                name: groupName.trim(),
                participants: Array.from(selectedContacts),
              });

              if (response.status === 'SUCCESS' && response.chat) {
                // Add the new group chat to Redux store
                dispatch(addChat(response.chat));
                console.log(
                  `📱 Added group chat to Redux store:`,
                  response.chat.id,
                );

                navigation.goBack();
                (navigation as any).navigate('ConversationScreen', {
                  chat: response.chat,
                });
              } else {
                throw new Error(
                  response.message || 'Failed to create group chat',
                );
              }
            } catch (error) {
              console.error('Error creating group chat:', error);
              Alert.alert(
                'Error',
                'Failed to create group chat. Please try again.',
              );
            }
          },
        },
      ],
      'plain-text',
    );
  };

  const handleInviteViaWhatsApp = async (
    phoneNumber: string,
    _name?: string,
  ) => {
    try {
      // Clean phone number for WhatsApp
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

      // Create WhatsApp direct chat URL
      const inviteMessage = `Hi! I'm using Maharishi Connect for messaging. Would you like to join me? Download the app: https://maharishiconnect.com/invite`;
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        inviteMessage,
      )}`;

      // Use Linking to open WhatsApp directly

      // Check if WhatsApp is installed
      const canOpen = await Linking.canOpenURL(whatsappUrl);

      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to Play Store if WhatsApp is not installed
        const playStoreUrl = `https://play.google.com/store/apps/details?id=com.whatsapp`;
        await Linking.openURL(playStoreUrl);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert('Error', 'Failed to open WhatsApp. Please try again.');
    }
  };

  const getContactAvatarInitials = (contact: Contact) => {
    const name = contact.localName || contact.fullName;
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const avatarColors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
      '#F8B500',
      '#52B788',
      '#E63946',
      '#457B9D',
    ];
    const index = name.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  const renderExistingUserItem = ({ item }: { item: Contact }) => {
    const isSelected = selectedContacts.has(item.user_id);
    const avatarColor = getAvatarColor(item.localName || item.fullName);

    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          {
            backgroundColor: colors.surface,
            borderLeftColor: isSelected ? colors.accent : 'transparent',
          },
          isSelected && styles.selectedContact,
        ]}
        onPress={() => handleContactSelect(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          {(() => {
            // Check for profile picture (prioritize local, then server)
            const profilePicture =
              item.localProfilePicture || item.profilePicture;

            if (profilePicture) {
              return (
                <Image
                  source={{ uri: profilePicture }}
                  style={styles.avatarImage}
                  defaultSource={require('@/assets/logo.png')}
                />
              );
            } else {
              return (
                <Text style={styles.avatarText}>
                  {getContactAvatarInitials(item)}
                </Text>
              );
            }
          })()}
        </View>

        <View style={styles.contactInfo}>
          <Text
            style={[styles.contactName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.localName || item.fullName}
          </Text>
          <Text
            style={[styles.contactPhone, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.phoneNumber}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          {isMultiSelect ? (
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: isSelected ? colors.accent : colors.border,
                  backgroundColor: isSelected ? colors.accent : 'transparent',
                },
              ]}
            >
              {isSelected && (
                <Icon
                  name="checkmark"
                  size={moderateScale(14)}
                  color="#FFFFFF"
                />
              )}
            </View>
          ) : (
            <View
              style={[
                styles.messageIconContainer,
                { backgroundColor: colors.accent + '15' },
              ]}
            >
              <Icon
                name="chatbubble-outline"
                size={moderateScale(18)}
                color={colors.accent}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderNonUserItem = ({
    item,
  }: {
    item: { phoneNumber: string; name?: string };
  }) => {
    const avatarColor = getAvatarColor(item.name || 'Unknown');

    return (
      <TouchableOpacity
        style={[styles.contactItem, { backgroundColor: colors.surface }]}
        onPress={() => handleInviteViaWhatsApp(item.phoneNumber, item.name)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.avatar,
            { backgroundColor: avatarColor, opacity: 0.6 },
          ]}
        >
          <Text style={styles.avatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>

        <View style={styles.contactInfo}>
          <Text
            style={[styles.contactName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.name || 'Unknown'}
          </Text>
          <Text
            style={[styles.contactPhone, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.phoneNumber}
          </Text>
          <Text style={[styles.inviteLabel, { color: colors.textSecondary }]}>
            Not on Maharishi Connect
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.inviteButton, { backgroundColor: '#25D366' }]}
          onPress={() => handleInviteViaWhatsApp(item.phoneNumber, item.name)}
        >
          <Icon name="logo-whatsapp" size={moderateScale(16)} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Only show loading screen if we're still loading and don't have any data yet
  if (isLoading && !hasData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CustomHeader
          title="Sync Contacts"
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />

        {/* Loading Content */}
        <View
          style={[
            styles.container,
            styles.centerContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.loadingContainer}>
            <View
              style={[
                styles.loadingSpinner,
                { borderColor: colors.accent + '20' },
              ]}
            >
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading contacts
            </Text>
            <Text
              style={[styles.loadingPhase, { color: colors.textSecondary }]}
            >
              {loadingPhase}
            </Text>

            <View
              style={[
                styles.progressContainer,
                { backgroundColor: colors.border + '30' },
              ]}
            >
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: colors.accent,
                    width: initialLoadComplete ? '100%' : '60%',
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader
        title="New Chat"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      {/* Enhanced Search Bar */}
      <View
        style={[styles.searchWrapper, { backgroundColor: colors.background }]}
      >
        <View
          style={[styles.searchContainer, { backgroundColor: colors.surface }]}
        >
          <Icon
            name="search-outline"
            size={moderateScale(20)}
            color={colors.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search contacts..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Icon
                name="close-circle"
                size={moderateScale(20)}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Grouping Indicator */}
      {isGrouping && (
        <View
          style={[
            styles.groupingIndicator,
            { backgroundColor: colors.surface },
          ]}
        >
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.groupingText, { color: colors.textSecondary }]}>
            Organizing contacts...
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      >
        {/* Existing Users Section */}
        {filteredExistingUsers.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                On Maharishi Connect
              </Text>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: colors.accent + '20' },
                ]}
              >
                <Text style={[styles.countText, { color: colors.accent }]}>
                  {filteredExistingUsers.length}
                </Text>
              </View>
            </View>
            {/* ✅ OPTIMIZED: Virtualized contact list for performance */}
            {groupedExistingUsers.length > 0 ? (
              <FlatList
                data={groupedExistingUsers}
                keyExtractor={section => section.title}
                renderItem={({ item: section }) => (
                  <View>
                    <Text
                      style={[
                        styles.alphabetHeader,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {section.title}
                    </Text>
                    <FlatList
                      data={section.data}
                      keyExtractor={item => item.user_id}
                      renderItem={({ item }) =>
                        renderExistingUserItem({ item })
                      }
                      initialNumToRender={10}
                      maxToRenderPerBatch={5}
                      windowSize={10}
                      removeClippedSubviews={true}
                      getItemLayout={(data, index) => ({
                        length: 80, // Approximate item height
                        offset: 80 * index,
                        index,
                      })}
                    />
                  </View>
                )}
                initialNumToRender={5}
                maxToRenderPerBatch={3}
                windowSize={10}
                removeClippedSubviews={true}
              />
            ) : (
              // Show ungrouped contacts while grouping is in progress
              <FlatList
                data={filteredExistingUsers}
                keyExtractor={item => item.user_id}
                renderItem={({ item }) => renderExistingUserItem({ item })}
                initialNumToRender={20}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={true}
                getItemLayout={(data, index) => ({
                  length: 80,
                  offset: 80 * index,
                  index,
                })}
              />
            )}
          </View>
        )}

        {/* Non-Users Section */}
        {filteredNonUsers.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Invite to Connect
              </Text>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: colors.textSecondary + '20' },
                ]}
              >
                <Text
                  style={[styles.countText, { color: colors.textSecondary }]}
                >
                  {filteredNonUsers.length}
                </Text>
              </View>
            </View>
            {/* ✅ OPTIMIZED: Virtualized non-users list for performance */}
            {groupedNonUsers.length > 0 ? (
              <FlatList
                data={groupedNonUsers}
                keyExtractor={section => section.title}
                renderItem={({ item: section }) => (
                  <View>
                    <Text
                      style={[
                        styles.alphabetHeader,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {section.title}
                    </Text>
                    <FlatList
                      data={section.data}
                      keyExtractor={item => item.user_id}
                      renderItem={({ item }) =>
                        renderNonUserItem({
                          item: {
                            phoneNumber: item.phoneNumber || '',
                            name: item.fullName,
                          },
                        })
                      }
                      initialNumToRender={10}
                      maxToRenderPerBatch={5}
                      windowSize={10}
                      removeClippedSubviews={true}
                      getItemLayout={(data, index) => ({
                        length: 80,
                        offset: 80 * index,
                        index,
                      })}
                    />
                  </View>
                )}
                initialNumToRender={5}
                maxToRenderPerBatch={3}
                windowSize={10}
                removeClippedSubviews={true}
              />
            ) : (
              // Show ungrouped contacts while grouping is in progress
              <FlatList
                data={filteredNonUsers}
                keyExtractor={item => item.phoneNumber}
                renderItem={({ item }) => renderNonUserItem({ item })}
                initialNumToRender={20}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={true}
                getItemLayout={(data, index) => ({
                  length: 80,
                  offset: 80 * index,
                  index,
                })}
              />
            )}
          </View>
        )}

        {/* Empty State */}
        {!isLoading &&
          initialLoadComplete &&
          groupedExistingUsers.length === 0 &&
          groupedNonUsers.length === 0 && (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconContainer,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Icon
                  name="people-outline"
                  size={moderateScale(48)}
                  color={colors.textSecondary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchQuery
                  ? 'No contacts found'
                  : hasPermission
                  ? 'No contacts available'
                  : 'Permission required'}
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : hasPermission
                  ? 'Add contacts to start chatting'
                  : 'Grant permission to access your contacts'}
              </Text>
              {!hasPermission && (
                <TouchableOpacity
                  style={[
                    styles.permissionButton,
                    { backgroundColor: colors.accent },
                  ]}
                  onPress={requestPermission}
                >
                  <Icon
                    name="checkmark-circle-outline"
                    size={moderateScale(20)}
                    color="#FFFFFF"
                  />
                  <Text style={styles.permissionButtonText}>
                    Grant Permission
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
      </ScrollView>

      {/* Floating Action Footer */}
      {isMultiSelect && selectedContacts.size > 0 && (
        <View
          style={[styles.floatingFooter, { backgroundColor: colors.surface }]}
        >
          <View style={styles.footerContent}>
            <View
              style={[styles.selectedBadge, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.selectedCountText}>
                {selectedContacts.size}
              </Text>
            </View>
            <Text style={[styles.selectedLabel, { color: colors.text }]}>
              {selectedContacts.size === 1
                ? 'contact selected'
                : 'contacts selected'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.createGroupButton,
              { backgroundColor: colors.accent },
            ]}
            onPress={createGroupChat}
          >
            <Icon name="people" size={moderateScale(18)} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Group</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chat Creation Loader Overlay */}
      {isCreatingChat && (
        <View style={styles.loaderOverlay}>
          <View
            style={[
              styles.loaderContainer,
              { backgroundColor: colors.surface },
            ]}
          >
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loaderText, { color: colors.text }]}>
              Creating chat...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingHorizontal: wp(10),
  },
  loadingSpinner: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  loadingText: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
    marginBottom: hp(1),
    letterSpacing: 0.3,
  },
  loadingPhase: {
    fontSize: responsiveFont(14),
    textAlign: 'center',
    marginBottom: hp(3),
  },
  progressContainer: {
    width: wp(60),
    height: hp(0.5),
    borderRadius: hp(0.25),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: hp(0.25),
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    minHeight: dimensions.headerHeight,
  },
  backButton: {
    padding: moderateScale(8),
  },
  headerTitle: {
    fontSize: responsiveFont(20),
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  headerRight: {
    width: wp(10),
  },
  multiSelectButton: {
    padding: moderateScale(8),
    borderRadius: moderateScale(20),
  },
  searchWrapper: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: moderateScale(16),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: wp(3),
    fontSize: responsiveFont(16),
    fontWeight: '400',
  },
  clearButton: {
    padding: moderateScale(4),
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(2),
  },
  sectionContainer: {
    marginBottom: hp(2),
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.5),
  },
  sectionTitle: {
    fontSize: responsiveFont(15),
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  countBadge: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(12),
  },
  countText: {
    fontSize: responsiveFont(13),
    fontWeight: '700',
  },
  alphabetHeader: {
    fontSize: responsiveFont(13),
    fontWeight: '600',
    paddingHorizontal: wp(5),
    paddingVertical: hp(0.8),
    letterSpacing: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.5),
    marginHorizontal: wp(3),
    marginVertical: hp(0.3),
    borderRadius: moderateScale(16),
    borderLeftWidth: 3,
  },
  selectedContact: {
    transform: [{ scale: 0.98 }],
  },
  avatar: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(24),
  },
  avatarText: {
    fontSize: responsiveFont(20),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  contactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contactName: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: hp(0.3),
  },
  contactPhone: {
    fontSize: responsiveFont(14),
    fontWeight: '400',
  },
  inviteLabel: {
    fontSize: responsiveFont(12),
    fontWeight: '500',
    marginTop: hp(0.2),
    fontStyle: 'italic',
  },
  actionButtons: {
    marginLeft: wp(2),
  },
  checkbox: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageIconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(10),
    paddingVertical: hp(10),
  },
  emptyIconContainer: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  emptyTitle: {
    fontSize: responsiveFont(22),
    fontWeight: '700',
    marginBottom: hp(1),
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: responsiveFont(15),
    textAlign: 'center',
    lineHeight: responsiveFont(22),
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(24),
    paddingVertical: moderateScale(14),
    borderRadius: moderateScale(16),
    marginTop: hp(3),
  },
  permissionButtonText: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: moderateScale(8),
    letterSpacing: 0.3,
  },
  floatingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.8),
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedBadge: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(12),
  },
  selectedCountText: {
    fontSize: responsiveFont(16),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedLabel: {
    fontSize: responsiveFont(15),
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(16),
  },
  createButtonText: {
    fontSize: responsiveFont(15),
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: moderateScale(8),
    letterSpacing: 0.3,
  },
  sectionContent: {
    paddingBottom: moderateScale(8),
  },
  messageButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: moderateScale(8),
  },
  groupingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    marginHorizontal: wp(4),
    marginVertical: hp(0.5),
    borderRadius: moderateScale(8),
  },
  groupingText: {
    fontSize: responsiveFont(14),
    marginLeft: wp(2),
    fontWeight: '500',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderContainer: {
    paddingHorizontal: moderateScale(24),
    paddingVertical: moderateScale(20),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    minWidth: moderateScale(120),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loaderText: {
    fontSize: responsiveFont(16),
    fontWeight: '500',
    marginTop: moderateScale(12),
    textAlign: 'center',
  },
});

export default FilteredContactsScreen;
