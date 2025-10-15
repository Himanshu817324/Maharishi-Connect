import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { moderateScale } from '@/theme/responsive';

const GestureNavigationBar: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View 
      style={[
        styles.container,
        { 
          backgroundColor: colors.primary,
          height: Platform.OS === 'ios' ? insets.bottom : moderateScale(15),
        }
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default GestureNavigationBar;
