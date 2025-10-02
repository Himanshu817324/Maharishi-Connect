import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { dimensions, fontSize, spacing, borderRadius, shadow } from '@/theme/responsive';
import Icon from 'react-native-vector-icons/Ionicons';

interface ThemeToggleProps {
  onToggle?: () => void;
  showSystemOption?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  onToggle, 
  showSystemOption = true 
}) => {
  const { colors, isDark, toggleTheme, isSystemTheme, setIsSystemTheme } = useTheme();

  const handleToggle = () => {
    console.log('🎨 Theme toggle clicked, current isDark:', isDark);
    toggleTheme();
    onToggle?.();
  };

  const handleSystemToggle = () => {
    console.log('🎨 System theme toggle clicked, current isSystemTheme:', isSystemTheme);
    setIsSystemTheme(!isSystemTheme);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Icon 
          name={isDark ? 'moon' : 'sunny'} 
          size={dimensions.iconMedium} 
          color={colors.primary} 
        />
        <Text style={[styles.title, { color: colors.text }]}>
          Theme Settings
        </Text>
      </View>

      <View style={styles.options}>
        {/* System Theme Option */}
        {showSystemOption && (
          <TouchableOpacity 
            style={[styles.option, { borderBottomColor: colors.border }]}
            onPress={handleSystemToggle}
          >
            <View style={styles.optionContent}>
              <Icon 
                name="phone-portrait" 
                size={dimensions.iconSmall} 
                color={colors.textSecondary} 
              />
              <Text style={[styles.optionText, { color: colors.text }]}>
                Follow System
              </Text>
            </View>
            <Switch
              value={isSystemTheme}
              onValueChange={(value) => {
                console.log('🎨 System Switch onValueChange called with value:', value);
                handleSystemToggle();
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isSystemTheme ? colors.accent : colors.textTertiary}
            />
          </TouchableOpacity>
        )}

        {/* Manual Theme Toggle */}
        <TouchableOpacity 
          style={[styles.option, { borderBottomColor: colors.border }]}
          onPress={handleToggle}
          disabled={isSystemTheme}
        >
          <View style={styles.optionContent}>
            <Icon 
              name={isDark ? 'moon' : 'sunny'} 
              size={dimensions.iconSmall} 
              color={isSystemTheme ? colors.textTertiary : colors.textSecondary} 
            />
            <Text style={[
              styles.optionText, 
              { 
                color: isSystemTheme ? colors.textTertiary : colors.text 
              }
            ]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={(value) => {
              console.log('🎨 Switch onValueChange called with value:', value);
              handleToggle();
            }}
            disabled={isSystemTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isDark ? colors.accent : colors.textTertiary}
          />
        </TouchableOpacity>

        {/* Theme Preview */}
        <View style={[styles.preview, { backgroundColor: colors.card }]}>
          <Text style={[styles.previewText, { color: colors.textSecondary }]}>
            Preview
          </Text>
          <View style={styles.previewColors}>
            <View style={[styles.colorPreview, { backgroundColor: colors.primary }]} />
            <View style={[styles.colorPreview, { backgroundColor: colors.accent }]} />
            <View style={[styles.colorPreview, { backgroundColor: colors.success }]} />
            <View style={[styles.colorPreview, { backgroundColor: colors.warning }]} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    margin: spacing.md,
    overflow: 'hidden',
    ...shadow.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  options: {
    backgroundColor: 'transparent',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    fontSize: fontSize.md,
    marginLeft: spacing.sm,
  },
  preview: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  previewText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  previewColors: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  colorPreview: {
    width: dimensions.iconSmall,
    height: dimensions.iconSmall,
    borderRadius: borderRadius.sm,
  },
});

export default ThemeToggle;
