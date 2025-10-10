import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { manifestPermissionManager } from './manifestPermissionManager';

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
      const permissions = manifestPermissionManager.getCameraPermissions();
      console.log(`📱 Camera permissions from manifest:`, permissions);
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
      const permissions = manifestPermissionManager.getStoragePermissions();
      console.log(`📱 Android version: ${androidVersion}`);
      console.log(`📱 Storage permissions from manifest:`, permissions);
      return permissions;
    }
    return [];
  }

  /**
   * Check if all required permissions are already granted
   */
  async checkAllPermissions(permissions: string[]): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const results = await Promise.all(
          permissions.map(permission => this.checkPermission(permission))
        );
        const allGranted = results.every(granted => granted);
        console.log(`🔍 All permissions granted: ${allGranted}`);
        return allGranted;
      } catch (error) {
        console.error('💥 Error checking all permissions:', error);
        return false;
      }
    }
    return true; // iOS permissions are handled by native pickers
  }

  /**
   * Request permissions only if not already granted
   */
  async requestPermissionsIfNeeded(permissions: string[]): Promise<PermissionResult> {
    if (Platform.OS === 'android') {
      try {
        // Check if all permissions are already granted
        const allGranted = await this.checkAllPermissions(permissions);
        if (allGranted) {
          console.log('✅ All permissions already granted');
          return {
            granted: true,
            permissions: {},
            deniedPermissions: [],
          };
        }

        // Request permissions that are not granted
        console.log('🔐 Some permissions not granted, requesting...');
        return await this.requestMultiplePermissions(permissions);
      } catch (error) {
        console.error('💥 Error requesting permissions if needed:', error);
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
   * Show permission rationale and request permission
   */
  async requestPermissionWithRationale(
    permission: string,
    title: string,
    message: string
  ): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        // Check if we should show rationale
        const shouldShowRationale = await this.shouldShowRequestPermissionRationale(permission);
        
        if (shouldShowRationale) {
          console.log(`💡 Showing rationale for ${permission}`);
          return new Promise((resolve) => {
            Alert.alert(
              title,
              message,
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => resolve(false),
                },
                {
                  text: 'OK',
                  onPress: async () => {
                    const granted = await this.requestPermission(permission);
                    resolve(granted);
                  },
                },
              ]
            );
          });
        } else {
          // Request permission directly
          return await this.requestPermission(permission);
        }
      } catch (error) {
        console.error(`💥 Error requesting permission with rationale for ${permission}:`, error);
        return false;
      }
    }
    return true; // iOS permissions are handled by native pickers
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
   * Get manifest permission summary for debugging
   */
  getManifestSummary(): any {
    return manifestPermissionManager.getManifestSummary();
  }

  /**
   * Get all permission groups from manifest
   */
  getPermissionGroups(): any[] {
    return manifestPermissionManager.getPermissionGroups();
  }

  /**
   * Get user-friendly permission names
   */
  getPermissionDisplayName(permission: string): string {
    return manifestPermissionManager.getPermissionDescription(permission);
  }
}

// Export singleton instance
export const permissionHelper = new PermissionHelper();
export default permissionHelper;
