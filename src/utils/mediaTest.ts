/**
 * Media Service Test Utility
 * 
 * This file provides test functions to verify the media sharing implementation.
 * Use these functions to test different media picker scenarios.
 */

import { mediaService, MediaFile } from '@/services/mediaService';

export const testMediaService = {
  /**
   * Test image picking functionality
   */
  async testImagePicking(): Promise<void> {
    console.log('🧪 Testing image picking...');
    
    try {
      const result = await mediaService.pickImages(3);
      
      if (result.success) {
        console.log('✅ Image picking successful:', {
          count: result.files.length,
          files: result.files.map(f => ({
            name: f.name,
            type: f.type,
            size: mediaService.formatFileSize(f.size),
            isImage: mediaService.isImageFile(f)
          }))
        });
      } else {
        console.log('❌ Image picking failed:', result.error);
      }
    } catch (error) {
      console.error('💥 Image picking error:', error);
    }
  },

  /**
   * Test video picking functionality
   */
  async testVideoPicking(): Promise<void> {
    console.log('🧪 Testing video picking...');
    
    try {
      const result = await mediaService.pickVideos(2);
      
      if (result.success) {
        console.log('✅ Video picking successful:', {
          count: result.files.length,
          files: result.files.map(f => ({
            name: f.name,
            type: f.type,
            size: mediaService.formatFileSize(f.size),
            duration: f.duration,
            isVideo: mediaService.isVideoFile(f)
          }))
        });
      } else {
        console.log('❌ Video picking failed:', result.error);
      }
    } catch (error) {
      console.error('💥 Video picking error:', error);
    }
  },

  /**
   * Test audio picking functionality
   */
  async testAudioPicking(): Promise<void> {
    console.log('🧪 Testing audio picking...');
    
    try {
      const result = await mediaService.pickAudioFiles(2);
      
      if (result.success) {
        console.log('✅ Audio picking successful:', {
          count: result.files.length,
          files: result.files.map(f => ({
            name: f.name,
            type: f.type,
            size: mediaService.formatFileSize(f.size),
            isAudio: mediaService.isAudioFile(f)
          }))
        });
      } else {
        console.log('❌ Audio picking failed:', result.error);
      }
    } catch (error) {
      console.error('💥 Audio picking error:', error);
    }
  },

  /**
   * Test file picking functionality
   */
  async testFilePicking(): Promise<void> {
    console.log('🧪 Testing file picking...');
    
    try {
      const result = await mediaService.pickFiles(3);
      
      if (result.success) {
        console.log('✅ File picking successful:', {
          count: result.files.length,
          files: result.files.map(f => ({
            name: f.name,
            type: f.type,
            size: mediaService.formatFileSize(f.size),
            extension: mediaService.getFileExtension(f.name)
          }))
        });
      } else {
        console.log('❌ File picking failed:', result.error);
      }
    } catch (error) {
      console.error('💥 File picking error:', error);
    }
  },

  /**
   * Test camera photo functionality
   */
  async testCameraPhoto(): Promise<void> {
    console.log('🧪 Testing camera photo...');
    
    try {
      const result = await mediaService.takePhoto();
      
      if (result.success) {
        console.log('✅ Camera photo successful:', {
          file: {
            name: result.files[0].name,
            type: result.files[0].type,
            size: mediaService.formatFileSize(result.files[0].size),
            width: result.files[0].width,
            height: result.files[0].height,
            isImage: mediaService.isImageFile(result.files[0])
          }
        });
      } else {
        console.log('❌ Camera photo failed:', result.error);
      }
    } catch (error) {
      console.error('💥 Camera photo error:', error);
    }
  },

  /**
   * Test camera video functionality
   */
  async testCameraVideo(): Promise<void> {
    console.log('🧪 Testing camera video...');
    
    try {
      const result = await mediaService.recordVideo();
      
      if (result.success) {
        console.log('✅ Camera video successful:', {
          file: {
            name: result.files[0].name,
            type: result.files[0].type,
            size: mediaService.formatFileSize(result.files[0].size),
            duration: result.files[0].duration,
            width: result.files[0].width,
            height: result.files[0].height,
            isVideo: mediaService.isVideoFile(result.files[0])
          }
        });
      } else {
        console.log('❌ Camera video failed:', result.error);
      }
    } catch (error) {
      console.error('💥 Camera video error:', error);
    }
  },

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting media service tests...\n');
    
    await this.testImagePicking();
    console.log('');
    
    await this.testVideoPicking();
    console.log('');
    
    await this.testAudioPicking();
    console.log('');
    
    await this.testFilePicking();
    console.log('');
    
    await this.testCameraPhoto();
    console.log('');
    
    await this.testCameraVideo();
    console.log('');
    
    console.log('🏁 All tests completed!');
  }
};

/**
 * Helper function to test file validation
 */
export const testFileValidation = (file: MediaFile, expectedType: 'image' | 'video' | 'audio' | 'file'): boolean => {
  console.log(`🧪 Testing file validation for ${file.name}:`);
  console.log(`   Type: ${file.type}`);
  console.log(`   Size: ${mediaService.formatFileSize(file.size)}`);
  console.log(`   Expected: ${expectedType}`);
  
  const isValid = mediaService.validateFile(file, expectedType);
  console.log(`   Result: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  
  return isValid;
};

/**
 * Helper function to test file type detection
 */
export const testFileTypeDetection = (file: MediaFile): void => {
  console.log(`🧪 Testing file type detection for ${file.name}:`);
  console.log(`   Is Image: ${mediaService.isImageFile(file)}`);
  console.log(`   Is Video: ${mediaService.isVideoFile(file)}`);
  console.log(`   Is Audio: ${mediaService.isAudioFile(file)}`);
  console.log(`   Extension: ${mediaService.getFileExtension(file.name)}`);
};

export default testMediaService;
