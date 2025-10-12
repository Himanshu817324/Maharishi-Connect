import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '@/store';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

export interface FileData {
  id: string;
  originalName: string;
  s3Key: string;
  mediaUrl: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  localPath?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadResult {
  status: 'SUCCESS' | 'ERROR';
  message: string;
  file?: FileData;
  error?: string;
}

class FileService {
  private baseURL: string;
  private maxFileSize: number = 50 * 1024 * 1024; // 50MB
  private supportedTypes: string[] = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo',
    'video/x-matroska',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/aac',
  ];

  constructor() {
    this.baseURL = 'https://api.maharishiconnect.com/api';
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  private async getAuthHeadersOptional(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      return {}; // Return empty headers if no token
    }

    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  private getUserId(): string {
    const state = store.getState();
    const user = state.auth.user;
    if (!user?.id && !user?.firebaseUid) {
      throw new Error('User ID not found');
    }
    return user.id || user.firebaseUid;
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    // Use a simple base64 encoding that works in React Native
    return this.base64Encode(binary);
  }

  private base64Encode(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      
      // eslint-disable-next-line no-bitwise
      const bitmap = (a << 16) | (b << 8) | c;
      
      // eslint-disable-next-line no-bitwise
      result += chars.charAt((bitmap >> 18) & 63);
      // eslint-disable-next-line no-bitwise
      result += chars.charAt((bitmap >> 12) & 63);
      // eslint-disable-next-line no-bitwise
      result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      // eslint-disable-next-line no-bitwise
      result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
    }
    
    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  private isValidS3Url(url: string): boolean {
    try {
      // Simple regex-based validation for S3 URLs
      const s3Pattern = /^https:\/\/(.*\.)?(amazonaws\.com|s3\.amazonaws\.com|s3-.*\.amazonaws\.com)/i;
      return s3Pattern.test(url) || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  private async validateS3Access(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }


  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Check if file type is supported
  isFileTypeSupported(mimeType: string): boolean {
    return this.supportedTypes.includes(mimeType);
  }

  // Check if file size is within limits
  isFileSizeValid(size: number): boolean {
    return size <= this.maxFileSize;
  }

  // Get file type category for UI display
  getFileTypeCategory(mimeType: string | undefined): 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other' {
    if (!mimeType || typeof mimeType !== 'string') {
      return 'other';
    }
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('tar') || mimeType.includes('gzip')) return 'archive';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    return 'other';
  }

  // Get file icon based on type
  getFileIcon(mimeType: string | undefined): string {
    const category = this.getFileTypeCategory(mimeType);
    
    switch (category) {
      case 'image':
        return 'image-outline';
      case 'video':
        return 'videocam-outline';
      case 'audio':
        return 'musical-notes-outline';
      case 'document':
        if (mimeType && mimeType.includes('pdf')) return 'document-text-outline';
        if (mimeType && mimeType.includes('word') || mimeType && mimeType.includes('doc')) return 'document-outline';
        if (mimeType && mimeType.includes('excel') || mimeType && mimeType.includes('spreadsheet')) return 'grid-outline';
        if (mimeType && mimeType.includes('powerpoint') || mimeType && mimeType.includes('presentation')) return 'easel-outline';
        if (mimeType && mimeType.includes('text') || mimeType && mimeType.includes('txt')) return 'document-text-outline';
        return 'document-outline';
      case 'archive':
        return 'archive-outline';
      default:
        return 'attach-outline';
    }
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Request storage permissions
  async requestStoragePermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);

        return (
          granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (error) {
        console.error('Error requesting storage permissions:', error);
        return false;
      }
    }
    return true; // iOS permissions are handled automatically
  }

  // Upload file to S3
  async uploadFile(
    fileUri: string,
    fileName: string,
    mimeType: string,
    onProgress?: (progress: UploadProgress) => void,
    requireAuth: boolean = true
  ): Promise<FileUploadResult> {
    try {
      // Validate file type
      if (!this.isFileTypeSupported(mimeType)) {
        return {
          status: 'ERROR',
          message: 'File type not supported',
          error: `Unsupported file type: ${mimeType}`,
        };
      }

      // Get auth headers (optional for signup scenarios)
      const headers = requireAuth ? await this.getAuthHeaders() : await this.getAuthHeadersOptional();
      const userId = this.getUserId();

      console.log('📤 [FileService] Uploading file:', { fileName, mimeType, userId });

      // Create form data according to API documentation
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: fileName,
      } as any);
      
      // userId is optional and extracted from JWT token
      // Only include it if needed for debugging
      if (userId) {
        formData.append('userId', userId);
      }
      
      console.log('📤 [FileService] Form data created:', {
        fileName,
        mimeType,
        userId,
        fileUri: fileUri.substring(0, 50) + '...'
      });

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          try {
            console.log('📤 [FileService] Upload response status:', xhr.status);
            console.log('📤 [FileService] Upload response:', xhr.responseText);
            
            if (xhr.status === 200 || xhr.status === 201) {
              const response = JSON.parse(xhr.responseText);
              console.log('📤 [FileService] Upload response parsed:', response);
              
              // Handle response according to API documentation
              if (response.status === 'SUCCESS' && response.file) {
                resolve({
                  status: 'SUCCESS',
                  message: response.message || 'File uploaded successfully',
                  file: response.file,
                });
              } else {
                resolve({
                  status: 'ERROR',
                  message: response.message || 'Upload failed',
                  error: 'Invalid response format from server',
                });
              }
            } else if (xhr.status === 413) {
              resolve({
                status: 'ERROR',
                message: 'File too large',
                error: 'File size exceeds the maximum allowed limit. Please choose a smaller file.',
              });
            } else if (xhr.status === 415) {
              resolve({
                status: 'ERROR',
                message: 'Unsupported file type',
                error: 'This file type is not supported. Please choose a different file.',
              });
            } else if (xhr.status === 401) {
              resolve({
                status: 'ERROR',
                message: 'Authentication failed',
                error: 'Please log in again to upload files.',
              });
            } else if (xhr.status >= 500) {
              resolve({
                status: 'ERROR',
                message: 'Server error',
                error: 'Server is temporarily unavailable. Please try again later.',
              });
            } else {
              let errorMessage = 'Upload failed';
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                errorMessage = errorResponse.message || errorResponse.error || 'Unknown error';
              } catch {
                errorMessage = `Upload failed with status ${xhr.status}`;
              }
              console.error('📤 [FileService] Upload error:', errorMessage);
              resolve({
                status: 'ERROR',
                message: 'Upload failed',
                error: errorMessage,
              });
            }
          } catch (error) {
            console.error('📤 [FileService] Parse error:', error);
            resolve({
              status: 'ERROR',
              message: 'Upload failed',
              error: 'Failed to parse server response. Please try again.',
            });
          }
        });

        xhr.addEventListener('error', (error) => {
          console.error('📤 [FileService] Upload network error:', error);
          resolve({
            status: 'ERROR',
            message: 'Network error',
            error: 'Network connection failed. Please check your internet connection and try again.',
          });
        });

        xhr.addEventListener('timeout', () => {
          console.error('📤 [FileService] Upload timeout');
          resolve({
            status: 'ERROR',
            message: 'Upload timeout',
            error: 'Upload timed out. Please try again with a smaller file or better connection.',
          });
        });

        xhr.addEventListener('abort', () => {
          console.error('📤 [FileService] Upload aborted');
          resolve({
            status: 'ERROR',
            message: 'Upload cancelled',
            error: 'Upload was cancelled. Please try again.',
          });
        });

        // Set up request - userId is extracted from JWT token, no need for URL parameter
        const uploadUrl = `${this.baseURL}/user/upload-file`;
        console.log('📤 [FileService] Upload URL:', uploadUrl);
        xhr.open('POST', uploadUrl);
        
        // Only set Authorization header if it exists
        if (headers.Authorization) {
          xhr.setRequestHeader('Authorization', headers.Authorization);
        }
        
        // Set timeout for upload (5 minutes for large files)
        xhr.timeout = 300000; // 5 minutes
        
        console.log('📤 [FileService] Sending file upload request...');
        console.log('📤 [FileService] Headers:', headers);
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        status: 'ERROR',
        message: 'Upload failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Download file
  async downloadFile(
    fileId: string,
    fileName: string,
    _onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; localPath?: string; error?: string }> {
    try {
      const downloadUrl = `${this.baseURL}/user/files/${fileId}`;
      const headers = await this.getAuthHeaders();
      
      console.log('📥 [FileService] Downloading file:', { fileId, fileName, downloadUrl });
      
      // Check if it's an image file based on extension
      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
      
      if (isImage) {
        try {
          // For images, download the file first and then save to gallery
          console.log('📥 [FileService] Downloading image for gallery save...');
          
          const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: headers,
          });
          
          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status}`);
          }
          
          // Get the actual content type from the response
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          console.log('📥 [FileService] Detected content type:', contentType);
          
          // Check if the response is actually an image
          if (!contentType.startsWith('image/')) {
            console.log('📥 [FileService] Response is not an image, checking if it\'s JSON...');
            
            // If it's JSON, try to parse it to see if there's a redirect URL
            const text = await response.text();
            console.log('📥 [FileService] Raw response text:', text.substring(0, 200) + '...');
            
            try {
              const jsonResponse = JSON.parse(text);
              console.log('📥 [FileService] JSON response:', jsonResponse);
              
              // Check for various possible URL fields in the response
              const possibleUrlFields = [
                'url', 'fileUrl', 'downloadUrl', 'file_url', 'download_url',
                'data.url', 'data.fileUrl', 'data.downloadUrl', 'data.file_url',
                'file.url', 'file.fileUrl', 'file.downloadUrl', 'file.file_url',
                'result.url', 'result.fileUrl', 'result.downloadUrl', 'result.file_url',
                'response.url', 'response.fileUrl', 'response.downloadUrl', 'response.file_url'
              ];
              
              let redirectUrl = null;
              for (const field of possibleUrlFields) {
                const value = this.getNestedValue(jsonResponse, field);
                if (value && typeof value === 'string' && value.startsWith('http')) {
                  redirectUrl = value;
                  console.log('📥 [FileService] Found URL in field:', field, '=', value);
                  break;
                }
              }
              
              if (redirectUrl) {
                console.log('📥 [FileService] Using redirect URL:', redirectUrl);
                
                // Validate S3 URL before attempting download
                if (!this.isValidS3Url(redirectUrl)) {
                  console.warn('📥 [FileService] Invalid S3 URL format:', redirectUrl);
                  Alert.alert('Error', 'Invalid file URL format. Please contact support.');
                  return {
                    success: false,
                    error: 'Invalid file URL format',
                  };
                }
                
                // Check S3 access before downloading
                const hasAccess = await this.validateS3Access(redirectUrl);
                if (!hasAccess) {
                  console.warn('📥 [FileService] S3 URL not accessible:', redirectUrl);
                  Alert.alert('Error', 'File is not accessible. It may have been deleted or moved.');
                  return {
                    success: false,
                    error: 'File not accessible',
                  };
                }
                
                // Download the image from S3 and then save to gallery
                try {
                  console.log('📥 [FileService] Downloading image from S3...');
                  
                  // Download the image from the S3 URL with retry logic
                  let imageResponse;
                  let retryCount = 0;
                  const maxRetries = 3;
                  
                  while (retryCount < maxRetries) {
                    try {
                      const controller = new AbortController();
                      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                      
                      imageResponse = await fetch(redirectUrl, {
                        method: 'GET',
                        headers: {
                          'Accept': 'image/*',
                        },
                        signal: controller.signal,
                      });
                      
                      clearTimeout(timeoutId);
                      
                      if (imageResponse.ok) {
                        break; // Success, exit retry loop
                      } else {
                        console.warn(`📥 [FileService] S3 download attempt ${retryCount + 1} failed with status: ${imageResponse.status}`);
                        retryCount++;
                        
                        if (retryCount < maxRetries) {
                          // Wait before retry (exponential backoff)
                          await new Promise<void>(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                        }
                      }
                    } catch (fetchError) {
                      console.warn(`📥 [FileService] S3 download attempt ${retryCount + 1} failed:`, fetchError);
                      retryCount++;
                      
                      if (retryCount < maxRetries) {
                        // Wait before retry (exponential backoff)
                        await new Promise<void>(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                      }
                    }
                  }
                  
                  if (!imageResponse || !imageResponse.ok) {
                    throw new Error(`Failed to download image from S3 after ${maxRetries} attempts. Last status: ${imageResponse?.status || 'unknown'}`);
                  }
                  
                  // Try a simpler approach - just open the image in browser for now
                  // This avoids the native exception issues with CameraRoll.save()
                  console.log('📥 [FileService] Opening image in browser for manual save...');
                  await Linking.openURL(redirectUrl);
                  Alert.alert(
                    'Save Image', 
                    'Image opened in browser. Long-press the image and select "Save to Photos" to save it to your gallery.',
                    [
                      { text: 'OK', style: 'default' }
                    ]
                  );
                  
                  return {
                    success: true,
                    localPath: redirectUrl,
                  };
                } catch (saveError) {
                  console.error('📥 [FileService] Error opening image:', saveError);
                  Alert.alert('Error', 'Could not open image. Please try again.');
                  return {
                    success: false,
                    error: 'Could not open image',
                  };
                }
              } else {
                console.log('📥 [FileService] No valid URL found in JSON response.');
                console.log('📥 [FileService] Available keys:', Object.keys(jsonResponse));
                console.log('📥 [FileService] Full response structure:', JSON.stringify(jsonResponse, null, 2));
                Alert.alert('Error', 'No valid image URL found in server response. Check console for details.');
                return {
                  success: false,
                  error: 'No valid image URL found',
                };
              }
            } catch (jsonError) {
              console.error('📥 [FileService] Error parsing JSON response:', jsonError);
              Alert.alert('Error', 'Server returned invalid response');
              return {
                success: false,
                error: 'Invalid server response',
              };
            }
          }
          
          // If it's actually an image, proceed with base64 conversion
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Convert to base64 using React Native compatible approach
          const base64 = this.arrayBufferToBase64(uint8Array);
          
          // Create data URI with proper MIME type
          const dataUri = `data:${contentType};base64,${base64}`;
          
          // Save to gallery using the data URI
          await CameraRoll.save(dataUri, { type: 'photo' });
          
          console.log('📥 [FileService] Image saved to gallery');
          Alert.alert('Success', 'Image saved to gallery');
          
          return {
            success: true,
            localPath: downloadUrl,
          };
        } catch (galleryError) {
          console.error('📥 [FileService] Error saving to gallery:', galleryError);
          
          // Don't automatically open browser, just show error
          Alert.alert('Error', 'Could not save image to gallery. Please try again.');
          
          return {
            success: false,
            error: 'Could not save to gallery',
          };
        }
      } else {
        // For non-image files, open in browser for download
        console.log('📥 [FileService] Opening non-image file in browser');
        await Linking.openURL(downloadUrl);
        Alert.alert('Info', 'File opened in browser. You can download it manually.');
        
        return {
          success: true,
          localPath: downloadUrl,
        };
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  // Get user's files list
  async getUserFiles(
    userId?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ files: FileData[]; pagination: any }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      
      if (userId) {
        params.append('userId', userId);
      }

      const response = await this.makeRequest<{
        status: string;
        files: FileData[];
        pagination: any;
      }>(`/user/files?${params.toString()}`);

      return {
        files: response.files,
        pagination: response.pagination,
      };
    } catch (error) {
      console.error('Error fetching user files:', error);
      throw error;
    }
  }

  // Share file in chat
  async shareFileInChat(
    chatId: string,
    fileData: FileData,
    message?: string
  ): Promise<{ status: string; message: any }> {
    try {
      const response = await this.makeRequest<{
        status: string;
        message: any;
      }>(`/chat/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message || '',
          messageType: 'file',
          mediaUrl: fileData.mediaUrl,
          mediaMetadata: {
            fileId: fileData.id,
            fileName: fileData.originalName,
            fileSize: fileData.size,
            fileType: fileData.mimeType,
            s3Key: fileData.s3Key,
          },
        }),
      });

      return response;
    } catch (error) {
      console.error('Error sharing file in chat:', error);
      throw error;
    }
  }

  // Check if file exists locally
  async fileExistsLocally(_fileName: string): Promise<boolean> {
    // For now, always return false since we're not storing files locally
    return false;
  }

  // Get local file path
  getLocalFilePath(fileName: string): string {
    // Return a placeholder path
    return `file://${fileName}`;
  }

  // Delete local file
  async deleteLocalFile(_fileName: string): Promise<boolean> {
    // For now, always return true since we're not storing files locally
    return true;
  }

  // Get file info from URI
  async getFileInfo(fileUri: string): Promise<{
    name: string;
    size: number;
    mimeType: string;
  }> {
    try {
      const fileName = fileUri.split('/').pop() || 'unknown';
      
      // Try to determine MIME type from file extension
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      let mimeType = 'application/octet-stream';
      
      const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'mp4': 'video/mp4',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'zip': 'application/zip',
      };
      
      if (mimeTypes[extension]) {
        mimeType = mimeTypes[extension];
      }

      return {
        name: fileName,
        size: 0, // We can't determine size without RNFS
        mimeType,
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const fileService = new FileService();
export default fileService;
