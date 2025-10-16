import { Alert, Linking, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'never_ask_again' | 'unavailable';
}

export interface ContactPermissionResult extends PermissionResult {
  contacts?: any[];
}

class PermissionManager {
  private lastPermissionRequest: number = 0;
  private readonly PERMISSION_REQUEST_COOLDOWN = 5000; // 5 seconds

  /**
   * Request contacts permission
   */
  async requestContactsPermission(): Promise<ContactPermissionResult> {
    // Rate limiting to prevent too many requests
    const now = Date.now();
    if (now - this.lastPermissionRequest < this.PERMISSION_REQUEST_COOLDOWN) {
      console.log('⏳ Permission request rate limited');
      return {
        granted: false,
        canAskAgain: true,
        status: 'denied',
      };
    }
    this.lastPermissionRequest = now;
    try {
      if (Platform.OS === 'ios') {
        // iOS contacts permission
        const permission = await Contacts.requestPermission();

        if (permission === 'authorized') {
          const contacts = await Contacts.getAll();
          return {
            granted: true,
            canAskAgain: true,
            status: 'granted',
            contacts: contacts,
          };
        } else if (permission === 'denied') {
          return {
            granted: false,
            canAskAgain: true,
            status: 'denied',
          };
        } else {
          return {
            granted: false,
            canAskAgain: false,
            status: 'never_ask_again',
          };
        }
      } else {
        // Android contacts permission
        const permission = await Contacts.requestPermission();

        if (permission === 'authorized') {
          const contacts = await Contacts.getAll();
          return {
            granted: true,
            canAskAgain: true,
            status: 'granted',
            contacts: contacts,
          };
        } else if (permission === 'denied') {
          return {
            granted: false,
            canAskAgain: true,
            status: 'denied',
          };
        } else {
          return {
            granted: false,
            canAskAgain: false,
            status: 'never_ask_again',
          };
        }
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'unavailable',
      };
    }
  }

  /**
   * Check if contacts permission is granted
   */
  async checkContactsPermission(): Promise<boolean> {
    try {
      const permission = await Contacts.checkPermission();
      return permission === 'authorized';
    } catch (error) {
      console.error('Error checking contacts permission:', error);
      return false;
    }
  }

  /**
   * Get all contacts
   */
  async getAllContacts(): Promise<any[]> {
    try {
      const hasPermission = await this.checkContactsPermission();
      if (!hasPermission) {
        throw new Error('Contacts permission not granted');
      }

      return await Contacts.getAll();
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  }

  /**
   * Search contacts
   */
  async searchContacts(searchTerm: string): Promise<any[]> {
    try {
      const hasPermission = await this.checkContactsPermission();
      if (!hasPermission) {
        throw new Error('Contacts permission not granted');
      }

      return await Contacts.getContactsMatchingString(searchTerm);
    } catch (error) {
      console.error('Error searching contacts:', error);
      throw error;
    }
  }

  /**
   * Show permission denied alert with settings option
   */
  showPermissionDeniedAlert(permissionType: string) {
    // Only show alert if app is in foreground
    try {
      Alert.alert(
        'Permission Required',
        `${permissionType} permission is required to use this feature. Please enable it in settings.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Open Settings',
            onPress: () => this.openAppSettings(),
          },
        ]
      );
    } catch (error) {
      console.log('⚠️ Cannot show alert - app not ready:', error);
    }
  }

  /**
   * Open app settings
   */
  async openAppSettings() {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  }

  /**
   * Request multiple permissions at once
   */
  async requestMultiplePermissions(permissions: string[]): Promise<Record<string, PermissionResult>> {
    const results: Record<string, PermissionResult> = {};

    for (const permission of permissions) {
      if (permission === 'contacts') {
        results[permission] = await this.requestContactsPermission();
      }
      // Add more permission types as needed
    }

    return results;
  }

  /**
   * Check if all required permissions are granted
   */
  async checkAllPermissions(permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (permission === 'contacts') {
        const hasPermission = await this.checkContactsPermission();
        if (!hasPermission) {
          return false;
        }
      }
      // Add more permission checks as needed
    }

    return true;
  }

  /**
   * ✅ ENHANCED: Format contact data for the app with robust device compatibility
   */
  formatContactData(contacts: any[]): any[] {
    if (!Array.isArray(contacts)) {
      console.warn('⚠️ formatContactData received non-array:', typeof contacts);
      return [];
    }

    return contacts
      .map((contact, index) => {
        try {
          // ✅ ENHANCED: More robust ID extraction for different device types
          const userId = contact.recordID ||
            contact.id ||
            contact.rawContactId ||
            contact.contactId ||
            contact._id ||
            `contact_${Date.now()}_${index}`;

          // ✅ ENHANCED: More flexible name extraction
          let fullName = '';
          if (contact.displayName) {
            fullName = contact.displayName;
          } else if (contact.name) {
            fullName = contact.name;
          } else if (contact.givenName || contact.familyName) {
            fullName = `${contact.givenName || ''} ${contact.familyName || ''}`.trim();
          } else if (contact.firstName) {
            fullName = contact.firstName;
          } else if (contact.nickname) {
            fullName = contact.nickname;
          } else {
            fullName = 'Unknown Contact';
          }

          // ✅ ENHANCED: More robust phone number extraction
          let phoneNumber = '';
          if (contact.phoneNumbers && Array.isArray(contact.phoneNumbers) && contact.phoneNumbers.length > 0) {
            phoneNumber = contact.phoneNumbers[0].number || contact.phoneNumbers[0];
          } else if (contact.phoneNumber) {
            phoneNumber = contact.phoneNumber;
          } else if (contact.phone) {
            phoneNumber = contact.phone;
          } else if (contact.mobile) {
            phoneNumber = contact.mobile;
          } else if (contact.tel) {
            phoneNumber = contact.tel;
          }

          // ✅ ENHANCED: More robust email extraction
          let email = '';
          if (contact.emailAddresses && Array.isArray(contact.emailAddresses) && contact.emailAddresses.length > 0) {
            email = contact.emailAddresses[0].email || contact.emailAddresses[0];
          } else if (contact.email) {
            email = contact.email;
          }

          // ✅ ENHANCED: More robust profile picture extraction
          let profilePicture = undefined;
          if (contact.thumbnailPath) {
            profilePicture = contact.thumbnailPath;
          } else if (contact.hasThumbnail && contact.thumbnailPath) {
            profilePicture = contact.thumbnailPath;
          } else if (contact.photo) {
            profilePicture = contact.photo;
          } else if (contact.avatar) {
            profilePicture = contact.avatar;
          }

          return {
            user_id: userId,
            fullName: fullName,
            email: email,
            phoneNumber: phoneNumber,
            profilePicture: profilePicture,
            isOnline: false,
            lastSeen: undefined,
            isBlocked: false,
            isFavorite: false,
            // ✅ NEW: Add debugging info
            _debug: {
              originalContact: {
                hasRecordID: !!contact.recordID,
                hasId: !!contact.id,
                hasDisplayName: !!contact.displayName,
                hasPhoneNumbers: !!(contact.phoneNumbers && contact.phoneNumbers.length > 0),
                hasEmailAddresses: !!(contact.emailAddresses && contact.emailAddresses.length > 0),
                phoneNumbersCount: contact.phoneNumbers?.length || 0,
                emailAddressesCount: contact.emailAddresses?.length || 0,
              }
            }
          };
        } catch (error) {
          console.error(`❌ Error formatting contact at index ${index}:`, error);
          return null;
        }
      })
      .filter(contact => contact !== null) // Remove failed formatting attempts
      .filter(contact => contact.phoneNumber && contact.phoneNumber.length > 0); // Only include contacts with phone numbers
  }

  /**
   * ✅ ENHANCED: Sync contacts with backend with comprehensive error handling
   */
  async syncContactsWithBackend(): Promise<any[]> {
    const startTime = Date.now();
    const deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version,
      manufacturer: (Platform.constants as any)?.Brand || 'Unknown',
      model: (Platform.constants as any)?.Model || 'Unknown'
    };

    console.log('📱 Starting contact sync with device info:', deviceInfo);

    try {
      // ✅ ENHANCED: Check permission with detailed logging
      console.log('🔐 Checking contacts permission...');
      const hasPermission = await this.checkContactsPermission();
      console.log('🔐 Permission status:', hasPermission ? 'GRANTED' : 'DENIED');

      if (!hasPermission) {
        console.log('📱 Requesting contacts permission...');
        const result = await this.requestContactsPermission();
        console.log('📱 Permission request result:', {
          granted: result.granted,
          status: result.status,
          canAskAgain: result.canAskAgain
        });

        if (!result.granted) {
          const errorMsg = `Contacts permission denied: ${result.status}`;
          console.error('❌', errorMsg);
          this.showPermissionDeniedAlert('Contacts');
          throw new Error(errorMsg);
        }
      }

      // ✅ ENHANCED: Get contacts with detailed logging
      console.log('📱 Fetching contacts from device...');
      const contacts = await this.getAllContacts();

      console.log('📱 Raw contacts from device:', {
        count: contacts.length,
        sample: contacts.slice(0, 3).map(c => ({
          id: c.recordID || c.id || 'no-id',
          name: c.displayName || c.givenName || 'no-name',
          phone: c.phoneNumbers?.[0]?.number || c.phoneNumber || 'no-phone',
          hasPhoneNumbers: !!(c.phoneNumbers && c.phoneNumbers.length > 0),
          phoneCount: c.phoneNumbers?.length || 0
        }))
      });

      if (contacts.length === 0) {
        console.warn('⚠️ No contacts found on device - this might indicate:');
        console.warn('   1. Device has no contacts');
        console.warn('   2. Permission issue (even though granted)');
        console.warn('   3. Device-specific contact access limitation');
        console.warn('   4. Contact library compatibility issue');
      }

      // ✅ ENHANCED: Format contacts with error handling
      console.log('📱 Formatting contacts...');
      const formattedContacts = this.formatContactData(contacts);

      console.log('📱 Formatted contacts:', {
        count: formattedContacts.length,
        sample: formattedContacts.slice(0, 3).map(c => ({
          userId: c.user_id,
          name: c.fullName,
          phone: c.phoneNumber,
          email: c.email || 'no-email'
        }))
      });

      const processingTime = Date.now() - startTime;
      console.log(`✅ Contact sync completed in ${processingTime}ms:`, {
        rawContacts: contacts.length,
        formattedContacts: formattedContacts.length,
        deviceInfo,
        processingTime
      });

      return formattedContacts;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error('❌ Detailed contact sync error:', {
        error: errorMessage,
        stack: errorStack,
        deviceInfo,
        processingTime,
        timestamp: new Date().toISOString()
      });

      // ✅ ENHANCED: Provide more specific error messages
      if (errorMessage?.includes('permission')) {
        throw new Error('Contacts permission is required. Please enable it in Settings.');
      } else if (errorMessage?.includes('network')) {
        throw new Error('Network error while syncing contacts. Please check your connection.');
      } else if (errorMessage?.includes('timeout')) {
        throw new Error('Contact sync timed out. Please try again.');
      } else {
        throw new Error(`Contact sync failed: ${errorMessage}`);
      }
    }
  }
}

// Export singleton instance
export const permissionManager = new PermissionManager();
export default permissionManager;