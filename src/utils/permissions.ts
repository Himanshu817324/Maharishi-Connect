import { Alert, Linking, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'never_ask_again' | 'unavailable';
  error?: string;
}

export interface ContactPermissionResult extends PermissionResult {
  contacts?: any[];
}

class PermissionManager {
  private lastPermissionRequest = 0;
  private readonly PERMISSION_REQUEST_COOLDOWN = 5000; // ms

  // Request contacts permission and optionally return fetched contacts
  async requestContactsPermission(): Promise<ContactPermissionResult> {
    const now = Date.now();
    if (now - this.lastPermissionRequest < this.PERMISSION_REQUEST_COOLDOWN) {
      console.log('⏳ Permission request rate limited');
      return { granted: false, canAskAgain: true, status: 'denied' };
    }
    this.lastPermissionRequest = now;

    try {
      const permission = await Contacts.requestPermission();

      if (permission === 'authorized') {
        // Attempt to fetch contacts immediately (best-effort)
        try {
          const contacts = await Contacts.getAll();
          return { granted: true, canAskAgain: true, status: 'granted', contacts };
        } catch (err: any) {
          // Permission granted but fetching failed
          return {
            granted: true,
            canAskAgain: true,
            status: 'granted',
            error: err?.message || 'Failed to read contacts after grant',
          };
        }
      }

      if (permission === 'denied') {
        return { granted: false, canAskAgain: true, status: 'denied' };
      }

      // Fallback for other return values
      return { granted: false, canAskAgain: false, status: 'never_ask_again' };
    } catch (error: any) {
      console.error('Error requesting contacts permission:', error);
      return { granted: false, canAskAgain: false, status: 'unavailable', error: error?.message };
    }
  }

  async checkContactsPermission(): Promise<boolean> {
    try {
      const permission = await Contacts.checkPermission();
      return permission === 'authorized';
    } catch (error) {
      console.error('Error checking contacts permission:', error);
      return false;
    }
  }

  // Returns all contacts. Throws if permission not granted or fetch fails.
  async getAllContacts(): Promise<any[]> {
    const hasPermission = await this.checkContactsPermission();
    if (!hasPermission) throw new Error('Contacts permission not granted');

    // Try standard API first, then fallback to matching string
    try {
      return await Contacts.getAll();
    } catch (standardError) {
      try {
        return await Contacts.getContactsMatchingString('');
      } catch (fallbackError) {
        console.error('[PermissionManager] Failed to fetch contacts (standard & fallback)', standardError, fallbackError);
        throw standardError;
      }
    }
  }

  async searchContacts(searchTerm: string): Promise<any[]> {
    const hasPermission = await this.checkContactsPermission();
    if (!hasPermission) throw new Error('Contacts permission not granted');
    return await Contacts.getContactsMatchingString(searchTerm);
  }

  showPermissionDeniedAlert(permissionType: string) {
    try {
      Alert.alert(
        'Permission Required',
        `${permissionType} permission is required to use this feature. Please enable it in settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => this.openAppSettings() },
        ]
      );
    } catch (error) {
      console.warn('Cannot show permission alert:', error);
    }
  }

  async openAppSettings() {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  }

  async requestMultiplePermissions(permissions: string[]): Promise<Record<string, PermissionResult>> {
    const results: Record<string, PermissionResult> = {};
    for (const p of permissions) {
      if (p === 'contacts') results[p] = await this.requestContactsPermission();
      // extend: handle other permission types
    }
    return results;
  }

  async checkAllPermissions(permissions: string[]): Promise<boolean> {
    for (const p of permissions) {
      if (p === 'contacts') {
        const ok = await this.checkContactsPermission();
        if (!ok) return false;
      }
    }
    return true;
  }

  // Normalize contact objects to the app's expected shape
  formatContactData(contacts: any[]): any[] {
    if (!Array.isArray(contacts)) {
      console.warn('⚠️ formatContactData received non-array:', typeof contacts);
      return [];
    }

    return contacts.map(contact => {
      const fullName =
        contact.displayName ||
        [contact.givenName, contact.familyName].filter(Boolean).join(' ').trim() ||
        contact.name ||
        'Unknown';

      let phoneNumber = '';
      if (Array.isArray(contact.phoneNumbers) && contact.phoneNumbers.length > 0) {
        const pn = contact.phoneNumbers[0];
        phoneNumber = typeof pn === 'string' ? pn : pn.number || '';
      } else if (contact.phoneNumber) phoneNumber = contact.phoneNumber;

      let email = '';
      if (Array.isArray(contact.emailAddresses) && contact.emailAddresses.length > 0) {
        const e = contact.emailAddresses[0];
        email = typeof e === 'string' ? e : e.email || '';
      } else if (contact.email) email = contact.email;

      const profilePicture = contact.thumbnailPath || (contact.hasThumbnail ? contact.thumbnailPath : undefined);

      return {
        user_id: contact.recordID || contact.id,
        fullName,
        email,
        phoneNumber,
        profilePicture,
        isOnline: false,
        lastSeen: undefined,
        isBlocked: false,
        isFavorite: false,
        originalContact: contact,
      };
    });
  }

  // High-level sync: ensure permission, read contacts, and return formatted data
  async syncContactsWithBackend(): Promise<any[]> {
    try {
      let contacts: any[] | undefined;

      const hasPermission = await this.checkContactsPermission();
      if (!hasPermission) {
        const result = await this.requestContactsPermission();
        if (!result.granted) {
          this.showPermissionDeniedAlert('Contacts');
          throw new Error(`Contacts permission denied: ${result.status}`);
        }

        if (result.contacts && result.contacts.length > 0) contacts = result.contacts;
      }

      if (!contacts) contacts = await this.getAllContacts();
      if (!contacts || contacts.length === 0) return [];

      return this.formatContactData(contacts);
    } catch (error: any) {
      console.error('Contact sync failed:', error);
      if (error?.message?.toLowerCase().includes('permission')) {
        throw new Error('Contacts permission is required. Please enable it in your device settings.');
      }
      throw new Error(`Contact sync failed: ${error?.message ?? 'unknown error'}`);
    }
  }
}

export const permissionManager = new PermissionManager();
export default permissionManager;