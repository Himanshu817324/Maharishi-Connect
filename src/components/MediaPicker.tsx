import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { mediaService, MediaFile, MediaPickerResult } from '@/services/mediaService';
import Toast from 'react-native-toast-message';
import PermissionTest from './PermissionTest';

interface MediaPickerProps {
  onMediaSelected: (type: string, files: MediaFile[]) => void;
  onUploadComplete?: (files: MediaFile[]) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number;
  visible: boolean;
  onClose: () => void;
}

interface MediaOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  action: () => Promise<void>;
  maxCount?: number;
}

const MediaPicker: React.FC<MediaPickerProps> = ({
  onMediaSelected,
  onUploadComplete,
  onUploadError,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([]);
  const [showPermissionTest, setShowPermissionTest] = useState(false);

  const showError = useCallback((message: string) => {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: message,
    });
    onUploadError?.(message);
  }, [onUploadError]);

  const showSuccess = useCallback((message: string) => {
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: message,
    });
  }, []);

  const handleMediaResult = useCallback(async (result: MediaPickerResult, type: string) => {
    if (!result.success) {
      if (result.error !== 'User cancelled') {
        showError(result.error || 'Failed to pick media');
      }
      return;
    }

    if (result.files.length === 0) {
      showError('No files selected');
      return;
    }

    // Validate file sizes
    const oversizedFiles = result.files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      showError(`Some files exceed the maximum size of ${mediaService.formatFileSize(maxFileSize)}`);
      return;
    }

    setSelectedFiles(result.files);
    onMediaSelected(type, result.files);
    onUploadComplete?.(result.files);
    
    const fileCount = result.files.length;
    const fileType = fileCount === 1 ? 'file' : 'files';
    showSuccess(`${fileCount} ${fileType} selected successfully`);
    
    onClose();
  }, [maxFileSize, onMediaSelected, onUploadComplete, onClose, showError, showSuccess]);

  const pickImages = useCallback(async () => {
    setIsLoading(true);
    setLoadingType('images');
    
    try {
      const result = await mediaService.pickImages(10);
      await handleMediaResult(result, 'image');
    } catch (error) {
      showError('Failed to pick images');
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  }, [handleMediaResult, showError]);

  const pickVideos = useCallback(async () => {
    setIsLoading(true);
    setLoadingType('videos');
    
    try {
      const result = await mediaService.pickVideos(5);
      await handleMediaResult(result, 'video');
    } catch (error) {
      showError('Failed to pick videos');
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  }, [handleMediaResult, showError]);

  const pickAudio = useCallback(async () => {
    setIsLoading(true);
    setLoadingType('audio');
    
    try {
      const result = await mediaService.pickAudioFiles(5);
      await handleMediaResult(result, 'audio');
    } catch (error) {
      showError('Failed to pick audio files');
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  }, [handleMediaResult, showError]);

  const pickFiles = useCallback(async () => {
    setIsLoading(true);
    setLoadingType('files');
    
    try {
      const result = await mediaService.pickFiles(5);
      await handleMediaResult(result, 'file');
    } catch (error) {
      showError('Failed to pick files');
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  }, [handleMediaResult, showError]);

  const takePhoto = useCallback(async () => {
    setIsLoading(true);
    setLoadingType('camera');
    
    try {
      const result = await mediaService.takePhoto();
      await handleMediaResult(result, 'image');
    } catch (error) {
      showError('Failed to take photo');
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  }, [handleMediaResult, showError]);

  const recordVideo = useCallback(async () => {
    setIsLoading(true);
    setLoadingType('video');
    
    try {
      const result = await mediaService.recordVideo();
      await handleMediaResult(result, 'video');
    } catch (error) {
      showError('Failed to record video');
    } finally {
      setIsLoading(false);
      setLoadingType('');
    }
  }, [handleMediaResult, showError]);

  const mediaOptions: MediaOption[] = [
    {
      id: 'images',
      title: 'Images',
      subtitle: 'Select from gallery',
      icon: 'images-outline',
      color: '#7ED321',
      action: pickImages,
      maxCount: 10,
    },
    {
      id: 'camera',
      title: 'Camera',
      subtitle: 'Take a photo',
      icon: 'camera-outline',
      color: '#F5A623',
      action: takePhoto,
    },
    {
      id: 'videos',
      title: 'Videos',
      subtitle: 'Select from gallery',
      icon: 'videocam-outline',
      color: '#D0021B',
      action: pickVideos,
      maxCount: 5,
    },
    {
      id: 'record-video',
      title: 'Record Video',
      subtitle: 'Record a video',
      icon: 'videocam-outline',
      color: '#E74C3C',
      action: recordVideo,
    },
    {
      id: 'audio',
      title: 'Audio',
      subtitle: 'MP3, M4A, WAV files',
      icon: 'musical-notes-outline',
      color: '#9B59B6',
      action: pickAudio,
      maxCount: 5,
    },
    {
      id: 'files',
      title: 'Files',
      subtitle: 'PDF, DOCX, ZIP, etc.',
      icon: 'document-outline',
      color: '#4A90E2',
      action: pickFiles,
      maxCount: 5,
    },
  ];

  const renderMediaOption = (option: MediaOption) => {
    const isCurrentLoading = isLoading && loadingType === option.id;
    
    return (
      <TouchableOpacity
        key={option.id}
        style={[styles.optionButton, { backgroundColor: colors.surface }]}
        onPress={option.action}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
          {isCurrentLoading ? (
            <ActivityIndicator size="small" color={option.color} />
          ) : (
            <Icon name={option.icon} size={moderateScale(24)} color={option.color} />
          )}
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>
            {option.title}
          </Text>
          <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
            {option.subtitle}
            {option.maxCount && ` (max ${option.maxCount})`}
          </Text>
        </View>
        <Icon 
          name={isCurrentLoading ? "hourglass-outline" : "chevron-forward"} 
          size={moderateScale(20)} 
          color={isCurrentLoading ? option.color : colors.textSecondary} 
        />
      </TouchableOpacity>
    );
  };

  const renderSelectedFiles = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <View style={[styles.selectedFilesContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.selectedFilesTitle, { color: colors.text }]}>
          Selected Files ({selectedFiles.length})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {selectedFiles.map((file, index) => (
            <View key={index} style={styles.filePreview}>
              {mediaService.isImageFile(file) ? (
                <Image source={{ uri: file.uri }} style={styles.fileImage} />
              ) : (
                <View style={[styles.fileIcon, { backgroundColor: colors.accent + '20' }]}>
                  <Icon 
                    name={
                      mediaService.isVideoFile(file) ? 'videocam' :
                      mediaService.isAudioFile(file) ? 'musical-notes' :
                      'document'
                    } 
                    size={moderateScale(20)} 
                    color={colors.accent} 
                  />
                </View>
              )}
              <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                {mediaService.formatFileSize(file.size)}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} disabled={isLoading}>
            <Icon 
              name="close" 
              size={moderateScale(24)} 
              color={isLoading ? colors.textSecondary : colors.text} 
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Share Media
          </Text>
          <TouchableOpacity 
            onPress={() => setShowPermissionTest(true)}
            disabled={isLoading}
          >
            <Icon 
              name="settings" 
              size={moderateScale(24)} 
              color={isLoading ? colors.textSecondary : colors.accent} 
            />
          </TouchableOpacity>
        </View>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                {loadingType === 'images' && 'Loading images...'}
                {loadingType === 'videos' && 'Loading videos...'}
                {loadingType === 'audio' && 'Loading audio files...'}
                {loadingType === 'files' && 'Loading files...'}
                {loadingType === 'camera' && 'Opening camera...'}
                {loadingType === 'video' && 'Opening camera...'}
              </Text>
            </View>
          </View>
        )}

        {/* Selected Files Preview */}
        {renderSelectedFiles()}

        {/* Media Options */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.optionsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Choose Media Type
            </Text>
            {mediaOptions.map(renderMediaOption)}
          </View>

          {/* File Size Info */}
          <View style={[styles.infoContainer, { backgroundColor: colors.surface }]}>
            <Icon name="information-circle-outline" size={moderateScale(20)} color={colors.accent} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Maximum file size: {mediaService.formatFileSize(maxFileSize)}
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Supported formats: Images (JPEG, PNG, GIF), Videos (MP4, MOV), Audio (MP3, M4A, WAV)
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Permission Test Modal */}
      <PermissionTest
        visible={showPermissionTest}
        onClose={() => setShowPermissionTest(false)}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    paddingHorizontal: wp(8),
    paddingVertical: hp(4),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    minWidth: wp(60),
  },
  loadingText: {
    fontSize: responsiveFont(16),
    fontWeight: '500',
    marginTop: hp(2),
    textAlign: 'center',
  },
  selectedFilesContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    marginHorizontal: wp(4),
    marginVertical: hp(1),
    borderRadius: moderateScale(12),
  },
  selectedFilesTitle: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    marginBottom: hp(1),
  },
  filePreview: {
    alignItems: 'center',
    marginRight: wp(3),
    width: moderateScale(80),
  },
  fileImage: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(8),
    marginBottom: hp(0.5),
  },
  fileIcon: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  fileName: {
    fontSize: responsiveFont(10),
    textAlign: 'center',
    marginBottom: hp(0.2),
  },
  fileSize: {
    fontSize: responsiveFont(8),
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  optionsContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  sectionTitle: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    marginBottom: hp(2),
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    marginVertical: hp(0.5),
    borderRadius: moderateScale(12),
  },
  optionIcon: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(4),
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    marginBottom: hp(0.2),
  },
  optionSubtitle: {
    fontSize: responsiveFont(14),
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    marginHorizontal: wp(4),
    marginVertical: hp(1),
    borderRadius: moderateScale(12),
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: wp(2),
  },
  infoText: {
    fontSize: responsiveFont(12),
    lineHeight: responsiveFont(16),
    marginBottom: hp(0.5),
  },
});

export default MediaPicker;
