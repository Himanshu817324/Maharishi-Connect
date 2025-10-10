import { Platform, PermissionsAndroid } from 'react-native';

export interface ManifestPermission {
  name: string;
  description: string;
  category: 'camera' | 'storage' | 'contacts' | 'location' | 'notification' | 'network';
  required: boolean;
  androidVersion?: number; // Minimum Android version required
}

export interface PermissionGroup {
  name: string;
  permissions: ManifestPermission[];
  description: string;
}

class AndroidManifestPermissionManager {
  private readonly PERMISSION_GROUPS: PermissionGroup[] = [
    {
      name: 'Camera & Media',
      description: 'Permissions for camera access and media capture',
      permissions: [
        {
          name: PermissionsAndroid.PERMISSIONS.CAMERA,
          description: 'Access camera to take photos and videos',
          category: 'camera',
          required: true,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          description: 'Record audio for video recording',
          category: 'camera',
          required: true,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION,
          description: 'Access location data in photos',
          category: 'camera',
          required: false,
        },
      ],
    },
    {
      name: 'Storage & Files',
      description: 'Permissions for file access and storage',
      permissions: [
        {
          name: PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          description: 'Read files from device storage (Android < 13)',
          category: 'storage',
          required: true,
          androidVersion: 24,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          description: 'Write files to device storage (Android < 13)',
          category: 'storage',
          required: true,
          androidVersion: 24,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          description: 'Access photos and images (Android 13+)',
          category: 'storage',
          required: true,
          androidVersion: 33,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          description: 'Access videos (Android 13+)',
          category: 'storage',
          required: true,
          androidVersion: 33,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
          description: 'Access audio files (Android 13+)',
          category: 'storage',
          required: true,
          androidVersion: 33,
        },
      ],
    },
    {
      name: 'Contacts & Communication',
      description: 'Permissions for contacts and communication features',
      permissions: [
        {
          name: PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          description: 'Read device contacts',
          category: 'contacts',
          required: true,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS,
          description: 'Modify device contacts',
          category: 'contacts',
          required: false,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          description: 'Read phone state information',
          category: 'contacts',
          required: false,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
          description: 'Read phone numbers',
          category: 'contacts',
          required: false,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          description: 'Read call history',
          category: 'contacts',
          required: false,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.READ_SMS,
          description: 'Read SMS messages',
          category: 'contacts',
          required: false,
        },
      ],
    },
    {
      name: 'Location',
      description: 'Permissions for location services',
      permissions: [
        {
          name: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          description: 'Access precise location',
          category: 'location',
          required: false,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          description: 'Access approximate location',
          category: 'location',
          required: false,
        },
      ],
    },
    {
      name: 'Notifications',
      description: 'Permissions for notifications',
      permissions: [
        {
          name: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          description: 'Send notifications to user',
          category: 'notification',
          required: true,
          androidVersion: 33,
        },
      ],
    },
    {
      name: 'System',
      description: 'System-level permissions',
      permissions: [
        {
          name: PermissionsAndroid.PERMISSIONS.VIBRATE,
          description: 'Control device vibration',
          category: 'notification',
          required: false,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.WAKE_LOCK,
          description: 'Keep device awake',
          category: 'network',
          required: false,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE,
          description: 'Run foreground services',
          category: 'network',
          required: false,
        },
        {
          name: PermissionsAndroid.PERMISSIONS.RECEIVE_BOOT_COMPLETED,
          description: 'Start automatically on boot',
          category: 'network',
          required: false,
        },
      ],
    },
  ];

  /**
   * Get all permissions for a specific category
   */
  getPermissionsByCategory(category: ManifestPermission['category']): ManifestPermission[] {
    const permissions: ManifestPermission[] = [];
    
    this.PERMISSION_GROUPS.forEach(group => {
      group.permissions.forEach(permission => {
        if (permission.category === category) {
          permissions.push(permission);
        }
      });
    });
    
    return permissions;
  }

  /**
   * Get permissions that are applicable for the current Android version
   */
  getApplicablePermissions(): ManifestPermission[] {
    if (Platform.OS !== 'android') {
      return [];
    }

    const currentVersion = Platform.Version;
    const applicablePermissions: ManifestPermission[] = [];

    this.PERMISSION_GROUPS.forEach(group => {
      group.permissions.forEach(permission => {
        if (!permission.androidVersion || currentVersion >= permission.androidVersion) {
          applicablePermissions.push(permission);
        }
      });
    });

    return applicablePermissions;
  }

  /**
   * Get storage permissions based on Android version
   */
  getStoragePermissions(): string[] {
    if (Platform.OS !== 'android') {
      return [];
    }

    const currentVersion = Platform.Version;
    const storagePermissions = this.getPermissionsByCategory('storage');
    
    return storagePermissions
      .filter(permission => {
        if (!permission.androidVersion) {
          return currentVersion < 33; // Legacy permissions for older versions
        }
        return currentVersion >= permission.androidVersion;
      })
      .map(permission => permission.name);
  }

  /**
   * Get camera permissions
   */
  getCameraPermissions(): string[] {
    if (Platform.OS !== 'android') {
      return [];
    }

    return this.getPermissionsByCategory('camera')
      .map(permission => permission.name);
  }

  /**
   * Get contacts permissions
   */
  getContactsPermissions(): string[] {
    if (Platform.OS !== 'android') {
      return [];
    }

    return this.getPermissionsByCategory('contacts')
      .map(permission => permission.name);
  }

  /**
   * Get location permissions
   */
  getLocationPermissions(): string[] {
    if (Platform.OS !== 'android') {
      return [];
    }

    return this.getPermissionsByCategory('location')
      .map(permission => permission.name);
  }

  /**
   * Get notification permissions
   */
  getNotificationPermissions(): string[] {
    if (Platform.OS !== 'android') {
      return [];
    }

    const currentVersion = Platform.Version;
    return this.getPermissionsByCategory('notification')
      .filter(permission => !permission.androidVersion || currentVersion >= permission.androidVersion)
      .map(permission => permission.name);
  }

  /**
   * Get permission description for user-friendly display
   */
  getPermissionDescription(permissionName: string): string {
    for (const group of this.PERMISSION_GROUPS) {
      const permission = group.permissions.find(p => p.name === permissionName);
      if (permission) {
        return permission.description;
      }
    }
    return permissionName;
  }

  /**
   * Get permission category
   */
  getPermissionCategory(permissionName: string): ManifestPermission['category'] | null {
    for (const group of this.PERMISSION_GROUPS) {
      const permission = group.permissions.find(p => p.name === permissionName);
      if (permission) {
        return permission.category;
      }
    }
    return null;
  }

  /**
   * Check if permission is required
   */
  isPermissionRequired(permissionName: string): boolean {
    for (const group of this.PERMISSION_GROUPS) {
      const permission = group.permissions.find(p => p.name === permissionName);
      if (permission) {
        return permission.required;
      }
    }
    return false;
  }

  /**
   * Get all permission groups
   */
  getPermissionGroups(): PermissionGroup[] {
    return this.PERMISSION_GROUPS;
  }

  /**
   * Get manifest summary for debugging
   */
  getManifestSummary(): {
    totalPermissions: number;
    applicablePermissions: number;
    androidVersion: number;
    permissionGroups: Array<{
      name: string;
      count: number;
      required: number;
    }>;
  } {
    const applicablePermissions = this.getApplicablePermissions();
    const androidVersion = Platform.OS === 'android' ? Platform.Version : 0;
    
    const permissionGroups = this.PERMISSION_GROUPS.map(group => {
      const applicableGroupPermissions = group.permissions.filter(permission => 
        !permission.androidVersion || androidVersion >= permission.androidVersion
      );
      
      return {
        name: group.name,
        count: applicableGroupPermissions.length,
        required: applicableGroupPermissions.filter(p => p.required).length,
      };
    });

    return {
      totalPermissions: this.PERMISSION_GROUPS.reduce((sum, group) => sum + group.permissions.length, 0),
      applicablePermissions: applicablePermissions.length,
      androidVersion,
      permissionGroups,
    };
  }
}

// Export singleton instance
export const manifestPermissionManager = new AndroidManifestPermissionManager();
export default manifestPermissionManager;
