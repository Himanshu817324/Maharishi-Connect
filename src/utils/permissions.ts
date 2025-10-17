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
        // Android contacts permission - handle different Android versions
        try {
          const permission = await Contacts.requestPermission();
          
          if (permission === 'authorized') {
            // Try to get contacts to verify permission actually works
            try {
              const contacts = await Contacts.getAll();
              return {
                granted: true,
                canAskAgain: true,
                status: 'granted',
                contacts: contacts,
              };
            } catch (contactError) {
              return {
                granted: false,
                canAskAgain: true,
                status: 'denied',
                error: 'Permission granted but contacts access failed',
              };
            }
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
        } catch (androidError) {
          return {
            granted: false,
            canAskAgain: false,
            status: 'unavailable',
            error: androidError.message,
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
   * Get all contacts with fallback methods
   */
  async getAllContacts(): Promise<any[]> {
    try {
      const hasPermission = await this.checkContactsPermission();
      if (!hasPermission) {
        throw new Error('Contacts permission not granted');
      }
      
      // Try the standard method first
      try {
        const contacts = await Contacts.getAll();
        return contacts;
      } catch (standardError) {
        // Try alternative method for problematic devices
        try {
          const contacts = await Contacts.getContactsMatchingString('');
          return contacts;
        } catch (alternativeError) {
          throw standardError; // Throw the original error
        }
      }
    } catch (error) {
      console.error('📱 [PermissionManager] Error getting contacts:', error);
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
   * Format contact data for the app
   */
  formatContactData(contacts: any[]): any[] {
    return contacts.map(contact => {
      // Handle different contact name formats
      let fullName = 'Unknown';
      if (contact.displayName) {
        fullName = contact.displayName;
      } else if (contact.givenName || contact.familyName) {
        fullName = `${contact.givenName || ''} ${contact.familyName || ''}`.trim();
      } else if (contact.name) {
        fullName = contact.name;
      }

      // Handle different phone number formats
      let phoneNumber = '';
      if (contact.phoneNumbers && Array.isArray(contact.phoneNumbers) && contact.phoneNumbers.length > 0) {
        phoneNumber = contact.phoneNumbers[0].number || contact.phoneNumbers[0];
      } else if (contact.phoneNumber) {
        phoneNumber = contact.phoneNumber;
      } else if (contact.phone) {
        phoneNumber = contact.phone;
      }

      // Handle different email formats
      let email = '';
      if (contact.emailAddresses && Array.isArray(contact.emailAddresses) && contact.emailAddresses.length > 0) {
        email = contact.emailAddresses[0].email || contact.emailAddresses[0];
      } else if (contact.emailAddress) {
        email = contact.emailAddress;
      } else if (contact.email) {
        email = contact.email;
      }

      return {
        user_id: contact.recordID || contact.id,
        fullName,
        email,
        phoneNumber,
        profilePicture: contact.thumbnailPath || contact.hasThumbnail ? contact.thumbnailPath : undefined,
        isOnline: false,
        lastSeen: undefined,
        isBlocked: false,
        isFavorite: false,
        // Store original contact for debugging
        originalContact: contact,
      };
    });
  }

  /**
   * Sync contacts with backend
   */
  async syncContactsWithBackend(): Promise<any[]> {
    try {
      // Check current permission status
      const hasPermission = await this.checkContactsPermission();
      
      if (!hasPermission) {
        const result = await this.requestContactsPermission();
        
        if (!result.granted) {
          this.showPermissionDeniedAlert('Contacts');
          throw new Error(`Contacts permission denied: ${result.status}`);
        }
        
        // If permission was granted and we have contacts from the request, use them
        if (result.contacts && result.contacts.length > 0) {
          const formattedContacts = this.formatContactData(result.contacts);
          return formattedContacts;
        }
      }

      // Try to get contacts
      const contacts = await this.getAllContacts();
      
      if (!contacts || contacts.length === 0) {
        return [];
      }
      
      const formattedContacts = this.formatContactData(contacts);
      return formattedContacts;
      
    } catch (error) {
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          throw new Error('Contacts permission is required. Please enable it in your device settings.');
        } else if (error.message.includes('contacts access failed')) {
          throw new Error('Permission granted but unable to access contacts. Please try restarting the app.');
        } else {
          throw new Error(`Contact sync failed: ${error.message}`);
        }
      }
      
      throw new Error('Contact sync failed. Please check your device settings and try again.');
    }
  }
}

// Export singleton instance
export const permissionManager = new PermissionManager();
export default permissionManager;