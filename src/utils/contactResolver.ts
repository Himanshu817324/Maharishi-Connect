// Contact name resolver utility
import { Contact } from 'react-native-contacts';

interface CachedContact {
  phoneNumber: string;
  name: string;
}

class ContactResolver {
  private contactCache: Map<string, string> = new Map();
  private avatarCache: Map<string, string> = new Map();
  private serverContactCache: Map<string, any> = new Map();
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  // Initialize the resolver with local contacts
  async initialize(contacts: Contact[] = []) {
    // If already initializing, wait for that to complete
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize(contacts);
    return this.initializationPromise;
  }

  private async _doInitialize(contacts: Contact[] = []) {
    this.contactCache.clear();
    this.avatarCache.clear();

    for (const contact of contacts) {
      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        const displayName = contact.displayName || contact.givenName || contact.familyName || 'Unknown';
        const avatar = contact.thumbnailPath || contact.hasThumbnail ? contact.thumbnailPath : null;

        for (const phoneNumber of contact.phoneNumbers) {
          const cleanNumber = this.normalizePhoneNumber(phoneNumber.number);
          if (cleanNumber) {
            this.contactCache.set(cleanNumber, displayName);
            if (avatar) {
              this.avatarCache.set(cleanNumber, avatar);
            }
          }
        }
      }
    }

    this.initialized = true;
    console.log(`📞 ContactResolver initialized with ${this.contactCache.size} phone numbers`);
  }

  // Add server contact data for better resolution
  addServerContacts(serverContacts: any[] = []) {
    for (const contact of serverContacts) {
      const phoneNumber = contact.mobileNo || contact.phone;
      if (phoneNumber) {
        const cleanNumber = this.normalizePhoneNumber(phoneNumber);
        if (cleanNumber) {
          this.serverContactCache.set(cleanNumber, contact);
          if (contact.localName || contact.name || contact.fullName) {
            const serverName = contact.localName || contact.name || contact.fullName;
            this.contactCache.set(cleanNumber, serverName);
          }
          if (contact.profilePicture) {
            this.avatarCache.set(cleanNumber, contact.profilePicture);
          }
        }
      }
    }
    console.log(`📞 Added ${serverContacts.length} server contacts to resolver`);
  }

  // Normalize phone number to a consistent format
  private normalizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return '';
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) {
      return digits.slice(-10);
    } else if (digits.length === 10) {
      return digits;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      return digits.slice(1);
    }
    if (digits.length > 10) {
      return digits.slice(-10);
    }
    return digits;
  }

  // FIXED: Renamed to be a private helper method for clarity
  private _resolveNameFromCache(phoneNumber: string): string | null {
    if (!this.initialized || !phoneNumber) return null;
    const normalizedNumber = this.normalizePhoneNumber(phoneNumber);
    return this.contactCache.get(normalizedNumber) || null;
  }

  // FIXED: Renamed to be a private helper method for clarity
  private _resolveAvatarFromCache(phoneNumber: string): string | null {
    if (!this.initialized || !phoneNumber) return null;
    const normalizedNumber = this.normalizePhoneNumber(phoneNumber);
    return this.avatarCache.get(normalizedNumber) || null;
  }

  getServerContact(phoneNumber: string): any | null {
    if (!phoneNumber) return null;
    const normalizedNumber = this.normalizePhoneNumber(phoneNumber);
    return this.serverContactCache.get(normalizedNumber) || null;
  }

  // FIXED: Updated to call the new private methods and clarify the logic
  resolveChatName(chat: any, currentUserId: string): string {
    if (!chat) return 'Unknown';
    if (chat.type !== 'direct') {
      return chat.name || 'Group Chat';
    }

    const participants = chat.participants || [];
    const otherParticipant = participants.find((p: any) => (p?.user_id || p?.uid || p?.id || p) !== currentUserId);

    if (otherParticipant) {
      const phoneNumber = otherParticipant?.user_mobile || otherParticipant?.phone || otherParticipant?.mobile;
      if (phoneNumber) {
        // 1. Prioritize the name from the user's local device contacts.
        const localName = this._resolveNameFromCache(phoneNumber);
        if (localName) {
          return localName;
        }

        // 2. Fallback to server data if not in local contacts.
        const serverContact = this.getServerContact(phoneNumber);
        if (serverContact) {
          return serverContact.localName || serverContact.name || serverContact.fullName || `+91${phoneNumber}`;
        }
      }

      // 3. Final fallback to the name from the participant object (sender's profile name).
      return otherParticipant?.user_name || otherParticipant?.fullName || otherParticipant?.name || 'Unknown User';
    }

    return chat.name || 'Unknown';
  }

  // Resolve contact name by phone number or user ID
  resolveContactName(phoneNumberOrId: string, fallbackName?: string): string {
    if (!phoneNumberOrId) return fallbackName || 'Unknown User';

    // First try to resolve by phone number from local contacts
    const localName = this._resolveNameFromCache(phoneNumberOrId);
    if (localName) return localName;

    // Try to resolve from server contacts
    const serverContact = this.getServerContact(phoneNumberOrId);
    if (serverContact) {
      return serverContact.localName || serverContact.name || serverContact.fullName || fallbackName || 'Unknown User';
    }

    // If it looks like a phone number, format it nicely
    const normalizedNumber = this.normalizePhoneNumber(phoneNumberOrId);
    if (normalizedNumber && normalizedNumber.length === 10) {
      return `+91${normalizedNumber}`;
    }

    // Return fallback name or unknown
    return fallbackName || 'Unknown User';
  }

  // FIXED: Updated to call the new private methods
  resolveChatAvatar(chat: any, currentUserId: string): string | null {
    if (!chat || chat.type !== 'direct') {
      return chat?.avatar || null;
    }

    const participants = chat.participants || [];
    const otherParticipant = participants.find((p: any) => (p?.user_id || p?.uid || p?.id || p) !== currentUserId);

    if (otherParticipant) {
      const phoneNumber = otherParticipant?.user_mobile || otherParticipant?.phone || otherParticipant?.mobile;
      if (phoneNumber) {
        const localAvatar = this._resolveAvatarFromCache(phoneNumber);
        if (localAvatar) return localAvatar;

        const serverContact = this.getServerContact(phoneNumber);
        if (serverContact?.profilePicture) return serverContact.profilePicture;
      }
      return otherParticipant?.avatar || otherParticipant?.profilePicture || null;
    }

    return null;
  }

  getCacheSize(): number {
    return this.contactCache.size;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // Wait for initialization to complete
  async waitForInitialization(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  // Enhanced name resolution with better fallbacks
  resolveChatNameEnhanced(chat: any, currentUserId: string): string {
    if (!chat) return 'Unknown';
    if (chat.type !== 'direct') {
      return chat.name || 'Group Chat';
    }

    const participants = chat.participants || [];
    const otherParticipant = participants.find((p: any) => (p?.user_id || p?.uid || p?.id || p) !== currentUserId);

    if (otherParticipant) {
      const phoneNumber = otherParticipant?.user_mobile || otherParticipant?.phone || otherParticipant?.mobile;

      // 1. Try to get name from participant data first (most reliable)
      const participantName = otherParticipant?.user_name ||
        otherParticipant?.fullName ||
        otherParticipant?.name ||
        otherParticipant?.userDetails?.fullName;

      if (participantName && participantName !== 'Unknown User') {
        return participantName;
      }

      // 2. If we have a phone number, try contact resolution
      if (phoneNumber && this.initialized) {
        const localName = this._resolveNameFromCache(phoneNumber);
        if (localName) {
          return localName;
        }

        const serverContact = this.getServerContact(phoneNumber);
        if (serverContact) {
          return serverContact.localName || serverContact.name || serverContact.fullName || `+91${phoneNumber}`;
        }
      }

      // 3. Format phone number nicely as fallback
      if (phoneNumber) {
        const normalizedNumber = this.normalizePhoneNumber(phoneNumber);
        if (normalizedNumber && normalizedNumber.length === 10) {
          return `+91${normalizedNumber}`;
        }
        return phoneNumber;
      }
    }

    return chat.name || 'Unknown User';
  }
}

export default new ContactResolver();