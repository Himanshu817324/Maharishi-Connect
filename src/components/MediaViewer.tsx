import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode } from 'react-native-video';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { MediaFile } from '@/services/mediaService';
import { fileService } from '@/services/fileService';
import AudioPlayer from '@/components/AudioPlayer';

interface MediaViewerProps {
  visible: boolean;
  onClose: () => void;
  mediaFiles: MediaFile[];
  initialIndex?: number;
}

const MediaViewer: React.FC<MediaViewerProps> = ({
  visible,
  onClose,
  mediaFiles,
  initialIndex = 0,
}) => {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Fallback colors in case theme is not available
  const safeColors = colors || {
    accent: '#007AFF',
    text: '#000000',
    textSecondary: '#666666',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    border: '#E0E0E0',
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [imageScale, setImageScale] = useState(1);
  const [imageTranslateX, setImageTranslateX] = useState(0);
  const [imageTranslateY, setImageTranslateY] = useState(0);

  const videoRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<any>(null);

  const currentFile = mediaFiles[currentIndex];

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsPlaying(false);
      setVideoProgress(0);
      setImageScale(1);
      setImageTranslateX(0);
      setImageTranslateY(0);
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    if (showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  const handleClose = () => {
    setIsPlaying(false);
    onClose();
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(false);
      setVideoProgress(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < mediaFiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(false);
      setVideoProgress(0);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    setShowControls(true);
  };

  const handleVideoProgress = (data: any) => {
    setVideoProgress(data.currentTime);
  };

  const handleVideoLoad = (data: any) => {
    setVideoDuration(data.duration);
  };


  const handleFileOpen = async () => {
    if (!currentFile) return;

    try {
      const canOpen = await Linking.canOpenURL(currentFile.uri);
      if (canOpen) {
        await Linking.openURL(currentFile.uri);
      } else {
        Alert.alert(
          'Cannot Open File',
          'No app available to open this file type. Please install a compatible app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const getFileType = (file: MediaFile) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'file';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderImage = () => (
    <View style={styles.mediaContainer}>
      <Image
        source={{ uri: currentFile.uri }}
        style={[
          styles.mediaImage,
          {
            transform: [
              { scale: imageScale },
              { translateX: imageTranslateX },
              { translateY: imageTranslateY },
            ],
          },
        ]}
        resizeMode="contain"
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={safeColors.accent} />
        </View>
      )}
    </View>
  );

  const renderVideo = () => (
    <View style={styles.mediaContainer}>
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={() => setShowControls(!showControls)}
        activeOpacity={1}
      >
        <Video
          ref={videoRef}
          source={{ uri: currentFile.uri }}
          style={styles.mediaVideo}
          resizeMode={ResizeMode.CONTAIN}
          paused={!isPlaying}
          onProgress={handleVideoProgress}
          onLoad={handleVideoLoad}
          onLoadStart={() => setIsLoading(true)}
          onError={(error) => {
            console.error('Video error:', error);
            Alert.alert('Error', 'Failed to load video');
          }}
        />
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={safeColors.accent} />
          </View>
        )}

        {showControls && (
          <View style={styles.videoControls}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayPause}
            >
              <Icon
                name={isPlaying ? 'pause' : 'play'}
                size={moderateScale(40)}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        )}

        {showControls && videoDuration > 0 && (
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>
              {formatTime(videoProgress)}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(videoProgress / videoDuration) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.timeText}>
              {formatTime(videoDuration)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderAudio = () => (
    <View style={styles.mediaContainer}>
      <View style={styles.audioContainer}>
        <View style={styles.audioIcon}>
          <Icon name="musical-notes" size={moderateScale(60)} color={safeColors.accent} />
        </View>
        
        <Text style={[styles.audioTitle, { color: safeColors.text }]}>
          {currentFile.name}
        </Text>
        
        <Text style={[styles.audioSubtitle, { color: safeColors.textSecondary }]}>
          {fileService?.formatFileSize?.(currentFile.size) || `${Math.round(currentFile.size / 1024)} KB`}
        </Text>

        <AudioPlayer
          uri={currentFile.uri}
          onProgress={(currentTime, duration) => {
            setVideoProgress(currentTime);
            setVideoDuration(duration);
          }}
          onEnd={() => setIsPlaying(false)}
          style={styles.audioPlayer}
        />
      </View>
    </View>
  );

  const renderFile = () => (
    <View style={styles.mediaContainer}>
      <View style={styles.fileContainer}>
        <View style={[styles.fileIcon, { backgroundColor: safeColors.accent + '20' }]}>
          <Icon
            name={fileService?.getFileIcon?.(currentFile.type) || 'document'}
            size={moderateScale(60)}
            color={safeColors.accent}
          />
        </View>
        
        <Text style={[styles.fileTitle, { color: safeColors.text }]}>
          {currentFile.name}
        </Text>
        
        <Text style={[styles.fileSubtitle, { color: safeColors.textSecondary }]}>
          {fileService?.formatFileSize?.(currentFile.size) || `${Math.round(currentFile.size / 1024)} KB`} • {fileService?.getFileTypeCategory?.(currentFile.type)?.toUpperCase() || 'FILE'}
        </Text>

        <TouchableOpacity
          style={[styles.openFileButton, { backgroundColor: safeColors.accent }]}
          onPress={handleFileOpen}
        >
          <Icon name="open-outline" size={moderateScale(20)} color="#FFFFFF" />
          <Text style={styles.openFileText}>Open File</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMedia = () => {
    if (!currentFile) return null;

    const fileType = getFileType(currentFile);

    switch (fileType) {
      case 'image':
        return renderImage();
      case 'video':
        return renderVideo();
      case 'audio':
        return renderAudio();
      case 'file':
        return renderFile();
      default:
        return renderFile();
    }
  };

  if (!visible || !currentFile || !mediaFiles || mediaFiles.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Icon name="close" size={moderateScale(24)} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {currentFile.name}
            </Text>
            <Text style={styles.headerSubtitle}>
              {currentIndex + 1} of {mediaFiles.length}
            </Text>
          </View>
          
          <TouchableOpacity onPress={handleFileOpen} style={styles.headerButton}>
            <Icon name="open-outline" size={moderateScale(24)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Media Content */}
        <View style={styles.content}>
          {renderMedia()}
        </View>

        {/* Navigation */}
        {mediaFiles.length > 1 && (
          <>
            <TouchableOpacity
              style={[styles.navButton, styles.navLeft]}
              onPress={handlePrevious}
              disabled={currentIndex === 0}
            >
              <Icon
                name="chevron-back"
                size={moderateScale(30)}
                color={currentIndex === 0 ? '#666666' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.navRight]}
              onPress={handleNext}
              disabled={currentIndex === mediaFiles.length - 1}
            >
              <Icon
                name="chevron-forward"
                size={moderateScale(30)}
                color={currentIndex === mediaFiles.length - 1 ? '#666666' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </>
        )}

        {/* Bottom Controls */}
        {showControls && (
          <View style={styles.bottomControls}>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {currentFile.name}
              </Text>
              <Text style={styles.fileSize}>
                {fileService?.formatFileSize?.(currentFile.size) || `${Math.round(currentFile.size / 1024)} KB`}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    paddingTop: hp(6), // Account for status bar
  },
  headerButton: {
    padding: moderateScale(8),
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: wp(2),
  },
  headerTitle: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: responsiveFont(12),
    color: '#CCCCCC',
    marginTop: hp(0.5),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaVideo: {
    width: '100%',
    height: '100%',
  },
  audioContainer: {
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  audioIcon: {
    marginBottom: hp(3),
  },
  audioTitle: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  audioSubtitle: {
    fontSize: responsiveFont(14),
    textAlign: 'center',
    marginBottom: hp(3),
  },
  audioPlayButton: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  audioPlayer: {
    width: '100%',
    marginTop: hp(2),
  },
  fileContainer: {
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  fileIcon: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  fileTitle: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  fileSubtitle: {
    fontSize: responsiveFont(14),
    textAlign: 'center',
    marginBottom: hp(3),
  },
  openFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: moderateScale(25),
  },
  openFileText: {
    color: '#FFFFFF',
    fontSize: responsiveFont(16),
    fontWeight: '600',
    marginLeft: wp(2),
  },
  videoControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: hp(2),
    left: wp(4),
    right: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  progressBar: {
    height: moderateScale(4),
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: moderateScale(2),
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(2),
  },
  timeText: {
    fontSize: responsiveFont(12),
    color: '#FFFFFF',
    minWidth: moderateScale(40),
    textAlign: 'center',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLeft: {
    left: wp(4),
  },
  navRight: {
    right: wp(4),
  },
  bottomControls: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  fileInfo: {
    alignItems: 'center',
  },
  fileName: {
    fontSize: responsiveFont(14),
    color: '#FFFFFF',
    textAlign: 'center',
  },
  fileSize: {
    fontSize: responsiveFont(12),
    color: '#CCCCCC',
    marginTop: hp(0.5),
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});

export default MediaViewer;