import React, { memo, useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme';
import OptimizedIcon from './OptimizedIcon';

interface LightweightVideoProps {
  uri: string;
  thumbnail?: string;
  onPress?: () => void;
  style?: any;
  width?: number;
  height?: number;
}

const LightweightVideo = memo<LightweightVideoProps>(({
  uri,
  thumbnail,
  onPress,
  style,
  width = 200,
  height = 150,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Fallback: Open in external player
      console.log('Opening video:', uri);
    }
  };

  if (hasError) {
    return (
      <View style={[styles.container, { width, height }, style]}>
        <View style={[styles.errorContainer, { backgroundColor: colors.surface }]}>
          <OptimizedIcon 
            name="videocam-outline" 
            size={32} 
            color={colors.textSecondary} 
          />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Video unavailable
          </Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { width, height }, style]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {thumbnail ? (
        <View style={styles.thumbnailContainer}>
          <OptimizedIcon 
            name="play-circle" 
            size={48} 
            color="rgba(255, 255, 255, 0.9)" 
            style={styles.playIcon}
          />
        </View>
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.surface }]}>
          <OptimizedIcon 
            name="videocam-outline" 
            size={32} 
            color={colors.textSecondary} 
          />
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            Video
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  thumbnailContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  playIcon: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
  },
});

export default LightweightVideo;
