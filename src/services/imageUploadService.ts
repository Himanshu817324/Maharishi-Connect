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

      // Use the file service for profile image uploads (which uses the correct endpoint)
      const { fileService } = await import('./fileService');
      const result = await fileService.uploadFile(imageUri, `profile_${userId}_${Date.now()}.jpg`, 'image/jpeg');
      
      if (result.status === 'SUCCESS' && result.file) {
        return {
          success: true,
          url: result.file.mediaUrl || result.file.s3Key,
          imageUrl: result.file.mediaUrl || result.file.s3Key,
          tempId: result.file.id || result.file.s3Key
        };
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Upload timed out. Please try again with a smaller image.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('413')) {
          errorMessage = 'Image too large. Please choose a smaller image.';
        } else if (error.message.includes('415')) {
          errorMessage = 'Unsupported image format. Please choose a different image.';
        } else if (error.message.includes('401')) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage
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

      // Use the file service for image uploads (which uses the correct endpoint)
      const { fileService } = await import('./fileService');
      const result = await fileService.uploadFile(imageUri, `chat_${chatId}_${Date.now()}.jpg`, 'image/jpeg');
      
      if (result.status === 'SUCCESS' && result.file) {
        return {
          success: true,
          url: result.file.mediaUrl || result.file.s3Key
        };
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Upload timed out. Please try again with a smaller image.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('413')) {
          errorMessage = 'Image too large. Please choose a smaller image.';
        } else if (error.message.includes('415')) {
          errorMessage = 'Unsupported image format. Please choose a different image.';
        } else if (error.message.includes('401')) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage
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

      // Use the file service for signup image uploads (which uses the correct endpoint)
      const { fileService } = await import('./fileService');
      const result = await fileService.uploadFile(imageUri, `signup_${Date.now()}.jpg`, 'image/jpeg');
      
      if (result.status === 'SUCCESS' && result.file) {
        return {
          success: true,
          url: result.file.mediaUrl || result.file.s3Key,
          imageUrl: result.file.mediaUrl || result.file.s3Key,
          tempId: result.file.id || result.file.s3Key
        };
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Upload timed out. Please try again with a smaller image.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('413')) {
          errorMessage = 'Image too large. Please choose a smaller image.';
        } else if (error.message.includes('415')) {
          errorMessage = 'Unsupported image format. Please choose a different image.';
        } else if (error.message.includes('401')) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

// Export singleton instance
export const imageUploadService = ImageUploadService.getInstance();
