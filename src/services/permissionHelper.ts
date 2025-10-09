import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

export interface PermissionResult {
  granted: boolean;
  permissions: Record<string, string>;
  deniedPermissions: string[];
}

class PermissionHelper {
  /**
   * Check if a permission is granted
   */
  async checkPermission(permission: string): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.check(permission);
        console.log(`🔍 Permission ${permission}: ${granted ? 'GRANTED' : 'DENIED'}`);
        return granted;
      } catch (error) {
        console.error(`💥 Error checking permission ${permission}:`, error);
        return false;
      }
    }
    return true; // iOS permissions are handled by native pickers
  }

  /**
   * Request a single permission
   */
  async requestPermission(permission: string): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        console.log(`🔐 Requesting permission: ${permission}`);
        const granted = await PermissionsAndroid.request(permission);
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        console.log(`🔐 Permission ${permission}: ${isGranted ? 'GRANTED' : 'DENIED'}`);
        return isGranted;
      } catch (error) {
        console.error(`💥 Error requesting permission ${permission}:`, error);
        return false;
      }
    }
    return true; // iOS permissions are handled by native pickers
  }

  /**
   * Request multiple permissions
   */
  async requestMultiplePermissions(permissions: string[]): Promise<PermissionResult> {
    if (Platform.OS === 'android') {
      try {
        console.log(`🔐 Requesting multiple permissions:`, permissions);
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        const deniedPermissions: string[] = [];
        const allGranted = Object.entries(granted).every(([permission, result]) => {
          const isGranted = result === PermissionsAndroid.RESULTS.GRANTED;
          if (!isGranted) {
            deniedPermissions.push(permission);
          }
          return isGranted;
        });

        console.log(`🔐 Permission results:`, granted);
        console.log(`🔐 All granted: ${allGranted}`);
        console.log(`🔐 Denied permissions:`, deniedPermissions);

        return {
          granted: allGranted,
          permissions: granted,
          deniedPermissions,
        };
      } catch (error) {
        console.error('💥 Error requesting multiple permissions:', error);
        return {
          granted: false,
          permissions: {},
          deniedPermissions: permissions,
        };
      }
    }
    return {
      granted: true,
      permissions: {},
      deniedPermissions: [],
    };
  }

  /**
   * Get camera permissions based on Android version
   */
  getCameraPermissions(): string[] {
    if (Platform.OS === 'android') {
      const androidVersion = Platform.Version;
      const permissions = [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ];

      if (androidVersion < 33) {
        // For older Android versions, use traditional storage permissions
        permissions.push(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        );
      } else {
        // For Android 13+ (API 33+), use granular media permissions
        permissions.push(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        );
      }

      return permissions;
    }
    return [];
  }

  /**
   * Get storage permissions based on Android version
   */
  getStoragePermissions(): string[] {
    if (Platform.OS === 'android') {
      const androidVersion = Platform.Version;

      if (androidVersion < 33) {
        // For older Android versions, use traditional storage permissions
        return [
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ];
      } else {
        // For Android 13+ (API 33+), use granular media permissions
        return [
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        ];
      }
    }
    return [];
  }

  /**
   * Show permission denied alert with option to open settings
   */
  showPermissionDeniedAlert(
    permissionType: string,
    onRetry?: () => void,
    onOpenSettings?: () => void
  ): void {
    Alert.alert(
      'Permission Required',
      `${permissionType} permission is required to use this feature. Please grant permission in settings.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        ...(onRetry ? [{
          text: 'Retry',
          onPress: onRetry,
        }] : []),
        {
          text: 'Open Settings',
          onPress: () => {
            if (onOpenSettings) {
              onOpenSettings();
            } else {
              this.openAppSettings();
            }
          },
        },
      ]
    );
  }

  /**
   * Open app settings
   */
  openAppSettings(): void {
    if (Platform.OS === 'android') {
      Linking.openSettings();
    } else {
      Linking.openURL('app-settings:');
    }
  }

  /**
   * Check if we should show permission rationale
   */
  async shouldShowRequestPermissionRationale(permission: string): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        return await PermissionsAndroid.shouldShowRequestPermissionRationale(permission);
      } catch (error) {
        console.error(`💥 Error checking permission rationale for ${permission}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Get user-friendly permission names
   */
  getPermissionDisplayName(permission: string): string {
    const permissionNames: Record<string, string> = {
      [PermissionsAndroid.PERMISSIONS.CAMERA]: 'Camera',
      [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]: 'Microphone',
      [PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE]: 'Storage',
      [PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE]: 'Storage',
      [PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES]: 'Photos',
      [PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO]: 'Videos',
      [PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO]: 'Audio Files',
    };

    return permissionNames[permission] || permission;
  }
}

// Export singleton instance
export const permissionHelper = new PermissionHelper();
export default permissionHelper;
