import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import MediaPickerModal from '../../MediaPickerModal';
import FileSharingModal from '../../FileSharingModal';
import { fileUploadService } from '@/services/fileUploadService';
import Toast from 'react-native-toast-message';

interface ChatInputProps {
  onSendMessage: (
    content: string,
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'file',
    mediaData?: {
      mediaUrl?: string;
      mediaMetadata?: {
        filename: string;
        size: number;
        mimeType: string;
      };
    }
  ) => void;
  placeholder?: string;
  disabled?: boolean;
  replyToMessage?: {
    id: string;
    content: string;
    sender: string;
  };
  onCancelReply?: () => void;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  screenInfo?: {
    width: number;
    height: number;
    isSmall: boolean;
    isMedium: boolean;
    isLarge: boolean;
    isTablet: boolean;
  };
  chatId?: string;
  userId?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  placeholder = 'Type a message...',
  disabled = false,
  replyToMessage,
  onCancelReply,
  onStartTyping,
  onStopTyping,
  screenInfo,
  chatId,
  userId,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showFileSharing, setShowFileSharing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [inputHeight, setInputHeight] = useState(40); // Track container height
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const styles = createStyles(screenInfo, insets);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      // Stop typing when message is sent
      onStopTyping?.();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleTextChange = (text: string) => {
    setMessage(text);

    // Handle typing indicators
    if (text.trim().length > 0) {
      onStartTyping?.();

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping?.();
      }, 3000);
    } else {
      onStopTyping?.();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    
    // Update container height based on TextInput content size
    const minHeight = 40;
    const maxHeight = 120; // Allow up to 5 lines
    const newHeight = Math.min(Math.max(height + 16, minHeight), maxHeight); // Add padding
    
    setInputHeight(newHeight);
  };

  const handleFileSelected = async (file: any, _type: 'image' | 'video' | 'audio' | 'file') => {
    try {
      setIsUploading(true);

      if (chatId && userId) {
        // Upload and share file
        const result = await fileUploadService.uploadAndShareFile(file, chatId, userId, message.trim());
        
        if (result.success) {
          // File uploaded and shared successfully
          Toast.show({
            type: 'success',
            text1: 'File Shared',
            text2: `${file.name || file.fileName} shared successfully`,
          });
          setMessage('');
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } else {
        // Send file as message
        onSendMessage(message.trim() || 'Shared a file', _type, {
          mediaUrl: file.uri,
          mediaMetadata: {
            filename: file.name || file.fileName || 'file',
            size: file.size || 0,
            mimeType: file.type || 'application/octet-stream',
          },
        });
        setMessage('');
      }
    } catch (error) {
      console.error('File upload error:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error instanceof Error ? error.message : 'Failed to upload file',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadAndShare = async (file: any, _type: 'image' | 'video' | 'audio' | 'file') => {
    if (!chatId || !userId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Chat ID or User ID not available',
      });
      return;
    }

    try {
      setIsUploading(true);
      const result = await fileUploadService.uploadAndShareFile(file, chatId, userId, message.trim());
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'File Shared',
          text2: `${file.name || file.fileName} shared successfully`,
        });
        setMessage('');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload and share error:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error instanceof Error ? error.message : 'Failed to upload file',
      });
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      {replyToMessage && (
        <View
          style={[
            styles.replyContainer,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <View style={styles.replyContent}>
            <Text style={[styles.replyLabel, { color: colors.textSecondary }]}>
              Replying to {replyToMessage.sender}
            </Text>
            <Text
              style={[styles.replyText, { color: colors.text }]}
              numberOfLines={1}
            >
              {replyToMessage.content}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCancelReply}
            style={styles.cancelReplyButton}
          >
            <Icon
              name="close"
              size={moderateScale(20)}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputContainer, { minHeight: inputHeight + 20 }]}>
        {/* Attach Button */}
        <TouchableOpacity
          style={[
            styles.attachButton,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
          onPress={() => setShowMediaPicker(true)}
          disabled={disabled || isUploading}
        >
          <Icon name="add" size={moderateScale(20)} color={colors.text} />
        </TouchableOpacity>

        {/* Files Button */}
        <TouchableOpacity
          style={[
            styles.filesButton,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
          onPress={() => setShowFileSharing(true)}
          disabled={disabled || isUploading}
        >
          <Icon name="folder" size={moderateScale(20)} color={colors.text} />
        </TouchableOpacity>

        {/* Text Input */}
        <View
          style={[
            styles.textInputContainer,
            { 
              backgroundColor: colors.background, 
              borderColor: colors.border,
              height: inputHeight, // Use dynamic height
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput, 
              { 
                color: colors.text,
              }
            ]}
            value={message}
            onChangeText={handleTextChange}
            onContentSizeChange={handleContentSizeChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            multiline={true}
            maxLength={1000}
            editable={!disabled && !isUploading}
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: message.trim() ? colors.tabBarBG : colors.border,
            },
          ]}
          onPress={handleSend}
          disabled={disabled || !message.trim() || isUploading}
        >
          <Icon
            name="send"
            size={moderateScale(20)}
            color={message.trim() ? colors.textOnPrimary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Media Picker Modal */}
      <MediaPickerModal
        visible={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onFileSelected={handleFileSelected}
        onUploadAndShare={handleUploadAndShare}
        chatId={chatId || ''}
        userId={userId || ''}
      />

      {/* File Sharing Modal */}
      <FileSharingModal
        visible={showFileSharing}
        onClose={() => setShowFileSharing(false)}
        onFileShared={(_file) => {
          // File is already shared, just close the modal
          setShowFileSharing(false);
        }}
        chatId={chatId || ''}
        userId={userId || ''}
      />
    </View>
  );
};

const createStyles = (screenInfo?: ChatInputProps['screenInfo'], _insets?: any) => StyleSheet.create({
  container: {
    borderTopWidth: 1,
    minHeight: moderateScale(50), // Minimum height
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'android' 
      ? (screenInfo?.isSmall ? hp(0.5) : screenInfo?.isTablet ? hp(1) : hp(0.8)) 
      : hp(1.5),
    position: 'relative',
    zIndex: 1000,
    // Container will grow with inputHeight
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(8),
    borderBottomWidth: 1,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: moderateScale(12),
    fontWeight: '500',
  },
  replyText: {
    fontSize: moderateScale(14),
    marginTop: moderateScale(2),
  },
  cancelReplyButton: {
    padding: moderateScale(4),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Changed from 'center' to 'flex-end' for better alignment with dynamic height
    paddingHorizontal: screenInfo?.isSmall ? wp(3) : wp(4),
    paddingVertical: Platform.OS === 'android' 
      ? (screenInfo?.isSmall ? hp(0.5) : screenInfo?.isTablet ? hp(1) : hp(0.8)) 
      : hp(1.2),
    minHeight: moderateScale(50), // Fixed minimum height
    justifyContent: 'space-between',
  },
  attachButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(8),
  },
  filesButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(8),
  },
  textInputContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: moderateScale(20),
    paddingHorizontal: screenInfo?.isSmall ? wp(2.5) : wp(3),
    paddingVertical: Platform.OS === 'android' 
      ? (screenInfo?.isSmall ? hp(0.8) : screenInfo?.isTablet ? hp(1.2) : hp(1)) 
      : hp(1.2),
    minHeight: moderateScale(40), // Minimum height for single line
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    // Height will be controlled dynamically by inputHeight state
  },
  textInput: {
    fontSize: screenInfo?.isSmall ? responsiveFont(15) : responsiveFont(16),
    lineHeight: 24,
    textAlignVertical: 'top',
    paddingVertical: 0,
    includeFontPadding: false,
    textAlign: 'left',
    flex: 1,
    minHeight: 24,
    // No maxHeight - let it fill the container
  },
  sendButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: moderateScale(8),
  },
});

export default ChatInput;
