import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { fileUploadService } from '@/services/fileUploadService';
import MediaPreview from './MediaPreview';

interface FileMessageBubbleProps {
  message: {
    id: string;
    content?: string;
    mediaUrl?: string;
    media_url?: string;
    mediaMetadata?: {
      fileId?: string;
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      s3Key?: string;
    };
    message_type?: 'file' | 'image' | 'video' | 'audio' | 'text';
    sender_id: string;
    created_at: string;
  };
  isOwn: boolean;
  onDownload?: (url: string) => void;
  onPreview?: (url: string, type: string) => void;
}

const FileMessageBubble: React.FC<FileMessageBubbleProps> = ({
  message,
  isOwn,
  onDownload,
  onPreview,
}) => {
  const { colors } = useTheme();
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewMediaType, setPreviewMediaType] = useState<'image' | 'video' | 'audio' | 'file'>('file');

  const fileInfo = message.mediaMetadata || {};
  const fileName = fileInfo.fileName || 'Unknown file';
  const fileSize = fileInfo.fileSize || 0;
  const fileType = fileInfo.fileType || 'application/octet-stream';
  const mediaUrl = message.mediaUrl || message.media_url || '';
  const messageType = message.message_type || 'file';

  const fileIcon = fileUploadService.getFileIcon(fileName, fileType);
  const formattedSize = fileUploadService.formatFileSize(fileSize);

  const handleDownload = async () => {
    if (onDownload) {
      onDownload(mediaUrl);
      return;
    }

    setDownloading(true);
    try {
      console.log('📥 Downloading file:', fileName);
      
      if (mediaUrl) {
        // Try to open the URL directly
        const canOpen = await Linking.canOpenURL(mediaUrl);
        if (canOpen) {
          await Linking.openURL(mediaUrl);
        } else {
          Alert.alert(
            'Download',
            `File: ${fileName}\nSize: ${formattedSize}\nURL: ${mediaUrl}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Error', 'Download URL not available');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (onPreview) {
      onPreview(mediaUrl, messageType);
      return;
    }

    setPreviewing(true);
    try {
      console.log('👁️ Previewing file:', fileName);
      
      if (mediaUrl) {
        // Create a file object for the preview
        const file = {
          uri: mediaUrl,
          name: fileName,
          type: fileType,
          size: fileSize,
        };

        // Show preview instead of opening external link
        setPreviewFile(file);
        setPreviewMediaType(messageType as 'image' | 'video' | 'audio' | 'file');
        setPreviewVisible(true);
      } else {
        Alert.alert('Error', 'Preview URL not available');
      }
    } catch (error) {
      console.error('Preview error:', error);
      Alert.alert('Error', 'Failed to preview file');
    } finally {
      setPreviewing(false);
    }
  };

  const handlePreviewClose = () => {
    setPreviewVisible(false);
    setPreviewFile(null);
  };

  const handlePreviewConfirm = (_file: any) => {
    // For file messages, we don't need to do anything after preview
    // The preview is just for viewing, not for sharing
    setPreviewVisible(false);
    setPreviewFile(null);
  };

  const canPreview = ['image', 'video', 'audio'].includes(messageType);

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isOwn ? colors.chatBubble : colors.chatBubbleOther,
        borderColor: isOwn ? colors.chatBubble : colors.border,
      }
    ]}>
      <View style={styles.fileInfo}>
        <View style={[
          styles.iconContainer,
          {
            backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : colors.accent + '20',
          }
        ]}>
          <Text style={[
            styles.fileIcon,
            { color: isOwn ? '#FFFFFF' : colors.accent }
          ]}>
            {fileIcon}
          </Text>
        </View>
        
        <View style={styles.details}>
          <Text style={[
            styles.fileName,
            { color: isOwn ? '#FFFFFF' : colors.text }
          ]} numberOfLines={1}>
            {fileName}
          </Text>
          <Text style={[
            styles.fileSize,
            { color: isOwn ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
          ]}>
            {formattedSize}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {canPreview && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : colors.border,
              }
            ]}
            onPress={handlePreview}
            disabled={previewing}
          >
            {previewing ? (
              <ActivityIndicator size="small" color={isOwn ? '#FFFFFF' : colors.text} />
            ) : (
              <Icon
                name="eye"
                size={moderateScale(16)}
                color={isOwn ? '#FFFFFF' : colors.text}
              />
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : colors.border,
            }
          ]}
          onPress={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={isOwn ? '#FFFFFF' : colors.text} />
          ) : (
            <Icon
              name="download"
              size={moderateScale(16)}
              color={isOwn ? '#FFFFFF' : colors.text}
            />
          )}
        </TouchableOpacity>
      </View>

      {message.content && (
        <View style={styles.captionContainer}>
          <Text style={[
            styles.caption,
            { color: isOwn ? 'rgba(255,255,255,0.9)' : colors.text }
          ]}>
            {message.content}
          </Text>
        </View>
      )}

      {/* Media Preview Modal */}
      <MediaPreview
        visible={previewVisible}
        onClose={handlePreviewClose}
        onConfirm={handlePreviewConfirm}
        file={previewFile}
        mediaType={previewMediaType}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: moderateScale(12),
    borderWidth: 1,
    padding: moderateScale(12),
    maxWidth: wp(70),
    minWidth: wp(50),
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(8),
  },
  iconContainer: {
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
  details: {
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
  actions: {
    flexDirection: 'row',
    gap: moderateScale(8),
    marginBottom: moderateScale(4),
  },
  actionButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionContainer: {
    marginTop: moderateScale(8),
    paddingTop: moderateScale(8),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  caption: {
    fontSize: responsiveFont(14),
    lineHeight: responsiveFont(18),
  },
});

export default FileMessageBubble;
