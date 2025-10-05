import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { moderateScale } from '@/theme/responsive';

const GestureNavigationBar: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View 
      style={[
        styles.container,
        { backgroundColor: colors.primary }
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  container: {
    height: moderateScale(15), 
    width: '100%',
  },
});

export default GestureNavigationBar;
