import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface FileUploadResult {
  success: boolean;
  file?: {
    id: string;
    s3Url: string;
    originalName: string;
    size: number;
    mimeType: string;
    s3Key: string;
  };
  error?: string;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileId?: string;
  s3Key?: string;
}

class FileUploadService {
  private API_BASE = 'https://api.maharishiconnect.com/api';
  private lastUploadedFile: any = null;

  /**
   * Upload file to S3 using the backend API
   */
  async uploadFile(file: any, userId: string): Promise<FileUploadResult> {
    try {
      console.log('📤 Starting file upload:', {
        fileName: file.name || file.fileName,
        fileSize: file.size,
        mimeType: file.type || file.mimeType,
        userId,
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('🔐 Using auth token for file upload');

      const response = await fetch(`${this.API_BASE}/user/upload-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      console.log('📡 File upload response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ File uploaded successfully:', data);

        // Store the last uploaded file for sharing
        this.lastUploadedFile = data.file;

        return {
          success: true,
          file: {
            id: data.file?.id || `temp_${Date.now()}`,
            s3Url: data.file?.mediaUrl || data.file?.s3Url,
            originalName: data.file?.originalName || file.name || file.fileName,
            size: data.file?.size || file.size,
            mimeType: data.file?.mimeType || file.type || file.mimeType,
            s3Key: data.file?.s3Key,
          },
        };
      } else {
        const errorData = await response.json();
        console.error('❌ File upload failed:', errorData);
        return {
          success: false,
          error: errorData.message || `Upload failed with status ${response.status}`,
        };
      }
    } catch (error) {
      console.error('❌ File upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      };
    }
  }

  /**
   * Share file in chat using the uploaded file data
   */
  async shareFileInChat(
    fileData: FileUploadResult['file'],
    chatId: string,
    caption: string = ''
  ): Promise<{ success: boolean; message?: any; error?: string }> {
    try {
      if (!fileData) {
        throw new Error('No file data provided');
      }

      console.log('📤 Sharing file in chat:', {
        fileId: fileData.id,
        chatId,
        caption,
        s3Url: fileData.s3Url,
      });

      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const requestBody = {
        content: caption,
        messageType: this.getFileMessageType(fileData.mimeType),
        mediaUrl: fileData.s3Url,
        mediaMetadata: {
          fileId: fileData.id,
          fileName: fileData.originalName,
          fileSize: fileData.size,
          fileType: fileData.mimeType,
          s3Key: fileData.s3Key,
        },
      };

      console.log('📤 Sending file message to chat:', requestBody);

      const response = await fetch(`${this.API_BASE}/chat/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 File share response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ File shared successfully in chat:', data);
        return {
          success: true,
          message: data.data,
        };
      } else {
        const errorData = await response.json();
        console.error('❌ File share failed:', errorData);
        return {
          success: false,
          error: errorData.message || `Share failed with status ${response.status}`,
        };
      }
    } catch (error) {
      console.error('❌ File share error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown share error',
      };
    }
  }

  /**
   * Upload and share file in one step
   */
  async uploadAndShareFile(
    file: any,
    chatId: string,
    userId: string,
    caption: string = ''
  ): Promise<{ success: boolean; message?: any; error?: string }> {
    try {
      console.log('🚀 Starting upload and share process:', {
        fileName: file.name || file.fileName,
        chatId,
        userId,
      });

      // First upload the file
      const uploadResult = await this.uploadFile(file, userId);
      
      if (!uploadResult.success || !uploadResult.file) {
        return {
          success: false,
          error: uploadResult.error || 'File upload failed',
        };
      }

      console.log('✅ File uploaded, now sharing in chat...');

      // Then share it in the chat
      const shareResult = await this.shareFileInChat(uploadResult.file, chatId, caption);
      
      if (shareResult.success) {
        console.log('✅ File uploaded and shared successfully!');
      } else {
        console.error('❌ File uploaded but sharing failed:', shareResult.error);
      }

      return shareResult;
    } catch (error) {
      console.error('❌ Upload and share error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get file download URL
   */
  async getFileDownloadUrl(fileId: string): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${this.API_BASE}/user/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          downloadUrl: data.file?.downloadUrl || data.file?.s3Url,
        };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.message || 'Failed to get download URL',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user files
   */
  async getUserFiles(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(
        `${this.API_BASE}/user/files?userId=${userId}&limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.files || [];
      } else {
        console.error('Failed to get user files:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error getting user files:', error);
      return [];
    }
  }

  /**
   * Get file message type based on MIME type
   */
  private getFileMessageType(mimeType: string): 'image' | 'video' | 'audio' | 'file' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // First try to get from AsyncStorage
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        return token;
      }

      // Try to get from auth state
      const authStateData = await AsyncStorage.getItem('@maharishi_connect_auth_state');
      if (authStateData) {
        const authState = JSON.parse(authStateData);
        const user = authState.user;
        if (user?.token) {
          return user.token;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
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
   * Get file icon based on file name or MIME type
   */
  getFileIcon(fileName: string, mimeType?: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const type = mimeType?.toLowerCase() || '';

    // Image files
    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
      return '🖼️';
    }
    
    // Video files
    if (type.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
      return '🎥';
    }
    
    // Audio files
    if (type.startsWith('audio/') || ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'].includes(extension)) {
      return '🎵';
    }
    
    // Document files
    if (['pdf'].includes(extension)) {
      return '📄';
    }
    if (['doc', 'docx'].includes(extension)) {
      return '📝';
    }
    if (['xls', 'xlsx'].includes(extension)) {
      return '📊';
    }
    if (['ppt', 'pptx'].includes(extension)) {
      return '📊';
    }
    if (['txt'].includes(extension)) {
      return '📄';
    }
    
    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return '📦';
    }
    
    // Default file icon
    return '📁';
  }

  /**
   * Validate file before upload
   */
  validateFile(file: any): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size too large. Maximum size is 100MB.' };
    }

    // Check file type
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      // Videos
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv',
      // Audio
      'audio/mp3', 'audio/wav', 'audio/aac', 'audio/flac', 'audio/ogg', 'audio/m4a',
      // Documents
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
    ];

    if (file.type && !allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not supported' };
    }

    return { valid: true };
  }
}

export const fileUploadService = new FileUploadService();
