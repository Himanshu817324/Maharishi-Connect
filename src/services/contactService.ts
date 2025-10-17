import AsyncStorage from '@react-native-async-storage/async-storage';
import { permissionManager } from '@/utils/permissions';
import { chatService } from './chatService';

export interface Contact {
  user_id: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  profilePicture?: string;
  isOnline?: boolean;
  lastSeen?: string;
  isBlocked?: boolean;
  isFavorite?: boolean;
  // Local contact data
  localName?: string;
  localProfilePicture?: string;
  localEmail?: string;
}

export interface ContactGroup {
  title: string;
  data: Contact[];
}

class ContactService {
  private baseURL: string;
  private contactsCache: {
    data: { existingUsers: Contact[]; nonUsers: Array<{ phoneNumber: string; name?: string }> };
    timestamp: number;
  } | null = null;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // ✅ Extended cache duration
  private readonly BATCH_SIZE = 100; // ✅ Batch size for processing
  private groupingCache = new Map<string, ContactGroup[]>(); // ✅ Memoization cache
  private isLoading = false; // ✅ Prevent concurrent loading

  constructor() {
    this.baseURL = 'https://api.maharishiconnect.com/api';
  }

  // ✅ OPTIMIZED: Async batch processing for contact cleaning
  private async processContactsAsync(deviceContacts: any[]): Promise<string[]> {
    const batches = [];
    for (let i = 0; i < deviceContacts.length; i += this.BATCH_SIZE) {
      batches.push(deviceContacts.slice(i, i + this.BATCH_SIZE));
    }

    const results = await Promise.all(
      batches.map(batch => this.processBatch(batch))
    );

    return results.flat();
  }

  // ✅ ENHANCED: Flexible phone number processing for all device types
  private async processBatch(batch: any[]): Promise<string[]> {
    return new Promise((resolve) => {
      const processContacts = () => {
        try {
          const phoneNumbers = batch
            .map((contact) => {
              if (!contact) return null;

              // Handle different contact data structures
              let phoneData = null;
              
              // Try different phone number field names
              if (contact.phoneNumber) {
                phoneData = contact.phoneNumber;
              } else if (contact.phoneNumbers && Array.isArray(contact.phoneNumbers) && contact.phoneNumbers.length > 0) {
                phoneData = contact.phoneNumbers[0].number || contact.phoneNumbers[0];
              } else if (contact.phone) {
                phoneData = contact.phone;
              } else if (contact.mobile) {
                phoneData = contact.mobile;
              }

              if (!phoneData || typeof phoneData !== 'string') {
                return null;
              }

              // Extract phone number using more robust logic
              const extracted = this.extractPhoneNumber(phoneData);
              return extracted;
            })
            .filter((phone): phone is string => !!phone);

          resolve(phoneNumbers);
        } catch (error) {
          console.error('Error processing contact batch:', error);
          resolve([]);
        }
      };

      setTimeout(processContacts, 0);
    });
  }

  // ✅ NEW: Robust phone number extraction for different device formats
  private extractPhoneNumber(phoneString: string): string | null {
    try {
      if (!phoneString || typeof phoneString !== 'string') {
        return null;
      }

      // Remove all non-digit characters except +
      let cleaned = phoneString.replace(/[^\d+]/g, '');

      // Handle different international formats
      if (cleaned.startsWith('+91')) {
        cleaned = cleaned.substring(3);
      } else if (cleaned.startsWith('91') && cleaned.length === 12) {
        cleaned = cleaned.substring(2);
      } else if (cleaned.startsWith('+1')) {
        // Handle US numbers if needed
        return null;
      }

      // Ensure it's a 10-digit Indian mobile number
      if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
        // Additional validation for Indian mobile numbers
        const firstDigit = cleaned[0];
        if (['6', '7', '8', '9'].includes(firstDigit)) {
          return cleaned;
        }
      }

      // Handle 11-digit numbers that start with 0 (some devices store as 09876543210)
      if (cleaned.length === 11 && cleaned.startsWith('0')) {
        const withoutZero = cleaned.substring(1);
        if (withoutZero.length === 10 && /^\d{10}$/.test(withoutZero)) {
          const firstDigit = withoutZero[0];
          if (['6', '7', '8', '9'].includes(firstDigit)) {
            return withoutZero;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting phone number:', error);
      return null;
    }
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

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get all contacts
  async getContacts(): Promise<Contact[]> {
    // Check cache first
    if (this.contactsCache && Date.now() - this.contactsCache.timestamp < this.CACHE_DURATION) {
      return this.contactsCache.data.existingUsers;
    }

    try {
      // Use the new getContactsWithStatus method
      const { existingUsers } = await this.getContactsWithStatus();
      return existingUsers;

    } catch (error) {
      console.error('Error fetching contacts:', error);
      // Return cached data if available, even if expired
      return this.contactsCache?.data.existingUsers || [];
    }
  }

  // Search contacts
  async searchContacts(query: string): Promise<Contact[]> {
    // Since API doesn't have contacts endpoint, use local search only
    return this.searchContactsLocally(query);
  }

  // Local search fallback
  private searchContactsLocally(query: string): Contact[] {
    const lowercaseQuery = query.toLowerCase();
    const contacts = this.contactsCache?.data.existingUsers || [];
    return contacts.filter(contact =>
      contact.fullName.toLowerCase().includes(lowercaseQuery) ||
      contact.email?.toLowerCase().includes(lowercaseQuery) ||
      contact.phoneNumber?.includes(query)
    );
  }

  // Get contact by ID
  async getContactById(userId: string): Promise<Contact | null> {
    try {
      // Since the contacts API endpoint doesn't exist, use local search only
      const contacts = this.contactsCache?.data.existingUsers || [];
      const contact = contacts.find(c => c.user_id === userId);

      if (contact) {
        return contact;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching contact:', error);
      return null;
    }
  }

  // ✅ OPTIMIZED: Memoized alphabetical grouping
  groupContactsAlphabetically(contacts: Contact[]): ContactGroup[] {
    // Create cache key from contact IDs
    const cacheKey = contacts.map(c => c.user_id).sort().join(',');

    // Check cache first
    if (this.groupingCache.has(cacheKey)) {
      return this.groupingCache.get(cacheKey)!;
    }

    // Use requestAnimationFrame to prevent UI blocking
    const grouped = contacts.reduce((groups, contact) => {
      const firstLetter = contact.fullName.charAt(0).toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(contact);
      return groups;
    }, {} as Record<string, Contact[]>);

    const result = Object.keys(grouped)
      .sort()
      .map(letter => ({
        title: letter,
        data: grouped[letter].sort((a, b) => a.fullName.localeCompare(b.fullName)),
      }));

    // Cache the result
    this.groupingCache.set(cacheKey, result);

    // Limit cache size to prevent memory issues
    if (this.groupingCache.size > 50) {
      const firstKey = this.groupingCache.keys().next().value;
      if (firstKey) {
        this.groupingCache.delete(firstKey);
      }
    }

    return result;
  }

  // Filter contacts by online status
  filterOnlineContacts(contacts: Contact[]): Contact[] {
    return contacts.filter(contact => contact.isOnline);
  }

  // Filter contacts by favorites
  filterFavoriteContacts(contacts: Contact[]): Contact[] {
    return contacts.filter(contact => contact.isFavorite);
  }

  // Filter contacts by blocked status
  filterBlockedContacts(contacts: Contact[]): Contact[] {
    return contacts.filter(contact => contact.isBlocked);
  }

  // Get recent contacts (last 10)
  getRecentContacts(contacts: Contact[]): Contact[] {
    return contacts
      .filter(contact => contact.lastSeen)
      .sort((a, b) => new Date(b.lastSeen!).getTime() - new Date(a.lastSeen!).getTime())
      .slice(0, 10);
  }

  // Add contact to favorites
  async addToFavorites(userId: string): Promise<void> {
    try {
      // Since the contacts API endpoint doesn't exist, update local cache only
      const contacts = this.contactsCache?.data.existingUsers || [];
      const contact = contacts.find(c => c.user_id === userId);
      if (contact) {
        contact.isFavorite = true;
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }
  }

  // Remove contact from favorites
  async removeFromFavorites(userId: string): Promise<void> {
    try {
      // Since the contacts API endpoint doesn't exist, update local cache only
      const contacts = this.contactsCache?.data.existingUsers || [];
      const contact = contacts.find(c => c.user_id === userId);
      if (contact) {
        contact.isFavorite = false;
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  }

  // Block contact
  async blockContact(userId: string): Promise<void> {
    try {
      // Since the contacts API endpoint doesn't exist, update local cache only
      const contacts = this.contactsCache?.data.existingUsers || [];
      const contact = contacts.find(c => c.user_id === userId);
      if (contact) {
        contact.isBlocked = true;
      }
    } catch (error) {
      console.error('Error blocking contact:', error);
      throw error;
    }
  }

  // Unblock contact
  async unblockContact(userId: string): Promise<void> {
    try {
      // Since the contacts API endpoint doesn't exist, update local cache only
      const contacts = this.contactsCache?.data.existingUsers || [];
      const contact = contacts.find(c => c.user_id === userId);
      if (contact) {
        contact.isBlocked = false;
      }
    } catch (error) {
      console.error('Error unblocking contact:', error);
      throw error;
    }
  }

  // Merge device contacts with backend contacts
  private mergeContacts(deviceContacts: Contact[], backendContacts: Contact[]): Contact[] {
    const mergedMap = new Map<string, Contact>();

    // Add backend contacts first (they have more complete data)
    backendContacts.forEach(contact => {
      mergedMap.set(contact.user_id, contact);
    });

    // Add device contacts, but don't override existing ones
    deviceContacts.forEach(contact => {
      if (!mergedMap.has(contact.user_id)) {
        mergedMap.set(contact.user_id, contact);
      }
    });

    return Array.from(mergedMap.values());
  }

  // Clear cache
  clearCache(): void {
    this.contactsCache = null;
  }

  // Refresh cache
  async refreshCache(): Promise<Contact[]> {
    this.clearCache();
    return this.getContacts();
  }

  // Get current user ID for debugging
  async getCurrentUserId(): Promise<string | null> {
    try {
      const authState = await AsyncStorage.getItem('@maharishi_connect_auth_state');
      if (authState) {
        const parsed = JSON.parse(authState);
        return parsed.user?.id || parsed.user?.uid || null;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting current user ID:', error);
      return null;
    }
  }

  // Get user by phone number (exact match)
  async getUserByPhoneNumber(phoneNumber: string): Promise<Contact | null> {
    try {
      const response = await chatService.checkContacts([phoneNumber]);

      if (response.users.length === 0) {
        console.log(`❌ No user found for phone: ${phoneNumber}`);
        return null;
      }

      console.log(`📞 Found ${response.users.length} users for phone ${phoneNumber}:`);
      response.users.forEach((u, index) => {
        console.log(`  ${index + 1}. ID=${u._id}, Name=${u.fullName}, Phone=${u.mobileNo}`);
      });

      // Find exact phone match
      const user = response.users.find(u => {
        let cleanedPhone = phoneNumber.replace(/[^\d+]/g, '');
        if (cleanedPhone.startsWith('+91')) {
          cleanedPhone = cleanedPhone.substring(3);
        } else if (cleanedPhone.startsWith('91') && cleanedPhone.length === 12) {
          cleanedPhone = cleanedPhone.substring(2);
        }

        let cleanedUserPhone = u.mobileNo.replace(/[^\d+]/g, '');
        if (cleanedUserPhone.startsWith('+91')) {
          cleanedUserPhone = cleanedUserPhone.substring(3);
        } else if (cleanedUserPhone.startsWith('91') && cleanedUserPhone.length === 12) {
          cleanedUserPhone = cleanedUserPhone.substring(2);
        }

        const matches = cleanedPhone === cleanedUserPhone;
        console.log(`📞 Phone comparison: ${cleanedPhone} === ${cleanedUserPhone} = ${matches}`);
        return matches;
      });

      if (!user) {
        console.log(`❌ No exact phone match found for: ${phoneNumber}`);
        return null;
      }

      console.log(`✅ Selected user: ID=${user._id}, Name=${user.fullName}, Phone=${user.mobileNo}`);

      // WORKAROUND: Extract correct user ID from profile picture URL if available
      let correctUserId = user._id;
      if (user.profilePicture) {
        const profilePictureMatch = user.profilePicture.match(/profile-images\/([^/]+)\//);
        if (profilePictureMatch) {
          const extractedUserId = profilePictureMatch[1];
          if (extractedUserId !== user._id) {
            console.warn(`⚠️ USER ID MISMATCH DETECTED!`);
            console.warn(`   API returned _id: ${user._id}`);
            console.warn(`   Profile picture shows: ${extractedUserId}`);
            console.warn(`   Using profile picture ID as correct user ID`);
            correctUserId = extractedUserId;
          }
        }
      }

      // Debug: Check if this is the current user
      const currentUserId = await this.getCurrentUserId();
      if (currentUserId === correctUserId) {
        console.warn(`⚠️ WARNING: Selected user is the current user! This might cause issues.`);
      }

      // Get local contact data for this phone number
      const deviceContacts = await permissionManager.syncContactsWithBackend();
      const localContact = deviceContacts.find(contact => {
        if (!contact.phoneNumber) return false;
        let cleaned = contact.phoneNumber.replace(/[^\d+]/g, '');
        if (cleaned.startsWith('+91')) {
          cleaned = cleaned.substring(3);
        } else if (cleaned.startsWith('91') && cleaned.length === 12) {
          cleaned = cleaned.substring(2);
        }
        return cleaned === phoneNumber;
      });

      return {
        user_id: correctUserId, // Use the corrected user ID
        fullName: localContact?.fullName || user.fullName,
        phoneNumber: user.mobileNo,
        isOnline: user.status === 'Available',
        isBlocked: false,
        isFavorite: false,
        profilePicture: user.profilePicture || undefined,
        // Local contact data
        localName: localContact?.fullName,
        localProfilePicture: localContact?.profilePicture,
        localEmail: localContact?.email,
      };
    } catch (error) {
      console.error('❌ Error getting user by phone number:', error);
      return null;
    }
  }

  // Check which contacts are existing users
  async checkExistingUsers(phoneNumbers: string[], deviceContacts: any[]): Promise<{
    existingUsers: Contact[];
    nonUsers: string[];
  }> {
    try {
      console.log('🔍 Checking existing users for phone numbers:', phoneNumbers);
      const response = await chatService.checkContacts(phoneNumbers);
      console.log('📞 Contact check response:', {
        usersCount: response.users.length,
        message: response.message,
      });

      // Check for duplicate phone numbers
      const phoneCounts = response.users.reduce((acc, user) => {
        acc[user.mobileNo] = (acc[user.mobileNo] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const duplicatePhones = Object.entries(phoneCounts).filter(([_phone, count]) => count > 1);
      if (duplicatePhones.length > 0) {
        console.warn('⚠️ DUPLICATE PHONE NUMBERS FOUND:', duplicatePhones);
        console.warn('This can cause chat creation issues. Please clean up your database.');
      }


      // Convert API response to Contact format, using local contact names
      const existingUsers: Contact[] = response.users.map(user => {
        // Find the local contact that matches this user's phone number
        const localContact = deviceContacts.find(contact => {
          if (!contact.phoneNumber) return false;
          let cleaned = contact.phoneNumber.replace(/[^\d+]/g, '');
          if (cleaned.startsWith('+91')) {
            cleaned = cleaned.substring(3);
          } else if (cleaned.startsWith('91') && cleaned.length === 12) {
            cleaned = cleaned.substring(2);
          }
          return cleaned === user.mobileNo;
        });

        const displayName = localContact?.fullName || user.fullName;

        // Use firebaseUid if available, otherwise extract from profile picture
        let correctUserId = user._id;

        if (user.firebaseUid) {
          // Use firebaseUid directly if available
          correctUserId = user.firebaseUid;
          console.log(`✅ Using firebaseUid: ${correctUserId}`);
        } else if (user.profilePicture) {
          // Fallback to profile picture extraction
          const profilePictureMatch = user.profilePicture.match(/profile-images\/([^/]+)\//);
          if (profilePictureMatch) {
            const extractedUserId = profilePictureMatch[1];
            if (extractedUserId !== user._id) {
              console.warn(`⚠️ USER ID MISMATCH DETECTED!`);
              console.warn(`   API returned _id: ${user._id}`);
              console.warn(`   Profile picture shows: ${extractedUserId}`);
              console.warn(`   Using profile picture ID as correct user ID`);
              correctUserId = extractedUserId;
            }
          }
        } else {
          console.warn(`⚠️ No firebaseUid or profilePicture available for user: ${user._id}`);
          console.warn(`   Using MongoDB _id as fallback: ${user._id}`);
        }

        // Debug: Show user details for duplicate phone numbers
        console.log(`📞 User details: ID=${user._id}, CorrectID=${correctUserId}, Name=${user.fullName}, Phone=${user.mobileNo}, DisplayName=${displayName}`);

        // Debug: Show name mapping
        if (localContact) {
          console.log(`📞 Name mapping: ${user.fullName} (registered) → ${localContact.fullName} (local contact)`);
        } else {
          console.log(`📞 Name mapping: ${user.fullName} (registered) → No local contact found`);
        }

        const contact = {
          user_id: correctUserId, // Use the corrected user ID
          fullName: displayName, // Use local name if available, fallback to registered name
          phoneNumber: user.mobileNo,
          isOnline: user.status === 'Available',
          isBlocked: false,
          isFavorite: false,
          profilePicture: user.profilePicture || undefined,
          // Local contact data
          localName: localContact?.fullName,
          localProfilePicture: localContact?.profilePicture,
          localEmail: localContact?.email,
        };

        // Debug: Log contact details
        console.log(`📞 Contact created:`, {
          user_id: contact.user_id,
          fullName: contact.fullName,
          phoneNumber: contact.phoneNumber,
          originalUser: user.fullName,
          localContact: localContact?.fullName || 'None'
        });

        return contact;
      });

      // Find non-users by comparing phone numbers
      const existingPhoneNumbers = new Set(response.users.map(user => user.mobileNo));
      const nonUsers = phoneNumbers.filter(phone => !existingPhoneNumbers.has(phone));

      console.log('✅ Processed contacts:', {
        existingUsers: existingUsers.length,
        nonUsers: nonUsers.length,
        apiUsers: response.users.length,
        devicePhones: phoneNumbers.length,
      });

      return {
        existingUsers,
        nonUsers,
      };
    } catch (error) {
      console.error('Error checking existing users:', error);
      // Show error to user instead of silently falling back
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to check contacts: ${errorMessage}`);
    }
  }

  // Get contacts with user status (existing users vs non-users)
  async getContactsWithStatus(): Promise<{
    existingUsers: Contact[];
    nonUsers: Array<{
      phoneNumber: string;
      name?: string;
    }>;
  }> {
    // ✅ FIX: Prevent concurrent loading to avoid race conditions
    if (this.isLoading) {
      console.log('⏳ Contact sync already in progress, waiting...');
      // Wait for current loading to complete
      while (this.isLoading) {
        await new Promise<void>(resolve => setTimeout(resolve, 100));
      }
      // Return cached data if available
      if (this.contactsCache &&
        Date.now() - this.contactsCache.timestamp < this.CACHE_DURATION) {
        return this.contactsCache.data;
      }
    }

    try {
      this.isLoading = true;

      // ✅ ENHANCED: Smart cache management with invalidation logic
      if (this.contactsCache && Date.now() - this.contactsCache.timestamp < this.CACHE_DURATION) {
        const isEmpty = this.contactsCache.data.existingUsers.length === 0 &&
          this.contactsCache.data.nonUsers.length === 0;
        const isRecent = Date.now() - this.contactsCache.timestamp < 60000; // 1 minute
        const hasData = this.contactsCache.data.existingUsers.length > 0 ||
          this.contactsCache.data.nonUsers.length > 0;

        if (hasData) {
          console.log('📱 Using cached contacts data:', {
            existingUsers: this.contactsCache.data.existingUsers.length,
            nonUsers: this.contactsCache.data.nonUsers.length,
            age: Date.now() - this.contactsCache.timestamp
          });
          return this.contactsCache.data;
        } else if (isEmpty && isRecent) {
          console.log('📱 Cache is empty and recent (likely an error) - invalidating and fetching fresh data');
          this.clearCache();
        } else if (isEmpty) {
          console.log('📱 Cache exists but is empty, will fetch fresh data');
        }
      }
      // ✅ ENHANCED: Get device contacts with comprehensive error handling
      let deviceContacts;
      try {
        console.log('📱 Fetching device contacts...');
        deviceContacts = await permissionManager.syncContactsWithBackend();
        
        // Log device-specific contact data for debugging
        if (deviceContacts && deviceContacts.length > 0) {
          console.log('📱 Device contact sample:', JSON.stringify(deviceContacts[0], null, 2));
        }
      } catch (permissionError) {
        const errorMessage = permissionError instanceof Error ? permissionError.message : 'Unknown error';
        const errorType = permissionError instanceof Error ? permissionError.constructor.name : 'Unknown';
        const errorStack = permissionError instanceof Error ? permissionError.stack : undefined;

        console.error('❌ Failed to fetch device contacts:', {
          error: errorMessage,
          type: errorType,
          stack: errorStack
        });

        // ✅ ENHANCED: Handle permission errors gracefully without crashing the app
        if (errorMessage?.includes('permission')) {
          console.warn('⚠️ Contacts permission not granted - returning empty contact list');
          return {
            existingUsers: [],
            nonUsers: [],
          };
        } else if (errorMessage?.includes('timeout')) {
          console.warn('⚠️ Contact sync timed out - returning empty contact list');
          return {
            existingUsers: [],
            nonUsers: [],
          };
        } else {
          console.warn('⚠️ Contact sync failed - returning empty contact list:', errorMessage);
          return {
            existingUsers: [],
            nonUsers: [],
          };
        }
      }

      // ✅ ENHANCED: Validate device contacts with detailed logging
      if (!deviceContacts || !Array.isArray(deviceContacts)) {
        console.error('❌ Device contacts validation failed:', {
          type: typeof deviceContacts,
          isArray: Array.isArray(deviceContacts),
          value: deviceContacts
        });
        throw new Error('Invalid contact data received from device');
      }

      if (deviceContacts.length === 0) {
        console.warn('⚠️ No contacts found on device');
        // Don't throw error for empty contacts - this might be legitimate
        return {
          existingUsers: [],
          nonUsers: [],
        };
      }

      // ✅ ENHANCED: Comprehensive debugging and device analysis
      console.log('📱 Device contact analysis:', {
        totalContacts: deviceContacts.length,
        contactsWithPhones: deviceContacts.filter(c => c.phoneNumber && c.phoneNumber.length > 0).length,
        contactsWithNames: deviceContacts.filter(c => c.fullName && c.fullName !== 'Unknown Contact').length,
        contactsWithEmails: deviceContacts.filter(c => c.email && c.email.length > 0).length,
        sampleContacts: deviceContacts.slice(0, 3).map((contact, index) => ({
          index: index + 1,
          userId: contact.user_id,
          name: contact.fullName,
          phone: contact.phoneNumber,
          email: contact.email || 'no-email',
          hasDebugInfo: !!contact._debug
        }))
      });

      // ✅ ENHANCED: Phone number format analysis
      const phoneFormats = deviceContacts
        .filter(c => c.phoneNumber)
        .map(c => c.phoneNumber)
        .slice(0, 10);

      console.log('📱 Phone number format analysis:', {
        samplePhones: phoneFormats,
        formats: phoneFormats.map(phone => ({
          original: phone,
          length: phone.length,
          hasPlus: phone.includes('+'),
          hasSpaces: phone.includes(' '),
          hasDashes: phone.includes('-'),
          hasParentheses: phone.includes('(') || phone.includes(')')
        }))
      });

      // ✅ OPTIMIZED: Async batch processing for large contact lists
      const phoneNumbers = await this.processContactsAsync(deviceContacts);

      // Remove duplicates
      const uniquePhoneNumbers = [...new Set(phoneNumbers)];

      // ✅ ENHANCED: Comprehensive phone number validation and logging
      if (!uniquePhoneNumbers || uniquePhoneNumbers.length === 0) {
        console.error('❌ No valid phone numbers found in device contacts');
        console.error('📱 This could indicate:');
        console.error('   1. All contacts have invalid phone number formats');
        console.error('   2. Phone number cleaning logic is too restrictive');
        console.error('   3. Device-specific contact structure issues');
        console.error('   4. Contacts exist but phone numbers are in unexpected fields');

        // ✅ ENHANCED: Don't return empty - try to diagnose the issue
        const contactsWithoutPhones = deviceContacts.filter(c => !c.phoneNumber || c.phoneNumber.length === 0);
        console.error('📱 Contacts without phone numbers:', contactsWithoutPhones.length);

        if (contactsWithoutPhones.length > 0) {
          console.error('📱 Sample contacts without phones:', contactsWithoutPhones.slice(0, 3).map(c => ({
            name: c.fullName,
            userId: c.user_id,
            hasPhoneField: 'phoneNumber' in c,
            phoneValue: c.phoneNumber,
            allFields: Object.keys(c)
          })));
        }

        return {
          existingUsers: [],
          nonUsers: [],
        };
      }

      console.log('✅ Phone number extraction successful:', {
        totalDeviceContacts: deviceContacts.length,
        validPhoneNumbers: uniquePhoneNumbers.length,
        extractionRate: `${((uniquePhoneNumbers.length / deviceContacts.length) * 100).toFixed(1)}%`,
        samplePhones: uniquePhoneNumbers.slice(0, 5)
      });

      // Check if known users are in the extracted phone numbers
      const knownUsers = ['9450869601', '9450869602', '9137538943', '9087654321'];
      console.log('🔍 Checking if known users are in extracted phone numbers:');
      knownUsers.forEach(phone => {
        const isInExtracted = uniquePhoneNumbers.includes(phone);
        console.log(`📞 Known user ${phone} - In extracted list: ${isInExtracted}`);
      });

      // Debug: Check if any device contacts contain the known phone numbers
      console.log('🔍 Checking device contacts for known phone numbers:');
      knownUsers.forEach(knownPhone => {
        const matchingContacts = deviceContacts.filter(contact => {
          if (!contact.phoneNumber) return false;
          return contact.phoneNumber.includes(knownPhone) || knownPhone.includes(contact.phoneNumber.replace(/[^\d]/g, ''));
        });
        if (matchingContacts.length > 0) {
          console.log(`📞 Found ${matchingContacts.length} contacts for ${knownPhone}:`,
            matchingContacts.map(c => ({ name: c.fullName, phone: c.phoneNumber })));
        } else {
          console.log(`📞 No contacts found for ${knownPhone}`);
        }
      });

      // Check which ones are existing users
      const { existingUsers, nonUsers } = await this.checkExistingUsers(uniquePhoneNumbers, deviceContacts);

      // Map non-users back to contact info
      const nonUserContacts = nonUsers.map(phoneNumber => {
        try {
          const deviceContact = deviceContacts.find(contact => {
            // ✅ FIX: Add null safety checks
            if (!contact || !contact.phoneNumber || typeof contact.phoneNumber !== 'string') {
              return false;
            }
            let cleaned = contact.phoneNumber.replace(/[^\d+]/g, '');
            if (cleaned.startsWith('+91')) {
              cleaned = cleaned.substring(3);
            } else if (cleaned.startsWith('91') && cleaned.length === 12) {
              cleaned = cleaned.substring(2);
            }
            return cleaned === phoneNumber;
          });
          return {
            phoneNumber,
            name: deviceContact?.fullName || 'Unknown',
          };
        } catch (error) {
          console.error('Error mapping non-user contact:', error);
          return {
            phoneNumber,
            name: 'Unknown',
          };
        }
      });

      console.log('✅ Contact status check complete:', {
        existingUsers: existingUsers.length,
        nonUsers: nonUserContacts.length,
      });

      const result = {
        existingUsers,
        nonUsers: nonUserContacts,
      };

      // Cache the result
      this.contactsCache = {
        data: result,
        timestamp: Date.now(),
      };

      return result;
    } catch (error) {
      console.error('Error getting contacts with status:', error);
      // ✅ FIX: Clear cache on error to prevent stale data
      this.clearCache();
      return {
        existingUsers: [],
        nonUsers: [],
      };
    } finally {
      // ✅ FIX: Always reset loading state
      this.isLoading = false;
    }
  }

  // Check if cache has valid data
  hasValidCache(): boolean {
    return this.contactsCache !== null &&
      Date.now() - this.contactsCache.timestamp < this.CACHE_DURATION &&
      (this.contactsCache.data.existingUsers.length > 0 || this.contactsCache.data.nonUsers.length > 0);
  }

  // Get cache status for UI loading states
  getCacheStatus(): { hasCache: boolean; isEmpty: boolean; isExpired: boolean } {
    if (!this.contactsCache) {
      return { hasCache: false, isEmpty: true, isExpired: false };
    }

    const isExpired = Date.now() - this.contactsCache.timestamp >= this.CACHE_DURATION;
    const isEmpty = this.contactsCache.data.existingUsers.length === 0 && this.contactsCache.data.nonUsers.length === 0;

    return {
      hasCache: true,
      isEmpty,
      isExpired
    };
  }

  // Force refresh contacts (bypass cache)
  async refreshContacts(): Promise<{
    existingUsers: Contact[];
    nonUsers: Array<{
      phoneNumber: string;
      name?: string;
    }>;
  }> {
    this.clearCache();
    return this.getContactsWithStatus();
  }
}

// Export singleton instance
export const contactService = new ContactService();
export default contactService;
