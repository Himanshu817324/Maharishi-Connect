import { lightweightImagePicker } from './lightweightImagePicker';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import { permissionService } from './permissionService';
import { permissionHelper } from './permissionHelper';

// Dynamic import for DocumentPicker to handle cases where it's not available
let DocumentPicker: any = null;
let types: any = null;

try {
  const documentPickerModule = require('@react-native-documents/picker');
  DocumentPicker = documentPickerModule.default || documentPickerModule;
  types = documentPickerModule.types;
  console.log('📁 DocumentPicker module loaded successfully');
} catch (error) {
  console.warn('⚠️ DocumentPicker module not available:', error);
}

export interface MediaFile {
  uri: string;
  name: string;
  type: string;
  size: number;
  duration?: number; // For videos and audio
  width?: number; // For images and videos
  height?: number; // For images and videos
}

export interface MediaPickerResult {
  success: boolean;
  files: MediaFile[];
  error?: string;
}

export type MediaType = 'image' | 'video' | 'audio' | 'file' | 'camera';

class MediaService {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024;

  /**
   * Check if DocumentPicker is available and provide helpful error messages
   */
  private checkDocumentPickerAvailability(): { available: boolean; error?: string } {
    if (!DocumentPicker) {
      return {
        available: false,
        error: 'DocumentPicker module not found. Please ensure @react-native-documents/picker is properly installed and linked.'
      };
    }

    if (!DocumentPicker.pick) {
      return {
        available: false,
        error: 'DocumentPicker.pick method not available. The native module may not be properly linked. Please rebuild the app.'
      };
    }

    if (!types) {
      return {
        available: false,
        error: 'DocumentPicker types not available. Please check the package installation.'
      };
    }

    return { available: true };
  }

  // 50MB
  private readonly SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/3gpp'];
  private readonly SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'audio/aac'];

  /**
   * Request necessary permissions for media operations
   */
  private async requestPermissions(type: MediaType): Promise<boolean> {
    try {
      console.log(`🔐 Requesting permissions for: ${type}`);
      
      switch (type) {
        case 'image':
        case 'video':
        case 'camera':
          return await this.requestCameraPermissions();
        case 'audio':
        case 'file':
          return await this.requestStoragePermissions();
        default:
          return true;
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  private async requestCameraPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      console.log('🔐 Requesting camera permissions for Android...');
      
      const permissions = permissionHelper.getCameraPermissions();
      console.log('🔐 Required camera permissions:', permissions);
      
      const result = await permissionHelper.requestPermissionsIfNeeded(permissions);
      
      if (!result.granted) {
        console.warn('⚠️ Some camera permissions were denied:', result.deniedPermissions);
        
        // Show user-friendly error message
        const deniedNames = result.deniedPermissions.map(p => permissionHelper.getPermissionDisplayName(p));
        Alert.alert(
          'Camera Permission Required',
          `Camera permission is required to take photos and videos. The following permissions are needed: ${deniedNames.join(', ')}. Please grant these permissions in settings.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => permissionHelper.openAppSettings() },
          ]
        );
      }
      
      return result.granted;
    }
    return true; // iOS permissions are handled by the picker libraries
  }

  private async requestStoragePermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      console.log('🔐 Requesting storage permissions for Android...');
      
      const permissions = permissionHelper.getStoragePermissions();
      console.log('🔐 Required storage permissions:', permissions);
      
      const result = await permissionHelper.requestPermissionsIfNeeded(permissions);
      
      if (!result.granted) {
        console.warn('⚠️ Some storage permissions were denied:', result.deniedPermissions);
        
        // Check if any permissions were set to "never ask again"
        if (result.neverAskAgainPermissions && result.neverAskAgainPermissions.length > 0) {
          console.warn('⚠️ Some permissions set to NEVER_ASK_AGAIN:', result.neverAskAgainPermissions);
          permissionHelper.showNeverAskAgainAlert(result.neverAskAgainPermissions);
        } else {
          // Show user-friendly error message for regular denials
          const deniedNames = result.deniedPermissions.map(p => permissionHelper.getPermissionDisplayName(p));
          Alert.alert(
            'Storage Permission Required',
            `Storage permission is required to access files. The following permissions are needed: ${deniedNames.join(', ')}. Please grant these permissions in settings.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => permissionHelper.openAppSettings() },
            ]
          );
        }
      }
      
      return result.granted;
    }
    return true; // iOS permissions are handled by the picker libraries
  }

  /**
   * Pick multiple images from gallery
   */
  async pickImages(maxCount: number = 10): Promise<MediaPickerResult> {
    try {
      console.log(`📸 Picking images (max: ${maxCount})`);
      
      const hasPermission = await this.requestPermissions('image');
      if (!hasPermission) {
        console.error('❌ Permission denied for image picking');
        return {
          success: false,
          files: [],
          error: 'Permission is required to access photos. Please grant permission in settings.'
        };
      }
      
      console.log('✅ Permissions granted for image picking');

      // Use lightweight image picker instead of react-native-image-picker
      return await lightweightImagePicker.pickImages(maxCount);
    } catch (error) {
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Failed to pick images'
      };
    }
  }

  /**
   * Pick videos from gallery
   */
  async pickVideos(maxCount: number = 5): Promise<MediaPickerResult> {
    try {
      const hasPermission = await this.requestPermissions('video');
      if (!hasPermission) {
        return {
          success: false,
          files: [],
          error: 'Storage permission is required to access videos'
        };
      }

      // Use lightweight image picker instead of react-native-image-picker
      return await lightweightImagePicker.pickVideos(maxCount);
    } catch (error) {
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Failed to pick videos'
      };
    }
  }

  /**
   * Pick audio files
   */
  async pickAudioFiles(maxCount: number = 5): Promise<MediaPickerResult> {
    try {
      console.log('🎵 Starting audio file picker...');
      
      const hasPermission = await this.requestPermissions('audio');
      if (!hasPermission) {
        return {
          success: false,
          files: [],
          error: 'Storage permission is required to access audio files'
        };
      }

      console.log('🎵 DocumentPicker available:', !!DocumentPicker);
      console.log('🎵 DocumentPicker.pick available:', !!DocumentPicker?.pick);
      console.log('🎵 types available:', !!types);

      // Check if DocumentPicker is available
      const availability = this.checkDocumentPickerAvailability();
      if (!availability.available) {
        console.warn('DocumentPicker not available for audio:', availability.error);
        console.log('Trying fallback method...');
        return await this.pickAudioFilesFallback(maxCount);
      }

      const result = await DocumentPicker.pick({
        type: [types?.audio || 'audio/*'],
        allowMultiSelection: maxCount > 1,
        copyTo: 'cachesDirectory',
      });

      if (result && result.length > 0) {
        const files: MediaFile[] = result
          .map(doc => ({
            uri: doc.uri,
            name: doc.name || 'Unknown',
            type: doc.type || 'audio/mpeg',
            size: doc.size || 0,
          }))
          .filter(file => this.validateFile(file, 'audio'));

        return { success: true, files };
      } else {
        return { success: false, files: [], error: 'No audio files selected' };
      }
    } catch (error) {
      console.error('Audio file picker error:', error);
      
      if (error && typeof error === 'object' && 'code' in error && error.code === 'DOCUMENT_PICKER_CANCELED') {
        return { success: false, files: [], error: 'User cancelled' };
      }
      
      // Try fallback method if DocumentPicker fails
      console.log('Audio DocumentPicker failed, trying fallback...');
      return await this.pickAudioFilesFallback(maxCount);
    }
  }

  /**
   * Fallback method for audio file selection using image picker
   */
  private async pickAudioFilesFallback(maxCount: number = 5): Promise<MediaPickerResult> {
    try {
      console.log('🎵 Using fallback audio picker (image picker)...');
      
      const result = await launchImageLibrary({
        mediaType: 'video' as RNMediaType, // Use video to potentially access audio files
        quality: 0.8,
        includeBase64: false,
        selectionLimit: maxCount,
      });

      if (result.assets && result.assets.length > 0) {
        const files: MediaFile[] = result.assets
          .filter(asset => {
            const type = asset.type || '';
            return type.startsWith('audio/') || type.startsWith('video/');
          })
          .map(asset => ({
            uri: asset.uri || '',
            name: asset.fileName || asset.uri?.split('/').pop() || 'Unknown',
            type: asset.type || 'audio/mpeg',
            size: asset.fileSize || 0,
            duration: asset.duration,
            width: asset.width,
            height: asset.height,
          }))
          .filter(file => this.validateFile(file, 'audio'));

        return { success: true, files };
      } else {
        return { success: false, files: [], error: 'No audio files selected' };
      }
    } catch (error) {
      console.error('Fallback audio picker error:', error);
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Failed to pick audio files'
      };
    }
  }

  /**
   * Pick any file type with fallback options
   */
  async pickFiles(maxCount: number = 5): Promise<MediaPickerResult> {
    try {
      console.log('📁 Starting file picker...');
      
      const hasPermission = await this.requestPermissions('file');
      if (!hasPermission) {
        return {
          success: false,
          files: [],
          error: 'Storage permission is required to access files'
        };
      }

      // Check if DocumentPicker is available
      const availability = this.checkDocumentPickerAvailability();
      if (!availability.available) {
        console.warn('DocumentPicker not available:', availability.error);
        console.log('Trying fallback method...');
        return await this.pickFilesFallback(maxCount);
      }

      console.log('📁 DocumentPicker available:', !!DocumentPicker);
      console.log('📁 DocumentPicker.pick available:', !!DocumentPicker?.pick);
      console.log('📁 types available:', !!types);

      const result = await DocumentPicker.pick({
        type: [types?.allFiles || '*/*'],
        allowMultiSelection: maxCount > 1,
        copyTo: 'cachesDirectory',
      });

      if (result && result.length > 0) {
        const files: MediaFile[] = result
          .map(doc => ({
            uri: doc.uri,
            name: doc.name || 'Unknown',
            type: doc.type || 'application/octet-stream',
            size: doc.size || 0,
          }))
          .filter(file => this.validateFile(file, 'file'));

        return { success: true, files };
      } else {
        return { success: false, files: [], error: 'No files selected' };
      }
    } catch (error) {
      console.error('DocumentPicker error:', error);
      
      if (error && typeof error === 'object' && 'code' in error && error.code === 'DOCUMENT_PICKER_CANCELED') {
        return { success: false, files: [], error: 'User cancelled' };
      }
      
      // Try fallback method if DocumentPicker fails
      console.log('DocumentPicker failed, trying fallback...');
      return await this.pickFilesFallback(maxCount);
    }
  }

  /**
   * Fallback method using react-native-image-picker for file selection
   */
  private async pickFilesFallback(maxCount: number = 5): Promise<MediaPickerResult> {
    try {
      console.log('📁 Using fallback file picker (image picker)...');
      
      const result = await launchImageLibrary({
        mediaType: 'mixed' as RNMediaType,
        quality: 0.8,
        includeBase64: false,
        selectionLimit: maxCount,
      });

      if (result.assets && result.assets.length > 0) {
        const files: MediaFile[] = result.assets
          .map(asset => ({
            uri: asset.uri || '',
            name: asset.fileName || asset.uri?.split('/').pop() || 'Unknown',
            type: asset.type || 'application/octet-stream',
            size: asset.fileSize || 0,
            width: asset.width,
            height: asset.height,
          }))
          .filter(file => this.validateFile(file, 'file'));

        return { success: true, files };
      } else {
        return { success: false, files: [], error: 'No files selected' };
      }
    } catch (error) {
      console.error('Fallback file picker error:', error);
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Failed to pick files'
      };
    }
  }

  /**
   * Take photo with camera
   */
  async takePhoto(): Promise<MediaPickerResult> {
    try {
      const hasPermission = await this.requestPermissions('camera');
      if (!hasPermission) {
        return {
          success: false,
          files: [],
          error: 'Camera permission is required to take photos'
        };
      }

      // Use lightweight image picker instead of react-native-image-picker
      return await lightweightImagePicker.takePhoto();

    } catch (error) {
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Failed to take photo'
      };
    }
  }

  /**
   * Record video with camera
   */
  async recordVideo(): Promise<MediaPickerResult> {
    try {
      const hasPermission = await this.requestPermissions('camera');
      if (!hasPermission) {
        return {
          success: false,
          files: [],
          error: 'Camera permission is required to record videos'
        };
      }

      const options: CameraOptions = {
        mediaType: 'video' as RNMediaType,
        quality: 0.8 as PhotoQuality,
        includeBase64: false,
        cameraType: 'back' as CameraType,
        saveToPhotos: true,
        videoQuality: 'high',
        maxWidth: 1920,
        maxHeight: 1080,
      };

      return new Promise((resolve) => {
        launchCamera(options, (response: ImagePickerResponse) => {
          if (response.didCancel) {
            resolve({ success: false, files: [], error: 'User cancelled' });
            return;
          }

          if (response.errorMessage) {
            resolve({ success: false, files: [], error: response.errorMessage });
            return;
          }

          if (response.assets && response.assets.length > 0) {
            const asset = response.assets[0];
            if (asset.uri && asset.fileName && asset.type) {
              const file: MediaFile = {
                uri: asset.uri,
                name: asset.fileName,
                type: asset.type,
                size: asset.fileSize || 0,
                duration: asset.duration,
                width: asset.width,
                height: asset.height,
              };

              if (this.validateFile(file, 'video')) {
                resolve({ success: true, files: [file] });
              } else {
                resolve({ success: false, files: [], error: 'Invalid video file' });
              }
            } else {
              resolve({ success: false, files: [], error: 'Invalid video data' });
            }
          } else {
            resolve({ success: false, files: [], error: 'No video recorded' });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Failed to record video'
      };
    }
  }

  /**
   * Validate file based on type and size
   */
  private validateFile(file: MediaFile, expectedType: MediaType): boolean {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      Alert.alert(
        'File Too Large',
        `File size ${this.formatFileSize(file.size)} exceeds maximum allowed size ${this.formatFileSize(this.MAX_FILE_SIZE)}`
      );
      return false;
    }

    // Check file type
    switch (expectedType) {
      case 'image':
        return this.SUPPORTED_IMAGE_TYPES.includes(file.type);
      case 'video':
        return this.SUPPORTED_VIDEO_TYPES.includes(file.type);
      case 'audio':
        return this.SUPPORTED_AUDIO_TYPES.includes(file.type);
      case 'file':
        return true; // Accept all file types
      default:
        return false;
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file is an image
   */
  isImageFile(file: MediaFile): boolean {
    return this.SUPPORTED_IMAGE_TYPES.includes(file.type);
  }

  /**
   * Check if file is a video
   */
  isVideoFile(file: MediaFile): boolean {
    return this.SUPPORTED_VIDEO_TYPES.includes(file.type);
  }

  /**
   * Check if file is an audio file
   */
  isAudioFile(file: MediaFile): boolean {
    return this.SUPPORTED_AUDIO_TYPES.includes(file.type);
  }
}

// Export singleton instance
export const mediaService = new MediaService();
export default mediaService;
