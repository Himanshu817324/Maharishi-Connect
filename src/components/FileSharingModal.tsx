import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { fileUploadService } from '@/services/fileUploadService';
import Toast from 'react-native-toast-message';

interface FileSharingModalProps {
  visible: boolean;
  onClose: () => void;
  onFileShared: (file: any) => void;
  chatId: string;
  userId: string;
}

interface FileItem {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  s3Url?: string;
  uploadedAt: string;
}

const FileSharingModal: React.FC<FileSharingModalProps> = ({
  visible,
  onClose,
  onFileShared,
  chatId,
  userId,
}) => {
  const { colors } = useTheme();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadUserFiles();
    }
  }, [visible, userId]);

  const loadUserFiles = async () => {
    setLoading(true);
    try {
      console.log('📁 Loading user files for sharing...');
      const userFiles = await fileUploadService.getUserFiles(userId, 50, 0);
      console.log('📁 Loaded files:', userFiles.length);
      setFiles(userFiles);
    } catch (error) {
      console.error('Error loading files:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load files',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShareFile = async (file: FileItem) => {
    setSharing(file.id);
    try {
      console.log('📤 Sharing file:', file.originalName);
      
      const result = await fileUploadService.shareFileInChat(
        {
          id: file.id,
          s3Url: file.s3Url || '',
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          s3Key: file.id,
        },
        chatId,
        ''
      );

      if (result.success) {
        console.log('✅ File shared successfully');
        Toast.show({
          type: 'success',
          text1: 'File Shared',
          text2: `${file.originalName} shared successfully`,
        });
        onFileShared(file);
        onClose();
      } else {
        throw new Error(result.error || 'Failed to share file');
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      Toast.show({
        type: 'error',
        text1: 'Share Failed',
        text2: error instanceof Error ? error.message : 'Failed to share file',
      });
    } finally {
      setSharing(null);
    }
  };

  const handleDownloadFile = async (file: FileItem) => {
    try {
      console.log('📥 Downloading file:', file.originalName);
      const result = await fileUploadService.getFileDownloadUrl(file.id);
      
      if (result.success && result.downloadUrl) {
        // In a real app, you would use a library like react-native-share
        // or open the URL in a browser
        Alert.alert(
          'Download',
          `Download link: ${result.downloadUrl}`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(result.error || 'Failed to get download URL');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: error instanceof Error ? error.message : 'Failed to download file',
      });
    }
  };

  const renderFileItem = ({ item }: { item: FileItem }) => {
    const isSharing = sharing === item.id;
    const fileIcon = fileUploadService.getFileIcon(item.originalName, item.mimeType);
    const fileSize = fileUploadService.formatFileSize(item.size);

    return (
      <View style={[styles.fileItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.fileInfo}>
          <View style={[styles.fileIconContainer, { backgroundColor: colors.accent + '20' }]}>
            <Text style={styles.fileIcon}>{fileIcon}</Text>
          </View>
          <View style={styles.fileDetails}>
            <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
              {item.originalName}
            </Text>
            <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
              {fileSize} • {new Date(item.uploadedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.fileActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accent }]}
            onPress={() => handleShareFile(item)}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="send" size={moderateScale(16)} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.border }]}
            onPress={() => handleDownloadFile(item)}
          >
            <Icon name="download" size={moderateScale(16)} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="folder-open" size={moderateScale(48)} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No Files Available
      </Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Upload some files to share them in your chats
      </Text>
    </View>
  );

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
              Share Files
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={moderateScale(24)} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Loading files...
                </Text>
              </View>
            ) : (
              <FlatList
                data={files}
                renderItem={renderFileItem}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={files.length === 0 ? styles.emptyListContainer : undefined}
              />
            )}
          </View>
        </View>
      </View>
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
    flex: 1,
    paddingHorizontal: moderateScale(20),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: responsiveFont(14),
    marginTop: moderateScale(8),
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(16),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    marginVertical: moderateScale(4),
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(12),
  },
  fileIcon: {
    fontSize: moderateScale(20),
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: responsiveFont(14),
    fontWeight: '500',
    marginBottom: moderateScale(2),
  },
  fileSize: {
    fontSize: responsiveFont(12),
  },
  fileActions: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  actionButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: moderateScale(40),
  },
  emptyTitle: {
    fontSize: responsiveFont(16),
    fontWeight: '500',
    marginTop: moderateScale(16),
    marginBottom: moderateScale(8),
  },
  emptyDescription: {
    fontSize: responsiveFont(14),
    textAlign: 'center',
    paddingHorizontal: moderateScale(20),
  },
});

export default FileSharingModal;
