import { useState, useEffect, useMemo } from 'react';
import { Keyboard, Platform, Dimensions } from 'react-native';
import { hp, wp, isSmallDevice, isMediumDevice, isLargeDevice, isTablet } from '@/theme/responsive';
import { getDeviceInfo, getOptimalKeyboardHeight, DeviceInfo } from '@/utils/deviceDetection';

interface KeyboardHeightReturn {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  adjustedKeyboardHeight: number;
  screenInfo: {
    width: number;
    height: number;
    isSmall: boolean;
    isMedium: boolean;
    isLarge: boolean;
    isTablet: boolean;
  };
  deviceInfo: DeviceInfo;
}

export const useKeyboardHeight = (): KeyboardHeightReturn => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  // Update screen dimensions on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });

    return () => subscription?.remove();
  }, []);

  // Calculate device info
  const deviceInfo = useMemo(() => getDeviceInfo(), [screenData]);

  // Calculate screen info (for backward compatibility)
  const screenInfo = useMemo(() => ({
    width: screenData.width,
    height: screenData.height,
    isSmall: deviceInfo.isSmall,
    isMedium: deviceInfo.isMedium,
    isLarge: deviceInfo.isLarge,
    isTablet: deviceInfo.isTablet,
  }), [screenData, deviceInfo]);

  // Calculate adjusted keyboard height using device detection
  const adjustedKeyboardHeight = useMemo(() => {
    if (!isKeyboardVisible || keyboardHeight === 0) return 0;
    
    return getOptimalKeyboardHeight(keyboardHeight, deviceInfo);
  }, [keyboardHeight, isKeyboardVisible, deviceInfo]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        const height = e.endCoordinates.height;
        setKeyboardHeight(height);
        setIsKeyboardVisible(true);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardVisible,
    adjustedKeyboardHeight,
    screenInfo,
    deviceInfo,
  };
};
