import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface FieldErrorProps {
  message?: string;
}

export function FieldError({ message }: FieldErrorProps) {
  const colors = useColors();
  if (!message) return null;
  return (
    <Text style={[styles.text, { color: colors.destructive }]}>{message}</Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 12,
    marginTop: 4,
  },
});
