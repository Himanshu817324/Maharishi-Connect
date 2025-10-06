import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont } from '@/theme/responsive';

interface OnlineStatusIndicatorProps {
  isOnline: boolean;
  lastSeen?: string;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const OnlineStatusIndicator: React.FC<OnlineStatusIndicatorProps> = ({
  isOnline,
  lastSeen,
  showText = false,
  size = 'small',
}) => {
  const { colors } = useTheme();

  const getIndicatorSize = () => {
    switch (size) {
      case 'small':
        return moderateScale(8);
      case 'medium':
        return moderateScale(10);
      case 'large':
        return moderateScale(12);
      default:
        return moderateScale(8);
    }
  };

  const getStatusText = () => {
    if (isOnline) {
      return 'Online';
    }
    
    if (lastSeen) {
      const lastSeenDate = new Date(lastSeen);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours}h ago`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        return `${days}d ago`;
      }
    }
    
    return 'Offline';
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.indicator,
          {
            width: getIndicatorSize(),
            height: getIndicatorSize(),
            borderRadius: getIndicatorSize() / 2,
            backgroundColor: isOnline ? colors.success : colors.textSecondary,
            borderColor: colors.background,
            borderWidth: 1,
          },
        ]}
      />
      {showText && (
        <Text
          style={[
            styles.statusText,
            {
              color: isOnline ? colors.success : colors.textSecondary,
              fontSize: responsiveFont(size === 'small' ? 10 : 12),
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  statusText: {
    marginLeft: moderateScale(4),
    fontWeight: '500',
  },
});

export default OnlineStatusIndicator;
