import { Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}

class PermissionService {
  // Request camera permission
  async requestCameraPermission(): Promise<PermissionResult> {
    try {
      console.log('🔐 Requesting camera permission...');
      
      const permission: Permission = Platform.OS === 'android' 
        ? PERMISSIONS.ANDROID.CAMERA 
        : PERMISSIONS.IOS.CAMERA;
      
      // First check if permission is already granted
      const currentStatus = await check(permission);
      console.log('🔐 Current camera permission status:', currentStatus);
      
      if (currentStatus === RESULTS.GRANTED) {
        console.log('✅ Camera permission already granted');
        return { granted: true, canAskAgain: true };
      }
      
      if (currentStatus === RESULTS.DENIED) {
        console.log('📱 Requesting camera permission...');
        const result = await request(permission);
        console.log('🔐 Camera permission request result:', result);
        
        const isGranted = result === RESULTS.GRANTED;
        const canAskAgain = result !== RESULTS.BLOCKED && result !== RESULTS.UNAVAILABLE;
        
        console.log('🔐 Camera permission final result:', { isGranted, canAskAgain });

        return {
          granted: isGranted,
          canAskAgain,
          message: !isGranted ? 'Camera permission is required to take photos' : undefined,
        };
      }
      
      // Permission is blocked or unavailable
      console.log('❌ Camera permission is blocked or unavailable:', currentStatus);
      return {
        granted: false,
        canAskAgain: currentStatus === RESULTS.BLOCKED ? false : true,
        message: 'Camera permission is required to take photos',
      };
    } catch (error) {
      console.error('❌ Error requesting camera permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        message: 'Error requesting camera permission',
      };
    }
  }

  // Request storage permissions
  async requestStoragePermissions(): Promise<PermissionResult> {
    try {
      console.log('🔐 Requesting storage permissions...');
      
      let permissions: Permission[] = [];
      
      if (Platform.OS === 'android') {
        const androidVersion = Platform.Version;
        
        if (androidVersion >= 33) {
          // Android 13+ (API 33+) - Use new media permissions
          permissions = [
            PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
            PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
            PERMISSIONS.ANDROID.READ_MEDIA_AUDIO,
          ];
        } else {
          // Android 12 and below - Use legacy storage permissions
          permissions = [
            PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
            PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
          ];
        }
      } else {
        // iOS permissions
        permissions = [
          PERMISSIONS.IOS.PHOTO_LIBRARY,
          PERMISSIONS.IOS.CAMERA,
        ];
      }

      console.log(`🔐 Requesting storage permissions for ${Platform.OS}:`, permissions);
      
      // Check current status of all permissions
      const checkResults = await Promise.all(
        permissions.map(permission => check(permission))
      );
      
      console.log('🔐 Current storage permission statuses:', checkResults);
      
      const alreadyGranted = checkResults.every(status => status === RESULTS.GRANTED);
      if (alreadyGranted) {
        console.log('✅ Storage permissions already granted');
        return { granted: true, canAskAgain: true };
      }
      
      // Request permissions that are not granted
      const requestPromises = permissions.map(async (permission, index) => {
        const currentStatus = checkResults[index];
        if (currentStatus === RESULTS.DENIED) {
          console.log(`📱 Requesting permission: ${permission}`);
          return await request(permission);
        }
        return currentStatus;
      });
      
      const results = await Promise.all(requestPromises);
      console.log('🔐 Storage permission request results:', results);
      
      const allGranted = results.every(result => result === RESULTS.GRANTED);
      const canAskAgain = results.every(result => 
        result !== RESULTS.BLOCKED && result !== RESULTS.UNAVAILABLE
      );

      console.log(`🔐 Storage permissions final result:`, { allGranted, canAskAgain });

      return {
        granted: allGranted,
        canAskAgain,
        message: !allGranted ? 'Storage permissions are required to access photos and files' : undefined,
      };
    } catch (error) {
      console.error('❌ Error requesting storage permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        message: 'Error requesting storage permissions',
      };
    }
  }

  // Request file access permissions (for document picker)
  async requestFileAccessPermissions(): Promise<PermissionResult> {
    try {
      console.log('🔐 Requesting file access permissions...');
      
      let permissions: Permission[] = [];
      
      if (Platform.OS === 'android') {
        const androidVersion = Platform.Version;
        
        if (androidVersion >= 33) {
          // Android 13+ - Use new media permissions for all file types
          permissions = [
            PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
            PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
            PERMISSIONS.ANDROID.READ_MEDIA_AUDIO,
          ];
        } else {
          // Android 12 and below - Use legacy storage permissions
          permissions = [
            PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
            PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
          ];
        }
      } else {
        // iOS permissions
        permissions = [
          PERMISSIONS.IOS.PHOTO_LIBRARY,
        ];
      }

      console.log(`🔐 Requesting file access permissions for ${Platform.OS}:`, permissions);
      
      // Check current status of all permissions
      const checkResults = await Promise.all(
        permissions.map(permission => check(permission))
      );
      
      console.log('🔐 Current file access permission statuses:', checkResults);
      
      const alreadyGranted = checkResults.every(status => status === RESULTS.GRANTED);
      if (alreadyGranted) {
        console.log('✅ File access permissions already granted');
        return { granted: true, canAskAgain: true };
      }
      
      // Request permissions that are not granted
      const requestPromises = permissions.map(async (permission, index) => {
        const currentStatus = checkResults[index];
        if (currentStatus === RESULTS.DENIED) {
          console.log(`📱 Requesting permission: ${permission}`);
          return await request(permission);
        }
        return currentStatus;
      });
      
      const results = await Promise.all(requestPromises);
      console.log('🔐 File access permission request results:', results);
      
      const allGranted = results.every(result => result === RESULTS.GRANTED);
      const canAskAgain = results.every(result => 
        result !== RESULTS.BLOCKED && result !== RESULTS.UNAVAILABLE
      );

      console.log(`🔐 File access permissions final result:`, { allGranted, canAskAgain });

      return {
        granted: allGranted,
        canAskAgain,
        message: !allGranted ? 'File access permissions are required to select and share files' : undefined,
      };
    } catch (error) {
      console.error('❌ Error requesting file access permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        message: 'Error requesting file access permissions',
      };
    }
  }

  // Request microphone permission
  async requestMicrophonePermission(): Promise<PermissionResult> {
    try {
      console.log('🔐 Requesting microphone permission...');
      
      const permission: Permission = Platform.OS === 'android' 
        ? PERMISSIONS.ANDROID.RECORD_AUDIO 
        : PERMISSIONS.IOS.MICROPHONE;
      
      // First check if permission is already granted
      const currentStatus = await check(permission);
      console.log('🔐 Current microphone permission status:', currentStatus);
      
      if (currentStatus === RESULTS.GRANTED) {
        console.log('✅ Microphone permission already granted');
        return { granted: true, canAskAgain: true };
      }
      
      if (currentStatus === RESULTS.DENIED) {
        console.log('📱 Requesting microphone permission...');
        const result = await request(permission);
        console.log('🔐 Microphone permission request result:', result);
        
        const isGranted = result === RESULTS.GRANTED;
        const canAskAgain = result !== RESULTS.BLOCKED && result !== RESULTS.UNAVAILABLE;
        
        console.log('🔐 Microphone permission final result:', { isGranted, canAskAgain });

        return {
          granted: isGranted,
          canAskAgain,
          message: !isGranted ? 'Microphone permission is required to record audio' : undefined,
        };
      }
      
      // Permission is blocked or unavailable
      console.log('❌ Microphone permission is blocked or unavailable:', currentStatus);
      return {
        granted: false,
        canAskAgain: currentStatus === RESULTS.BLOCKED ? false : true,
        message: 'Microphone permission is required to record audio',
      };
    } catch (error) {
      console.error('❌ Error requesting microphone permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        message: 'Error requesting microphone permission',
      };
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
    try {
      const cameraPermission: Permission = Platform.OS === 'android' 
        ? PERMISSIONS.ANDROID.CAMERA 
        : PERMISSIONS.IOS.CAMERA;
      
      const storagePermission: Permission = Platform.OS === 'android' 
        ? PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE 
        : PERMISSIONS.IOS.PHOTO_LIBRARY;
      
      const microphonePermission: Permission = Platform.OS === 'android' 
        ? PERMISSIONS.ANDROID.RECORD_AUDIO 
        : PERMISSIONS.IOS.MICROPHONE;

      const [camera, storage, microphone] = await Promise.all([
        check(cameraPermission),
        check(storagePermission),
        check(microphonePermission),
      ]);

      return {
        camera: camera === RESULTS.GRANTED,
        storage: storage === RESULTS.GRANTED,
        microphone: microphone === RESULTS.GRANTED,
      };
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      return {
        camera: false,
        storage: false,
        microphone: false,
      };
    }
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
    try {
      const cameraPermission: Permission = Platform.OS === 'android' 
        ? PERMISSIONS.ANDROID.CAMERA 
        : PERMISSIONS.IOS.CAMERA;
      
      const storagePermission: Permission = Platform.OS === 'android' 
        ? PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE 
        : PERMISSIONS.IOS.PHOTO_LIBRARY;
      
      const microphonePermission: Permission = Platform.OS === 'android' 
        ? PERMISSIONS.ANDROID.RECORD_AUDIO 
        : PERMISSIONS.IOS.MICROPHONE;

      const [camera, storage, microphone] = await Promise.all([
        check(cameraPermission),
        check(storagePermission),
        check(microphonePermission),
      ]);

      return {
        camera: {
          granted: camera === RESULTS.GRANTED,
          canAskAgain: camera !== RESULTS.BLOCKED && camera !== RESULTS.UNAVAILABLE,
        },
        storage: {
          granted: storage === RESULTS.GRANTED,
          canAskAgain: storage !== RESULTS.BLOCKED && storage !== RESULTS.UNAVAILABLE,
        },
        microphone: {
          granted: microphone === RESULTS.GRANTED,
          canAskAgain: microphone !== RESULTS.BLOCKED && microphone !== RESULTS.UNAVAILABLE,
        },
      };
    } catch (error) {
      console.error('❌ Error getting permission status:', error);
      return {
        camera: { granted: false, canAskAgain: false },
        storage: { granted: false, canAskAgain: false },
        microphone: { granted: false, canAskAgain: false },
      };
    }
  }
}

// Export singleton instance
export const permissionService = new PermissionService();
export default permissionService;

