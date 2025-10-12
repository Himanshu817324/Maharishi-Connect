import React, { memo } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';

interface OptimizedIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

// Pre-defined icon set to reduce bundle size
const ICON_MAP = {
  // Navigation
  'arrow-back': 'arrow-back',
  'menu': 'menu',
  'close': 'close',
  
  // Chat
  'chatbubbles': 'chatbubbles',
  'chatbubbles-outline': 'chatbubbles-outline',
  'create': 'create',
  'create-outline': 'create-outline',
  'search': 'search',
  'search-outline': 'search-outline',
  
  // Media
  'camera': 'camera',
  'camera-outline': 'camera-outline',
  'images': 'images',
  'images-outline': 'images-outline',
  'videocam': 'videocam',
  'videocam-outline': 'videocam-outline',
  'musical-notes': 'musical-notes',
  'musical-notes-outline': 'musical-notes-outline',
  'document': 'document',
  'document-outline': 'document-outline',
  
  // Actions
  'add': 'add',
  'add-circle': 'add-circle',
  'add-circle-outline': 'add-circle-outline',
  'send': 'send',
  'send-outline': 'send-outline',
  'attach': 'attach',
  'attach-outline': 'attach-outline',
  
  // Status
  'checkmark': 'checkmark',
  'checkmark-circle': 'checkmark-circle',
  'checkmark-done': 'checkmark-done',
  'checkmark-done-outline': 'checkmark-done-outline',
  'time': 'time',
  'time-outline': 'time-outline',
  'alert-circle': 'alert-circle',
  'alert-circle-outline': 'alert-circle-outline',
  
  // UI
  'ellipsis-vertical': 'ellipsis-vertical',
  'ellipsis-horizontal': 'ellipsis-horizontal',
  'more': 'more',
  'more-outline': 'more-outline',
  'settings': 'settings',
  'settings-outline': 'settings-outline',
  'information-circle': 'information-circle',
  'information-circle-outline': 'information-circle-outline',
  
  // Communication
  'call': 'call',
  'call-outline': 'call-outline',
  'people': 'people',
  'people-outline': 'people-outline',
  
  // Common
  'home': 'home',
  'home-outline': 'home-outline',
  'person': 'person',
  'person-outline': 'person-outline',
  'star': 'star',
  'star-outline': 'star-outline',
  'heart': 'heart',
  'heart-outline': 'heart-outline',
  'thumbs-up': 'thumbs-up',
  'thumbs-up-outline': 'thumbs-up-outline',
  'thumbs-down': 'thumbs-down',
  'thumbs-down-outline': 'thumbs-down-outline',
} as const;

const OptimizedIcon = memo<OptimizedIconProps>(({ 
  name, 
  size = 24, 
  color, 
  style 
}) => {
  const { colors } = useTheme();
  
  // Use mapped icon name or fallback to original
  const iconName = ICON_MAP[name as keyof typeof ICON_MAP] || name;
  const iconColor = color || colors.text;
  
  return (
    <Icon
      name={iconName}
      size={size}
      color={iconColor}
      style={style}
    />
  );
});

export default OptimizedIcon;
