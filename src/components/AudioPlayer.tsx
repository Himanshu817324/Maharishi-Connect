import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Slider,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont } from '@/theme/responsive';

interface AudioPlayerProps {
  uri: string;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnd?: () => void;
  style?: any;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  uri,
  onProgress,
  onEnd,
  style,
}) => {
  const { safeColors } = useTheme();
  
  // Fallback safeColors in case theme is not available
  const safeColors = safeColors || {
    accent: '#007AFF',
    text: '#000000',
    textSecondary: '#666666',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    border: '#E0E0E0',
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // For now, we'll simulate audio playback
  // In a real implementation, you'd use react-native-track-player or similar
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          if (newTime >= duration) {
            setIsPlaying(false);
            onEnd?.();
            return duration;
          }
          onProgress?.(newTime, duration);
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, duration, onProgress, onEnd]);

  const handlePlayPause = () => {
    if (duration === 0) {
      // Simulate loading duration (in a real app, this would come from the audio file)
      setDuration(180); // 3 minutes default
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number) => {
    setCurrentTime(value);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.playButton, { backgroundColor: safeColors.accent }]}
        onPress={handlePlayPause}
        disabled={isLoading}
      >
        <Icon
          name={isPlaying ? 'pause' : 'play'}
          size={moderateScale(20)}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      <View style={styles.progressContainer}>
        <Text style={[styles.timeText, { color: safeColors.textSecondary }]}>
          {formatTime(currentTime)}
        </Text>
        
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 1}
          value={currentTime}
          onValueChange={handleSeek}
          minimumTrackTintColor={safeColors.accent}
          maximumTrackTintColor={safeColors.border}
          thumbStyle={{ backgroundColor: safeColors.accent }}
        />
        
        <Text style={[styles.timeText, { color: safeColors.textSecondary }]}>
          {formatTime(duration)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(8),
  },
  playButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(12),
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    height: moderateScale(20),
    marginHorizontal: moderateScale(8),
  },
  timeText: {
    fontSize: responsiveFont(12),
    minWidth: moderateScale(40),
    textAlign: 'center',
  },
});

export default AudioPlayer;
