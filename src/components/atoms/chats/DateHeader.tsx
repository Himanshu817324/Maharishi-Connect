import { useTheme } from '../../../theme';
import { moderateScale } from '../../../theme/responsive';
import { safeFormatDateHeader } from '../../../utils/dateValidation';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  date: string;
};

export default function DateHeader({ date }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.dateContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.dateText, { color: colors.subText }]}>
          {safeFormatDateHeader(date)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: moderateScale(16),
  },
  dateContainer: {
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(16),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  dateText: {
    fontSize: moderateScale(12),
    fontWeight: '500',
  },
});
