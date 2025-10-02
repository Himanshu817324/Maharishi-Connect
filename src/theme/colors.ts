// theme/colors.ts
import { Platform } from 'react-native';

// Base color palette
const BaseColors = {
  // Primary colors
  primary: "#075E54",
  primaryLight: "#128C7E",
  primaryDark: "#004D40",
  
  // Accent colors
  accent: "#D9FDD3",
  accentLight: "#E8F5E8",
  accentDark: "#25D366",
  
  // Status colors
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
  info: "#2196F3",
  
  // Neutral colors
  white: "#FFFFFF",
  black: "#000000",
  gray50: "#FAFAFA",
  gray100: "#F5F5F5",
  gray200: "#EEEEEE",
  gray300: "#E0E0E0",
  gray400: "#BDBDBD",
  gray500: "#9E9E9E",
  gray600: "#757575",
  gray700: "#616161",
  gray800: "#424242",
  gray900: "#212121",
};

// Platform-specific adjustments
const getPlatformColors = () => {
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  
  return {
    // iOS specific colors
    ios: {
      systemBlue: "#007AFF",
      systemGreen: "#34C759",
      systemRed: "#FF3B30",
      systemOrange: "#FF9500",
      systemYellow: "#FFCC00",
      systemPurple: "#AF52DE",
      systemPink: "#FF2D92",
      systemTeal: "#5AC8FA",
      systemIndigo: "#5856D6",
    },
    // Android specific colors
    android: {
      materialBlue: "#2196F3",
      materialGreen: "#4CAF50",
      materialRed: "#F44336",
      materialOrange: "#FF9800",
      materialPurple: "#9C27B0",
      materialTeal: "#009688",
      materialIndigo: "#3F51B5",
      materialPink: "#E91E63",
    }
  };
};

const platformColors = getPlatformColors();

export const LightColors = {
  // Core colors
  background: "#F5F1EB",
  surface: "#FFFFFF",
  surfaceVariant: "#F7F7F7",
  
  // Text colors
  text: "#111111",
  textSecondary: "#555555",
  subText: "#555555", // Alias for backward compatibility
  textTertiary: "#888888",
  textOnPrimary: "#FFFFFF",
  textOnSurface: "#111111",
  textOnBackground: "#111111",
  
  // Primary colors
  primary: BaseColors.primary,
  primaryLight: BaseColors.primaryLight,
  primaryDark: BaseColors.primaryDark,
  onPrimary: BaseColors.white,
  
  // Accent colors
  accent: BaseColors.accent,
  accentLight: BaseColors.accentLight,
  accentDark: BaseColors.accentDark,
  onAccent: BaseColors.primary,
  
  // Status colors
  success: BaseColors.success,
  warning: BaseColors.warning,
  error: BaseColors.error,
  info: BaseColors.info,
  onSuccess: BaseColors.white,
  onWarning: BaseColors.white,
  onError: BaseColors.white,
  onInfo: BaseColors.white,
  
  // UI colors
  border: "#E5E5E5",
  borderLight: "#F0F0F0",
  borderDark: "#CCCCCC",
  divider: "#E0E0E0",
  
  // Background colors
  card: "#F7F7F7",
  cardElevated: "#FFFFFF",
  inputBg: "#F1F1F1",
  inputBgFocused: "#FFFFFF",
  
  // Navigation colors
  tabBarBG: BaseColors.primary,
  tabBarActive: BaseColors.white,
  tabBarInactive: "#B0BEC5",
  headerBG: BaseColors.primary,
  headerText: BaseColors.white,
  
  // Button colors
  button: BaseColors.primary,
  buttonSecondary: BaseColors.gray200,
  buttonText: BaseColors.white,
  buttonTextSecondary: BaseColors.gray700,
  
  // Status bar
  statusbar: BaseColors.accent,
  statusbarContent: "dark-content",
  
  // Platform specific
  ...(Platform.OS === 'ios' ? platformColors.ios : {}),
  ...(Platform.OS === 'android' ? platformColors.android : {}),
  
  // Chat specific
  chatBubble: BaseColors.primary,
  chatBubbleOther: BaseColors.gray200,
  chatBubbleText: BaseColors.white,
  chatBubbleTextOther: BaseColors.gray800,
  chatTime: BaseColors.gray500,
  chatTimeOther: BaseColors.gray500,
  
  // Message status
  messageSent: BaseColors.gray500,
  messageDelivered: BaseColors.gray600,
  messageRead: BaseColors.primary,
  
  // Typing indicator
  typingIndicator: BaseColors.gray500,
  
  // Online status
  online: BaseColors.success,
  offline: BaseColors.gray400,
  
  // Shadows
  shadow: "rgba(0, 0, 0, 0.1)",
  shadowLight: "rgba(0, 0, 0, 0.05)",
  shadowDark: "rgba(0, 0, 0, 0.2)",
};

export const DarkColors = {
  // Core colors
  background: "#000000",
  surface: "#1C1C1C",
  surfaceVariant: "#2C2C2C",
  
  // Text colors
  text: "#FFFFFF",
  textSecondary: "#AAAAAA",
  subText: "#AAAAAA", // Alias for backward compatibility
  textTertiary: "#888888",
  textOnPrimary: "#FFFFFF",
  textOnSurface: "#FFFFFF",
  textOnBackground: "#FFFFFF",
  
  // Primary colors
  primary: BaseColors.primaryLight,
  primaryLight: "#4DB6AC",
  primaryDark: BaseColors.primary,
  onPrimary: BaseColors.white,
  
  // Accent colors
  accent: BaseColors.accentDark,
  accentLight: BaseColors.accent,
  accentDark: "#1B5E20",
  onAccent: BaseColors.white,
  
  // Status colors
  success: "#66BB6A",
  warning: "#FFB74D",
  error: "#EF5350",
  info: "#42A5F5",
  onSuccess: BaseColors.black,
  onWarning: BaseColors.black,
  onError: BaseColors.white,
  onInfo: BaseColors.white,
  
  // UI colors
  border: "#333333",
  borderLight: "#2C2C2C",
  borderDark: "#444444",
  divider: "#333333",
  
  // Background colors
  card: "#1C1C1C",
  cardElevated: "#2C2C2C",
  inputBg: "#111111",
  inputBgFocused: "#1C1C1C",
  
  // Navigation colors
  tabBarBG: BaseColors.primary,
  tabBarActive: BaseColors.white,
  tabBarInactive: "#B0BEC5",
  headerBG: BaseColors.primary,
  headerText: BaseColors.white,
  
  // Button colors
  button: BaseColors.primaryLight,
  buttonSecondary: BaseColors.gray700,
  buttonText: BaseColors.white,
  buttonTextSecondary: BaseColors.gray300,
  
  // Status bar
  statusbar: BaseColors.primary,
  statusbarContent: "light-content",
  
  // Platform specific
  ...(Platform.OS === 'ios' ? platformColors.ios : {}),
  ...(Platform.OS === 'android' ? platformColors.android : {}),
  
  // Chat specific
  chatBubble: BaseColors.primaryLight,
  chatBubbleOther: BaseColors.gray700,
  chatBubbleText: BaseColors.white,
  chatBubbleTextOther: BaseColors.gray200,
  chatTime: BaseColors.gray400,
  chatTimeOther: BaseColors.gray400,
  
  // Message status
  messageSent: BaseColors.gray500,
  messageDelivered: BaseColors.gray400,
  messageRead: BaseColors.primaryLight,
  
  // Typing indicator
  typingIndicator: BaseColors.gray400,
  
  // Online status
  online: "#66BB6A",
  offline: BaseColors.gray600,
  
  // Shadows
  shadow: "rgba(0, 0, 0, 0.3)",
  shadowLight: "rgba(0, 0, 0, 0.1)",
  shadowDark: "rgba(0, 0, 0, 0.5)",
};
