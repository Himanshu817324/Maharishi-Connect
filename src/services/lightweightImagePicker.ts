// Lightweight image picker service
// This is a simplified version that can be extended based on needs

import { Alert, Platform } from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { permissionService } from './permissionService';

export interface ImagePickerResult {
  success: boolean;
  files: Array<{
    uri: string;
    name: string;
    size: number;
    type: string;
  }>;
  error?: string;
}

class LightweightImagePicker {
  // Simplified image picker that uses native capabilities
  async pickImages(maxCount: number = 1): Promise<ImagePickerResult> {
    try {
      console.log(`📸 Starting image picker for ${Platform.OS} ${Platform.Version}`);
      
      if (Platform.OS === 'web') {
        return this.pickImagesWeb(maxCount);
      }
      
      // For Android 13+, react-native-image-picker handles permissions internally
      // For older versions, we still need to check storage permissions
      if (Platform.OS === 'android' && Platform.Version < 33) {
        console.log('🔐 Checking storage permissions for Android < 13');
        const storagePermission = await permissionService.requestStoragePermissions();
        if (!storagePermission.granted) {
          console.log('❌ Storage permission denied');
          return {
            success: false,
            files: [],
            error: 'Storage permission is required to access photos'
          };
        }
        console.log('✅ Storage permission granted');
      } else {
        console.log('🔐 Skipping storage permission check for Android 13+ or iOS');
      }
      
      // Use react-native-image-picker for native platforms
      return new Promise((resolve) => {
        const options = {
          mediaType: 'photo' as MediaType,
          quality: 0.8,
          maxWidth: 1024,
          maxHeight: 1024,
          selectionLimit: maxCount,
        };

        launchImageLibrary(options, (response: ImagePickerResponse) => {
          if (response.didCancel) {
            resolve({
              success: false,
              files: [],
              error: 'User cancelled image selection'
            });
            return;
          }

          if (response.errorMessage) {
            console.error('Image picker error:', response.errorMessage);
            resolve({
              success: false,
              files: [],
              error: response.errorMessage.includes('permission') 
                ? 'Permission denied. Please allow access to photos in app settings.'
                : response.errorMessage
            });
            return;
          }

          if (response.assets && response.assets.length > 0) {
            const files = response.assets.map(asset => ({
              uri: asset.uri || '',
              name: asset.fileName || `image_${Date.now()}.jpg`,
              size: asset.fileSize || 0,
              type: asset.type || 'image/jpeg',
            }));

            resolve({
              success: true,
              files: files
            });
          } else {
            resolve({
              success: false,
              files: [],
              error: 'No images selected'
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async pickImagesWeb(maxCount: number): Promise<ImagePickerResult> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = maxCount > 1;
      
      input.onchange = (event) => {
        const files = Array.from((event.target as HTMLInputElement).files || []);
        const result: ImagePickerResult = {
          success: true,
          files: files.map(file => ({
            uri: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            type: file.type,
          }))
        };
        resolve(result);
      };
      
      input.click();
    });
  }

  // Camera capture (simplified)
  async takePhoto(): Promise<ImagePickerResult> {
    try {
      console.log(`📷 Starting camera for ${Platform.OS} ${Platform.Version}`);
      
      if (Platform.OS === 'web') {
        return {
          success: false,
          files: [],
          error: 'Camera not available on web'
        };
      }

      // Check camera permissions
      console.log('🔐 Checking camera permissions');
      const cameraPermission = await permissionService.requestCameraPermission();
      if (!cameraPermission.granted) {
        console.log('❌ Camera permission denied');
        return {
          success: false,
          files: [],
          error: 'Camera permission is required to take photos'
        };
      }
      console.log('✅ Camera permission granted');

      // Use react-native-image-picker for camera
      return new Promise((resolve) => {
        const options = {
          mediaType: 'photo' as MediaType,
          quality: 0.8,
          maxWidth: 1024,
          maxHeight: 1024,
          cameraType: 'back',
        };

        launchCamera(options, (response: ImagePickerResponse) => {
          if (response.didCancel) {
            resolve({
              success: false,
              files: [],
              error: 'User cancelled camera capture'
            });
            return;
          }

          if (response.errorMessage) {
            console.error('Camera error:', response.errorMessage);
            resolve({
              success: false,
              files: [],
              error: response.errorMessage.includes('permission') 
                ? 'Permission denied. Please allow camera access in app settings.'
                : response.errorMessage
            });
            return;
          }

          if (response.assets && response.assets.length > 0) {
            const files = response.assets.map(asset => ({
              uri: asset.uri || '',
              name: asset.fileName || `photo_${Date.now()}.jpg`,
              size: asset.fileSize || 0,
              type: asset.type || 'image/jpeg',
            }));

            resolve({
              success: true,
              files: files
            });
          } else {
            resolve({
              success: false,
              files: [],
              error: 'No photo captured'
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // File validation
  validateFile(file: { size: number; type: string }, maxSize: number = 10 * 1024 * 1024): boolean {
    if (file.size > maxSize) {
      Alert.alert('Error', 'File size too large');
      return false;
    }
    
    if (!file.type.startsWith('image/')) {
      Alert.alert('Error', 'Please select an image file');
      return false;
    }
    
    return true;
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const lightweightImagePicker = new LightweightImagePicker();
export default lightweightImagePicker;
