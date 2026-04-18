import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { ProgressBar } from "./ProgressBar";

interface StepLayoutProps {
  title: string;
  subtitle?: string;
  step: number;
  children: React.ReactNode;
  onBack?: () => void;
  submitButton: React.ReactNode;
}

export function StepLayout({
  title,
  subtitle,
  step,
  children,
  onBack,
  submitButton,
}: StepLayoutProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 6,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} testID="back-button" hitSlop={8}>
              <View style={[styles.backCircle, { backgroundColor: colors.background }]}>
                <Feather name="chevron-left" size={20} color={colors.primary} />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
          <View style={styles.logoArea}>
            <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
              <Feather name="shield" size={13} color="#fff" />
            </View>
            <Text style={[styles.logoText, { color: colors.primary }]}>LoanCheck</Text>
          </View>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.progressWrapper}>
          <ProgressBar currentStep={step} />
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step header */}
        <View style={[styles.stepHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.stepNumBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.stepNumText, { color: colors.primary }]}>Step {step} of 4</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
          )}
        </View>

        <View style={styles.formArea}>{children}</View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: bottomPad + 12,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        {submitButton}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: { width: 36 },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoArea: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  progressWrapper: {},
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  stepHeader: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
  },
  stepNumBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  stepNumText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 4, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  formArea: { gap: 0 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
