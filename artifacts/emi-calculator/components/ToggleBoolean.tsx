import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface ToggleBooleanProps {
  label: string;
  value: boolean | undefined;
  onChange: (val: boolean) => void;
  error?: string;
  yesLabel?: string;
  noLabel?: string;
}

export function ToggleBoolean({
  label,
  value,
  onChange,
  error,
  yesLabel = "Yes",
  noLabel = "No",
}: ToggleBooleanProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.btn,
            {
              borderColor: value === true ? colors.primary : colors.border,
              backgroundColor: value === true ? colors.primary : colors.card,
              shadowColor: value === true ? colors.primary : "transparent",
            },
          ]}
          onPress={() => onChange(true)}
          activeOpacity={0.7}
          testID="toggle-yes"
        >
          {value === true && (
            <Feather name="check" size={14} color="#fff" style={{ marginRight: 6 }} />
          )}
          <Text
            style={[
              styles.btnText,
              { color: value === true ? "#fff" : colors.mutedForeground },
            ]}
          >
            {yesLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            {
              borderColor: value === false ? colors.destructive : colors.border,
              backgroundColor: value === false ? "#fee2e2" : colors.card,
            },
          ]}
          onPress={() => onChange(false)}
          activeOpacity={0.7}
          testID="toggle-no"
        >
          {value === false && (
            <Feather name="x" size={14} color={colors.destructive} style={{ marginRight: 6 }} />
          )}
          <Text
            style={[
              styles.btnText,
              { color: value === false ? colors.destructive : colors.mutedForeground },
            ]}
          >
            {noLabel}
          </Text>
        </TouchableOpacity>
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>⚠ {error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, lineHeight: 20 },
  row: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: 12,
    minHeight: 52,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  btnText: { fontSize: 15, fontWeight: "600" },
  error: { fontSize: 12, marginTop: 4 },
});
