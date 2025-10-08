import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { fileService, FileData } from '@/services/fileService';
import { MessageData } from '@/services/chatService';
import MessageStatusIndicator from '@/components/MessageStatusIndicator';
import MediaViewer from '@/components/MediaViewer';

interface FileMessageBubbleProps {
  message: MessageData;
  isOwn: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

const FileMessageBubble: React.FC<FileMessageBubbleProps> = ({
  message,
  isOwn,
  onPress,
  onLongPress,
}) => {
  const { colors } = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isMediaViewerVisible, setIsMediaViewerVisible] = useState(false);

  const fileMetadata = message.mediaMetadata;
  const fileUrl = message.mediaUrl;

  const getFileIcon = useCallback((mimeType: string) => {
    return fileService.getFileIcon(mimeType);
  }, []);

  const getFileTypeCategory = useCallback((mimeType: string) => {
    return fileService.getFileTypeCategory(mimeType);
  }, []);

  const formatFileSize = useCallback((size: number) => {
    return fileService.formatFileSize(size);
  }, []);

  const handleFilePress = useCallback(async () => {
    if (!fileMetadata || !fileUrl) return;

    const fileCategory = getFileTypeCategory(fileMetadata.fileType);
    
    // For media files (images, videos, audio), open in media viewer
    if (fileCategory === 'image' || fileCategory === 'video' || fileCategory === 'audio') {
      setIsMediaViewerVisible(true);
      return;
    }

    // For documents, try to open with external app
    try {
      const canOpen = await Linking.canOpenURL(fileUrl);
      if (canOpen) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert('Error', 'Cannot open this file type');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  }, [fileMetadata, fileUrl, getFileTypeCategory]);

  const handleLongPress = useCallback(() => {
    onLongPress?.();
  }, [onLongPress]);

  if (!fileMetadata) {
    return (
      <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Invalid file message
        </Text>
      </View>
    );
  }

  const fileCategory = getFileTypeCategory(fileMetadata.fileType);
  const fileIcon = getFileIcon(fileMetadata.fileType);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.container,
          isOwn ? styles.ownContainer : styles.otherContainer,
          { backgroundColor: isOwn ? colors.accent : colors.surface },
        ]}
        onPress={handleFilePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        {/* File Icon */}
        <View style={[styles.fileIcon, { backgroundColor: colors.background + '20' }]}>
          {fileCategory === 'image' && fileUrl ? (
            <Image
              source={{ uri: fileUrl }}
              style={styles.fileImage}
              resizeMode="cover"
            />
          ) : (
            <Icon name={fileIcon} size={moderateScale(24)} color={colors.text} />
          )}
        </View>

      {/* File Info */}
      <View style={styles.fileInfo}>
        <Text
          style={[
            styles.fileName,
            { color: isOwn ? '#FFFFFF' : colors.text },
          ]}
          numberOfLines={2}
        >
          {fileMetadata.fileName}
        </Text>
        <Text
          style={[
            styles.fileSize,
            { color: isOwn ? '#FFFFFF' : colors.textSecondary },
          ]}
        >
          {formatFileSize(fileMetadata.fileSize)}
        </Text>
        <Text
          style={[
            styles.fileType,
            { color: isOwn ? '#FFFFFF' : colors.textSecondary },
          ]}
        >
          {fileCategory.toUpperCase()}
        </Text>
      </View>

      {/* Download Status */}
      <View style={styles.downloadStatus}>
        {isDownloading ? (
          <View style={styles.downloadingContainer}>
            <ActivityIndicator
              size="small"
              color={isOwn ? '#FFFFFF' : colors.accent}
            />
            <Text
              style={[
                styles.downloadText,
                { color: isOwn ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {downloadProgress}%
            </Text>
          </View>
        ) : isDownloaded ? (
          <Icon
            name="checkmark-circle"
            size={moderateScale(20)}
            color={isOwn ? '#FFFFFF' : colors.accent}
          />
        ) : (
          <Icon
            name="download-outline"
            size={moderateScale(20)}
            color={isOwn ? '#FFFFFF' : colors.textSecondary}
          />
        )}
      </View>

      {/* Download Progress Bar */}
      {isDownloading && (
        <View style={[styles.progressBar, { backgroundColor: colors.background + '40' }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: isOwn ? '#FFFFFF' : colors.accent,
                width: `${downloadProgress}%`,
              },
            ]}
          />
        </View>
      )}

      {/* Message Status Indicator - Only show for own messages */}
      {isOwn && (
        <View style={styles.statusContainer}>
          <MessageStatusIndicator
            status={message.status || 'sent'}
            showText={true}
            showIcon={true}
            size="small"
            readCount={message.read_by?.length || 0}
            totalRecipients={1} // For direct chats, this would be 1
            canRetry={message.status === 'failed'}
            onRetry={() => {
              // Handle retry logic here
              console.log('Retrying file message:', message.id);
            }}
          />
        </View>
      )}
    </TouchableOpacity>

    {/* Media Viewer Modal */}
    <MediaViewer
      visible={isMediaViewerVisible}
      onClose={() => setIsMediaViewerVisible(false)}
      mediaUrl={fileUrl || ''}
      mediaType={fileCategory as 'image' | 'video' | 'audio' | 'document'}
      fileName={fileMetadata.fileName}
      fileSize={fileMetadata.fileSize}
    />
  </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    marginVertical: hp(0.5),
    borderRadius: moderateScale(12),
    maxWidth: wp(80),
    minHeight: moderateScale(80),
  },
  ownContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  fileIcon: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
    overflow: 'hidden',
  },
  fileImage: {
    width: '100%',
    height: '100%',
  },
  fileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    marginBottom: hp(0.2),
  },
  fileSize: {
    fontSize: responsiveFont(12),
    marginBottom: hp(0.1),
  },
  fileType: {
    fontSize: responsiveFont(10),
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  downloadStatus: {
    marginLeft: wp(2),
    alignItems: 'center',
  },
  downloadingContainer: {
    alignItems: 'center',
  },
  downloadText: {
    fontSize: responsiveFont(10),
    marginTop: hp(0.2),
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: moderateScale(2),
    borderRadius: moderateScale(1),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: moderateScale(1),
  },
  errorText: {
    fontSize: responsiveFont(12),
    fontStyle: 'italic',
  },
  statusContainer: {
    position: 'absolute',
    bottom: moderateScale(4),
    right: moderateScale(4),
  },
});

export default FileMessageBubble;
