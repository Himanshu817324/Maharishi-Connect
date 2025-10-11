// Lightweight image picker service
// This is a simplified version that can be extended based on needs

import { Alert, Platform } from 'react-native';

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
      // This is a placeholder implementation
      // In a real app, you would integrate with native image picker
      // or use a lighter alternative like expo-image-picker
      
      if (Platform.OS === 'web') {
        return this.pickImagesWeb(maxCount);
      }
      
      // For native platforms, you would use the actual image picker
      // For now, return a mock result
      return {
        success: true,
        files: [],
        error: 'Image picker not implemented yet'
      };
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
      // This would integrate with native camera
      // For now, return a mock result
      return {
        success: true,
        files: [],
        error: 'Camera not implemented yet'
      };
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
