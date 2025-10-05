import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { moderateScale } from '@/theme/responsive';

interface MessageTimeProps {
  timestamp: string;
  isOwn?: boolean;
  showFullTime?: boolean;
}

const MessageTime: React.FC<MessageTimeProps> = ({
  timestamp,
  isOwn = false,
  showFullTime = false,
}) => {
  const { colors } = useTheme();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (showFullTime) {
      return date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  };

  return (
    <Text style={[
      styles.timeText,
      {
        color: colors.textSecondary,
        textAlign: isOwn ? 'right' : 'left',
      }
    ]}>
      {formatTime(timestamp)}
    </Text>
  );
};

const styles = StyleSheet.create({
  timeText: {
    fontSize: moderateScale(11),
    marginTop: moderateScale(2),
    marginHorizontal: moderateScale(8),
  },
});

export default MessageTime;
