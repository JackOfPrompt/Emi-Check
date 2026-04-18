import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface ToggleBooleanProps {
  label: string;
  value: boolean | undefined;
  onChange: (val: boolean) => void;
  error?: string;
}

export function ToggleBoolean({ label, value, onChange, error }: ToggleBooleanProps) {
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
              backgroundColor: value === true ? colors.accent : colors.card,
            },
          ]}
          onPress={() => onChange(true)}
          testID={`toggle-yes`}
        >
          <Text
            style={[
              styles.btnText,
              {
                color: value === true ? colors.primary : colors.mutedForeground,
                fontWeight: value === true ? "600" : "400",
              },
            ]}
          >
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.btn,
            {
              borderColor: value === false ? colors.destructive : colors.border,
              backgroundColor:
                value === false ? "#fef2f2" : colors.card,
            },
          ]}
          onPress={() => onChange(false)}
          testID={`toggle-no`}
        >
          <Text
            style={[
              styles.btnText,
              {
                color:
                  value === false ? colors.destructive : colors.mutedForeground,
                fontWeight: value === false ? "600" : "400",
              },
            ]}
          >
            No
          </Text>
        </TouchableOpacity>
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
  row: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    minHeight: 50,
  },
  btnText: {
    fontSize: 15,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
