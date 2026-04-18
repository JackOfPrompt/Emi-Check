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
  variant?: "primary" | "outline";
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  testID,
  variant = "primary",
}: PrimaryButtonProps) {
  const colors = useColors();
  const isPrimary = variant === "primary";

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        {
          backgroundColor: disabled || loading
            ? colors.border
            : isPrimary ? colors.primary : "transparent",
          borderColor: isPrimary ? "transparent" : colors.primary,
          borderWidth: isPrimary ? 0 : 2,
        },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#fff" : colors.primary} />
      ) : (
        <View style={styles.inner}>
          <Text style={[styles.text, { color: isPrimary ? "#fff" : colors.primary }]}>
            {title}
          </Text>
          {icon && <Feather name={icon as any} size={18} color={isPrimary ? "#fff" : colors.primary} />}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
