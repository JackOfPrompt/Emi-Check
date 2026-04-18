import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
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
  return remaining + "," + result;
}

function SectionCard({ title, subtitle, children, colors }: any) {
  return (
    <View style={[sectionStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {(title || subtitle) && (
        <View style={[sectionStyles.titleRow, { borderBottomColor: colors.border }]}>
          {title && <Text style={[sectionStyles.title, { color: colors.primary }]}>{title}</Text>}
          {subtitle && <Text style={[sectionStyles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>}
        </View>
      )}
      <View style={sectionStyles.body}>{children}</View>
    </View>
  );
}

export default function Screen2Obligations() {
  const colors = useColors();
  const { obligations, employment, setObligations } = useFormStore();

  const [homeLoanEmi, setHomeLoanEmi] = useState(obligations.home_loan_emi || 0);
  const [personalLoanEmi, setPersonalLoanEmi] = useState(obligations.personal_loan_emi || 0);
  const [businessLoanEmi, setBusinessLoanEmi] = useState(obligations.business_loan_emi || 0);
  const [vehicleLoanEmi, setVehicleLoanEmi] = useState(obligations.vehicle_loan_emi || 0);
  const [activeLoanCount, setActiveLoanCount] = useState<number | undefined>(
    obligations.active_loan_count !== 0 ? obligations.active_loan_count : undefined
  );
  const [hasCC, setHasCC] = useState<boolean | undefined>(
    obligations.total_cc_limit > 0 ? true : obligations.cc_outstanding > 0 ? true : undefined
  );
  const [totalCCLimit, setTotalCCLimit] = useState(obligations.total_cc_limit || 0);
  const [ccOutstanding, setCcOutstanding] = useState(obligations.cc_outstanding || 0);
  const [overdueLastSix, setOverdueLastSix] = useState<boolean | undefined>(
    obligations.overdue_last_6months === true ? true : obligations.overdue_last_6months === false ? false : undefined
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalExistingEMI = calcTotalExistingEMI({
    home_loan_emi: homeLoanEmi,
    personal_loan_emi: personalLoanEmi,
    business_loan_emi: businessLoanEmi,
    vehicle_loan_emi: vehicleLoanEmi,
  });
  const ccObligation = hasCC ? calcCCObligation(ccOutstanding) : 0;
  const totalObligation = totalExistingEMI + ccObligation;

  const income =
    employment.employment_type === "salaried"
      ? employment.monthly_net_income || 0
      : employment.avg_monthly_bank_credit || 0;

  const foirUsed = income > 0 ? (totalObligation / income) * 100 : 0;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (activeLoanCount === undefined) newErrors.activeLoanCount = "Please select number of active loans";
    if (overdueLastSix === undefined) newErrors.overdueLastSix = "Please answer this question";
    if (hasCC === undefined) newErrors.hasCC = "Please answer this question";
    if (income > 0 && totalExistingEMI > income) {
      newErrors.totalEMI = "Your total EMIs exceed your income. Please verify.";
    }
    if (hasCC && ccOutstanding > 0 && totalCCLimit > 0 && ccOutstanding > totalCCLimit) {
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
      total_cc_limit: hasCC ? totalCCLimit : 0,
      cc_outstanding: hasCC ? ccOutstanding : 0,
      overdue_last_6months: overdueLastSix || false,
    });
    router.push("/loan-intent");
  };

  const hasAnyLoan = (activeLoanCount || 0) > 0;

  return (
    <StepLayout
      title="Existing Obligations"
      subtitle="Enter 0 if you don't have a particular loan — this helps us calculate accurately"
      step={2}
      onBack={() => router.back()}
      submitButton={
        <PrimaryButton title="Continue" onPress={onNext} icon="arrow-right" testID="next-button" />
      }
    >
      {/* Active loans question */}
      <SectionCard title="Active Loans" colors={colors}>
        <SelectInput
          label="How many active loans do you have?"
          value={activeLoanCount}
          onChange={(v) => {
            setActiveLoanCount(v as number);
            if (v === 0) {
              setHomeLoanEmi(0);
              setPersonalLoanEmi(0);
              setBusinessLoanEmi(0);
              setVehicleLoanEmi(0);
            }
            setErrors((e) => ({ ...e, activeLoanCount: "" }));
          }}
          error={errors.activeLoanCount}
          options={[
            { label: "0 — No active loans", value: 0 },
            { label: "1 loan", value: 1 },
            { label: "2 loans", value: 2 },
            { label: "3 loans", value: 3 },
            { label: "4 loans", value: 4 },
            { label: "5 or more loans", value: 5 },
          ]}
          placeholder="Select number of loans"
        />

        {/* EMI inputs — only shown when loans exist */}
        {hasAnyLoan && (
          <>
            <Text style={[sectionStyles.subheading, { color: colors.mutedForeground }]}>
              Enter monthly EMI for each loan (0 if not applicable)
            </Text>
            {(activeLoanCount || 0) >= 1 && (
              <CurrencyInput label="Home Loan EMI ₹/month" value={homeLoanEmi} onChangeValue={setHomeLoanEmi} placeholder="0" />
            )}
            <CurrencyInput label="Personal Loan EMI ₹/month" value={personalLoanEmi} onChangeValue={setPersonalLoanEmi} placeholder="0" />
            {employment.employment_type === "self_employed" && (
              <CurrencyInput label="Business Loan EMI ₹/month" value={businessLoanEmi} onChangeValue={setBusinessLoanEmi} placeholder="0" />
            )}
            <CurrencyInput label="Vehicle Loan EMI ₹/month" value={vehicleLoanEmi} onChangeValue={setVehicleLoanEmi} placeholder="0" />
          </>
        )}
      </SectionCard>

      {/* Live EMI summary */}
      {(totalExistingEMI > 0 || ccObligation > 0) && (
        <View style={[summaryStyles.card, { backgroundColor: colors.surface ?? colors.accent, borderColor: colors.primary + "40" }]}>
          <View style={summaryStyles.row}>
            <View style={summaryStyles.col}>
              <Text style={[summaryStyles.label, { color: colors.primary }]}>Total EMI</Text>
              <Text style={[summaryStyles.value, { color: colors.primary }]}>₹{formatINR(totalExistingEMI)}</Text>
            </View>
            {ccObligation > 0 && (
              <>
                <View style={[summaryStyles.divider, { backgroundColor: colors.primary + "30" }]} />
                <View style={summaryStyles.col}>
                  <Text style={[summaryStyles.label, { color: colors.primary }]}>CC Obligation</Text>
                  <Text style={[summaryStyles.value, { color: colors.primary }]}>₹{formatINR(ccObligation)}</Text>
                </View>
              </>
            )}
            {income > 0 && (
              <>
                <View style={[summaryStyles.divider, { backgroundColor: colors.primary + "30" }]} />
                <View style={summaryStyles.col}>
                  <Text style={[summaryStyles.label, { color: colors.primary }]}>Used FOIR</Text>
                  <Text style={[
                    summaryStyles.value,
                    { color: foirUsed > 60 ? colors.destructive : colors.primary }
                  ]}>
                    {Math.round(foirUsed)}%
                  </Text>
                </View>
              </>
            )}
          </View>
          {errors.totalEMI && (
            <Text style={[summaryStyles.error, { color: colors.destructive }]}>⚠ {errors.totalEMI}</Text>
          )}
        </View>
      )}

      {/* Credit Card section */}
      <SectionCard title="Credit Cards" colors={colors}>
        <ToggleBoolean
          label="Do you have any credit cards?"
          value={hasCC}
          onChange={(v) => {
            setHasCC(v);
            if (!v) { setTotalCCLimit(0); setCcOutstanding(0); }
            setErrors((e) => ({ ...e, hasCC: "" }));
          }}
          error={errors.hasCC}
          yesLabel="Yes, I have credit cards"
          noLabel="No credit cards"
        />

        {hasCC === true && (
          <>
            <CurrencyInput
              label="Total Credit Card Limit ₹"
              value={totalCCLimit}
              onChangeValue={setTotalCCLimit}
              helperText="Combined limit across all your credit cards"
              placeholder="e.g. 2,00,000"
            />
            <CurrencyInput
              label="Current Outstanding Balance ₹"
              value={ccOutstanding}
              onChangeValue={setCcOutstanding}
              helperText={`Monthly obligation: ₹${formatINR(ccObligation)} (5% of outstanding)`}
              error={errors.ccOutstanding}
              placeholder="0"
            />
          </>
        )}
      </SectionCard>

      {/* Overdue history */}
      <SectionCard title="Repayment History" colors={colors}>
        <ToggleBoolean
          label="Any loan or credit card overdue or late payment in the last 6 months?"
          value={overdueLastSix}
          onChange={(v) => {
            setOverdueLastSix(v);
            setErrors((e) => ({ ...e, overdueLastSix: "" }));
          }}
          error={errors.overdueLastSix}
          yesLabel="Yes"
          noLabel="No (Clean record)"
        />

        {overdueLastSix === true && (
          <View style={[warningStyles.banner, { backgroundColor: "#fef3c7", borderColor: "#d97706" }]}>
            <Feather name="alert-triangle" size={14} color="#92400e" />
            <Text style={[warningStyles.text, { color: "#92400e" }]}>
              Any overdue payment significantly reduces eligible FOIR. You can still apply with some lenders.
            </Text>
          </View>
        )}

        {overdueLastSix === false && (
          <View style={[warningStyles.banner, { backgroundColor: "#f0fdf4", borderColor: "#16a34a" }]}>
            <Feather name="check-circle" size={14} color="#16a34a" />
            <Text style={[warningStyles.text, { color: "#15803d" }]}>
              Clean repayment history — this improves your loan eligibility!
            </Text>
          </View>
        )}
      </SectionCard>
    </StepLayout>
  );
}

const sectionStyles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, marginBottom: 14, overflow: "hidden" },
  titleRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  title: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  subtitle: { fontSize: 12, marginTop: 2 },
  subheading: { fontSize: 13, marginBottom: 12, fontStyle: "italic" },
  body: { padding: 16, paddingBottom: 4 },
});

const summaryStyles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 14 },
  row: { flexDirection: "row", alignItems: "center" },
  col: { flex: 1, alignItems: "center" },
  divider: { width: 1, height: 36, marginHorizontal: 8 },
  label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 },
  value: { fontSize: 20, fontWeight: "800" },
  error: { fontSize: 12, marginTop: 8 },
});

const warningStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  text: { fontSize: 13, flex: 1, lineHeight: 18 },
});
