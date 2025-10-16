import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';

interface MediaFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

interface MediaPreviewProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (file: MediaFile) => void;
  file: MediaFile | null;
  mediaType: 'image' | 'video' | 'audio' | 'file';
}

const MediaPreview: React.FC<MediaPreviewProps> = ({
  visible,
  onClose,
  onConfirm,
  file,
  mediaType,
}) => {
  const { colors } = useTheme();
  const [imageScale, setImageScale] = useState(1);
  const [imageTranslateX, setImageTranslateX] = useState(0);
  const [imageTranslateY, setImageTranslateY] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const videoRef = useRef<Video>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    if (visible && file) {
      setIsLoading(true);
      setImageError(false);
      setVideoError(false);
      setImageScale(1);
      setImageTranslateX(0);
      setImageTranslateY(0);
      setIsVideoPlaying(false);
      setVideoProgress(0);
    }
  }, [visible, file]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'videocam';
    if (mimeType.startsWith('audio/')) return 'musical-notes';
    if (mimeType.includes('pdf')) return 'document-text';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document-text';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'grid';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'easel';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'archive';
    return 'document';
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  const handleVideoLoad = (data: any) => {
    setIsLoading(false);
    setVideoDuration(data.duration);
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setVideoError(true);
  };

  const handleVideoProgress = (data: any) => {
    setVideoProgress(data.currentTime);
  };

  const toggleVideoPlayback = () => {
    setIsVideoPlaying(!isVideoPlaying);
  };

  const handleVideoSeek = (position: number) => {
    if (videoRef.current) {
      videoRef.current.seek(position);
    }
  };

  const renderImagePreview = () => {
    if (!file) return null;

    return (
      <View style={styles.mediaContainer}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading image...
            </Text>
          </View>
        )}
        
        {imageError ? (
          <View style={styles.errorContainer}>
            <Icon name="image-outline" size={moderateScale(64)} color={colors.textSecondary} />
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              Failed to load image
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            maximumZoomScale={5}
            minimumZoomScale={0.5}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => {
              const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
              const scale = Math.max(contentSize.width / layoutMeasurement.width, 1);
              setImageScale(scale);
            }}
          >
            <Image
              source={{ uri: file.uri }}
              style={[
                styles.image,
                {
                  width: screenWidth * 0.9,
                  height: screenHeight * 0.6,
                }
              ]}
              resizeMode="contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </ScrollView>
        )}
      </View>
    );
  };

  const renderVideoPreview = () => {
    if (!file) return null;

    return (
      <View style={styles.mediaContainer}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading video...
            </Text>
          </View>
        )}
        
        {videoError ? (
          <View style={styles.errorContainer}>
            <Icon name="videocam-outline" size={moderateScale(64)} color={colors.textSecondary} />
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              Failed to load video
            </Text>
          </View>
        ) : (
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              source={{ uri: file.uri }}
              style={styles.video}
              paused={!isVideoPlaying}
              onLoad={handleVideoLoad}
              onError={handleVideoError}
              onProgress={handleVideoProgress}
              resizeMode="contain"
              controls={false}
            />
            
            <View style={styles.videoOverlay}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={toggleVideoPlayback}
              >
                <Icon
                  name={isVideoPlaying ? 'pause' : 'play'}
                  size={moderateScale(40)}
                  color="white"
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.videoControls}>
              <Text style={[styles.timeText, { color: 'white' }]}>
                {Math.floor(videoProgress / 60)}:{(videoProgress % 60).toFixed(0).padStart(2, '0')}
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(videoProgress / videoDuration) * 100}%` }
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.timeText, { color: 'white' }]}>
                {Math.floor(videoDuration / 60)}:{(videoDuration % 60).toFixed(0).padStart(2, '0')}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderAudioPreview = () => {
    if (!file) return null;

    return (
      <View style={styles.mediaContainer}>
        <View style={styles.audioContainer}>
          <Icon name="musical-notes" size={moderateScale(80)} color={colors.accent} />
          <Text style={[styles.audioTitle, { color: colors.text }]}>
            Audio File
          </Text>
          <Text style={[styles.audioFileName, { color: colors.textSecondary }]}>
            {file.name}
          </Text>
          <Text style={[styles.audioFileSize, { color: colors.textSecondary }]}>
            {formatFileSize(file.size)}
          </Text>
          
          <View style={styles.audioControls}>
            <TouchableOpacity style={styles.audioControlButton}>
              <Icon name="play" size={moderateScale(24)} color={colors.accent} />
            </TouchableOpacity>
            <View style={styles.audioWaveform}>
              <View style={[styles.waveBar, { height: 20, backgroundColor: colors.accent }]} />
              <View style={[styles.waveBar, { height: 15, backgroundColor: colors.accent }]} />
              <View style={[styles.waveBar, { height: 25, backgroundColor: colors.accent }]} />
              <View style={[styles.waveBar, { height: 10, backgroundColor: colors.accent }]} />
              <View style={[styles.waveBar, { height: 30, backgroundColor: colors.accent }]} />
              <View style={[styles.waveBar, { height: 18, backgroundColor: colors.accent }]} />
              <View style={[styles.waveBar, { height: 22, backgroundColor: colors.accent }]} />
              <View style={[styles.waveBar, { height: 12, backgroundColor: colors.accent }]} />
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFilePreview = () => {
    if (!file) return null;

    const fileIcon = getFileIcon(file.type);

    return (
      <View style={styles.mediaContainer}>
        <View style={styles.fileContainer}>
          <View style={[styles.fileIconContainer, { backgroundColor: colors.accent + '20' }]}>
            <Icon name={fileIcon} size={moderateScale(64)} color={colors.accent} />
          </View>
          
          <Text style={[styles.fileName, { color: colors.text }]}>
            {file.name}
          </Text>
          
          <View style={styles.fileInfo}>
            <View style={styles.fileInfoRow}>
              <Text style={[styles.fileInfoLabel, { color: colors.textSecondary }]}>
                Type:
              </Text>
              <Text style={[styles.fileInfoValue, { color: colors.text }]}>
                {file.type || 'Unknown'}
              </Text>
            </View>
            
            <View style={styles.fileInfoRow}>
              <Text style={[styles.fileInfoLabel, { color: colors.textSecondary }]}>
                Size:
              </Text>
              <Text style={[styles.fileInfoValue, { color: colors.text }]}>
                {formatFileSize(file.size)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderMediaContent = () => {
    switch (mediaType) {
      case 'image':
        return renderImagePreview();
      case 'video':
        return renderVideoPreview();
      case 'audio':
        return renderAudioPreview();
      case 'file':
        return renderFilePreview();
      default:
        return null;
    }
  };

  if (!file) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              Preview {mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={moderateScale(24)} color={colors.text} />
            </TouchableOpacity>
          </View>

          {renderMediaContent()}

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.accent }]}
              onPress={() => onConfirm(file)}
            >
              <Text style={[styles.confirmButtonText, { color: 'white' }]}>
                Use This File
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: wp(95),
    height: hp(85),
    borderRadius: moderateScale(20),
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(16),
    borderBottomWidth: 1,
  },
  title: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
  },
  closeButton: {
    padding: moderateScale(4),
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(20),
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    borderRadius: moderateScale(8),
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoControls: {
    position: 'absolute',
    bottom: moderateScale(20),
    left: moderateScale(20),
    right: moderateScale(20),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(20),
  },
  timeText: {
    fontSize: responsiveFont(12),
    fontWeight: '500',
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: moderateScale(12),
  },
  progressBar: {
    height: moderateScale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: moderateScale(2),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
  },
  audioContainer: {
    alignItems: 'center',
    padding: moderateScale(20),
  },
  audioTitle: {
    fontSize: responsiveFont(20),
    fontWeight: '600',
    marginTop: moderateScale(16),
  },
  audioFileName: {
    fontSize: responsiveFont(16),
    marginTop: moderateScale(8),
    textAlign: 'center',
  },
  audioFileSize: {
    fontSize: responsiveFont(14),
    marginTop: moderateScale(4),
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateScale(24),
    width: '100%',
  },
  audioControlButton: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(16),
  },
  audioWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: moderateScale(40),
  },
  waveBar: {
    width: moderateScale(4),
    borderRadius: moderateScale(2),
  },
  fileContainer: {
    alignItems: 'center',
    padding: moderateScale(20),
  },
  fileIconContainer: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(20),
  },
  fileName: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: moderateScale(16),
  },
  fileInfo: {
    width: '100%',
  },
  fileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: moderateScale(8),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  fileInfoLabel: {
    fontSize: responsiveFont(14),
    fontWeight: '500',
  },
  fileInfoValue: {
    fontSize: responsiveFont(14),
    flex: 1,
    textAlign: 'right',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(40),
  },
  loadingText: {
    fontSize: responsiveFont(14),
    marginTop: moderateScale(8),
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(40),
  },
  errorText: {
    fontSize: responsiveFont(14),
    marginTop: moderateScale(8),
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(16),
    borderTopWidth: 1,
    gap: moderateScale(12),
  },
  cancelButton: {
    flex: 1,
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: responsiveFont(16),
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
  },
});

export default MediaPreview;
