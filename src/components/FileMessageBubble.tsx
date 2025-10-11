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
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { fileService, FileData } from '@/services/fileService';
import { MessageData } from '@/services/chatService';
import MessageStatusIndicator from '@/components/MessageStatusIndicator';
import MediaViewer from '@/components/MediaViewer';
import { permissionService } from '@/services/permissionService';

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

  const fileMetadata = message.media_metadata;
  const fileUrl = message.media_url;

  const getFileIcon = useCallback((mimeType: string | undefined) => {
    return fileService.getFileIcon(mimeType);
  }, []);

  const getFileTypeCategory = useCallback((mimeType: string | undefined) => {
    return fileService.getFileTypeCategory(mimeType);
  }, []);

  const formatFileSize = useCallback((size: number) => {
    return fileService.formatFileSize(size);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!fileMetadata || !fileUrl) return;

    try {
      // Request storage permissions before downloading
      const permissionResult = await permissionService.requestStoragePermissions();
      
      if (!permissionResult.granted) {
        if (!permissionResult.canAskAgain) {
          Alert.alert(
            'Storage Permission Required',
            'Storage permission is required to download files. Please enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        } else {
          Alert.alert(
            'Storage Permission Required',
            'Storage permission is required to download files. Please grant permission to continue.',
            [{ text: 'OK' }]
          );
        }
        return;
      }

      setIsDownloading(true);
      setDownloadProgress(0);

      // Create a mock file ID for download (you might need to adjust this based on your API)
      const fileId = fileMetadata.fileId || 'temp-file-id';
      
      const result = await fileService.downloadFile(
        fileId,
        fileMetadata.fileName,
        (progress) => {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          setDownloadProgress(percentage);
        }
      );

      if (result.success) {
        setIsDownloaded(true);
        Alert.alert('Success', 'File downloaded successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to download file');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }, [fileMetadata, fileUrl]);

  const handleFilePress = useCallback(async () => {
    if (!fileMetadata || !fileUrl) return;

    const fileCategory = getFileTypeCategory(fileMetadata.fileType || fileMetadata.mimeType);
    
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
        <Text style={[styles.errorText, { color: '#666666' }]}>
          Invalid file message
        </Text>
      </View>
    );
  }

  const fileCategory = getFileTypeCategory(fileMetadata?.fileType || fileMetadata?.mimeType);
  const fileIcon = getFileIcon(fileMetadata?.fileType || fileMetadata?.mimeType);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.container,
          isOwn ? styles.ownContainer : styles.otherContainer,
          isOwn ? styles.ownBubble : styles.otherBubble,
          {
            backgroundColor: isOwn ? colors.chatBubble : colors.chatBubbleOther,
            borderColor: isOwn ? colors.chatBubble : colors.chatBubbleOther,
          },
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

        {/* File Info Container */}
        <View style={styles.fileInfoContainer}>
          <View style={styles.fileInfo}>
            <Text
              style={[
                styles.fileName,
                { color: isOwn ? colors.chatBubbleText : colors.chatBubbleTextOther },
              ]}
              numberOfLines={2}
            >
              {fileMetadata.fileName}
            </Text>
            <Text
              style={[
                styles.fileSize,
                { color: isOwn ? colors.chatBubbleText : colors.chatBubbleTextOther },
              ]}
            >
              {formatFileSize(fileMetadata.fileSize)}
            </Text>
            <Text
              style={[
                styles.fileType,
                { color: isOwn ? colors.chatBubbleText : colors.chatBubbleTextOther },
              ]}
            >
              {fileCategory.toUpperCase()}
            </Text>
          </View>
          
          {/* Message Status Indicator - Only show for own messages */}
          {isOwn && (
            <View style={styles.statusContainer}>
              <MessageStatusIndicator
                status={message.status || 'sent'}
                showText={false} // No text, only icon
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
        </View>

      {/* Download Status */}
      <TouchableOpacity 
        style={styles.downloadStatus}
        onPress={handleDownload}
        disabled={isDownloading || isDownloaded}
        activeOpacity={0.7}
      >
        {isDownloading ? (
          <View style={styles.downloadingContainer}>
            <ActivityIndicator
              size="small"
              color={isOwn ? colors.chatBubbleText : colors.accent}
            />
            <Text
              style={[
                styles.downloadText,
                { color: isOwn ? '#FFFFFF' : '#666666' },
              ]}
            >
              {downloadProgress}%
            </Text>
          </View>
        ) : isDownloaded ? (
          <Icon
            name="checkmark-circle"
            size={moderateScale(20)}
            color={isOwn ? colors.chatBubbleText : colors.accent}
          />
        ) : (
          <Icon
            name="download-outline"
            size={moderateScale(20)}
            color={isOwn ? colors.textOnPrimary : '#666666'}
          />
        )}
      </TouchableOpacity>

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
    paddingVertical: hp(1.2),
    borderRadius: moderateScale(18),
    marginVertical: hp(0.3),
    maxWidth: wp(85), // Increased width to reduce wrapping
    minHeight: moderateScale(80),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  ownBubble: {
    borderBottomRightRadius: moderateScale(4), // Pointed edge on bottom right (sender's side)
  },
  otherBubble: {
    borderBottomLeftRadius: moderateScale(4), // Pointed edge on bottom left (receiver's side)
    borderWidth: 1,
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
  fileInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    maxWidth: '100%',
  },
  fileInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: wp(1),
    minWidth: 0,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: wp(1),
    flexShrink: 0,
  },
});

export default FileMessageBubble;
