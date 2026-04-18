import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useFormStore } from "@/store/useFormStore";
import { StepLayout } from "@/components/StepLayout";
import { RadioCardGroup } from "@/components/RadioCard";
import { SelectInput } from "@/components/SelectInput";
import { CurrencyInput } from "@/components/CurrencyInput";
import { PrimaryButton } from "@/components/PrimaryButton";
import { calcEligibility, RATE_DEFAULTS } from "@/lib/eligibility";

const TENURE_OPTIONS: Record<string, Array<{ label: string; value: number }>> = {
  personal: [
    { label: "12 months", value: 12 },
    { label: "24 months", value: 24 },
    { label: "36 months", value: 36 },
    { label: "48 months", value: 48 },
    { label: "60 months", value: 60 },
  ],
  home: [
    { label: "60 months (5 years)", value: 60 },
    { label: "120 months (10 years)", value: 120 },
    { label: "180 months (15 years)", value: 180 },
    { label: "240 months (20 years)", value: 240 },
    { label: "300 months (25 years)", value: 300 },
  ],
  lap: [
    { label: "60 months (5 years)", value: 60 },
    { label: "120 months (10 years)", value: 120 },
    { label: "180 months (15 years)", value: 180 },
    { label: "240 months (20 years)", value: 240 },
  ],
  business: [
    { label: "12 months", value: 12 },
    { label: "24 months", value: 24 },
    { label: "36 months", value: 36 },
    { label: "48 months", value: 48 },
    { label: "60 months", value: 60 },
  ],
};

export default function Screen3LoanIntent() {
  const colors = useColors();
  const { loanIntent, employment, obligations, setLoanIntent, setResult } = useFormStore();

  const [loanType, setLoanType] = useState(loanIntent.loan_type || "");
  const [requestedAmount, setRequestedAmount] = useState(loanIntent.requested_loan_amount || 0);
  const [tenureMonths, setTenureMonths] = useState<number | undefined>(loanIntent.preferred_tenure_months);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const rate = RATE_DEFAULTS[loanType];

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const intentData = {
      loan_type: loanType,
      requested_loan_amount: requestedAmount,
      preferred_tenure_months: tenureMonths || 60,
    };

    setLoanIntent(intentData);

    const result = calcEligibility(
      employment as any,
      obligations as any,
      intentData
    );
    setResult(result);
    router.push("/result");
  };

  return (
    <StepLayout
      title="Loan Requirements"
      subtitle="Tell us what kind of loan you need"
      step={3}
      onBack={() => router.back()}
      submitButton={
        <PrimaryButton
          title="Check Eligibility"
          onPress={onCheckEligibility}
          icon="zap"
          testID="check-eligibility-button"
        />
      }
    >
      <RadioCardGroup
        label="What type of loan do you need?"
        options={[
          { label: "Personal Loan", value: "personal", icon: "user" },
          { label: "Home Loan", value: "home", icon: "home" },
          { label: "Loan Against Property (LAP)", value: "lap", icon: "map-pin" },
          { label: "Business Loan", value: "business", icon: "briefcase" },
        ]}
        value={loanType}
        onChange={(v) => {
          setLoanType(v);
          setTenureMonths(undefined);
          setErrors({});
        }}
        error={errors.loanType}
      />

      {loanType && rate && (
        <View style={[styles.rateBadge, { backgroundColor: colors.goldLight, borderColor: colors.gold }]}>
          <Text style={[styles.rateBadgeText, { color: "#92400e" }]}>
            Indicative interest rate: {rate}% p.a.
          </Text>
        </View>
      )}

      <CurrencyInput
        label="How much do you need? ₹"
        value={requestedAmount}
        onChangeValue={setRequestedAmount}
        error={errors.requestedAmount}
        placeholder="e.g. 500000"
      />

      {loanType && (
        <SelectInput
          label="Preferred Tenure"
          value={tenureMonths}
          onChange={(v) => setTenureMonths(v as number)}
          error={errors.tenureMonths}
          options={TENURE_OPTIONS[loanType] || TENURE_OPTIONS.personal}
          placeholder="Select tenure"
        />
      )}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  rateBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    marginTop: -8,
  },
  rateBadgeText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
