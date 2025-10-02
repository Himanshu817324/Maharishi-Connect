import { Dimensions, PixelRatio, Platform } from "react-native";

const { width, height } = Dimensions.get("window");
const { width: fullScreenWidth, height: fullScreenHeight } = Dimensions.get("screen");

// Reference iPhone X screen
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

// Android reference screen (Galaxy S10)
const androidGuidelineBaseWidth = 360;
const androidGuidelineBaseHeight = 760;

// Get platform-specific guidelines
const getGuidelines = () => {
  if (Platform.OS === 'android') {
    return {
      width: androidGuidelineBaseWidth,
      height: androidGuidelineBaseHeight,
    };
  }
  return {
    width: guidelineBaseWidth,
    height: guidelineBaseHeight,
  };
};

const guidelines = getGuidelines();

// Scaling functions
export const scale = (size: number) => (width / guidelines.width) * size;
export const verticalScale = (size: number) => (height / guidelines.height) * size;
export const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

// Font scaling
export const responsiveFont = (fontSize: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(fontSize)));

// Screen dimensions
export const screenWidth = width;
export const screenHeight = height;
export const screenWidthFull = screenWidth;
export const screenHeightFull = screenHeight;

// Safe area helpers
export const isSmallDevice = height < 600;
export const isMediumDevice = height >= 600 && height < 800;
export const isLargeDevice = height >= 800;
export const isTablet = width >= 768;

// Responsive breakpoints
export const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
};

// Width utilities
export const wp = (percentage: number) => {
  return (screenWidth * percentage) / 100;
};

export const wpx = (pixels: number) => {
  return scale(pixels);
};

// Height utilities
export const hp = (percentage: number) => {
  return (screenHeight * percentage) / 100;
};

export const hpx = (pixels: number) => {
  return verticalScale(pixels);
};

// Spacing utilities
export const spacing = {
  xs: wpx(4),
  sm: wpx(8),
  md: wpx(16),
  lg: wpx(24),
  xl: wpx(32),
  xxl: wpx(48),
  xxxl: wpx(64),
};

// Font size utilities
export const fontSize = {
  xs: responsiveFont(10),
  sm: responsiveFont(12),
  md: responsiveFont(14),
  lg: responsiveFont(16),
  xl: responsiveFont(18),
  xxl: responsiveFont(20),
  xxxl: responsiveFont(24),
  xxxxl: responsiveFont(32),
};

// Border radius utilities
export const borderRadius = {
  xs: wpx(2),
  sm: wpx(4),
  md: wpx(8),
  lg: wpx(12),
  xl: wpx(16),
  xxl: wpx(24),
  round: wpx(50),
};

// Shadow utilities
export const shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
};

// Platform-specific adjustments
export const platformSelect = (ios: any, android: any) => {
  return Platform.select({ ios, android });
};

// Responsive value function
export const responsiveValue = (values: { [key: string]: any }) => {
  if (isSmallDevice) return values.sm || values.md || values.lg;
  if (isMediumDevice) return values.md || values.lg || values.sm;
  if (isLargeDevice) return values.lg || values.md || values.xl;
  return values.md || values.lg;
};

// Common responsive dimensions
export const dimensions = {
  // Header heights
  headerHeight: hpx(56),
  headerHeightLarge: hpx(64),
  
  // Tab bar heights
  tabBarHeight: hpx(60),
  tabBarHeightLarge: hpx(80),
  
  // Button heights
  buttonHeight: hpx(48),
  buttonHeightSmall: hpx(36),
  buttonHeightLarge: hpx(56),
  
  // Input heights
  inputHeight: hpx(48),
  inputHeightSmall: hpx(40),
  inputHeightLarge: hpx(56),
  
  // Card dimensions
  cardMinHeight: hpx(80),
  cardPadding: wpx(16),
  
  // Avatar sizes
  avatarSmall: wpx(32),
  avatarMedium: wpx(40),
  avatarLarge: wpx(56),
  avatarXLarge: wpx(80),
  
  // Icon sizes
  iconSmall: wpx(16),
  iconMedium: wpx(24),
  iconLarge: wpx(32),
  iconXLarge: wpx(48),
  
  // Chat specific
  chatBubbleMaxWidth: wp(80),
  chatBubbleMinWidth: wpx(60),
  chatInputHeight: hpx(48),
  chatHeaderHeight: hpx(56),
  
  // List item heights
  listItemHeight: hpx(56),
  listItemHeightLarge: hpx(72),
  
  // Modal dimensions
  modalMaxWidth: wp(90),
  modalMaxHeight: hp(80),
  
  // Safe area
  safeAreaTop: Platform.OS === 'ios' ? hpx(44) : hpx(24),
  safeAreaBottom: Platform.OS === 'ios' ? hpx(34) : hpx(0),
  
  // FAB dimensions
  fabHeight: hpx(56),
  fabWidth: wpx(56),
};
