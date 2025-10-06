import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont } from '@/theme/responsive';

interface MessageStatusIndicatorProps {
  status: 'sent' | 'delivered' | 'read';
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
      case 'sent':
        return 'checkmark';
      case 'delivered':
        return 'checkmark';
      case 'read':
        return 'checkmark';
      default:
        return 'checkmark';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'sent':
        return colors.textSecondary; // Gray for sent
      case 'delivered':
        return colors.textSecondary; // Gray for delivered
      case 'read':
        return colors.accent; // Blue for read
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return 'Read';
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
        {status === 'read' && (
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
