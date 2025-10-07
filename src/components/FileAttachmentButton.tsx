import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import FilePicker from './FilePicker';
import { FileData } from '@/services/fileService';
import { chatService } from '@/services/chatService';

interface FileAttachmentButtonProps {
  chatId: string;
  onFileSent?: (file: FileData) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

const FileAttachmentButton: React.FC<FileAttachmentButtonProps> = ({
  chatId,
  onFileSent,
  onError,
  disabled = false,
}) => {
  const { colors } = useTheme();
  const [isFilePickerVisible, setIsFilePickerVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelected = async (file: FileData) => {
    try {
      setIsUploading(true);
      
      // Send file message to chat
      const response = await chatService.sendFileMessage(chatId, {
        fileId: file.id,
        fileName: file.originalName,
        fileSize: file.size,
        fileType: file.mimeType,
        s3Key: file.s3Key,
        mediaUrl: file.mediaUrl,
      });

      if (response.status === 'SUCCESS') {
        onFileSent?.(file);
        Alert.alert('Success', 'File sent successfully');
      } else {
        throw new Error('Failed to send file message');
      }
    } catch (error) {
      console.error('Error sending file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send file';
      onError?.(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadError = (error: string) => {
    onError?.(error);
  };

  const handlePress = () => {
    if (disabled || isUploading) return;
    setIsFilePickerVisible(true);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: disabled ? colors.border : colors.accent,
          },
        ]}
        onPress={handlePress}
        disabled={disabled || isUploading}
        activeOpacity={0.7}
      >
        <Icon
          name={isUploading ? 'hourglass-outline' : 'attach-outline'}
          size={moderateScale(20)}
          color={disabled ? colors.textSecondary : '#FFFFFF'}
        />
      </TouchableOpacity>

      <FilePicker
        visible={isFilePickerVisible}
        onClose={() => setIsFilePickerVisible(false)}
        onFileSelected={handleFileSelected}
        onUploadError={handleUploadError}
        maxFileSize={50 * 1024 * 1024} // 50MB
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(2),
  },
});

export default FileAttachmentButton;

