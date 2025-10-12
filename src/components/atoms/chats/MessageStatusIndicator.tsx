import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont } from '@/theme/responsive';

interface MessageStatusIndicatorProps {
  status: 'sending' | 'sent' | 'delivered' | 'seen' | 'failed';
  readBy?: Array<{
    user_id: string;
    read_at: string;
  }>;
  deliveredTo?: Array<{
    user_id: string;
    delivered_at: string;
  }>;
  isOwn: boolean;
  showTimestamp?: boolean;
}

const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  status,
  readBy = [],
  deliveredTo = [],
  isOwn,
  showTimestamp = false,
}) => {
  const { colors } = useTheme();

  if (!isOwn) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return 'time';
      case 'sent':
        return 'checkmark';
      case 'delivered':
        return 'checkmark';
      case 'seen':
        return 'checkmark';
      case 'failed':
        return 'close';
      default:
        return 'checkmark';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'sending':
        return colors.textSecondary; // Gray for sending
      case 'sent':
        return colors.textSecondary; // Gray for sent
      case 'delivered':
        return colors.textSecondary; // Gray for delivered
      case 'seen':
        return colors.accent; // Blue for seen
      case 'failed':
        return colors.error; // Red for failed
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Sending';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'seen':
        return 'Seen';
      case 'failed':
        return 'Failed';
      default:
        return 'Sent';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        {/* WhatsApp-like status indicators */}
        {status === 'sent' && (
          <Icon
            name="checkmark"
            size={moderateScale(14)}
            color={getStatusColor()}
            style={styles.statusIcon}
          />
        )}
        {status === 'delivered' && (
          <>
            <Icon
              name="checkmark"
              size={moderateScale(14)}
              color={getStatusColor()}
              style={[styles.statusIcon, { marginLeft: -moderateScale(4) }]}
            />
            <Icon
              name="checkmark"
              size={moderateScale(14)}
              color={getStatusColor()}
              style={[styles.statusIcon, { marginLeft: -moderateScale(8) }]}
            />
          </>
        )}
        {status === 'seen' && (
          <>
            <Icon
              name="checkmark"
              size={moderateScale(14)}
              color={getStatusColor()}
              style={[styles.statusIcon, { marginLeft: -moderateScale(4) }]}
            />
            <Icon
              name="checkmark"
              size={moderateScale(14)}
              color={getStatusColor()}
              style={[styles.statusIcon, { marginLeft: -moderateScale(8) }]}
            />
          </>
        )}
      </View>
      
      {showTimestamp && (
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          {getStatusText()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    marginTop: moderateScale(2),
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginHorizontal: moderateScale(1),
  },
  statusText: {
    fontSize: responsiveFont(9),
    marginTop: moderateScale(2),
    opacity: 0.7,
  },
});

export default MessageStatusIndicator;
