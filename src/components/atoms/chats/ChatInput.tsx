import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';

interface ChatInputProps {
  onSendMessage: (
    content: string,
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'file',
  ) => void;
  onSendImage?: () => void;
  onSendVideo?: () => void;
  onSendAudio?: () => void;
  onSendFile?: () => void;
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
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendImage,
  onSendVideo,
  onSendAudio,
  onSendFile,
  placeholder = 'Type a message...',
  disabled = false,
  replyToMessage,
  onCancelReply,
  keyboardHeight: _keyboardHeight = 0,
  isKeyboardVisible = false,
  onStartTyping,
  onStopTyping,
}) => {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleMediaPress = (
    type: 'camera' | 'gallery' | 'video' | 'audio' | 'file',
  ) => {
    setShowMediaMenu(false); // Close menu after selection
    switch (type) {
      case 'camera':
        onSendImage?.();
        break;
      case 'gallery':
        onSendImage?.();
        break;
      case 'video':
        onSendVideo?.();
        break;
      case 'audio':
        onSendAudio?.();
        break;
      case 'file':
        onSendFile?.();
        break;
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

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    minHeight: hp(8), // Ensure minimum height
    backgroundColor: 'transparent', // Ensure background is transparent
    paddingBottom: hp(2), // Consistent bottom padding
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
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5), // Add vertical padding for better centering
    minHeight: hp(8), // Increase minimum height for better centering
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
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2), // Increase vertical padding for better centering
    maxHeight: hp(12), // Use responsive height
    minHeight: hp(5), // Increase minimum height for better centering
    justifyContent: 'center', // Center content vertically
  },
  textInput: {
    fontSize: responsiveFont(16),
    lineHeight: responsiveFont(22), // Increase line height for better centering
    minHeight: hp(3), // Increase minimum height for better centering
    textAlignVertical: 'center', // Center text vertically on Android
    paddingVertical: 0, // Remove default padding to allow proper centering
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
