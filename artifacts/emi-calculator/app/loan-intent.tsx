import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFormStore } from "@/store/useFormStore";
import { StepLayout } from "@/components/StepLayout";
import { RadioCardGroup } from "@/components/RadioCard";
import { SelectInput } from "@/components/SelectInput";
import { CurrencyInput } from "@/components/CurrencyInput";
import { PrimaryButton } from "@/components/PrimaryButton";
import { calcEligibility, RATE_DEFAULTS } from "@/lib/eligibility";

function formatINR(value: number): string {
  if (!value) return "0";
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
  return remaining + "," + result;
}

const LOAN_TYPES = [
  {
    label: "Personal Loan",
    value: "personal",
    icon: "user",
    subLabel: "Quick disbursal, no collateral",
    rate: 14,
    maxTenure: "5 years",
  },
  {
    label: "Home Loan",
    value: "home",
    icon: "home",
    subLabel: "Buy or construct your home",
    rate: 8.5,
    maxTenure: "30 years",
  },
  {
    label: "Loan Against Property",
    value: "lap",
    icon: "map-pin",
    subLabel: "Use your property as collateral",
    rate: 11,
    maxTenure: "20 years",
  },
  {
    label: "Business Loan",
    value: "business",
    icon: "briefcase",
    subLabel: "Working capital or expansion",
    rate: 16,
    maxTenure: "5 years",
  },
];

const TENURE_OPTIONS: Record<string, Array<{ label: string; value: number }>> = {
  personal: [
    { label: "1 year (12 months)", value: 12 },
    { label: "2 years (24 months)", value: 24 },
    { label: "3 years (36 months)", value: 36 },
    { label: "4 years (48 months)", value: 48 },
    { label: "5 years (60 months)", value: 60 },
  ],
  home: [
    { label: "5 years", value: 60 },
    { label: "10 years", value: 120 },
    { label: "15 years", value: 180 },
    { label: "20 years", value: 240 },
    { label: "25 years", value: 300 },
    { label: "30 years", value: 360 },
  ],
  lap: [
    { label: "5 years", value: 60 },
    { label: "10 years", value: 120 },
    { label: "15 years", value: 180 },
    { label: "20 years", value: 240 },
  ],
  business: [
    { label: "1 year (12 months)", value: 12 },
    { label: "2 years (24 months)", value: 24 },
    { label: "3 years (36 months)", value: 36 },
    { label: "4 years (48 months)", value: 48 },
    { label: "5 years (60 months)", value: 60 },
  ],
};

function SectionCard({ title, children, colors }: any) {
  return (
    <View style={[sectionStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {title && (
        <View style={[sectionStyles.titleRow, { borderBottomColor: colors.border }]}>
          <Text style={[sectionStyles.title, { color: colors.primary }]}>{title}</Text>
        </View>
      )}
      <View style={sectionStyles.body}>{children}</View>
    </View>
  );
}

export default function Screen3LoanIntent() {
  const colors = useColors();
  const { loanIntent, employment, obligations, setLoanIntent, setResult } = useFormStore();

  const [loanType, setLoanType] = useState(loanIntent.loan_type || "");
  const [requestedAmount, setRequestedAmount] = useState(loanIntent.requested_loan_amount || 0);
  const [tenureMonths, setTenureMonths] = useState<number | undefined>(
    loanIntent.preferred_tenure_months || undefined
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedLoanInfo = LOAN_TYPES.find((l) => l.value === loanType);
  const rate = RATE_DEFAULTS[loanType];

  // Live preview calculation
  const canPreview = !!(loanType && tenureMonths && employment.employment_type);
  const preview = canPreview
    ? calcEligibility(employment as any, obligations as any, {
        loan_type: loanType,
        preferred_tenure_months: tenureMonths,
      })
    : null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!loanType) newErrors.loanType = "Please select loan type";
    if (!requestedAmount || requestedAmount < 50000)
      newErrors.requestedAmount = "Minimum loan amount is ₹50,000";
    if (!tenureMonths) newErrors.tenureMonths = "Please select tenure";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onCheckEligibility = () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const intentData = {
      loan_type: loanType,
      requested_loan_amount: requestedAmount,
      preferred_tenure_months: tenureMonths || 60,
    };

    setLoanIntent(intentData);
    const result = calcEligibility(employment as any, obligations as any, intentData);
    setResult(result);
    router.push("/result");
  };

  return (
    <StepLayout
      title="Loan Requirements"
      subtitle="Tell us what you need and we'll calculate your eligibility instantly"
      step={3}
      onBack={() => router.back()}
      submitButton={
        <PrimaryButton
          title="Check My Eligibility"
          onPress={onCheckEligibility}
          icon="zap"
          testID="check-eligibility-button"
        />
      }
    >
      {/* Loan type */}
      <SectionCard title="Loan Type" colors={colors}>
        <RadioCardGroup
          options={LOAN_TYPES.map((l) => ({
            label: l.label,
            value: l.value,
            subLabel: l.subLabel,
            icon: l.icon,
          }))}
          value={loanType}
          onChange={(v) => {
            setLoanType(v);
            setTenureMonths(undefined);
            setErrors({});
          }}
          error={errors.loanType}
        />

        {selectedLoanInfo && (
          <View style={[rateBadge.container, { backgroundColor: colors.goldLight, borderColor: colors.gold + "60" }]}>
            <Feather name="percent" size={13} color={colors.gold} />
            <Text style={[rateBadge.text, { color: colors.gold }]}>
              Indicative rate: {selectedLoanInfo.rate}% p.a. · Max tenure: {selectedLoanInfo.maxTenure}
            </Text>
          </View>
        )}
      </SectionCard>

      {/* Amount and tenure */}
      <SectionCard title="Loan Details" colors={colors}>
        <CurrencyInput
          label="How much do you need? ₹"
          value={requestedAmount}
          onChangeValue={setRequestedAmount}
          error={errors.requestedAmount}
          placeholder="e.g. 5,00,000"
          helperText="Enter the loan amount you want to borrow"
        />

        {loanType ? (
          <SelectInput
            label="Preferred Repayment Tenure"
            value={tenureMonths}
            onChange={(v) => setTenureMonths(v as number)}
            error={errors.tenureMonths}
            options={TENURE_OPTIONS[loanType] || TENURE_OPTIONS.personal}
            placeholder="Select tenure"
          />
        ) : (
          <View style={[tenureHint.container, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[tenureHint.text, { color: colors.mutedForeground }]}>
              Select a loan type above to see tenure options
            </Text>
          </View>
        )}
      </SectionCard>

      {/* Live eligibility preview */}
      {preview && (
        <View style={[previewStyles.card, {
          backgroundColor: preview.eligible ? colors.primary : colors.destructive,
        }]}>
          <View style={previewStyles.header}>
            <Feather name={preview.eligible ? "zap" : "alert-circle"} size={16} color="#fff" />
            <Text style={previewStyles.headerText}>
              {preview.eligible ? "Estimated Eligibility Preview" : "Eligibility Challenge"}
            </Text>
          </View>
          {preview.eligible ? (
            <View style={previewStyles.stats}>
              <View style={previewStyles.stat}>
                <Text style={previewStyles.statLabel}>Max Loan</Text>
                <Text style={previewStyles.statValue}>₹{formatINR(preview.eligibleLoanAmount)}</Text>
              </View>
              <View style={previewStyles.statDivider} />
              <View style={previewStyles.stat}>
                <Text style={previewStyles.statLabel}>EMI/month</Text>
                <Text style={previewStyles.statValue}>₹{formatINR(preview.eligibleEMI)}</Text>
              </View>
              <View style={previewStyles.statDivider} />
              <View style={previewStyles.stat}>
                <Text style={previewStyles.statLabel}>FOIR</Text>
                <Text style={previewStyles.statValue}>{Math.round(preview.foirApplied * 100)}%</Text>
              </View>
            </View>
          ) : (
            <Text style={previewStyles.notEligibleText}>
              High existing obligations may limit eligibility. Reduce current EMIs for better results.
            </Text>
          )}
          <Text style={previewStyles.disclaimer}>
            * Indicative only. Final amount subject to lender verification.
          </Text>
        </View>
      )}
    </StepLayout>
  );
}

const sectionStyles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, marginBottom: 14, overflow: "hidden" },
  titleRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  title: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  body: { padding: 16, paddingBottom: 8 },
});

const rateBadge = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  text: { fontSize: 13, fontWeight: "500", flex: 1 },
});

const tenureHint = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  text: { fontSize: 13 },
});

const previewStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  headerText: { color: "#fff", fontWeight: "700", fontSize: 13, letterSpacing: 0.3 },
  stats: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  stat: { flex: 1, alignItems: "center" },
  statLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginBottom: 4, fontWeight: "600" },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  statDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.25)" },
  notEligibleText: { color: "#fff", fontSize: 13, lineHeight: 20, marginBottom: 8 },
  disclaimer: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontStyle: "italic" },
});
