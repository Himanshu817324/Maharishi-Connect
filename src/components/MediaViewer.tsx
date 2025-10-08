import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { Image } from 'react-native';
import { Video, ResizeMode } from 'react-native-video';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { fileService } from '@/services/fileService';

interface MediaViewerProps {
  visible: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  fileName?: string;
  fileSize?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MediaViewer: React.FC<MediaViewerProps> = ({
  visible,
  onClose,
  mediaUrl,
  mediaType,
  fileName,
  fileSize,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setError(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [visible, mediaUrl]);

  const handleClose = () => {
    setIsPlaying(false);
    onClose();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        url: mediaUrl,
        title: fileName || 'Shared Media',
      });
    } catch (error) {
      console.error('Error sharing media:', error);
      Alert.alert('Error', 'Failed to share media');
    }
  };

  const handleDownload = async () => {
    try {
      if (mediaType === 'image') {
        // For images, try to save to gallery
        Alert.alert(
          'Save Image',
          'Long-press the image and select "Save to Photos" to save it to your gallery.',
          [{ text: 'OK' }]
        );
      } else {
        // For other files, open in browser for download
        await Linking.openURL(mediaUrl);
        Alert.alert('Info', 'File opened in browser. You can download it manually.');
      }
    } catch (error) {
      console.error('Error downloading media:', error);
      Alert.alert('Error', 'Failed to download media');
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVideoLoad = (data: any) => {
    setDuration(data.duration);
    setIsLoading(false);
  };

  const handleVideoError = (error: any) => {
    console.error('Video error:', error);
    setError('Failed to load video');
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setError('Failed to load image');
    setIsLoading(false);
  };

  const handleOpenInExternalApp = async () => {
    try {
      const canOpen = await Linking.canOpenURL(mediaUrl);
      if (canOpen) {
        await Linking.openURL(mediaUrl);
      } else {
        Alert.alert('Error', 'Cannot open this file type');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const renderImage = () => (
    <View style={styles.mediaContainer}>
      <Image
        source={{ uri: mediaUrl }}
        style={styles.image}
        resizeMode="contain"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </View>
  );

  const renderVideo = () => (
    <View style={styles.mediaContainer}>
      <Video
        ref={videoRef}
        source={{ uri: mediaUrl }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        paused={!isPlaying}
        onLoad={handleVideoLoad}
        onError={handleVideoError}
        onProgress={(data) => setCurrentTime(data.currentTime)}
        onEnd={() => setIsPlaying(false)}
        controls={false}
      />
      {!isLoading && !error && (
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          activeOpacity={0.7}
        >
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={moderateScale(50)}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAudio = () => (
    <View style={styles.audioContainer}>
      <View style={[styles.audioIcon, { backgroundColor: colors.accent + '20' }]}>
        <Icon name="musical-notes" size={moderateScale(60)} color={colors.accent} />
      </View>
      <Text style={[styles.audioTitle, { color: colors.text }]}>
        {fileName || 'Audio File'}
      </Text>
      <Text style={[styles.audioSubtitle, { color: colors.textSecondary }]}>
        {fileSize ? fileService.formatFileSize(fileSize) : ''}
      </Text>
      <TouchableOpacity
        style={[styles.audioPlayButton, { backgroundColor: colors.accent }]}
        onPress={handlePlayPause}
        activeOpacity={0.7}
      >
        <Icon
          name={isPlaying ? 'pause' : 'play'}
          size={moderateScale(30)}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );

  const renderDocument = () => (
    <View style={styles.documentContainer}>
      <View style={[styles.documentIcon, { backgroundColor: colors.accent + '20' }]}>
        <Icon name="document" size={moderateScale(60)} color={colors.accent} />
      </View>
      <Text style={[styles.documentTitle, { color: colors.text }]}>
        {fileName || 'Document'}
      </Text>
      <Text style={[styles.documentSubtitle, { color: colors.textSecondary }]}>
        {fileSize ? fileService.formatFileSize(fileSize) : ''}
      </Text>
      <TouchableOpacity
        style={[styles.documentButton, { backgroundColor: colors.accent }]}
        onPress={handleOpenInExternalApp}
        activeOpacity={0.7}
      >
        <Icon name="open-outline" size={moderateScale(20)} color="#FFFFFF" />
        <Text style={styles.documentButtonText}>Open with External App</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={moderateScale(60)} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
            onPress={() => {
              setError(null);
              setIsLoading(true);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Icon name="hourglass-outline" size={moderateScale(60)} color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
        </View>
      );
    }

    switch (mediaType) {
      case 'image':
        return renderImage();
      case 'video':
        return renderVideo();
      case 'audio':
        return renderAudio();
      case 'document':
        return renderDocument();
      default:
        return renderDocument();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <StatusBar hidden />
      <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Icon name="close" size={moderateScale(24)} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {fileName || 'Media'}
            </Text>
            {fileSize && (
              <Text style={styles.headerSubtitle}>
                {fileService.formatFileSize(fileSize)}
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
              <Icon name="share-outline" size={moderateScale(24)} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDownload} style={styles.headerButton}>
              <Icon name="download-outline" size={moderateScale(24)} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Media Content */}
        <View style={styles.content}>
          {renderContent()}
        </View>
      </SafeAreaView>
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
    paddingVertical: hp(1),
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerButton: {
    padding: moderateScale(8),
  },
  headerInfo: {
    flex: 1,
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
    marginTop: hp(0.2),
  },
  headerActions: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContainer: {
    width: screenWidth,
    height: screenHeight * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  audioContainer: {
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  audioIcon: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  audioTitle: {
    fontSize: responsiveFont(20),
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
  },
  documentContainer: {
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  documentIcon: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  documentTitle: {
    fontSize: responsiveFont(20),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  documentSubtitle: {
    fontSize: responsiveFont(14),
    textAlign: 'center',
    marginBottom: hp(3),
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: moderateScale(25),
  },
  documentButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFont(16),
    fontWeight: '600',
    marginLeft: wp(2),
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: responsiveFont(16),
    marginTop: hp(2),
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  errorText: {
    fontSize: responsiveFont(16),
    textAlign: 'center',
    marginTop: hp(2),
    marginBottom: hp(3),
  },
  retryButton: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: moderateScale(25),
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFont(16),
    fontWeight: '600',
  },
});

export default MediaViewer;

