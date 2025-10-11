import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}

class PermissionService {
  // Request camera permission
  async requestCameraPermission(): Promise<PermissionResult> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to camera to take photos and videos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        return {
          granted: granted === PermissionsAndroid.RESULTS.GRANTED,
          canAskAgain: granted !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
        };
      } catch (error) {
        console.error('Error requesting camera permission:', error);
        return {
          granted: false,
          canAskAgain: false,
          message: 'Error requesting camera permission',
        };
      }
    }
    
    // iOS permissions are handled automatically
    return { granted: true, canAskAgain: true };
  }

  // Request storage permissions
  async requestStoragePermissions(): Promise<PermissionResult> {
    if (Platform.OS === 'android') {
      try {
        // Check Android version for appropriate permissions
        const androidVersion = Platform.Version;
        let permissionsToRequest: string[] = [];
        
        if (androidVersion >= 33) {
          // Android 13+ (API 33+) - Use new media permissions
          permissionsToRequest = [
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          ];
        } else {
          // Android 12 and below - Use legacy storage permissions
          permissionsToRequest = [
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          ];
        }

        console.log(`🔐 Requesting storage permissions for Android ${androidVersion}:`, permissionsToRequest);
        
        const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
        
        // Check if all requested permissions are granted
        const allGranted = permissionsToRequest.every(permission => 
          granted[permission] === PermissionsAndroid.RESULTS.GRANTED
        );
        
        const canAskAgain = permissionsToRequest.every(permission => 
          granted[permission] !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
        );

        console.log(`🔐 Storage permissions result:`, { allGranted, canAskAgain, granted });

        return {
          granted: allGranted,
          canAskAgain,
          message: !allGranted ? 'Storage permissions are required to access photos and files' : undefined,
        };
      } catch (error) {
        console.error('Error requesting storage permissions:', error);
        return {
          granted: false,
          canAskAgain: false,
          message: 'Error requesting storage permissions',
        };
      }
    }
    
    // iOS permissions are handled automatically
    return { granted: true, canAskAgain: true };
  }

  // Request microphone permission
  async requestMicrophonePermission(): Promise<PermissionResult> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to microphone to record audio',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        return {
          granted: granted === PermissionsAndroid.RESULTS.GRANTED,
          canAskAgain: granted !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
        };
      } catch (error) {
        console.error('Error requesting microphone permission:', error);
        return {
          granted: false,
          canAskAgain: false,
          message: 'Error requesting microphone permission',
        };
      }
    }
    
    // iOS permissions are handled automatically
    return { granted: true, canAskAgain: true };
  }

  // Request gallery permission
  async requestGalleryPermission(): Promise<PermissionResult> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Gallery Permission',
            message: 'This app needs access to save images to your gallery',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        return {
          granted: granted === PermissionsAndroid.RESULTS.GRANTED,
          canAskAgain: granted !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
        };
      } catch (error) {
        console.error('Error requesting gallery permission:', error);
        return {
          granted: false,
          canAskAgain: false,
          message: 'Failed to request gallery permission',
        };
      }
    } else {
      // iOS doesn't need explicit permission for saving to gallery
      return { granted: true, canAskAgain: true };
    }
  }

  // Request all media permissions (camera + storage + microphone)
  async requestAllMediaPermissions(): Promise<{
    camera: PermissionResult;
    storage: PermissionResult;
    microphone: PermissionResult;
    allGranted: boolean;
  }> {
    const [camera, storage, microphone] = await Promise.all([
      this.requestCameraPermission(),
      this.requestStoragePermissions(),
      this.requestMicrophonePermission(),
    ]);

    return {
      camera,
      storage,
      microphone,
      allGranted: camera.granted && storage.granted && microphone.granted,
    };
  }

  // Check if permissions are granted
  async checkPermissions(): Promise<{
    camera: boolean;
    storage: boolean;
    microphone: boolean;
  }> {
    if (Platform.OS === 'android') {
      try {
        const [camera, storage, microphone] = await Promise.all([
          PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA),
          PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE),
          PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO),
        ]);

        return {
          camera,
          storage,
          microphone,
        };
      } catch (error) {
        console.error('Error checking permissions:', error);
        return {
          camera: false,
          storage: false,
          microphone: false,
        };
      }
    }
    
    // iOS permissions are handled automatically
    return {
      camera: true,
      storage: true,
      microphone: true,
    };
  }

  // Show permission denied alert with settings option
  showPermissionDeniedAlert(
    permissionType: 'Camera' | 'Storage' | 'Microphone' | 'All',
    onRetry?: () => void
  ): void {
    const title = `${permissionType} Permission Required`;
    const message = `${permissionType} permission is required to use this feature. Please enable it in Settings.`;
    
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Settings',
          onPress: () => this.openAppSettings(),
        },
        ...(onRetry ? [{
          text: 'Retry',
          onPress: onRetry,
        }] : []),
      ]
    );
  }

  // Open app settings
  async openAppSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening app settings:', error);
    }
  }

  // Request permissions with user-friendly flow
  async requestPermissionsWithFlow(
    requiredPermissions: ('camera' | 'storage' | 'microphone')[],
    onComplete: (result: { allGranted: boolean; permissions: any }) => void
  ): Promise<void> {
    const results: any = {};
    let allGranted = true;

    for (const permission of requiredPermissions) {
      let result: PermissionResult;
      
      switch (permission) {
        case 'camera':
          result = await this.requestCameraPermission();
          break;
        case 'storage':
          result = await this.requestStoragePermissions();
          break;
        case 'microphone':
          result = await this.requestMicrophonePermission();
          break;
        default:
          result = { granted: false, canAskAgain: false };
      }

      results[permission] = result;
      
      if (!result.granted) {
        allGranted = false;
        
        if (!result.canAskAgain) {
          // Permission permanently denied, show settings alert
          this.showPermissionDeniedAlert(
            permission === 'camera' ? 'Camera' : 
            permission === 'storage' ? 'Storage' : 'Microphone',
            () => this.requestPermissionsWithFlow(requiredPermissions, onComplete)
          );
          return;
        }
      }
    }

    onComplete({ allGranted, permissions: results });
  }

  // Get permission status for UI display
  async getPermissionStatus(): Promise<{
    camera: { granted: boolean; canAskAgain: boolean };
    storage: { granted: boolean; canAskAgain: boolean };
    microphone: { granted: boolean; canAskAgain: boolean };
  }> {
    const permissions = await this.checkPermissions();
    
    return {
      camera: {
        granted: permissions.camera,
        canAskAgain: true, // We can't determine this without requesting
      },
      storage: {
        granted: permissions.storage,
        canAskAgain: true,
      },
      microphone: {
        granted: permissions.microphone,
        canAskAgain: true,
      },
    };
  }
}

// Export singleton instance
export const permissionService = new PermissionService();
export default permissionService;

