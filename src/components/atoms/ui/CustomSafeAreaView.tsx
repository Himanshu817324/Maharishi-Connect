import React from "react";
import { View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = ViewProps & {
  children: React.ReactNode;
};

const CustomSafeAreaView: React.FC<Props> = ({ children, style, ...rest }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[{ paddingTop: insets.top, flex: 1 }, style]}
      {...rest}
    >
      {children}
    </View>
  );
};

export default CustomSafeAreaView;
