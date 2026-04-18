import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useFormStore } from "@/store/useFormStore";
import { StepLayout } from "@/components/StepLayout";
import { CurrencyInput } from "@/components/CurrencyInput";
import { SelectInput } from "@/components/SelectInput";
import { ToggleBoolean } from "@/components/ToggleBoolean";
import { PrimaryButton } from "@/components/PrimaryButton";
import { calcCCObligation, calcTotalExistingEMI } from "@/lib/eligibility";

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
  result = remaining + "," + result;
  return result;
}

export default function Screen2Obligations() {
  const colors = useColors();
  const { obligations, employment, setObligations } = useFormStore();

  const [homeLoanEmi, setHomeLoanEmi] = useState(obligations.home_loan_emi || 0);
  const [personalLoanEmi, setPersonalLoanEmi] = useState(obligations.personal_loan_emi || 0);
  const [businessLoanEmi, setBusinessLoanEmi] = useState(obligations.business_loan_emi || 0);
  const [vehicleLoanEmi, setVehicleLoanEmi] = useState(obligations.vehicle_loan_emi || 0);
  const [activeLoanCount, setActiveLoanCount] = useState<number | undefined>(obligations.active_loan_count);
  const [totalCCLimit, setTotalCCLimit] = useState(obligations.total_cc_limit || 0);
  const [ccOutstanding, setCcOutstanding] = useState(obligations.cc_outstanding || 0);
  const [overdueLastSix, setOverdueLastSix] = useState<boolean | undefined>(obligations.overdue_last_6months ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalExistingEMI = calcTotalExistingEMI({
    home_loan_emi: homeLoanEmi,
    personal_loan_emi: personalLoanEmi,
    business_loan_emi: businessLoanEmi,
    vehicle_loan_emi: vehicleLoanEmi,
  });
  const ccObligation = calcCCObligation(ccOutstanding);

  const income =
    employment.employment_type === "salaried"
      ? employment.monthly_net_income || 0
      : employment.avg_monthly_bank_credit || 0;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (activeLoanCount === undefined) newErrors.activeLoanCount = "Required";
    if (overdueLastSix === undefined) newErrors.overdueLastSix = "Required";
    if (income > 0 && totalExistingEMI >= income) {
      newErrors.totalEMI = "Your total EMIs exceed your income. Please verify.";
    }
    if (ccOutstanding > totalCCLimit && totalCCLimit > 0) {
      newErrors.ccOutstanding = "Outstanding cannot exceed total credit card limit";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onNext = () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setObligations({
      home_loan_emi: homeLoanEmi,
      personal_loan_emi: personalLoanEmi,
      business_loan_emi: businessLoanEmi,
      vehicle_loan_emi: vehicleLoanEmi,
      active_loan_count: activeLoanCount || 0,
      total_cc_limit: totalCCLimit,
      cc_outstanding: ccOutstanding,
      overdue_last_6months: overdueLastSix || false,
    });
    router.push("/loan-intent");
  };

  return (
    <StepLayout
      title="Existing Obligations"
      subtitle="Enter 0 if not applicable"
      step={2}
      onBack={() => router.back()}
      submitButton={
        <PrimaryButton
          title="Next"
          onPress={onNext}
          icon="arrow-right"
          testID="next-button"
        />
      }
    >
      <CurrencyInput
        label="Home Loan EMI ₹/month"
        value={homeLoanEmi}
        onChangeValue={setHomeLoanEmi}
        placeholder="0"
      />
      <CurrencyInput
        label="Personal Loan EMI ₹/month"
        value={personalLoanEmi}
        onChangeValue={setPersonalLoanEmi}
        placeholder="0"
      />
      <CurrencyInput
        label="Business Loan EMI ₹/month"
        value={businessLoanEmi}
        onChangeValue={setBusinessLoanEmi}
        placeholder="0"
      />
      <CurrencyInput
        label="Vehicle Loan EMI ₹/month"
        value={vehicleLoanEmi}
        onChangeValue={setVehicleLoanEmi}
        placeholder="0"
      />

      {/* Total EMI Summary Card */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: colors.accent, borderColor: colors.primary },
        ]}
      >
        <Text style={[styles.summaryLabel, { color: colors.primary }]}>
          Total Existing EMI
        </Text>
        <Text style={[styles.summaryValue, { color: colors.primary }]}>
          ₹{formatINR(totalExistingEMI)}/month
        </Text>
        {errors.totalEMI && (
          <Text style={[styles.summaryError, { color: colors.destructive }]}>
            {errors.totalEMI}
          </Text>
        )}
      </View>

      <SelectInput
        label="Number of Active Loans"
        value={activeLoanCount}
        onChange={(v) => setActiveLoanCount(v as number)}
        error={errors.activeLoanCount}
        options={[
          { label: "0", value: 0 },
          { label: "1", value: 1 },
          { label: "2", value: 2 },
          { label: "3", value: 3 },
          { label: "4", value: 4 },
          { label: "5+", value: 5 },
        ]}
        placeholder="Select count"
      />

      <CurrencyInput
        label="Total Credit Card Limit ₹"
        value={totalCCLimit}
        onChangeValue={setTotalCCLimit}
        helperText="Combined limit across all credit cards"
        placeholder="0"
      />
      <CurrencyInput
        label="Current Credit Card Outstanding ₹"
        value={ccOutstanding}
        onChangeValue={setCcOutstanding}
        helperText={`CC Monthly Obligation: ₹${formatINR(ccObligation)}/month (5% of outstanding)`}
        error={errors.ccOutstanding}
        placeholder="0"
      />

      <ToggleBoolean
        label="Any loan or credit card overdue in last 6 months?"
        value={overdueLastSix}
        onChange={setOverdueLastSix}
        error={errors.overdueLastSix}
      />

      {overdueLastSix === true && (
        <View
          style={[
            styles.warningBanner,
            { backgroundColor: "#fef3c7", borderColor: "#d97706" },
          ]}
        >
          <Text style={[styles.warningText, { color: "#92400e" }]}>
            This may affect your eligibility significantly
          </Text>
        </View>
      )}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  summaryError: {
    fontSize: 12,
    marginTop: 6,
  },
  warningBanner: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
