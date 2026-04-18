import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  testID?: string;
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  testID,
}: PrimaryButtonProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        {
          backgroundColor:
            disabled || loading ? colors.border : colors.primary,
        },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={styles.inner}>
          <Text style={styles.text}>{title}</Text>
          {icon && <Feather name={icon as any} size={18} color="#fff" />}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
