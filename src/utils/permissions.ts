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
   * Format contact data for the app
   */
  formatContactData(contacts: any[]): any[] {
    return contacts.map(contact => ({
      user_id: contact.recordID || contact.id,
      fullName: contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim(),
      email: contact.emailAddresses?.[0]?.email || '',
      phoneNumber: contact.phoneNumbers?.[0]?.number || '',
      profilePicture: contact.thumbnailPath || contact.hasThumbnail ? contact.thumbnailPath : undefined,
      isOnline: false, // This would need to be determined by your backend
      lastSeen: undefined,
      isBlocked: false,
      isFavorite: false,
    }));
  }

  /**
   * Sync contacts with backend
   */
  async syncContactsWithBackend(): Promise<any[]> {
    try {
      const hasPermission = await this.checkContactsPermission();
      if (!hasPermission) {
        const result = await this.requestContactsPermission();
        if (!result.granted) {
          this.showPermissionDeniedAlert('Contacts');
          throw new Error('Contacts permission denied');
        }
      }

      const contacts = await this.getAllContacts();
      const formattedContacts = this.formatContactData(contacts);
      
      // Here you would typically send the contacts to your backend
      // For now, we'll just return the formatted contacts
      console.log('Synced contacts:', formattedContacts.length);
      return formattedContacts;
      
    } catch (error) {
      console.error('Error syncing contacts:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const permissionManager = new PermissionManager();
export default permissionManager;