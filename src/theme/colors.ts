// theme/colors.ts
import { Platform } from 'react-native';

// Base color palette - Maroon & Yellow Theme
const BaseColors = {
  // Primary colors (Maroon)
  primary: "#7B1E3C", // Deep elegant maroon
  primaryLight: "#B8324F", // Brighter maroon for dark mode
  primaryDark: "#5A1529", // Darker maroon variant
  
  // Accent colors (Yellow)
  accent: "#FFD54F", // Warm soft yellow
  accentLight: "#FFEB7A", // Vibrant yellow for dark mode
  accentDark: "#FFC107", // Darker yellow variant
  
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
  // Core colors - Light Mode Palette
  background: "#FFFFFF", // Pure white background for maximum visibility
  chatBackground: "#fffbeb ", // Light neutral background
  surface: "#FFFFFF",
  surfaceVariant: "#F5F5F5",
  
  // Text colors
  text: "#000000", // Pure black text for maximum contrast
  textSecondary: "#757575",
  subText: "#757575", // Alias for backward compatibility
  textTertiary: "#9E9E9E",
  textOnPrimary: "#FFFFFF",
  textOnSurface: "#212121",
  textOnBackground: "#212121",
  
  // Primary colors (Maroon)
  primary: "#7B1E3C", // Deep elegant maroon
  primaryLight: "#B8324F",
  primaryDark: "#5A1529",
  onPrimary: "#FFFFFF",
  
  // Accent colors (Yellow)
  accent: "#FFD54F", // Warm soft yellow
  accentLight: "#FFEB7A",
  accentDark: "#FFC107",
  onAccent: "#212121",
  
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
  border: "#E0E0E0",
  borderLight: "#F0F0F0",
  borderDark: "#BDBDBD",
  divider: "#E0E0E0",
  
  // Background colors
  card: "#FFFFFF",
  cardElevated: "#FFFFFF",
  inputBg: "#F5F5F5",
  inputBgFocused: "#FFFFFF",
  
  // Navigation colors
  tabBarBG: "#7B1E3C",
  tabBarActive: "#FFD54F",
  tabBarInactive: "#BDBDBD",
  headerBG: "#7B1E3C",
  headerText: "#FFFFFF",
  
  // Button colors
  button: "#7B1E3C",
  buttonSecondary: "#F5F5F5",
  buttonText: "#FFFFFF",
  buttonTextSecondary: "#212121",
  
  // Status bar
  statusbar: "#7B1E3C",
  statusbarContent: "light-content",
  
  // Platform specific
  ...(Platform.OS === 'ios' ? platformColors.ios : {}),
  ...(Platform.OS === 'android' ? platformColors.android : {}),
  
  // Chat specific - Light Mode
  chatBubble: "#7B1E3C", // Muted yellow for user messages
  chatBubbleOther: "#525100", // Soft grey for incoming messages
  chatBubbleText: "#ffffff", 
  chatBubbleTextOther: "#ffffff",
  chatTime: "#757575",
  chatTimeOther: "#757575",
  
  // Message status
  messageSent: "#007AFF",
  messageDelivered: "#007AFF",
  messageRead: "#4CAF50",
  
  // Typing indicator
  typingIndicator: "#757575",
  
  // Online status
  online: BaseColors.success,
  offline: BaseColors.gray400,
  
  // Shadows
  shadow: "rgba(0, 0, 0, 0.1)",
  shadowLight: "rgba(0, 0, 0, 0.05)",
  shadowDark: "rgba(0, 0, 0, 0.2)",
};

export const DarkColors = {
  // Core colors - Dark Mode Palette
  background: "#121212", // True dark base
  chatBackground: "#121212", // True dark base
  surface: "#1E1E1E",
  surfaceVariant: "#2C2C2C",
  
  // Text colors
  text: "#EDEDED", // Soft white text
  textSecondary: "#BDBDBD",
  subText: "#BDBDBD", // Alias for backward compatibility
  textTertiary: "#9E9E9E",
  textOnPrimary: "#FFFFFF",
  textOnSurface: "#EDEDED",
  textOnBackground: "#EDEDED",
  
  // Primary colors (Maroon)
  primary: "#B8324F", // Slightly brighter maroon to stand out on dark BG
  primaryLight: "#E85A7A",
  primaryDark: "#7B1E3C",
  onPrimary: "#FFFFFF",
  
  // Accent colors (Yellow)
  accent: "#FFEB7A", // Vibrant but soft yellow - looks rich in dark UI
  accentLight: "#FFF59D",
  accentDark: "#FFD54F",
  onAccent: "#212121",
  
  // Status colors
  success: "#66BB6A",
  warning: "#FFB74D",
  error: "#EF5350",
  info: "#42A5F5",
  onSuccess: "#212121",
  onWarning: "#212121",
  onError: "#FFFFFF",
  onInfo: "#FFFFFF",
  
  // UI colors
  border: "#333333",
  borderLight: "#2C2C2C",
  borderDark: "#444444",
  divider: "#333333",
  
  // Background colors
  card: "#1E1E1E",
  cardElevated: "#2C2C2C",
  inputBg: "#121212",
  inputBgFocused: "#1E1E1E",
  
  // Navigation colors
  tabBarBG: "#B8324F",
  tabBarActive: "#FFEB7A",
  tabBarInactive: "#757575",
  headerBG: "#B8324F",
  headerText: "#FFFFFF",
  
  // Button colors
  button: "#B8324F",
  buttonSecondary: "#333333",
  buttonText: "#FFFFFF",
  buttonTextSecondary: "#EDEDED",
  
  // Status bar
  statusbar: "#B8324F",
  statusbarContent: "light-content",
  
  // Platform specific
  ...(Platform.OS === 'ios' ? platformColors.ios : {}),
  ...(Platform.OS === 'android' ? platformColors.android : {}),
  
  // Chat specific - Dark Mode
  chatBubble: "#7B1E3C", // Subtle maroon tint for user messages
  chatBubbleOther: "#525100", // Neutral dark for received messages
  chatBubbleText: "#EDEDED",
  chatBubbleTextOther: "#EDEDED",
  chatTime: "#9E9E9E",
  chatTimeOther: "#9E9E9E",
  
  // Message status
  messageSent: "#007AFF",
  messageDelivered: "#007AFF",
  messageRead: "#4CAF50",
  
  // Typing indicator
  typingIndicator: "#9E9E9E",
  
  // Online status
  online: "#66BB6A",
  offline: "#757575",
  
  // Shadows
  shadow: "rgba(0, 0, 0, 0.3)",
  shadowLight: "rgba(0, 0, 0, 0.1)",
  shadowDark: "rgba(0, 0, 0, 0.5)",
};

// Gradient colors for special effects
export const GradientColors = {
  // Maroon gradient (for app header or FAB)
  maroonGradient: {
    light: ["#7B1E3C", "#B8324F"],
    dark: ["#B8324F", "#E85A7A"],
  },
  
  // Yellow gradient (for status bar or highlights)
  yellowGradient: {
    light: ["#FFD54F", "#FFEB7A"],
    dark: ["#FFEB7A", "#FFF59D"],
  },
  
  // Combined gradient
  primaryGradient: {
    light: ["#7B1E3C", "#FFD54F"],
    dark: ["#B8324F", "#FFEB7A"],
  },
};

// Additional utility colors
export const UtilityColors = {
  // Transparent variants
  transparent: "transparent",
  overlay: "rgba(0, 0, 0, 0.5)",
  overlayLight: "rgba(0, 0, 0, 0.3)",
  overlayDark: "rgba(0, 0, 0, 0.7)",
  
  // Focus states
  focusRing: "rgba(123, 30, 60, 0.3)", // Maroon with opacity
  focusRingDark: "rgba(184, 50, 79, 0.3)", // Brighter maroon with opacity
  
  // Selection states
  selection: "rgba(255, 213, 79, 0.2)", // Yellow with opacity
  selectionDark: "rgba(255, 235, 122, 0.2)", // Brighter yellow with opacity
  
  // Disabled states
  disabled: "#BDBDBD",
  disabledDark: "#757575",
  disabledText: "#9E9E9E",
  disabledTextDark: "#616161",
};
