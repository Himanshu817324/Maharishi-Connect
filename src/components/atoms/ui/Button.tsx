import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTheme } from "../../../theme";
import { moderateScale } from "../../../theme/responsive";

type ButtonProps = {
  title: string;
  onPress: undefined;
};

export default function Button({ title, onPress }: ButtonProps)  {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onPress}>
      <Text style={[styles.text, { color: colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(20),
    borderRadius: 8,
    alignItems: "center",
  },
  text: {
    fontSize: moderateScale(16),
    fontWeight: "bold",
  },
});
