import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import OptimizedIcon from '@/components/atoms/ui/OptimizedIcon';
import { lightweightImagePicker } from '@/services/lightweightImagePicker';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { fileService, FileData } from '@/services/fileService';
import { permissionService } from '@/services/permissionService';

interface FilePickerProps {
  onFileSelected: (file: FileData) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (file: FileData) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number;
  allowedTypes?: string[];
  visible: boolean;
  onClose: () => void;
}

interface FileOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  action: () => void;
}

const FilePicker: React.FC<FilePickerProps> = ({
  onFileSelected,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  allowedTypes,
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const handleFileUpload = useCallback(async (fileUri: string, fileName: string, mimeType: string) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      const result = await fileService.uploadFile(
        fileUri,
        fileName,
        mimeType,
        (progress) => {
          setUploadProgress(progress.percentage);
          onUploadProgress?.(progress.percentage);
        }
      );

      if (result.status === 'SUCCESS' && result.file) {
        onFileSelected(result.file);
        onUploadComplete?.(result.file);
        setSelectedFile(null);
        onClose();
      } else {
        onUploadError?.(result.error || 'Upload failed');
        Alert.alert('Upload Failed', result.message);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
      Alert.alert('Upload Failed', 'An error occurred while uploading the file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onFileSelected, onUploadComplete, onUploadError, onUploadProgress, onClose]);

  const pickDocument = useCallback(async () => {
    try {
      // Use image picker for documents as well
      const result = await launchImageLibrary({
        mediaType: 'mixed' as MediaType,
        quality: 0.8,
        includeBase64: false,
        selectionLimit: 1,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        if (asset.uri && asset.fileName && asset.type) {
          // Validate file size
          if (asset.fileSize && asset.fileSize > maxFileSize) {
            Alert.alert(
              'File Too Large',
              `File size ${fileService.formatFileSize(asset.fileSize)} exceeds maximum allowed size ${fileService.formatFileSize(maxFileSize)}`
            );
            return;
          }

          // Validate file type
          if (allowedTypes && asset.type && !allowedTypes.includes(asset.type)) {
            Alert.alert('Invalid File Type', 'This file type is not allowed');
            return;
          }

          setSelectedFile(asset);
          await handleFileUpload(asset.uri, asset.fileName, asset.type);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  }, [maxFileSize, allowedTypes, handleFileUpload]);

  const pickImageFromGallery = useCallback(async () => {
    try {
      // Request permissions
      const permissions = await permissionService.requestAllMediaPermissions();
      if (!permissions.allGranted) {
        permissionService.showPermissionDeniedAlert('All', () => pickImageFromGallery());
        return;
      }

      const result = await lightweightImagePicker.pickImages(1);

      if (result.success && result.files.length > 0) {
        const file = result.files[0];
        
        // Validate file size
        if (file.size > maxFileSize) {
          Alert.alert(
            'File Too Large',
            `File size ${fileService.formatFileSize(file.size)} exceeds maximum allowed size ${fileService.formatFileSize(maxFileSize)}`
          );
          return;
        }

        setSelectedFile(file);
        await handleFileUpload(file.uri, file.name, file.type);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  }, [maxFileSize, handleFileUpload]);

  const takePhoto = useCallback(async () => {
    try {
      // Request permissions
      const permissions = await permissionService.requestAllMediaPermissions();
      if (!permissions.allGranted) {
        permissionService.showPermissionDeniedAlert('All', () => takePhoto());
        return;
      }

      const result = await lightweightImagePicker.takePhoto();

      if (result.success && result.files.length > 0) {
        const file = result.files[0];
        
        // Validate file size
        if (file.size > maxFileSize) {
          Alert.alert(
            'File Too Large',
            `File size ${fileService.formatFileSize(file.size)} exceeds maximum allowed size ${fileService.formatFileSize(maxFileSize)}`
          );
          return;
        }

        setSelectedFile(file);
        await handleFileUpload(file.uri, file.name, file.type);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  }, [handleFileUpload, maxFileSize]);

  const recordVideo = useCallback(async () => {
    try {
      // Request permissions
      const permissions = await permissionService.requestAllMediaPermissions();
      if (!permissions.allGranted) {
        permissionService.showPermissionDeniedAlert('All', () => recordVideo());
        return;
      }

      const result = await launchCamera({
        mediaType: 'video',
        quality: 0.8,
        videoQuality: 'high',
        includeBase64: false,
        cameraType: 'back',
        saveToPhotos: true,
        maxWidth: 1920,
        maxHeight: 1080,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        if (asset.uri && asset.fileName && asset.type) {
          // Validate file size
          if (asset.fileSize && asset.fileSize > maxFileSize) {
            Alert.alert(
              'File Too Large',
              `File size ${fileService.formatFileSize(asset.fileSize)} exceeds maximum allowed size ${fileService.formatFileSize(maxFileSize)}`
            );
            return;
          }

          setSelectedFile(asset);
          await handleFileUpload(asset.uri, asset.fileName, asset.type);
        }
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video');
    }
  }, [handleFileUpload, maxFileSize]);

  const fileOptions: FileOption[] = [
    {
      id: 'gallery',
      title: 'Gallery',
      subtitle: 'Photos and videos',
      icon: 'images-outline',
      color: '#7ED321',
      action: pickImageFromGallery,
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
      id: 'video',
      title: 'Record Video',
      subtitle: 'Record a video',
      icon: 'videocam-outline',
      color: '#D0021B',
      action: recordVideo,
    },
    {
      id: 'document',
      title: 'Document',
      subtitle: 'PDF, Word, Excel, etc.',
      icon: 'document-outline',
      color: '#4A90E2',
      action: pickDocument,
    },
  ];

  const renderFileOption = (option: FileOption) => (
    <TouchableOpacity
      key={option.id}
      style={[styles.optionButton, { backgroundColor: colors.surface }]}
      onPress={option.action}
      disabled={isUploading}
    >
      <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
        <OptimizedIcon name={option.icon} size={moderateScale(24)} color={option.color} />
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, { color: colors.text }]}>
          {option.title}
        </Text>
        <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
          {option.subtitle}
        </Text>
      </View>
      <OptimizedIcon name="chevron-forward" size={moderateScale(20)} color={colors.textSecondary} />
    </TouchableOpacity>
  );

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
          <TouchableOpacity onPress={onClose} disabled={isUploading}>
            <OptimizedIcon name="close" size={moderateScale(24)} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Add File
          </Text>
          <View style={{ width: moderateScale(24) }} />
        </View>

        {/* Upload Progress */}
        {isUploading && (
          <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressText, { color: colors.text }]}>
                Uploading...
              </Text>
              <Text style={[styles.progressPercentage, { color: colors.accent }]}>
                {uploadProgress}%
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${uploadProgress}%`,
                  },
                ]}
              />
            </View>
            {selectedFile && (
              <Text style={[styles.fileName, { color: colors.textSecondary }]}>
                {selectedFile.name || selectedFile.fileName}
              </Text>
            )}
          </View>
        )}

        {/* File Options */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.optionsContainer}>
            {fileOptions.map(renderFileOption)}
          </View>

          {/* File Size Info */}
          <View style={[styles.infoContainer, { backgroundColor: colors.surface }]}>
            <OptimizedIcon name="information-circle-outline" size={moderateScale(20)} color={colors.accent} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Maximum file size: {fileService.formatFileSize(maxFileSize)}
            </Text>
          </View>
        </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    marginHorizontal: wp(4),
    marginVertical: hp(1),
    borderRadius: moderateScale(12),
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  progressText: {
    fontSize: responsiveFont(14),
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
  },
  progressBar: {
    height: moderateScale(4),
    borderRadius: moderateScale(2),
    overflow: 'hidden',
    marginBottom: hp(0.5),
  },
  progressFill: {
    height: '100%',
    borderRadius: moderateScale(2),
  },
  fileName: {
    fontSize: responsiveFont(12),
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
  },
  optionsContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
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
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    marginHorizontal: wp(4),
    marginVertical: hp(1),
    borderRadius: moderateScale(12),
  },
  infoText: {
    fontSize: responsiveFont(12),
    marginLeft: wp(2),
    flex: 1,
  },
});

export default FilePicker;
