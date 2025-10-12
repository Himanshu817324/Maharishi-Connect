import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { mediaService, MediaFile } from '@/services/mediaService';

interface ChatInputProps {
  onSendMessage: (
    content: string,
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'file',
  ) => void;
  onMediaSelected: (type: string, files: MediaFile[]) => void;
  placeholder?: string;
  disabled?: boolean;
  replyToMessage?: {
    id: string;
    content: string;
    sender: string;
  };
  onCancelReply?: () => void;
  keyboardHeight?: number;
  isKeyboardVisible?: boolean;
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
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onMediaSelected,
  placeholder = 'Type a message...',
  disabled = false,
  replyToMessage,
  onCancelReply,
  keyboardHeight: _keyboardHeight = 0,
  isKeyboardVisible = false,
  onStartTyping,
  onStopTyping,
  screenInfo,
}) => {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // ✅ FIX: Create dynamic styles based on screen info
  const styles = createStyles(screenInfo);

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

  const handleMediaPress = async (
    type: 'camera' | 'gallery' | 'video' | 'audio' | 'file',
  ) => {
    setShowMediaMenu(false); // Close menu after selection
    
    try {
      switch (type) {
        case 'camera':
          await takePhoto();
          break;
        case 'gallery':
          await pickImages();
          break;
        case 'video':
          await pickVideos();
          break;
        case 'audio':
          await pickAudio();
          break;
        case 'file':
          await pickFiles();
          break;
      }
    } catch (error) {
      console.error('Media selection error:', error);
      Alert.alert('Error', 'Failed to select media. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await mediaService.takePhoto();
      
      if (result.success && result.files.length > 0) {
        onMediaSelected('image', result.files);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Camera error:', error);
      throw error;
    }
  };

  const pickImages = async () => {
    try {
      const result = await mediaService.pickImages(10);
      
      if (result.success && result.files.length > 0) {
        onMediaSelected('image', result.files);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      throw error;
    }
  };

  const pickVideos = async () => {
    try {
      const result = await mediaService.pickVideos(5);
      
      if (result.success && result.files.length > 0) {
        onMediaSelected('video', result.files);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Video picker error:', error);
      throw error;
    }
  };

  const pickAudio = async () => {
    try {
      const result = await mediaService.pickAudioFiles(5);
      
      if (result.success && result.files.length > 0) {
        onMediaSelected('audio', result.files);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Audio picker error:', error);
      throw error;
    }
  };

  const pickFiles = async () => {
    try {
      const result = await mediaService.pickFiles(5);
      
      if (result.success && result.files.length > 0) {
        onMediaSelected('file', result.files);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('File picker error:', error);
      throw error;
    }
  };

  const toggleMediaMenu = () => {
    setShowMediaMenu(!showMediaMenu);
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

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[
            styles.mediaButton,
            {
              backgroundColor: showMediaMenu ? colors.accent : colors.surface,
              borderColor: colors.border,
            },
            styles.mediaButtonBorder,
          ]}
          onPress={toggleMediaMenu}
          disabled={disabled}
        >
          <Icon
            name={showMediaMenu ? 'close' : 'add'}
            size={moderateScale(24)}
            color={showMediaMenu ? colors.textOnPrimary : colors.accent}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.textInputContainer,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: colors.text }]}
            value={message}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
            editable={!disabled}
            onFocus={() => {
              setShowMediaMenu(false); // Close media menu when focusing on input
            }}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: message.trim() ? colors.accent : colors.border,
            },
          ]}
          onPress={handleSend}
          disabled={disabled || !message.trim()}
        >
          <Icon
            name="send"
            size={moderateScale(20)}
            color={message.trim() ? colors.textOnPrimary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {showMediaMenu && (
        <TouchableWithoutFeedback onPress={() => setShowMediaMenu(false)}>
          <View
            style={[
              styles.mediaMenu,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.mediaMenuRow}>
              <TouchableOpacity
                style={styles.mediaOption}
                onPress={() => handleMediaPress('camera')}
                disabled={disabled}
              >
                <View
                  style={[
                    styles.mediaOptionIcon,
                    { backgroundColor: colors.accent + '15' },
                  ]}
                >
                  <Icon
                    name="camera"
                    size={moderateScale(24)}
                    color={colors.accent}
                  />
                </View>
                <Text style={[styles.mediaOptionText, { color: colors.text }]}>
                  Camera
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaOption}
                onPress={() => handleMediaPress('gallery')}
                disabled={disabled}
              >
                <View
                  style={[
                    styles.mediaOptionIcon,
                    { backgroundColor: colors.accent + '15' },
                  ]}
                >
                  <Icon
                    name="image"
                    size={moderateScale(24)}
                    color={colors.accent}
                  />
                </View>
                <Text style={[styles.mediaOptionText, { color: colors.text }]}>
                  Gallery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaOption}
                onPress={() => handleMediaPress('video')}
                disabled={disabled}
              >
                <View
                  style={[
                    styles.mediaOptionIcon,
                    { backgroundColor: colors.accent + '15' },
                  ]}
                >
                  <Icon
                    name="videocam"
                    size={moderateScale(24)}
                    color={colors.accent}
                  />
                </View>
                <Text style={[styles.mediaOptionText, { color: colors.text }]}>
                  Video
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mediaMenuRow}>
              <TouchableOpacity
                style={styles.mediaOption}
                onPress={() => handleMediaPress('audio')}
                disabled={disabled}
              >
                <View
                  style={[
                    styles.mediaOptionIcon,
                    { backgroundColor: colors.accent + '15' },
                  ]}
                >
                  <Icon
                    name="mic"
                    size={moderateScale(24)}
                    color={colors.accent}
                  />
                </View>
                <Text style={[styles.mediaOptionText, { color: colors.text }]}>
                  Audio
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaOption}
                onPress={() => handleMediaPress('file')}
                disabled={disabled}
              >
                <View
                  style={[
                    styles.mediaOptionIcon,
                    { backgroundColor: colors.accent + '15' },
                  ]}
                >
                  <Icon
                    name="document"
                    size={moderateScale(24)}
                    color={colors.accent}
                  />
                </View>
                <Text style={[styles.mediaOptionText, { color: colors.text }]}>
                  File
                </Text>
              </TouchableOpacity>

              <View style={styles.mediaOption} />
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
};

const createStyles = (screenInfo?: ChatInputProps['screenInfo']) => StyleSheet.create({
  container: {
    borderTopWidth: 1,
    minHeight: screenInfo?.isSmall ? hp(7) : screenInfo?.isTablet ? hp(9) : hp(8), // ✅ FIX: Screen-aware height
    backgroundColor: 'transparent', // Ensure background is transparent
    paddingBottom: Platform.OS === 'android' 
      ? (screenInfo?.isSmall ? hp(1) : screenInfo?.isTablet ? hp(2) : hp(1.5)) 
      : hp(2), // ✅ FIX: Screen-aware Android padding
    // ✅ FIX: Ensure proper positioning on Android
    position: 'relative',
    zIndex: 1000,
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
    alignItems: 'center', // Center all items vertically
    paddingHorizontal: screenInfo?.isSmall ? wp(3) : wp(4), // ✅ FIX: Screen-aware horizontal padding
    paddingVertical: Platform.OS === 'android' 
      ? (screenInfo?.isSmall ? hp(1) : screenInfo?.isTablet ? hp(1.5) : hp(1.2)) 
      : hp(1.5), // ✅ FIX: Screen-aware Android padding
    minHeight: Platform.OS === 'android' 
      ? (screenInfo?.isSmall ? hp(6) : screenInfo?.isTablet ? hp(8) : hp(7)) 
      : hp(8), // ✅ FIX: Screen-aware Android height
    // ✅ FIX: Ensure proper alignment on Android
    justifyContent: 'space-between',
  },
  mediaButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(2),
  },
  mediaButtonBorder: {
    borderWidth: 1,
  },
  textInputContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: moderateScale(20),
    paddingHorizontal: screenInfo?.isSmall ? wp(2.5) : wp(3), // ✅ FIX: Screen-aware horizontal padding
    paddingVertical: Platform.OS === 'android' 
      ? (screenInfo?.isSmall ? hp(0.8) : screenInfo?.isTablet ? hp(1.2) : hp(1)) 
      : hp(1.2), // ✅ FIX: Screen-aware Android padding
    maxHeight: Platform.OS === 'android' 
      ? (screenInfo?.isSmall ? hp(8) : screenInfo?.isTablet ? hp(12) : hp(10)) 
      : hp(12), // ✅ FIX: Screen-aware Android max height
    minHeight: Platform.OS === 'android' 
      ? (screenInfo?.isSmall ? hp(4) : screenInfo?.isTablet ? hp(5.5) : hp(4.5)) 
      : hp(5), // ✅ FIX: Screen-aware Android min height
    justifyContent: 'flex-start', // Start from top instead of center
    alignItems: 'stretch', // Stretch to full width instead of center
  },
  textInput: {
    fontSize: screenInfo?.isSmall ? responsiveFont(15) : responsiveFont(16), // ✅ FIX: Screen-aware font size
    lineHeight: Platform.OS === 'android' 
      ? (screenInfo?.isSmall ? responsiveFont(18) : screenInfo?.isTablet ? responsiveFont(22) : responsiveFont(20)) 
      : responsiveFont(22), // ✅ FIX: Screen-aware Android line height
    minHeight: Platform.OS === 'android' 
      ? (screenInfo?.isSmall ? hp(2) : screenInfo?.isTablet ? hp(3.5) : hp(2.5)) 
      : hp(3), // ✅ FIX: Screen-aware Android min height
    textAlignVertical: 'top', // Start text from top instead of center
    paddingVertical: 0, // Remove default padding to allow proper alignment
    // ✅ FIX: Better Android text input styling
    includeFontPadding: false, // Remove extra padding on Android
    textAlign: 'left', // Ensure text starts from left
    flex: 1, // Take full width of container
  },
  sendButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp(2), // Use responsive margin
  },
  mediaMenu: {
    borderTopWidth: 1,
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  mediaMenuRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: hp(1.5),
  },
  mediaOption: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: hp(1),
  },
  mediaOptionIcon: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  mediaOptionText: {
    fontSize: responsiveFont(12),
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ChatInput;
