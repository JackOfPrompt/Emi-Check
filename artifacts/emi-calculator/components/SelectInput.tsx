import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Option {
  label: string;
  value: string | number;
}

interface SelectInputProps {
  label?: string;
  options: Option[];
  value: string | number | undefined;
  onChange: (val: string | number) => void;
  placeholder?: string;
  error?: string;
}

export function SelectInput({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  error,
}: SelectInputProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      )}
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            borderColor: error ? colors.destructive : colors.border,
            backgroundColor: colors.card,
          },
        ]}
        onPress={() => setOpen(true)}
        testID={`select-${label}`}
      >
        <Text
          style={[
            styles.triggerText,
            { color: selected ? colors.foreground : colors.mutedForeground },
          ]}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {error}
        </Text>
      )}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              {label}
            </Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      {
                        backgroundColor: isSelected
                          ? colors.accent
                          : "transparent",
                        borderRadius: 8,
                      },
                    ]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: isSelected
                            ? colors.primary
                            : colors.foreground,
                          fontWeight: isSelected ? "600" : "400",
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Feather
                        name="check"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.list}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
    marginBottom: 6,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 50,
    paddingVertical: 12,
  },
  triggerText: {
    fontSize: 15,
    flex: 1,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
    borderWidth: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  list: {
    maxHeight: 400,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  optionText: {
    fontSize: 15,
    flex: 1,
  },
});
