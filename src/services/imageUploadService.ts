import { apiService } from './apiService';

export interface UploadResult {
  success: boolean;
  url?: string;
  tempId?: string;
  imageUrl?: string;
  directUrl?: string;
  error?: string;
}

export class ImageUploadService {
  private static instance: ImageUploadService;
  
  private constructor() {}
  
  public static getInstance(): ImageUploadService {
    if (!ImageUploadService.instance) {
      ImageUploadService.instance = new ImageUploadService();
    }
    return ImageUploadService.instance;
  }

  /**
   * Upload profile image via backend API (backend handles S3)
   * @param imageUri - Local URI of the image
   * @param userId - User ID for organizing files
   * @returns Promise with upload result
   */
  async uploadProfileImage(imageUri: string, userId: string): Promise<UploadResult> {
    try {
      // Create FormData for upload
      const formData = new FormData();
      
      // Use the correct field name that works with the backend
      formData.append('profileImage', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `profile_${userId}_${Date.now()}.jpg`,
      } as any);

      // Use the profile image upload endpoint
      const response = await apiService.uploadProfileImage(formData);
      
      // Handle the response structure from your backend
      if (response.status === 'SUCCESS' && response.data?.imageUrl) {
        return {
          success: true,
          url: response.data.imageUrl,
          imageUrl: response.data.imageUrl,
          tempId: response.data.tempId
        };
      } else if ((response as any).imageUrl) {
        // Fallback for different response structure
        return {
          success: true,
          url: (response as any).imageUrl,
          imageUrl: (response as any).imageUrl,
          tempId: (response as any).tempId
        };
      } else {
        throw new Error('No image URL returned from server');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Upload chat image via backend API (backend handles S3)
   * @param imageUri - Local URI of the image
   * @param chatId - Chat ID for organizing files
   * @returns Promise with upload result
   */
  async uploadChatImage(imageUri: string, chatId: string): Promise<UploadResult> {
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `chat_${chatId}_${Date.now()}.jpg`,
      } as any);

      // Use the existing API service to upload
      const response = await apiService.uploadImageToCloud(formData);
      
      if ((response as any).imageUrl) {
        return {
          success: true,
          url: (response as any).imageUrl
        };
      } else {
        throw new Error('No image URL returned from server');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Upload image for signup and get tempId (for backend to process later)
   * @param imageUri - Local URI of the image
   * @returns Promise with upload result containing tempId
   */
  async uploadImageForSignup(imageUri: string): Promise<UploadResult> {
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('profileImage', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `signup_${Date.now()}.jpg`,
      } as any);

      // Use the profile image upload endpoint (same as regular upload)
      const response = await apiService.uploadProfileImage(formData);
      
      // Handle the response structure from your backend
      if (response.status === 'SUCCESS' && response.data?.imageUrl) {
        return {
          success: true,
          url: response.data.imageUrl,
          imageUrl: response.data.imageUrl,
          tempId: response.data.tempId
        };
      } else if ((response as any).imageUrl) {
        // Fallback for different response structure
        return {
          success: true,
          url: (response as any).imageUrl,
          imageUrl: (response as any).imageUrl,
          tempId: (response as any).tempId
        };
      } else {
        throw new Error('No image URL returned from server');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }
}

// Export singleton instance
export const imageUploadService = ImageUploadService.getInstance();
