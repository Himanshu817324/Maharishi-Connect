import { Platform, Alert, Linking } from 'react-native';
import { permissionService, PermissionResult } from './permissionService';

export interface FileSharingPermissions {
  camera: boolean;
  storage: boolean;
  microphone: boolean;
  fileAccess: boolean;
  allGranted: boolean;
}

export interface PermissionRequestResult {
  success: boolean;
  permissions: FileSharingPermissions;
  deniedPermissions: string[];
  canAskAgain: boolean;
}

class FileSharingPermissionManager {
  private permissionCache: FileSharingPermissions | null = null;
  private lastCheckTime: number = 0;
  private CACHE_DURATION = 30000; // 30 seconds

  /**
   * Check all file sharing permissions
   */
  async checkFileSharingPermissions(): Promise<FileSharingPermissions> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.permissionCache && (now - this.lastCheckTime) < this.CACHE_DURATION) {
      console.log('🔐 Using cached permission results');
      return this.permissionCache;
    }

    console.log('🔐 Checking file sharing permissions...');

    try {
      const [camera, storage, microphone, fileAccess] = await Promise.all([
        this.checkCameraPermission(),
        this.checkStoragePermission(),
        this.checkMicrophonePermission(),
        this.checkFileAccessPermission(),
      ]);

      const permissions: FileSharingPermissions = {
        camera,
        storage,
        microphone,
        fileAccess,
        allGranted: camera && storage && microphone && fileAccess,
      };

      // Cache the results
      this.permissionCache = permissions;
      this.lastCheckTime = now;

      console.log('🔐 Permission check results:', permissions);
      return permissions;
    } catch (error) {
      console.error('Error checking file sharing permissions:', error);
      return {
        camera: false,
        storage: false,
        microphone: false,
        fileAccess: false,
        allGranted: false,
      };
    }
  }

  /**
   * Request all file sharing permissions
   */
  async requestFileSharingPermissions(): Promise<PermissionRequestResult> {
    console.log('🔐 Requesting all file sharing permissions...');

    try {
      const [cameraResult, storageResult, microphoneResult, fileAccessResult] = await Promise.all([
        permissionService.requestCameraPermission(),
        permissionService.requestStoragePermissions(),
        permissionService.requestMicrophonePermission(),
        permissionService.requestFileAccessPermissions(),
      ]);

      const permissions: FileSharingPermissions = {
        camera: cameraResult.granted,
        storage: storageResult.granted,
        microphone: microphoneResult.granted,
        fileAccess: fileAccessResult.granted,
        allGranted: cameraResult.granted && storageResult.granted && microphoneResult.granted && fileAccessResult.granted,
      };

      const deniedPermissions: string[] = [];
      if (!cameraResult.granted) deniedPermissions.push('camera');
      if (!storageResult.granted) deniedPermissions.push('storage');
      if (!microphoneResult.granted) deniedPermissions.push('microphone');
      if (!fileAccessResult.granted) deniedPermissions.push('fileAccess');

      const canAskAgain = cameraResult.canAskAgain && storageResult.canAskAgain && 
                         microphoneResult.canAskAgain && fileAccessResult.canAskAgain;

      // Update cache
      this.permissionCache = permissions;
      this.lastCheckTime = Date.now();

      console.log('🔐 Permission request results:', {
        success: permissions.allGranted,
        permissions,
        deniedPermissions,
        canAskAgain,
      });

      return {
        success: permissions.allGranted,
        permissions,
        deniedPermissions,
        canAskAgain,
      };
    } catch (error) {
      console.error('Error requesting file sharing permissions:', error);
      return {
        success: false,
        permissions: {
          camera: false,
          storage: false,
          microphone: false,
          fileAccess: false,
          allGranted: false,
        },
        deniedPermissions: ['camera', 'storage', 'microphone', 'fileAccess'],
        canAskAgain: false,
      };
    }
  }

  /**
   * Request specific permissions for a file type
   */
  async requestPermissionsForFileType(fileType: 'image' | 'video' | 'audio' | 'file'): Promise<PermissionRequestResult> {
    console.log(`🔐 Requesting permissions for file type: ${fileType}`);

    const requiredPermissions: string[] = [];
    const permissionRequests: Promise<PermissionResult>[] = [];

    // Determine required permissions based on file type
    switch (fileType) {
      case 'image':
        requiredPermissions.push('camera', 'storage');
        permissionRequests.push(
          permissionService.requestCameraPermission(),
          permissionService.requestStoragePermissions()
        );
        break;
      case 'video':
        requiredPermissions.push('camera', 'storage', 'microphone');
        permissionRequests.push(
          permissionService.requestCameraPermission(),
          permissionService.requestStoragePermissions(),
          permissionService.requestMicrophonePermission()
        );
        break;
      case 'audio':
        requiredPermissions.push('microphone', 'fileAccess');
        permissionRequests.push(
          permissionService.requestMicrophonePermission(),
          permissionService.requestFileAccessPermissions()
        );
        break;
      case 'file':
        requiredPermissions.push('fileAccess');
        permissionRequests.push(
          permissionService.requestFileAccessPermissions()
        );
        break;
    }

    try {
      const results = await Promise.all(permissionRequests);
      
      const permissions: FileSharingPermissions = {
        camera: fileType === 'image' || fileType === 'video' ? results[0].granted : true,
        storage: fileType === 'image' || fileType === 'video' ? 
          (fileType === 'video' ? results[1].granted : results[1].granted) : true,
        microphone: fileType === 'video' ? results[2].granted : 
          (fileType === 'audio' ? results[1].granted : true),
        fileAccess: fileType === 'file' ? results[0].granted : 
          (fileType === 'audio' ? results[1].granted : true),
        allGranted: results.every(result => result.granted),
      };

      const deniedPermissions: string[] = [];
      results.forEach((result, index) => {
        if (!result.granted) {
          deniedPermissions.push(requiredPermissions[index]);
        }
      });

      const canAskAgain = results.every(result => result.canAskAgain);

      console.log(`🔐 Permissions for ${fileType}:`, {
        success: permissions.allGranted,
        permissions,
        deniedPermissions,
        canAskAgain,
      });

      return {
        success: permissions.allGranted,
        permissions,
        deniedPermissions,
        canAskAgain,
      };
    } catch (error) {
      console.error(`Error requesting permissions for ${fileType}:`, error);
      return {
        success: false,
        permissions: {
          camera: false,
          storage: false,
          microphone: false,
          fileAccess: false,
          allGranted: false,
        },
        deniedPermissions: requiredPermissions,
        canAskAgain: false,
      };
    }
  }

  /**
   * Show permission denied alert with specific guidance
   */
  showPermissionDeniedAlert(
    deniedPermissions: string[],
    onRetry?: () => void,
    onSettings?: () => void
  ): void {
    const permissionNames = deniedPermissions.map(perm => {
      switch (perm) {
        case 'camera': return 'Camera';
        case 'storage': return 'Storage';
        case 'microphone': return 'Microphone';
        case 'fileAccess': return 'File Access';
        default: return perm;
      }
    });

    const title = 'Permissions Required';
    const message = `The following permissions are required to share files:\n\n• ${permissionNames.join('\n• ')}\n\nPlease enable these permissions in Settings to continue.`;

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
          onPress: () => {
            if (onSettings) {
              onSettings();
            } else {
              this.openAppSettings();
            }
          },
        },
        ...(onRetry ? [{
          text: 'Retry',
          onPress: onRetry,
        }] : []),
      ]
    );
  }

  /**
   * Show permission explanation for specific file type
   */
  showFileTypePermissionExplanation(fileType: 'image' | 'video' | 'audio' | 'file'): void {
    let title = '';
    let message = '';

    switch (fileType) {
      case 'image':
        title = 'Camera & Gallery Access';
        message = 'To share images, we need access to your camera to take photos and your gallery to select existing images.';
        break;
      case 'video':
        title = 'Camera, Gallery & Microphone Access';
        message = 'To share videos, we need access to your camera to record videos, your gallery to select existing videos, and your microphone for audio recording.';
        break;
      case 'audio':
        title = 'Microphone & File Access';
        message = 'To share audio files, we need access to your microphone to record audio and file access to select existing audio files.';
        break;
      case 'file':
        title = 'File Access';
        message = 'To share documents and other files, we need access to your device storage to select files.';
        break;
    }

    Alert.alert(title, message, [
      { text: 'OK', style: 'default' },
    ]);
  }

  /**
   * Open app settings
   */
  async openAppSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening app settings:', error);
    }
  }

  /**
   * Clear permission cache
   */
  clearCache(): void {
    this.permissionCache = null;
    this.lastCheckTime = 0;
    console.log('🔐 Permission cache cleared');
  }

  /**
   * Private helper methods
   */
  private async checkCameraPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const { PermissionsAndroid } = require('react-native');
        return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      } catch (error) {
        console.error('Error checking camera permission:', error);
        return false;
      }
    }
    return true; // iOS handles this automatically
  }

  private async checkStoragePermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const { PermissionsAndroid } = require('react-native');
        const androidVersion = Platform.Version;
        
        if (androidVersion >= 33) {
          // Check new media permissions
          const [images, videos, audio] = await Promise.all([
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES),
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO),
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO),
          ]);
          return images && videos && audio;
        } else {
          // Check legacy storage permissions
          const [read, write] = await Promise.all([
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE),
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE),
          ]);
          return read && write;
        }
      } catch (error) {
        console.error('Error checking storage permission:', error);
        return false;
      }
    }
    return true; // iOS handles this automatically
  }

  private async checkMicrophonePermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const { PermissionsAndroid } = require('react-native');
        return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      } catch (error) {
        console.error('Error checking microphone permission:', error);
        return false;
      }
    }
    return true; // iOS handles this automatically
  }

  private async checkFileAccessPermission(): Promise<boolean> {
    // File access permission is the same as storage permission
    return this.checkStoragePermission();
  }
}

export const fileSharingPermissionManager = new FileSharingPermissionManager();
export default fileSharingPermissionManager;
