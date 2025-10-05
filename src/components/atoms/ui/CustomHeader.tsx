import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/theme';
import { responsiveFont, wp, hp, moderateScale } from '@/theme/responsive';
import CustomStatusBar from './StatusBar';
import Icon from 'react-native-vector-icons/Ionicons';

interface CustomHeaderProps {
  title: string;
  backgroundColor?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  backgroundColor,
  showBackButton = false,
  onBackPress: _onBackPress,
  rightComponent,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: backgroundColor || colors.primary },
      ]}
    >
      <CustomStatusBar backgroundColor={backgroundColor || colors.primary} />
      <View style={styles.headerContent}>
        <View style={styles.leftSection}>
          {showBackButton && (
            <Text style={[styles.backButton, { color: colors.textOnPrimary }]}>
              <Icon
                name="arrow-back"
                size={moderateScale(24)}
                color={colors.text}
              />
            </Text>
          )}
        </View>

        <View style={styles.centerSection}>
          <Text style={[styles.title, { color: colors.textOnPrimary }]}>
            {title}
          </Text>
        </View>

        <View style={styles.rightSection}>{rightComponent}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? hp(6) : hp(3),
    paddingBottom: hp(1.5),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    height: hp(6),
  },
  leftSection: {
    width: wp(15),
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    width: wp(15),
    alignItems: 'flex-end',
  },
  title: {
    fontSize: responsiveFont(24),
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    fontSize: responsiveFont(24),
    fontWeight: 'bold',
  },
});

export default CustomHeader;
