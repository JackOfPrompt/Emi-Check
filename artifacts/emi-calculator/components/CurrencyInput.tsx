import React, { useState, forwardRef } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { useColors } from "@/hooks/useColors";

function formatINR(value: number): string {
  if (!value) return "";
  const str = Math.round(value).toString();
  let result = "";
  const len = str.length;
  if (len <= 3) return str;
  result = str.slice(-3);
  let remaining = str.slice(0, len - 3);
  while (remaining.length > 2) {
    result = remaining.slice(-2) + "," + result;
    remaining = remaining.slice(0, remaining.length - 2);
  }
  result = remaining + "," + result;
  return result;
}

interface CurrencyInputProps extends Omit<TextInputProps, "value" | "onChangeText"> {
  value: number;
  onChangeValue: (val: number) => void;
  label?: string;
  helperText?: string;
  error?: string;
  prefix?: string;
}

export const CurrencyInput = forwardRef<TextInput, CurrencyInputProps>(
  ({ value, onChangeValue, label, helperText, error, prefix = "₹", style, ...rest }, ref) => {
    const colors = useColors();
    const [isFocused, setIsFocused] = useState(false);
    const [rawText, setRawText] = useState(value ? value.toString() : "");

    const displayValue = isFocused
      ? rawText
      : value
      ? formatINR(value)
      : "";

    return (
      <View style={styles.container}>
        {label && (
          <Text style={[styles.label, { color: colors.foreground }]}>
            {label}
          </Text>
        )}
        <View
          style={[
            styles.inputWrapper,
            {
              borderColor: error
                ? colors.destructive
                : isFocused
                ? colors.primary
                : colors.border,
              backgroundColor: colors.card,
            },
          ]}
        >
          <Text style={[styles.prefix, { color: colors.mutedForeground }]}>
            {prefix}
          </Text>
          <TextInput
            ref={ref}
            style={[styles.input, { color: colors.foreground }, style]}
            value={displayValue}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, "");
              setRawText(cleaned);
              onChangeValue(cleaned ? parseFloat(cleaned) : 0);
            }}
            onFocus={() => {
              setIsFocused(true);
              setRawText(value ? value.toString() : "");
            }}
            onBlur={() => {
              setIsFocused(false);
            }}
            keyboardType="numeric"
            placeholderTextColor={colors.mutedForeground}
            {...rest}
          />
        </View>
        {helperText && !error && (
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>
            {helperText}
          </Text>
        )}
        {error && (
          <Text style={[styles.error, { color: colors.destructive }]}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  prefix: {
    fontSize: 16,
    marginRight: 4,
    fontWeight: "500",
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  helper: {
    fontSize: 12,
    marginTop: 4,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
