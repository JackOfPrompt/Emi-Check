import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface RadioOption {
  label: string;
  value: string;
  subLabel?: string;
  icon?: string;
}

interface RadioCardGroupProps {
  label?: string;
  options: RadioOption[];
  value: string | undefined;
  onChange: (val: string) => void;
  error?: string;
  horizontal?: boolean;
}

export function RadioCardGroup({
  label,
  options,
  value,
  onChange,
  error,
  horizontal = false,
}: RadioCardGroupProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      )}
      <View style={[styles.group, horizontal && styles.horizontal]}>
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.card,
                horizontal && styles.cardHorizontal,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.accent : colors.card,
                },
              ]}
              onPress={() => onChange(opt.value)}
              testID={`radio-${opt.value}`}
            >
              {opt.icon && (
                <Feather
                  name={opt.icon as any}
                  size={22}
                  color={isSelected ? colors.primary : colors.mutedForeground}
                  style={styles.icon}
                />
              )}
              <View style={styles.textArea}>
                <Text
                  style={[
                    styles.cardLabel,
                    {
                      color: isSelected ? colors.primary : colors.foreground,
                      fontWeight: isSelected ? "600" : "400",
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {opt.subLabel && (
                  <Text
                    style={[
                      styles.subLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {opt.subLabel}
                  </Text>
                )}
              </View>
              {isSelected && (
                <View
                  style={[
                    styles.checkCircle,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Feather name="check" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  group: {
    gap: 10,
  },
  horizontal: {
    flexDirection: "row",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    minHeight: 54,
  },
  cardHorizontal: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 70,
    gap: 6,
  },
  icon: {
    marginRight: 12,
  },
  textArea: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 15,
  },
  subLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
