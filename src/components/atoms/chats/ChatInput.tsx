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
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';

interface ChatInputProps {
  onSendMessage: (
    content: string,
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'file',
  ) => void;
  placeholder?: string;
  disabled?: boolean;
  replyToMessage?: {
    id: string;
    content: string;
    sender: string;
  };
  onCancelReply?: () => void;
  keyboardHeight?: number;
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
  placeholder = 'Type a message...',
  disabled = false,
  replyToMessage,
  onCancelReply,
  keyboardHeight: _keyboardHeight = 0,
  onStartTyping,
  onStopTyping,
  screenInfo,
}) => {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');
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
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: message.trim() ? colors.tabBarBG : colors.border,
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
});

export default ChatInput;
