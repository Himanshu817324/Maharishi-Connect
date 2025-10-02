import { useTheme } from "../../../theme";
import { moderateScale } from "../../../theme/responsive";
import Icon from "react-native-vector-icons/Ionicons";
import { useState, useCallback, useRef } from "react";
import { Keyboard, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import socketService from "../../../services/socketService";

type Props = {
  onSendMessage: (message: string) => void;
  chatId: string;
};

export default function ChatInput({ onSendMessage, chatId }: Props) {
  const [text, setText] = useState("");
  const { colors } = useTheme();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = useCallback(() => {
    if (chatId) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Send typing indicator
      socketService.handleTyping(chatId);
      
      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopTyping(chatId);
      }, 3000);
    }
  }, [chatId]);

  const handleSend = () => {
    if (text.trim()) {
      // Stop typing when sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      socketService.stopTyping(chatId);
      
      onSendMessage(text.trim());
      setText("");
      Keyboard.dismiss();
    }
  };

  return (
    <View style={[styles.container, { 
      borderTopColor: colors.border,
      backgroundColor: colors.background 
    }]}>
      <TextInput
        value={text}
        onChangeText={(newText) => {
          setText(newText);
          handleTyping();
        }}
        placeholder="Type a message"
        placeholderTextColor={colors.subText}
        style={[
          styles.input,
          { 
            backgroundColor: colors.inputBg, 
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        multiline
        maxLength={500}
      />
      <TouchableOpacity 
        onPress={handleSend}
        style={[
          styles.sendButton,
          { 
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          }
        ]}
        activeOpacity={0.7}
        disabled={!text.trim()}
      >
        <Icon name="send" size={moderateScale(20)} 
        color={colors.textOnPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    padding: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    borderRadius: moderateScale(25),
    marginRight: moderateScale(12),
    fontSize: moderateScale(16),
    maxHeight: moderateScale(100),
    borderWidth: 1,
    minHeight: moderateScale(40),
  },
  sendButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
