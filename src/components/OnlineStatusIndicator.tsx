import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { UserStatus } from '@/services/userStatusService';

interface OnlineStatusIndicatorProps {
  status: UserStatus;
  showIcon?: boolean;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'compact' | 'detailed';
}

const OnlineStatusIndicator: React.FC<OnlineStatusIndicatorProps> = ({
  status,
  showIcon = true,
  showText = true,
  size = 'medium',
  variant = 'default',
}) => {
  const { colors } = useTheme();

  const getStatusColor = () => {
    if (status.isOnline) {
      return '#4CAF50'; // Green for online
    } else {
      return colors.textSecondary; // Gray for offline
    }
  };

  const getStatusIcon = () => {
    if (status.isOnline) {
      return 'radio-button-on';
    } else {
      return 'radio-button-off';
    }
  };

  const getStatusText = () => {
    if (status.isOnline) {
      return 'Online';
    } else {
      return status.statusText || 'Offline';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          iconSize: moderateScale(8),
          textSize: responsiveFont(10),
          containerPadding: moderateScale(4),
        };
      case 'large':
        return {
          iconSize: moderateScale(16),
          textSize: responsiveFont(14),
          containerPadding: moderateScale(8),
        };
      default: // medium
        return {
          iconSize: moderateScale(12),
          textSize: responsiveFont(12),
          containerPadding: moderateScale(6),
        };
    }
  };

  const sizeStyles = getSizeStyles();

  if (variant === 'compact') {
    return (
      <View
        style={[
          styles.compactContainer,
          { padding: sizeStyles.containerPadding },
        ]}
      >
        {showIcon && (
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: getStatusColor(),
                width: sizeStyles.iconSize,
                height: sizeStyles.iconSize,
              },
            ]}
          />
        )}
      </View>
    );
  }

  if (variant === 'detailed') {
    return (
      <View
        style={[
          styles.detailedContainer,
          { padding: sizeStyles.containerPadding },
        ]}
      >
        {showIcon && (
          <Icon
            name={getStatusIcon()}
            size={sizeStyles.iconSize}
            color={getStatusColor()}
            style={styles.statusIcon}
          />
        )}
        {showText && (
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.statusText,
                {
                  color: getStatusColor(),
                  fontSize: sizeStyles.textSize,
                },
              ]}
            >
              {getStatusText()}
            </Text>
            {!status.isOnline && status.lastSeen && (
              <Text
                style={[
                  styles.lastSeenText,
                  {
                    color: colors.textSecondary,
                    fontSize: sizeStyles.textSize - 2,
                  },
                ]}
              >
                {status.lastSeen}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  // Default variant
  return (
    <View
      style={[
        styles.defaultContainer,
        { padding: sizeStyles.containerPadding },
      ]}
    >
      {showIcon && (
        <Icon
          name={getStatusIcon()}
          size={sizeStyles.iconSize}
          color={getStatusColor()}
          style={styles.statusIcon}
        />
      )}
      {showText && (
        <Text
          style={[
            styles.statusText,
            {
              color: getStatusColor(),
              fontSize: sizeStyles.textSize,
            },
          ]}
        >
          {getStatusText()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  defaultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailedContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusDot: {
    borderRadius: moderateScale(4),
  },
  statusIcon: {
    marginRight: wp(1),
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  lastSeenText: {
    marginTop: hp(0.2),
    fontStyle: 'italic',
  },
});

export default OnlineStatusIndicator;
