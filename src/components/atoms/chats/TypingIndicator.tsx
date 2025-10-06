import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';

interface TypingIndicatorProps {
  isVisible: boolean;
  userName?: string;
  isOwn?: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isVisible,
  userName,
  isOwn = false,
}) => {
  const { colors } = useTheme();
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isVisible) {
      const animateDots = () => {
        const createAnimation = (dot: Animated.Value, delay: number) => {
          return Animated.loop(
            Animated.sequence([
              Animated.delay(delay),
              Animated.timing(dot, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.timing(dot, {
                toValue: 0.3,
                duration: 600,
                useNativeDriver: true,
              }),
            ])
          );
        };

        Animated.parallel([
          createAnimation(dot1, 0),
          createAnimation(dot2, 200),
          createAnimation(dot3, 400),
        ]).start();
      };

      animateDots();
    } else {
      // Reset dots when not visible
      dot1.setValue(0.3);
      dot2.setValue(0.3);
      dot3.setValue(0.3);
    }
  }, [isVisible, dot1, dot2, dot3]);

  if (!isVisible) return null;

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isOwn ? colors.accent : colors.surface,
            borderColor: isOwn ? colors.accent : colors.border,
          },
        ]}
      >
        {userName && !isOwn && (
          <Text style={[styles.userName, { color: colors.textSecondary }]}>
            {userName} is typing
          </Text>
        )}
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: isOwn ? colors.textOnPrimary : colors.textSecondary,
                opacity: dot1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: isOwn ? colors.textOnPrimary : colors.textSecondary,
                opacity: dot2,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: isOwn ? colors.textOnPrimary : colors.textSecondary,
                opacity: dot3,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: hp(0.5),
    paddingHorizontal: wp(2),
    alignItems: 'flex-end',
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderRadius: moderateScale(20),
    borderWidth: 1,
    maxWidth: wp(80),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userName: {
    fontSize: responsiveFont(11),
    fontWeight: '500',
    marginBottom: hp(0.3),
    opacity: 0.8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    marginHorizontal: moderateScale(2),
  },
});

export default TypingIndicator;
