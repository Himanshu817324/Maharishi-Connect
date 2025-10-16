import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { permissionService } from '@/services/permissionService';
import { lightweightImagePicker } from '@/services/lightweightImagePicker';
import { pick as DocumentPicker, errorCodes } from '@react-native-documents/picker';
import { fileUploadService } from '@/services/fileUploadService';
import Toast from 'react-native-toast-message';
import MediaPreview from './MediaPreview';

interface MediaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onFileSelected: (file: any, type: 'image' | 'video' | 'audio' | 'file') => void;
  onUploadAndShare?: (file: any, type: 'image' | 'video' | 'audio' | 'file') => Promise<void>;
  chatId?: string;
  userId?: string;
}

interface MediaOption {
  id: string;
  title: string;
  icon: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'camera' | 'gallery';
  description: string;
  requiresPermission?: string[];
}

const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  visible,
  onClose,
  onFileSelected,
  onUploadAndShare,
  chatId,
  userId,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewMediaType, setPreviewMediaType] = useState<'image' | 'video' | 'audio' | 'file'>('file');

  useEffect(() => {
    if (visible) {
      checkAllPermissions();
    }
  }, [visible]);

  const checkAllPermissions = async () => {
    // Checking all media permissions
    
    try {
      const permissionResults = await Promise.all([
        permissionService.requestCameraPermission(),
        permissionService.requestStoragePermissions(),
      ]);

      setPermissions({
        camera: permissionResults[0].granted,
        storage: permissionResults[1].granted,
      });

      // Permission results logged
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      // Set all permissions to false if there's an error
      setPermissions({
        camera: false,
        storage: false,
      });
    }
  };

  const mediaOptions: MediaOption[] = [
    {
      id: 'camera',
      title: 'Camera',
      icon: 'camera',
      type: 'camera',
      description: 'Take a photo or video',
      requiresPermission: ['camera'],
    },
    {
      id: 'gallery',
      title: 'Gallery',
      icon: 'images',
      type: 'gallery',
      description: 'Choose from gallery',
      requiresPermission: ['storage'],
    },
    {
      id: 'video',
      title: 'Video',
      icon: 'videocam',
      type: 'video',
      description: 'Select videos',
      requiresPermission: ['storage'],
    },
    {
      id: 'document',
      title: 'Document',
      icon: 'document',
      type: 'file',
      description: 'Select documents',
      requiresPermission: ['storage'],
    },
    {
      id: 'audio',
      title: 'Audio',
      icon: 'musical-notes',
      type: 'audio',
      description: 'Record or select audio',
      requiresPermission: ['storage'],
    },
  ];

  const handleOptionPress = async (option: MediaOption) => {
    // Media option selected

    setIsLoading(true);

    try {
      switch (option.type) {
        case 'camera':
          await handleCameraPress();
          break;
        case 'gallery':
          await handleGalleryPress();
          break;
        case 'video':
          await handleVideoPress();
          break;
        case 'file':
          await handleDocumentPress();
          break;
        case 'audio':
          await handleAudioPress();
          break;
      }
    } catch (error) {
      console.error('Error handling media option:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to access media',
      });
      setIsLoading(false);
    }
  };

  const handleCameraPress = async () => {
    try {
      // Opening camera
      
      // Request camera permission first
      const permissionResult = await permissionService.requestCameraPermission();
      // Camera permission result
      
      if (!permissionResult.granted) {
        // Camera permission denied
        Toast.show({
          type: 'error',
          text1: 'Permission Required',
          text2: 'Camera permission is required to take photos',
        });
        return;
      }
      
        // Camera permission granted, launching camera
      const result = await lightweightImagePicker.takePhoto();
      // Camera result
      
      if (result.success && result.files.length > 0) {
        const file = result.files[0];
        // Photo captured
        
        // Show preview instead of directly processing
        showPreview(file, 'image');
      } else if (result.error) {
        // Camera error
        throw new Error(result.error);
      } else {
        // Camera cancelled or no files selected
      }
    } catch (error) {
      console.error('Camera error:', error);
      Toast.show({
        type: 'error',
        text1: 'Camera Error',
        text2: error instanceof Error ? error.message : 'Failed to access camera',
      });
    } finally {
      // Camera handler finished
      setIsLoading(false);
    }
  };

  const handleGalleryPress = async () => {
    try {
      // Opening gallery
      
      // Request storage permission first
      const permissionResult = await permissionService.requestStoragePermissions();
      // Storage permission result
      
      if (!permissionResult.granted) {
        // Storage permission denied
        Toast.show({
          type: 'error',
          text1: 'Permission Required',
          text2: 'Storage permission is required to access gallery',
        });
        return;
      }
      
        // Storage permission granted, launching gallery
      const result = await lightweightImagePicker.pickImages(10); // Allow multiple selection
      // Gallery result
      
      if (result.success && result.files.length > 0) {
        // Images selected
        
        // For multiple files, show preview for the first one
        // In a more advanced implementation, you could show a carousel
        const file = result.files[0];
        const fileType = file.type?.startsWith('video/') ? 'video' : 'image';
        // Showing preview for file
        
        showPreview(file, fileType);
      } else if (result.error) {
        // Gallery error
        throw new Error(result.error);
      } else {
        // Gallery cancelled or no files selected
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Toast.show({
        type: 'error',
        text1: 'Gallery Error',
        text2: error instanceof Error ? error.message : 'Failed to access gallery',
      });
    } finally {
      // Gallery handler finished
      setIsLoading(false);
    }
  };

  const handleVideoPress = async () => {
    try {
      // Opening video picker
      
      // Request storage permission first
      const permissionResult = await permissionService.requestStoragePermissions();
      // Storage permission result
      
      if (!permissionResult.granted) {
        // Storage permission denied
        Toast.show({
          type: 'error',
          text1: 'Permission Required',
          text2: 'Storage permission is required to access videos',
        });
        return;
      }
      
      // Storage permission granted, launching video picker
      const result = await lightweightImagePicker.pickVideos(10); // Allow multiple selection
      // Video picker result
      
      if (result.success && result.files.length > 0) {
        // Videos selected
        
        // Show preview for the first video
        const file = result.files[0];
        // Showing preview for video
        
        showPreview(file, 'video');
      } else if (result.error) {
        // Video picker error
        throw new Error(result.error);
      } else {
        // Video picker cancelled or no files selected
      }
    } catch (error) {
      console.error('Video picker error:', error);
      Toast.show({
        type: 'error',
        text1: 'Video Error',
        text2: error instanceof Error ? error.message : 'Failed to access videos',
      });
    } finally {
      // Video handler finished
      setIsLoading(false);
    }
  };

  const handleDocumentPress = async () => {
    try {
      // Opening document picker
      
      // DocumentPicker doesn't need explicit permissions on Android 13+
      // It uses the system file picker which handles permissions internally
      // DocumentPicker handles permissions internally
      
      const result = await DocumentPicker({
        type: ['*/*'], // Use MIME type instead of DocumentPicker.types
        allowMultiSelection: true,
      });

      // Document picker result

      if (result && result.length > 0) {
        // Documents selected
        
        // Show preview for the first document
        const doc = result[0];
        const file = {
          uri: doc.uri,
          name: doc.name || 'document',
          type: doc.type || 'application/octet-stream',
          size: doc.size || 0,
        };

        const fileType = getFileTypeFromMime(doc.type || '');
        // Showing preview for document
        
        showPreview(file, fileType);
      } else {
        // No documents selected
      }
    } catch (error) {
      console.error('📄 Document picker error:', error);
      if (error?.code === errorCodes.canceled || error?.message?.includes('cancel')) {
        // Document picker cancelled
      } else {
        Toast.show({
          type: 'error',
          text1: 'Document Error',
          text2: 'Failed to select documents',
        });
      }
    } finally {
      // Document handler finished
      setIsLoading(false);
    }
  };

  const handleAudioPress = async () => {
    try {
      // Opening audio picker
      
      // DocumentPicker doesn't need explicit permissions on Android 13+
      // It uses the system file picker which handles permissions internally
      // DocumentPicker handles permissions internally
      
      const result = await DocumentPicker({
        type: ['audio/*'], // Use MIME type instead of DocumentPicker.types
        allowMultiSelection: true,
      });

      // Audio picker result

      if (result && result.length > 0) {
        // Audio files selected
        
        // Show preview for the first audio file
        const audio = result[0];
        const file = {
          uri: audio.uri,
          name: audio.name || 'audio',
          type: audio.type || 'audio/mpeg',
          size: audio.size || 0,
        };
        
        // Showing preview for audio file
        
        showPreview(file, 'audio');
      } else {
        // No audio files selected
      }
    } catch (error) {
      console.error('🎵 Audio picker error:', error);
      if (error?.code === errorCodes.canceled || error?.message?.includes('cancel')) {
        // Audio picker cancelled
      } else {
        Toast.show({
          type: 'error',
          text1: 'Audio Error',
          text2: 'Failed to select audio files',
        });
      }
    } finally {
      // Audio handler finished
      setIsLoading(false);
    }
  };

  const getFileTypeFromMime = (mimeType: string): 'image' | 'video' | 'audio' | 'file' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
  };

  const showPreview = (file: any, mediaType: 'image' | 'video' | 'audio' | 'file') => {
    // Showing preview for file
    setPreviewFile(file);
    setPreviewMediaType(mediaType);
    setPreviewVisible(true);
  };

  const handlePreviewConfirm = async (file: any) => {
    // Preview confirmed
    setPreviewVisible(false);
    
    try {
      if (onUploadAndShare && chatId && userId) {
        // Uploading and sharing file
        await onUploadAndShare(file, previewMediaType);
      } else {
        // Calling onFileSelected
        onFileSelected(file, previewMediaType);
      }
      onClose();
    } catch (error) {
      console.error('❌ Error after preview confirm:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to process file',
      });
    }
  };

  const handlePreviewClose = () => {
    // Preview closed
    setPreviewVisible(false);
    setPreviewFile(null);
  };

  const renderMediaOption = (option: MediaOption) => {
    // For now, let's enable all options and handle permissions in the handler
    const isDisabled = false; // Temporarily disable this check

    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.optionButton,
          {
            backgroundColor: isDisabled ? colors.border : colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => handleOptionPress(option)}
        disabled={isDisabled || isLoading}
      >
        <View style={styles.optionContent}>
          <View style={[
            styles.iconContainer,
            {
              backgroundColor: isDisabled ? colors.border : colors.accent + '20',
            }
          ]}>
            <Icon
              name={option.icon}
              size={moderateScale(24)}
              color={isDisabled ? colors.textSecondary : colors.accent}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[
              styles.optionTitle,
              {
                color: isDisabled ? colors.textSecondary : colors.text,
              }
            ]}>
              {option.title}
            </Text>
            <Text style={[
              styles.optionDescription,
              { color: colors.textSecondary }
            ]}>
              {option.description}
            </Text>
          </View>
          {isDisabled && (
            <Icon
              name="lock-closed"
              size={moderateScale(16)}
              color={colors.textSecondary}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
              Share Media
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={moderateScale(24)} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Choose what you want to share
            </Text>

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Processing...
                </Text>
              </View>
            )}

            <View style={styles.optionsContainer}>
              {mediaOptions.map(renderMediaOption)}
            </View>

            <View style={[styles.infoContainer, { backgroundColor: colors.accent + '10' }]}>
              <Icon name="information-circle" size={moderateScale(20)} color={colors.accent} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                All files are securely uploaded and shared with your chat participants.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Media Preview Modal */}
      <MediaPreview
        visible={previewVisible}
        onClose={handlePreviewClose}
        onConfirm={handlePreviewConfirm}
        file={previewFile}
        mediaType={previewMediaType}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    maxHeight: hp(80),
    minHeight: hp(50),
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
  content: {
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(16),
  },
  subtitle: {
    fontSize: responsiveFont(14),
    marginBottom: moderateScale(20),
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(20),
  },
  loadingText: {
    fontSize: responsiveFont(14),
    marginTop: moderateScale(8),
  },
  optionsContainer: {
    gap: moderateScale(12),
  },
  optionButton: {
    borderRadius: moderateScale(12),
    borderWidth: 1,
    padding: moderateScale(16),
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(16),
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: responsiveFont(16),
    fontWeight: '500',
    marginBottom: moderateScale(4),
  },
  optionDescription: {
    fontSize: responsiveFont(14),
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(16),
    borderRadius: moderateScale(12),
    marginTop: moderateScale(20),
  },
  infoText: {
    fontSize: responsiveFont(12),
    marginLeft: moderateScale(8),
    flex: 1,
  },
});

export default MediaPickerModal;
