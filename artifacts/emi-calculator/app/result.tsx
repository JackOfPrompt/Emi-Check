import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFormStore } from "@/store/useFormStore";
import { supabase } from "@/lib/supabase";
import { calcTotalExistingEMI, calcCCObligation } from "@/lib/eligibility";

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

function validateMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile);
}

function getAge(dob: string): number {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

export default function Screen4Result() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { employment, obligations, loanIntent, result, meta, reset } = useFormStore();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [dob, setDob] = useState("");
  const [panLast4, setPanLast4] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!result) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>No result found. Please start over.</Text>
        <TouchableOpacity onPress={() => { reset(); router.replace("/"); }}>
          <Text style={{ color: colors.primary, marginTop: 12 }}>Start Over</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const riskColor =
    result.riskCategory === "low"
      ? colors.success
      : result.riskCategory === "medium"
      ? colors.warning
      : colors.destructive;

  const lenderMessage =
    result.leadScore >= 70
      ? "You qualify for Tier 1 Banks & NBFCs"
      : result.leadScore >= 40
      ? "You qualify for select NBFCs & private lenders"
      : "You may qualify for alternative lending products";

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name || name.trim().length < 3) newErrors.name = "Minimum 3 characters";
    if (!mobile || !validateMobile(mobile)) newErrors.mobile = "Enter valid 10-digit mobile (starts with 6-9)";
    if (!city.trim()) newErrors.city = "Required";
    if (!pincode || !/^\d{6}$/.test(pincode)) newErrors.pincode = "Enter valid 6-digit pincode";
    if (!dob) {
      newErrors.dob = "Required";
    } else {
      const age = getAge(dob);
      if (age < 21 || age > 65) newErrors.dob = "Age must be between 21 and 65 years";
    }
    if (panLast4 && panLast4.length > 0 && panLast4.length !== 4) {
      newErrors.panLast4 = "PAN must be exactly 4 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    setSubmitError("");

    try {
      const totalExistingEMI = calcTotalExistingEMI(obligations);
      const ccEmiEquivalent = calcCCObligation(obligations.cc_outstanding || 0);

      const payload = {
        // Personal
        name: name.trim(),
        mobile,
        city: city.trim(),
        pincode,
        date_of_birth: dob,
        pan_last4: panLast4.toUpperCase() || null,

        // Employment
        employment_type: employment.employment_type,

        // Salaried
        employer_category: employment.employer_category ?? null,
        total_work_experience_years: employment.total_work_experience_years ?? null,
        current_company_tenure_months: employment.current_company_tenure_months ?? null,
        pf_deducted: employment.pf_deducted ?? null,
        salary_mode: employment.salary_mode ?? null,
        salary_bank_name: employment.salary_bank_name ?? null,
        monthly_net_income: employment.monthly_net_income ?? null,

        // Self-employed
        business_type: employment.business_type ?? null,
        industry_type: employment.industry_type ?? null,
        business_vintage_years: employment.business_vintage_years ?? null,
        itr_filed: employment.itr_filed ?? null,
        gst_registered: employment.gst_registered ?? null,
        avg_monthly_bank_credit: employment.avg_monthly_bank_credit ?? null,

        // Obligations
        home_loan_emi: obligations.home_loan_emi || 0,
        personal_loan_emi: obligations.personal_loan_emi || 0,
        business_loan_emi: obligations.business_loan_emi || 0,
        vehicle_loan_emi: obligations.vehicle_loan_emi || 0,
        total_existing_emi: totalExistingEMI,
        active_loan_count: obligations.active_loan_count || 0,
        total_cc_limit: obligations.total_cc_limit || 0,
        cc_outstanding: obligations.cc_outstanding || 0,
        cc_emi_equivalent: ccEmiEquivalent,
        overdue_last_6months: obligations.overdue_last_6months || false,

        // Loan intent
        loan_type: loanIntent.loan_type,
        requested_loan_amount: loanIntent.requested_loan_amount,
        preferred_tenure_months: loanIntent.preferred_tenure_months,
        interest_rate_assumed: result.interestRateAssumed ?? null,

        // Calculated
        total_obligations: result.totalObligations,
        foir_applied: result.foirApplied,
        eligible_emi: result.eligibleEMI,
        eligible_loan_amount: result.eligibleLoanAmount,
        surplus_income: result.surplusIncome,
        risk_category: result.riskCategory,
        lead_score: result.leadScore,

        // Meta
        source: meta.utm_source ? "ads" : "organic",
        utm_source: meta.utm_source ?? null,
        utm_medium: meta.utm_medium ?? null,
        utm_campaign: meta.utm_campaign ?? null,
        status: "new",
      };

      const { error } = await supabase.from("emi_calc_leads").insert(payload);
      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-button">
            <Feather name="chevron-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.logoArea}>
            <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
              <Feather name="shield" size={14} color="#fff" />
            </View>
            <Text style={[styles.logoText, { color: colors.primary }]}>LoanCheck</Text>
          </View>
          <View style={styles.backBtn} />
        </View>
        <View style={[styles.stepRow, { justifyContent: "center" }]}>
          <Text style={[styles.stepLabel, { color: colors.primary }]}>Step 4 of 4 — Result</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Eligibility Result Section */}
        {!result.eligible ? (
          <View style={[styles.ineligibleCard, { backgroundColor: "#fef2f2", borderColor: colors.destructive }]}>
            <Feather name="alert-circle" size={32} color={colors.destructive} style={{ marginBottom: 8 }} />
            <Text style={[styles.ineligibleTitle, { color: colors.destructive }]}>
              Insufficient Eligible EMI
            </Text>
            <Text style={[styles.ineligibleBody, { color: "#7f1d1d" }]}>
              Based on your current obligations, your eligible EMI is insufficient. Consider reducing existing obligations or applying with a co-applicant.
            </Text>
            <TouchableOpacity style={[styles.advisorBtn, { backgroundColor: colors.destructive }]}>
              <Text style={styles.advisorBtnText}>Talk to a Loan Advisor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Your Eligibility
            </Text>
            <View style={styles.resultCards}>
              <View style={[styles.resultCard, { backgroundColor: colors.primary }]}>
                <Text style={styles.resultCardLabel}>Eligible Loan Amount</Text>
                <Text style={styles.resultCardValue}>₹{formatINR(result.eligibleLoanAmount)}</Text>
              </View>
              <View style={styles.resultRowCards}>
                <View style={[styles.resultCardSmall, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.resultCardLabelSmall, { color: colors.mutedForeground }]}>Monthly EMI</Text>
                  <Text style={[styles.resultCardValueSmall, { color: colors.foreground }]}>₹{formatINR(result.eligibleEMI)}</Text>
                </View>
                <View style={[styles.resultCardSmall, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.resultCardLabelSmall, { color: colors.mutedForeground }]}>FOIR Applied</Text>
                  <Text style={[styles.resultCardValueSmall, { color: colors.foreground }]}>{Math.round(result.foirApplied * 100)}%</Text>
                </View>
              </View>
            </View>

            <View style={[styles.metaRow, { borderColor: colors.border }]}>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Surplus Income</Text>
                <Text style={[styles.metaValue, { color: colors.foreground }]}>₹{formatINR(result.surplusIncome)}/mo</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Risk Category</Text>
                <View style={[styles.riskBadge, { backgroundColor: riskColor + "22" }]}>
                  <Text style={[styles.riskText, { color: riskColor }]}>
                    {result.riskCategory === "low" ? "Low Risk" : result.riskCategory === "medium" ? "Medium Risk" : "High Risk"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.lenderBanner, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
              <Feather name="award" size={16} color={colors.primary} />
              <Text style={[styles.lenderText, { color: colors.primary }]}>{lenderMessage}</Text>
            </View>
          </>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {submitted ? (
          /* Thank You State */
          <View style={styles.thankYou}>
            <View style={[styles.thankYouIcon, { backgroundColor: colors.accent }]}>
              <Feather name="check-circle" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.thankYouTitle, { color: colors.foreground }]}>You're all set!</Text>
            <Text style={[styles.thankYouBody, { color: colors.mutedForeground }]}>
              Our loan advisors will contact you within 24 hours with the best offers.
            </Text>
            <View style={[styles.scoreBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.scoreText}>Your profile score: {result.leadScore} / 100</Text>
            </View>
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: colors.primary }]}
              onPress={() => { reset(); router.replace("/"); }}
            >
              <Text style={[styles.resetBtnText, { color: colors.primary }]}>Calculate Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Lead Capture Form */
          <View>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>
              Get personalised loan offers from top lenders
            </Text>
            <Text style={[styles.formSubtitle, { color: colors.mutedForeground }]}>
              Free. No spam. Your details are secure.
            </Text>

            <FormField
              label="Full Name"
              value={name}
              onChangeText={setName}
              error={errors.name}
              placeholder="Your full name"
              colors={colors}
            />
            <FormField
              label="Mobile Number"
              value={mobile}
              onChangeText={setMobile}
              error={errors.mobile}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
              colors={colors}
            />
            <FormField
              label="City"
              value={city}
              onChangeText={setCity}
              error={errors.city}
              placeholder="Your city"
              colors={colors}
            />
            <FormField
              label="Pincode"
              value={pincode}
              onChangeText={setPincode}
              error={errors.pincode}
              placeholder="6-digit pincode"
              keyboardType="numeric"
              maxLength={6}
              colors={colors}
            />
            <FormField
              label="Date of Birth"
              value={dob}
              onChangeText={setDob}
              error={errors.dob}
              placeholder="YYYY-MM-DD"
              colors={colors}
            />
            <FormField
              label="Last 4 characters of PAN (optional)"
              value={panLast4}
              onChangeText={(t) => setPanLast4(t.toUpperCase())}
              error={errors.panLast4}
              placeholder="e.g. 1234"
              helperText="Helps get more accurate offers"
              maxLength={4}
              autoCapitalize="characters"
              colors={colors}
            />

            {submitError ? (
              <View style={[styles.errorBanner, { backgroundColor: "#fef2f2", borderColor: colors.destructive }]}>
                <Text style={[styles.errorText, { color: colors.destructive }]}>{submitError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: loading ? colors.border : colors.primary }]}
              onPress={onSubmit}
              disabled={loading}
              testID="submit-lead-button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.submitBtnInner}>
                  <Text style={styles.submitBtnText}>Get My Loan Offers</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  helperText,
  colors,
  ...rest
}: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        style={[
          styles.textInput,
          {
            borderColor: error ? colors.destructive : colors.border,
            color: colors.foreground,
            backgroundColor: colors.card,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        {...rest}
      />
      {helperText && !error && (
        <Text style={[styles.helperText, { color: colors.mutedForeground }]}>{helperText}</Text>
      )}
      {error && (
        <Text style={[styles.errorFieldText, { color: colors.destructive }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 8,
  },
  backBtn: { width: 36, alignItems: "center" },
  logoArea: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 18, fontWeight: "700" },
  stepRow: { flexDirection: "row" },
  stepLabel: { fontSize: 12, fontWeight: "600" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  resultCards: { gap: 12, marginBottom: 16 },
  resultCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  resultCardLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  resultCardValue: { color: "#fff", fontSize: 32, fontWeight: "700" },
  resultRowCards: { flexDirection: "row", gap: 12 },
  resultCardSmall: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  resultCardLabelSmall: { fontSize: 12, fontWeight: "500", marginBottom: 4 },
  resultCardValueSmall: { fontSize: 22, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  metaItem: { flex: 1, padding: 14, alignItems: "center" },
  metaDivider: { width: 1, backgroundColor: "#e2e8f0" },
  metaLabel: { fontSize: 12, marginBottom: 6 },
  metaValue: { fontSize: 15, fontWeight: "600" },
  riskBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  riskText: { fontSize: 13, fontWeight: "600" },
  lenderBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  lenderText: { fontSize: 13, fontWeight: "600", flex: 1 },
  ineligibleCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  ineligibleTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  ineligibleBody: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  advisorBtn: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  advisorBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  divider: { height: 1, marginVertical: 24 },
  formTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  formSubtitle: { fontSize: 13, marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: "500", marginBottom: 6 },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 50,
  },
  helperText: { fontSize: 12, marginTop: 4 },
  errorFieldText: { fontSize: 12, marginTop: 4 },
  errorBanner: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { fontSize: 13 },
  submitBtn: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  submitBtnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  thankYou: { alignItems: "center", paddingVertical: 24 },
  thankYouIcon: { borderRadius: 50, padding: 20, marginBottom: 16 },
  thankYouTitle: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  thankYouBody: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  scoreBadge: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 20,
  },
  scoreText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  resetBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  resetBtnText: { fontSize: 15, fontWeight: "600" },
});
