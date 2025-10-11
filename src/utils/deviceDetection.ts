import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');
const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

export interface DeviceInfo {
  width: number;
  height: number;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  aspectRatio: number;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isTablet: boolean;
  isPhone: boolean;
  isLandscape: boolean;
  deviceType: 'phone' | 'tablet' | 'foldable';
  keyboardAdjustmentFactor: number;
}

export const getDeviceInfo = (): DeviceInfo => {
  const pixelRatio = PixelRatio.get();
  const aspectRatio = width / height;
  const isLandscape = width > height;
  
  // Device size classification
  const isSmall = height < 600;
  const isMedium = height >= 600 && height < 800;
  const isLarge = height >= 800;
  const isTablet = width >= 768 || (width >= 600 && height >= 960);
  const isPhone = !isTablet;
  
  // Device type classification
  let deviceType: 'phone' | 'tablet' | 'foldable' = 'phone';
  if (isTablet) {
    deviceType = 'tablet';
  } else if (width > 400 && height > 800) {
    // Potential foldable device
    deviceType = 'foldable';
  }
  
  // Keyboard adjustment factor based on device characteristics
  let keyboardAdjustmentFactor = 1.0;
  
  if (Platform.OS === 'android') {
    if (isSmall) {
      keyboardAdjustmentFactor = 0.95; // Minimal adjustment for small screens
    } else if (isTablet) {
      keyboardAdjustmentFactor = 1.0; // No adjustment for tablets
    } else if (isLarge) {
      keyboardAdjustmentFactor = 0.98; // Minimal adjustment for large phones
    }
    
    // Additional adjustments based on aspect ratio
    if (aspectRatio > 0.6) {
      // Wide screens (tablets, some phones)
      keyboardAdjustmentFactor *= 1.0;
    } else if (aspectRatio < 0.5) {
      // Tall screens (some phones)
      keyboardAdjustmentFactor *= 0.98;
    }
    
    // Pixel density adjustments
    if (pixelRatio > 3) {
      // High DPI screens
      keyboardAdjustmentFactor *= 0.99;
    } else if (pixelRatio < 2) {
      // Low DPI screens
      keyboardAdjustmentFactor *= 1.01;
    }
  }
  
  return {
    width,
    height,
    screenWidth,
    screenHeight,
    pixelRatio,
    aspectRatio,
    isSmall,
    isMedium,
    isLarge,
    isTablet,
    isPhone,
    isLandscape,
    deviceType,
    keyboardAdjustmentFactor,
  };
};

export const getOptimalKeyboardHeight = (
  rawKeyboardHeight: number,
  deviceInfo: DeviceInfo
): number => {
  if (Platform.OS !== 'android' || rawKeyboardHeight === 0) {
    return rawKeyboardHeight;
  }
  
  // Use the raw keyboard height with adaptive buffer to prevent cutting
  let buffer = 15; // Base buffer
  
  // Increase buffer for devices that might have measurement issues
  if (deviceInfo.isSmall) {
    buffer = 20; // More buffer for small screens
  } else if (deviceInfo.isTablet) {
    buffer = 10; // Less buffer for tablets (usually more accurate)
  } else if (deviceInfo.aspectRatio < 0.5) {
    buffer = 25; // More buffer for very tall screens
  }
  
  let adjustedHeight = rawKeyboardHeight + buffer;
  
  // Apply device-specific adjustments
  adjustedHeight *= deviceInfo.keyboardAdjustmentFactor;
  
  // Ensure bounds - allow up to 50% of screen height for keyboard
  const minHeight = 0;
  const maxHeight = deviceInfo.height * 0.5;
  
  // Add extra safety margin for edge cases
  const finalHeight = Math.max(minHeight, Math.min(Math.round(adjustedHeight), maxHeight));
  
  // Ensure minimum clearance of 20px above keyboard
  return Math.max(finalHeight, 20);
};
