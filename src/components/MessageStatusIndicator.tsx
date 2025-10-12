import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { moderateScale, responsiveFont, wp } from '@/theme/responsive';
import { MessageStatus, messageStatusService } from '@/services/messageStatusService';

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  showText?: boolean;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  onRetry?: () => void;
  canRetry?: boolean;
  readCount?: number;
  totalRecipients?: number;
}

const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  status,
  showText = false, // Changed default to false - no text by default
  showIcon = true,
  size = 'small',
  onRetry,
  canRetry = false,
  readCount = 0,
  totalRecipients = 1,
}) => {
  console.log('🔍 MessageStatusIndicator rendering:', { status, showText, showIcon, size });
  console.log('🔍 MessageStatusIndicator props:', { status, readCount, totalRecipients });

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          iconSize: moderateScale(12),
          textSize: responsiveFont(10),
          containerPadding: moderateScale(2),
        };
      case 'large':
        return {
          iconSize: moderateScale(16),
          textSize: responsiveFont(12),
          containerPadding: moderateScale(4),
        };
      default: // medium
        return {
          iconSize: moderateScale(14),
          textSize: responsiveFont(11),
          containerPadding: moderateScale(3),
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const statusColor = messageStatusService.getStatusColor(status);
  const statusIcon = messageStatusService.getStatusIcon(status);
  const statusText = messageStatusService.getStatusDisplayText(status) || 'Unknown';

  const handlePress = () => {
    if (canRetry && onRetry) {
      onRetry();
    }
  };

  const renderReadCount = () => {
    if (status === 'seen' && totalRecipients > 1 && readCount > 0) {
      return (
        <Text
          style={[
            styles.readCount,
            {
              color: statusColor,
              fontSize: sizeStyles.textSize - 1,
            },
          ]}
        >
          {`${readCount}/${totalRecipients}`}
        </Text>
      );
    }
    return null;
  };

  const renderRetryButton = () => {
    if (canRetry && onRetry) {
      return (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: statusColor + '20' }]}
          onPress={handlePress}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Icon
            name="refresh"
            size={sizeStyles.iconSize - 2}
            color={statusColor}
          />
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <View style={[styles.container, { padding: sizeStyles.containerPadding }]}>
      {showIcon && (
        <Icon
          name={statusIcon}
          size={sizeStyles.iconSize}
          color={statusColor}
          style={styles.icon}
        />
      )}
      
      {showText && (
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.statusText,
              {
                color: statusColor,
                fontSize: sizeStyles.textSize,
              },
            ]}
          >
            {statusText}
          </Text>
          {renderReadCount()}
        </View>
      )}
      
      {renderRetryButton()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  icon: {
    marginLeft: wp(1), // Changed from marginRight to marginLeft for inline layout
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  readCount: {
    marginLeft: wp(1),
    fontWeight: '600',
  },
  retryButton: {
    marginLeft: wp(1),
    padding: moderateScale(2),
    borderRadius: moderateScale(8),
  },
});

export default MessageStatusIndicator;

