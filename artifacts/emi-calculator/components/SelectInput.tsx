import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Platform,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Option {
  label: string;
  value: string | number;
  subLabel?: string;
}

interface SelectInputProps {
  label?: string;
  options: Option[];
  value: string | number | undefined;
  onChange: (val: string | number) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
}

export function SelectInput({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  error,
  helperText,
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
            borderColor: error ? colors.destructive : selected ? colors.primary : colors.border,
            backgroundColor: colors.card,
          },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        testID={`select-${label}`}
      >
        <Text
          style={[
            styles.triggerText,
            { color: selected ? colors.foreground : colors.mutedForeground },
          ]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <View style={[styles.chevronWrap, selected && { backgroundColor: colors.accent }]}>
          <Feather
            name="chevron-down"
            size={15}
            color={selected ? colors.primary : colors.mutedForeground}
          />
        </View>
      </TouchableOpacity>
      {helperText && !error && (
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>{helperText}</Text>
      )}
      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>⚠ {error}</Text>
      )}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: colors.card },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {label && (
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                {label}
              </Text>
            )}

            <FlatList
              data={options}
              keyExtractor={(item) => item.value.toString()}
              bounces={false}
              renderItem={({ item, index }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      {
                        backgroundColor: isSelected ? colors.accent : "transparent",
                        borderBottomColor: colors.border,
                        borderBottomWidth: index < options.length - 1 ? 1 : 0,
                      },
                    ]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    activeOpacity={0.6}
                  >
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionText,
                          { color: isSelected ? colors.primary : colors.foreground },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.subLabel && (
                        <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>
                          {item.subLabel}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                        <Feather name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.list}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    minHeight: 52,
  },
  triggerText: { fontSize: 15, flex: 1, paddingVertical: 8 },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  helper: { fontSize: 12, marginTop: 4 },
  error: { fontSize: 12, marginTop: 4 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 0,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    maxHeight: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  list: { maxHeight: 420 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionContent: { flex: 1 },
  optionText: { fontSize: 15, fontWeight: "500" },
  optionSub: { fontSize: 12, marginTop: 2 },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
