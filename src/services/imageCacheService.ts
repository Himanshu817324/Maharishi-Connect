import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

export interface CachedImage {
  url: string;
  localPath: string;
  cachedAt: string;
  fileSize: number;
  mimeType: string;
}

export interface ImageCacheResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

class ImageCacheService {
  private static instance: ImageCacheService;
  private cacheDir: string;
  private maxCacheSize: number = 100 * 1024 * 1024; // 100MB
  private maxCacheAge: number = 7 * 24 * 60 * 60 * 1000; // 7 days
  private cacheIndex: Map<string, CachedImage> = new Map();

  private constructor() {
    this.cacheDir = Platform.OS === 'ios' 
      ? `${RNFS.DocumentDirectoryPath}/imageCache`
      : `${RNFS.ExternalDirectoryPath}/imageCache`;
    
    this.initializeCache();
  }

  public static getInstance(): ImageCacheService {
    if (!ImageCacheService.instance) {
      ImageCacheService.instance = new ImageCacheService();
    }
    return ImageCacheService.instance;
  }

  private async initializeCache(): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      const dirExists = await RNFS.exists(this.cacheDir);
      if (!dirExists) {
        await RNFS.mkdir(this.cacheDir);
        console.log('📁 [ImageCache] Created cache directory:', this.cacheDir);
      }

      // Load cache index from AsyncStorage
      await this.loadCacheIndex();
      
      // Clean up old cache entries
      await this.cleanupCache();
      
      console.log('📁 [ImageCache] Cache initialized successfully');
    } catch (error) {
      console.error('❌ [ImageCache] Failed to initialize cache:', error);
    }
  }

  private async loadCacheIndex(): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem('image_cache_index');
      if (indexData) {
        const index = JSON.parse(indexData);
        this.cacheIndex = new Map(Object.entries(index));
        console.log('📁 [ImageCache] Loaded cache index:', this.cacheIndex.size, 'entries');
      }
    } catch (error) {
      console.error('❌ [ImageCache] Failed to load cache index:', error);
      this.cacheIndex = new Map();
    }
  }

  private async saveCacheIndex(): Promise<void> {
    try {
      const indexObject = Object.fromEntries(this.cacheIndex);
      await AsyncStorage.setItem('image_cache_index', JSON.stringify(indexObject));
    } catch (error) {
      console.error('❌ [ImageCache] Failed to save cache index:', error);
    }
  }

  private generateCacheKey(url: string): string {
    // Create a hash-like key from the URL
    return url.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
  }

  private getFileExtension(url: string, mimeType?: string): string {
    // Extract extension from URL
    const urlMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Extract extension from MIME type
    if (mimeType) {
      const mimeMatch = mimeType.match(/\/([a-zA-Z0-9]+)/);
      if (mimeMatch) {
        return mimeMatch[1];
      }
    }

    return 'jpg'; // Default to jpg
  }

  /**
   * Cache an image from URL to local storage
   */
  async cacheImage(url: string, mimeType?: string): Promise<ImageCacheResult> {
    try {
      console.log('📁 [ImageCache] Caching image:', url);

      // Check if already cached
      const existingCache = this.cacheIndex.get(url);
      if (existingCache) {
        const fileExists = await RNFS.exists(existingCache.localPath);
        if (fileExists) {
          console.log('📁 [ImageCache] Image already cached:', existingCache.localPath);
          return {
            success: true,
            localPath: existingCache.localPath
          };
        } else {
          // Remove invalid cache entry
          this.cacheIndex.delete(url);
        }
      }

      // Download the image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Generate cache file path
      const extension = this.getFileExtension(url, mimeType);
      const cacheKey = this.generateCacheKey(url);
      const fileName = `${cacheKey}.${extension}`;
      const localPath = `${this.cacheDir}/${fileName}`;

      // Save to local storage
      await RNFS.writeFile(localPath, buffer.toString('base64'), 'base64');

      // Update cache index
      const cachedImage: CachedImage = {
        url,
        localPath,
        cachedAt: new Date().toISOString(),
        fileSize: buffer.length,
        mimeType: mimeType || 'image/jpeg'
      };

      this.cacheIndex.set(url, cachedImage);
      await this.saveCacheIndex();

      console.log('📁 [ImageCache] Image cached successfully:', localPath);
      return {
        success: true,
        localPath
      };

    } catch (error) {
      console.error('❌ [ImageCache] Failed to cache image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get cached image path or cache it if not available
   */
  async getCachedImage(url: string, mimeType?: string): Promise<ImageCacheResult> {
    try {
      // Check if already cached
      const existingCache = this.cacheIndex.get(url);
      if (existingCache) {
        const fileExists = await RNFS.exists(existingCache.localPath);
        if (fileExists) {
          console.log('📁 [ImageCache] Using cached image:', existingCache.localPath);
          return {
            success: true,
            localPath: existingCache.localPath
          };
        } else {
          // Remove invalid cache entry
          this.cacheIndex.delete(url);
        }
      }

      // Cache the image
      return await this.cacheImage(url, mimeType);

    } catch (error) {
      console.error('❌ [ImageCache] Failed to get cached image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Preload and cache multiple images
   */
  async preloadImages(urls: string[], mimeTypes?: string[]): Promise<ImageCacheResult[]> {
    const results: ImageCacheResult[] = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const mimeType = mimeTypes?.[i];
      
      try {
        const result = await this.cacheImage(url, mimeType);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  /**
   * Clean up old cache entries
   */
  private async cleanupCache(): Promise<void> {
    try {
      const now = Date.now();
      const entriesToRemove: string[] = [];

      // Check for expired entries
      for (const [url, cachedImage] of this.cacheIndex.entries()) {
        const cacheAge = now - new Date(cachedImage.cachedAt).getTime();
        
        if (cacheAge > this.maxCacheAge) {
          entriesToRemove.push(url);
          // Delete the file
          try {
            await RNFS.unlink(cachedImage.localPath);
          } catch (error) {
            console.warn('⚠️ [ImageCache] Failed to delete expired cache file:', cachedImage.localPath);
          }
        }
      }

      // Remove expired entries from index
      entriesToRemove.forEach(url => this.cacheIndex.delete(url));

      if (entriesToRemove.length > 0) {
        await this.saveCacheIndex();
        console.log('📁 [ImageCache] Cleaned up', entriesToRemove.length, 'expired cache entries');
      }

      // Check cache size and remove oldest entries if needed
      await this.enforceCacheSizeLimit();

    } catch (error) {
      console.error('❌ [ImageCache] Failed to cleanup cache:', error);
    }
  }

  /**
   * Enforce cache size limit by removing oldest entries
   */
  private async enforceCacheSizeLimit(): Promise<void> {
    try {
      let totalSize = 0;
      const entriesByAge: Array<{ url: string; cachedImage: CachedImage }> = [];

      // Calculate total size and sort by age
      for (const [url, cachedImage] of this.cacheIndex.entries()) {
        totalSize += cachedImage.fileSize;
        entriesByAge.push({ url, cachedImage });
      }

      // Sort by age (oldest first)
      entriesByAge.sort((a, b) => 
        new Date(a.cachedImage.cachedAt).getTime() - new Date(b.cachedImage.cachedAt).getTime()
      );

      // Remove oldest entries if size limit exceeded
      if (totalSize > this.maxCacheSize) {
        const entriesToRemove: string[] = [];
        let sizeToRemove = totalSize - this.maxCacheSize;

        for (const { url, cachedImage } of entriesByAge) {
          if (sizeToRemove <= 0) break;
          
          entriesToRemove.push(url);
          sizeToRemove -= cachedImage.fileSize;
          
          // Delete the file
          try {
            await RNFS.unlink(cachedImage.localPath);
          } catch (error) {
            console.warn('⚠️ [ImageCache] Failed to delete cache file:', cachedImage.localPath);
          }
        }

        // Remove entries from index
        entriesToRemove.forEach(url => this.cacheIndex.delete(url));
        await this.saveCacheIndex();

        console.log('📁 [ImageCache] Removed', entriesToRemove.length, 'old cache entries to enforce size limit');
      }

    } catch (error) {
      console.error('❌ [ImageCache] Failed to enforce cache size limit:', error);
    }
  }

  /**
   * Clear all cached images
   */
  async clearCache(): Promise<void> {
    try {
      // Delete all cache files
      for (const cachedImage of this.cacheIndex.values()) {
        try {
          await RNFS.unlink(cachedImage.localPath);
        } catch (error) {
          console.warn('⚠️ [ImageCache] Failed to delete cache file:', cachedImage.localPath);
        }
      }

      // Clear cache index
      this.cacheIndex.clear();
      await this.saveCacheIndex();

      console.log('📁 [ImageCache] Cache cleared successfully');

    } catch (error) {
      console.error('❌ [ImageCache] Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    cacheDir: string;
  }> {
    let totalSize = 0;
    
    for (const cachedImage of this.cacheIndex.values()) {
      totalSize += cachedImage.fileSize;
    }

    return {
      totalFiles: this.cacheIndex.size,
      totalSize,
      cacheDir: this.cacheDir
    };
  }

  /**
   * Save image to device gallery (for user-requested saves)
   */
  async saveToGallery(imagePath: string): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        await CameraRoll.save(imagePath, { type: 'photo' });
      } else {
        await CameraRoll.save(imagePath, { type: 'photo', album: 'MaharishiConnect' });
      }
      
      console.log('📁 [ImageCache] Image saved to gallery:', imagePath);
      return true;
    } catch (error) {
      console.error('❌ [ImageCache] Failed to save image to gallery:', error);
      return false;
    }
  }
}

// Export singleton instance
export const imageCacheService = ImageCacheService.getInstance();
export default imageCacheService;
