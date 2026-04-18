import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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
                  backgroundColor: isSelected ? colors.surface ?? colors.accent : colors.card,
                  shadowColor: isSelected ? colors.primary : "transparent",
                },
              ]}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.7}
              testID={`radio-${opt.value}`}
            >
              {/* Left: icon + text */}
              {!horizontal && opt.icon && (
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.muted,
                    },
                  ]}
                >
                  <Feather
                    name={opt.icon as any}
                    size={18}
                    color={isSelected ? "#fff" : colors.mutedForeground}
                  />
                </View>
              )}

              {horizontal && opt.icon && (
                <Feather
                  name={opt.icon as any}
                  size={20}
                  color={isSelected ? colors.primary : colors.mutedForeground}
                  style={{ marginBottom: 4 }}
                />
              )}

              <View style={[styles.textArea, horizontal && { alignItems: "center" }]}>
                <Text
                  style={[
                    styles.cardLabel,
                    {
                      color: isSelected ? colors.primary : colors.foreground,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {opt.subLabel && !horizontal && (
                  <Text
                    style={[styles.subLabel, { color: colors.mutedForeground }]}
                  >
                    {opt.subLabel}
                  </Text>
                )}
              </View>

              {/* Right: radio circle */}
              {!horizontal && (
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {isSelected && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              )}

              {horizontal && isSelected && (
                <View style={[styles.checkDot, { backgroundColor: colors.primary }]}>
                  <Feather name="check" size={8} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>⚠ {error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  group: { gap: 8 },
  horizontal: { flexDirection: "row" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    minHeight: 58,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHorizontal: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 72,
    paddingVertical: 12,
    gap: 2,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textArea: { flex: 1 },
  cardLabel: { fontSize: 15 },
  subLabel: { fontSize: 12, marginTop: 2 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  checkDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { fontSize: 12, marginTop: 4 },
});
