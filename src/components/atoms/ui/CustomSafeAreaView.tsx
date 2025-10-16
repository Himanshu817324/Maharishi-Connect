import React from "react";
import { View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

type Props = ViewProps & {
  children: React.ReactNode;
  topColor?: string;
  bottomColor?: string;
};

const CustomSafeAreaView: React.FC<Props> = ({ 
  children, 
  style, 
  topColor, 
  bottomColor,
  ...rest 
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const topBgColor = topColor || colors.primary;
  const bottomBgColor = bottomColor || colors.background;

  return (
    <View style={[{ flex: 1 }, style]} {...rest}>
      {/* Top area with primary color */}
      {insets.top > 0 && (
        <View 
          style={{
            height: insets.top,
            backgroundColor: topBgColor,
          }}
        />
      )}
      {/* Main content area with background color */}
      <View 
        style={{
          flex: 1,
          backgroundColor: bottomBgColor,
        }}
      >
        {children}
      </View>
      {/* Bottom area with background color for safe area - reduced height */}
      {insets.bottom > 0 && (
        <View 
          style={{
            height: Math.max(insets.bottom - 8, 4), // Reduce by 8px but keep minimum 4px
            backgroundColor: bottomBgColor,
          }}
        />
      )}
    </View>
  );
};

export default CustomSafeAreaView;
