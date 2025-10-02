import { useTheme } from "../../../theme/index";
import { moderateScale } from "../../../theme/responsive";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MessageTime from "./MessageTime";

interface Message {
  id: string;
  content: string;
  timestamp: string;
  sender: string;
  type: string;
  status?: string;
  isEdited?: boolean;
  reactions?: { [emoji: string]: string[] };
}

type Props = { 
  message: Message; 
  isMe: boolean; 
  showTime: boolean;
  onPress: () => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
};

export default function MessageBubble({ 
  message, 
  isMe, 
  showTime, 
  onPress, 
  onEdit, 
  onDelete, 
  onAddReaction, 
  onRemoveReaction 
}: Props) {
  const { colors } = useTheme();
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isMe ? colors.accent : colors.card,
          borderColor: isMe ? colors.primary : colors.border,
          alignSelf: isMe ? "flex-end" : "flex-start",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.text,
          { color: isMe ? colors.text : colors.text },
        ]}
      >
        {message.content}
      </Text>
      
      {showTime && (
        <MessageTime
          timestamp={message.timestamp}
          variant="bubble"
          isMe={isMe}
        />
      )}
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  container: {
    maxWidth: "75%",
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(12),
    marginVertical: moderateScale(5),
    marginHorizontal: moderateScale(16),
    borderRadius: moderateScale(18),
    flexShrink: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 0.5,
  },
  text: { 
    fontSize: moderateScale(14),
    lineHeight: moderateScale(20),
    flexWrap: 'wrap',
    flexShrink: 1,
  },
});
