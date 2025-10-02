// src/components/atoms/ui/StatusBar.tsx
import React from 'react';
import { StatusBar as RNStatusBar, Platform } from 'react-native';
import { useTheme } from '../../../theme';

interface CustomStatusBarProps {
  backgroundColor?: string;
  barStyle?: 'default' | 'light-content' | 'dark-content';
}

const CustomStatusBar: React.FC<CustomStatusBarProps> = ({ 
  backgroundColor, 
  barStyle 
}) => {
  const { colors, isDark } = useTheme();

  return (
    <RNStatusBar
      backgroundColor={backgroundColor || colors.statusbar}
      barStyle={barStyle || (isDark ? "light-content" : "dark-content")}
      translucent={Platform.OS === 'android'}
    />
  );
};

export default CustomStatusBar;
