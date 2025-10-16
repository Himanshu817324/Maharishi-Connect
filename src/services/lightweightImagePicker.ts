// Lightweight image picker service
// This is a simplified version that can be extended based on needs

import { Alert, Platform } from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType, PhotoQuality, CameraType } from 'react-native-image-picker';

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
      console.log(`📸 Max count: ${maxCount}`);
      
      if (Platform.OS === 'web') {
        console.log('📸 Web platform not supported');
        return {
          success: false,
          files: [],
          error: 'Web platform not supported for image picker'
        };
      }
      
      // Permissions are handled by the calling component
      console.log('🔐 Permissions handled by calling component');
      
      // Use react-native-image-picker for native platforms
      return new Promise((resolve) => {
        const options = {
          mediaType: 'photo' as MediaType,
          quality: 0.8 as PhotoQuality,
          selectionLimit: maxCount,
        };
        console.log('📸 Launching image library with options:', options);
        
        // Add timeout to detect if picker hangs
        const timeout = setTimeout(() => {
          console.log('📸 Image picker timeout - no response after 30 seconds');
          resolve({
            success: false,
            files: [],
            error: 'Image picker timeout - no response received'
          });
        }, 30000);
        
        try {
          console.log('📸 About to call launchImageLibrary...');
          launchImageLibrary(options, (response: ImagePickerResponse) => {
            clearTimeout(timeout);
            console.log('📸 Image picker response received:', {
              didCancel: response.didCancel,
              errorMessage: response.errorMessage,
              assetsCount: response.assets?.length || 0,
              response: response
            });

            if (response.didCancel) {
              console.log('📸 User cancelled image selection');
              resolve({
                success: false,
                files: [],
                error: 'User cancelled image selection'
              });
              return;
            }

            if (response.errorMessage) {
              console.error('📸 Image picker error:', response.errorMessage);
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
              console.log('📸 Processing selected images:', response.assets.length);
              const files = response.assets.map(asset => ({
                uri: asset.uri || '',
                name: asset.fileName || `image_${Date.now()}.jpg`,
                size: asset.fileSize || 0,
                type: asset.type || 'image/jpeg',
              }));

              console.log('📸 Mapped files:', files);
              resolve({
                success: true,
                files: files
              });
            } else {
              console.log('📸 No assets in response');
              resolve({
                success: false,
                files: [],
                error: 'No images selected'
              });
            }
          });
        } catch (error) {
          clearTimeout(timeout);
          console.error('📸 Error calling launchImageLibrary:', error);
          resolve({
            success: false,
            files: [],
            error: error instanceof Error ? error.message : 'Failed to launch image library'
          });
        }
      });
    } catch (error) {
      console.error('📸 Image picker exception:', error);
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }


  // Video picker
  async pickVideos(maxCount: number = 1): Promise<ImagePickerResult> {
    try {
      console.log(`🎥 Starting video picker for ${Platform.OS} ${Platform.Version}`);
      console.log(`🎥 Max count: ${maxCount}`);
      
      if (Platform.OS === 'web') {
        console.log('🎥 Web platform not supported');
        return {
          success: false,
          files: [],
          error: 'Web platform not supported for video picker'
        };
      }
      
      // Permissions are handled by the calling component
      console.log('🔐 Permissions handled by calling component');
      
      // Use react-native-image-picker for native platforms
      return new Promise((resolve) => {
        const options = {
          mediaType: 'video' as MediaType,
          quality: 0.8 as PhotoQuality,
          selectionLimit: maxCount,
        };

        console.log('🎥 Launching video library with options:', options);
        
        launchImageLibrary(options, (response: ImagePickerResponse) => {
          console.log('🎥 Video picker response received:', {
            didCancel: response.didCancel,
            errorMessage: response.errorMessage,
            assetsCount: response.assets?.length || 0,
            response: response
          });

          if (response.didCancel) {
            console.log('🎥 User cancelled video selection');
            resolve({
              success: false,
              files: [],
              error: 'User cancelled video selection'
            });
            return;
          }

          if (response.errorMessage) {
            console.error('🎥 Video picker error:', response.errorMessage);
            resolve({
              success: false,
              files: [],
              error: response.errorMessage.includes('permission') 
                ? 'Permission denied. Please allow access to videos in app settings.'
                : response.errorMessage
            });
            return;
          }

          if (response.assets && response.assets.length > 0) {
            console.log('🎥 Processing selected videos:', response.assets.length);
            const files = response.assets.map(asset => ({
              uri: asset.uri || '',
              name: asset.fileName || `video_${Date.now()}.mp4`,
              size: asset.fileSize || 0,
              type: asset.type || 'video/mp4',
            }));

            console.log('🎥 Mapped files:', files);
            resolve({
              success: true,
              files: files
            });
          } else {
            console.log('🎥 No assets in response');
            resolve({
              success: false,
              files: [],
              error: 'No videos selected'
            });
          }
        });
      });
    } catch (error) {
      console.error('🎥 Video picker exception:', error);
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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

      // Permissions are handled by the calling component
      console.log('🔐 Permissions handled by calling component');

      // Use react-native-image-picker for camera
      return new Promise((resolve) => {
        const options = {
          mediaType: 'photo' as MediaType,
          quality: 0.8 as PhotoQuality,
          maxWidth: 1024,
          maxHeight: 1024,
          cameraType: 'back' as CameraType,
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
