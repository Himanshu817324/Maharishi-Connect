import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

export interface ImagePersistenceResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

class ImagePersistenceService {
  private static instance: ImagePersistenceService;
  private persistentDir: string;

  private constructor() {
    // Use a persistent directory that won't be cleared on app restart
    this.persistentDir = Platform.OS === 'ios' 
      ? `${RNFS.DocumentDirectoryPath}/persistentImages`
      : `${RNFS.ExternalDirectoryPath}/persistentImages`;
    
    this.initializeDirectory();
  }

  public static getInstance(): ImagePersistenceService {
    if (!ImagePersistenceService.instance) {
      ImagePersistenceService.instance = new ImagePersistenceService();
    }
    return ImagePersistenceService.instance;
  }

  private async initializeDirectory(): Promise<void> {
    try {
      const dirExists = await RNFS.exists(this.persistentDir);
      if (!dirExists) {
        await RNFS.mkdir(this.persistentDir);
        console.log('📁 [ImagePersistence] Created persistent directory:', this.persistentDir);
      }
    } catch (error) {
      console.error('❌ [ImagePersistence] Failed to initialize directory:', error);
    }
  }

  /**
   * Check if image is already persisted locally
   */
  async isImagePersisted(imageUrl: string): Promise<boolean> {
    try {
      const fileName = this.generateFileName(imageUrl);
      const localPath = `${this.persistentDir}/${fileName}`;
      return await RNFS.exists(localPath);
    } catch (error) {
      console.error('❌ [ImagePersistence] Error checking if image is persisted:', error);
      return false;
    }
  }

  /**
   * Get local path for persisted image
   */
  async getPersistedImagePath(imageUrl: string): Promise<string | null> {
    try {
      const fileName = this.generateFileName(imageUrl);
      const localPath = `${this.persistentDir}/${fileName}`;
      const exists = await RNFS.exists(localPath);
      return exists ? localPath : null;
    } catch (error) {
      console.error('❌ [ImagePersistence] Error getting persisted image path:', error);
      return null;
    }
  }

  /**
   * Persist image to local storage (only if not already persisted)
   */
  async persistImage(imageUrl: string): Promise<ImagePersistenceResult> {
    try {
      // Check if already persisted
      const isPersisted = await this.isImagePersisted(imageUrl);
      if (isPersisted) {
        const localPath = await this.getPersistedImagePath(imageUrl);
        return {
          success: true,
          localPath: localPath || undefined
        };
      }

      console.log('📁 [ImagePersistence] Persisting image:', imageUrl);

      // Generate file path
      const fileName = this.generateFileName(imageUrl);
      const localPath = `${this.persistentDir}/${fileName}`;

      // Download the image using react-native-fs (React Native compatible)
      const downloadResult = await RNFS.downloadFile({
        fromUrl: imageUrl,
        toFile: localPath,
        headers: {
          'Accept': 'image/*',
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        console.log('📁 [ImagePersistence] Image persisted successfully:', localPath);
        return {
          success: true,
          localPath
        };
      } else {
        throw new Error(`Download failed with status: ${downloadResult.statusCode}`);
      }

    } catch (error) {
      console.error('❌ [ImagePersistence] Failed to persist image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate a consistent file name from URL
   */
  private generateFileName(imageUrl: string): string {
    // Create a hash-like filename from the URL
    const urlHash = imageUrl.replace(/[^a-zA-Z0-9]/g, '_');
    const extension = this.getFileExtension(imageUrl);
    return `${urlHash}.${extension}`;
  }

  /**
   * Extract file extension from URL
   */
  private getFileExtension(url: string): string {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1] : 'jpg';
  }

  /**
   * Clear all persisted images (for cleanup)
   */
  async clearPersistedImages(): Promise<void> {
    try {
      const files = await RNFS.readDir(this.persistentDir);
      for (const file of files) {
        await RNFS.unlink(file.path);
      }
      console.log('📁 [ImagePersistence] Cleared all persisted images');
    } catch (error) {
      console.error('❌ [ImagePersistence] Failed to clear persisted images:', error);
    }
  }

  /**
   * Get persistence statistics
   */
  async getPersistenceStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    directory: string;
  }> {
    try {
      const files = await RNFS.readDir(this.persistentDir);
      let totalSize = 0;
      
      for (const file of files) {
        const stats = await RNFS.stat(file.path);
        totalSize += stats.size || 0;
      }

      return {
        totalFiles: files.length,
        totalSize,
        directory: this.persistentDir
      };
    } catch (error) {
      console.error('❌ [ImagePersistence] Failed to get persistence stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        directory: this.persistentDir
      };
    }
  }
}

// Export singleton instance
export const imagePersistenceService = ImagePersistenceService.getInstance();
export default imagePersistenceService;
