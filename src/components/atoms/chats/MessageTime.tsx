import { useTheme } from "../../../theme";
import { moderateScale } from "../../../theme/responsive";
import { safeFormatTime } from "../../../utils/dateValidation";
import React from 'react';
import { StyleSheet, Text } from "react-native";


type Props = {
  timestamp: string | number | Date;
  variant?: "list" | "bubble";
  isMe?: boolean;
};

export default function MessageTime({ timestamp, variant = "list", isMe = false }: Props) {
  const { colors } = useTheme();
  
  // Always show time for individual messages, regardless of variant
  const formatted = safeFormatTime(timestamp);

  return (
    <Text
      style={[
        styles.time,
        {
          color: variant === "bubble" && isMe ? colors.subText : colors.subText 
        },
        variant === "bubble" && styles.bubbleTime,
      ]}
    >
      {formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  time: {
    fontSize: moderateScale(12),
    textAlign: "right",
    flexShrink: 0,
    minWidth: moderateScale(40),
    fontWeight: "500",
  },
  bubbleTime: {
    fontSize: moderateScale(10),
    marginHorizontal: moderateScale(4),
    flexShrink: 0,
    minWidth: moderateScale(35),
    fontWeight: "500",
  },
});
