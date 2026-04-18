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
            paddingTop: topPad + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} testID="back-button">
              <Feather name="chevron-left" size={24} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
          <View style={styles.logoArea}>
            <View
              style={[styles.logoIcon, { backgroundColor: colors.primary }]}
            >
              <Feather name="shield" size={14} color="#fff" />
            </View>
            <Text style={[styles.logoText, { color: colors.primary }]}>
              LoanCheck
            </Text>
          </View>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.progressWrapper}>
          <ProgressBar currentStep={step} />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPad + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        )}
        <View style={styles.formArea}>{children}</View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: bottomPad + 16,
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
  root: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    alignItems: "center",
  },
  logoArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
  },
  progressWrapper: {
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  formArea: {
    gap: 4,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
