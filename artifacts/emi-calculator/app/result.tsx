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
import { calcTotalExistingEMI, calcCCObligation, LenderBreakdown } from "@/lib/eligibility";

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

function getAge(dob: string): number {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

const CATEGORY_DISPLAY: Record<string, string> = {
  SUPER_CAT_A: "Super Category A", CAT_A: "Category A", CAT_B: "Category B",
  CAT_C: "Category C", CAT_D: "Category D", CAT_E: "Category E",
  ELITE: "Elite", SUPER_PRIME: "Super Prime", PREFERRED: "Preferred",
  OPEN_MARKET: "Open Market", DIAMOND_PLUS: "Diamond Plus", DIAMOND: "Diamond",
  GOLD_PLUS: "Gold Plus", GOLD: "Gold", SILVER_PLUS: "Silver Plus", SILVER: "Silver",
  ACE_PLUS: "Ace Plus", ACE: "Ace", TATA_GROUP: "Tata Group",
  SELECT_ITBPO: "Select IT/BPO", UNLISTED: "Standard Category",
};

export default function Screen4Result() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contact, employment, obligations, loanIntent, result, meta, leadId, reset } = useFormStore();

  // Pre-fill from contact data captured on Screen 1
  const [name, setName] = useState(contact.full_name || "");
  const [mobile, setMobile] = useState(contact.mobile || "");
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
        <Text style={{ color: colors.mutedForeground, marginBottom: 12 }}>
          No result found. Please start over.
        </Text>
        <TouchableOpacity onPress={() => { reset(); router.replace("/"); }}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>Start Over</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const riskColor =
    result.riskCategory === "low" ? colors.success
      : result.riskCategory === "medium" ? colors.warning
      : colors.destructive;

  const riskLabel =
    result.riskCategory === "low" ? "Low Risk"
      : result.riskCategory === "medium" ? "Medium Risk"
      : "High Risk";

  const lenderTierMsg =
    result.leadScore >= 70
      ? "Tier 1 Banks & NBFCs — best rates available"
      : result.leadScore >= 40
      ? "Select NBFCs & private lenders"
      : "Alternative lending products";

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) newErrors.name = "Enter your full name";
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) newErrors.mobile = "Enter valid 10-digit mobile";
    if (!city.trim()) newErrors.city = "City is required";
    if (!pincode || !/^\d{6}$/.test(pincode)) newErrors.pincode = "Enter valid 6-digit pincode";
    if (dob) {
      const age = getAge(dob);
      if (age < 21 || age > 65) newErrors.dob = "Age must be between 21 and 65";
    }
    if (panLast4 && panLast4.length !== 4) newErrors.panLast4 = "Must be exactly 4 characters";
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

      const fullPayload = {
        name: name.trim(),
        mobile,
        city: city.trim(),
        pincode,
        date_of_birth: dob || null,
        pan_last4: panLast4.toUpperCase() || null,
        employment_type: employment.employment_type,
        employer_category: employment.employer_category ?? null,
        total_work_experience_years: employment.total_work_experience_years ?? null,
        current_company_tenure_months: employment.current_company_tenure_months ?? null,
        pf_deducted: employment.pf_deducted ?? null,
        salary_mode: employment.salary_mode ?? null,
        salary_bank_name: employment.salary_bank_name ?? null,
        monthly_net_income: employment.monthly_net_income ?? null,
        business_type: employment.business_type ?? null,
        industry_type: employment.industry_type ?? null,
        business_vintage_years: employment.business_vintage_years ?? null,
        itr_filed: employment.itr_filed ?? null,
        gst_registered: employment.gst_registered ?? null,
        avg_monthly_bank_credit: employment.avg_monthly_bank_credit ?? null,
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
        loan_type: loanIntent.loan_type,
        requested_loan_amount: loanIntent.requested_loan_amount,
        preferred_tenure_months: loanIntent.preferred_tenure_months,
        interest_rate_assumed: result.interestRateAssumed ?? null,
        total_obligations: result.totalObligations,
        foir_applied: result.foirApplied,
        eligible_emi: result.eligibleEMI,
        eligible_loan_amount: result.eligibleLoanAmount,
        surplus_income: result.surplusIncome,
        risk_category: result.riskCategory,
        lead_score: result.leadScore,
        source: meta.utm_source ? "ads" : "organic",
        utm_source: meta.utm_source ?? null,
        utm_medium: meta.utm_medium ?? null,
        utm_campaign: meta.utm_campaign ?? null,
        status: "new",
      };

      let saveError: any = null;

      if (leadId) {
        // Update the partial lead saved on Screen 1
        const { error } = await supabase
          .from("emi_calc_leads")
          .update(fullPayload)
          .eq("id", leadId);
        saveError = error;
      } else {
        // No partial lead — create full record now
        const { error } = await supabase
          .from("emi_calc_leads")
          .insert(fullPayload);
        saveError = error;
      }

      if (saveError) throw saveError;

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
      <View style={[styles.header, { paddingTop: topPad + 6, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-button">
            <View style={[styles.backCircle, { backgroundColor: colors.background }]}>
              <Feather name="chevron-left" size={20} color={colors.primary} />
            </View>
          </TouchableOpacity>
          <View style={styles.logoArea}>
            <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
              <Feather name="shield" size={13} color="#fff" />
            </View>
            <Text style={[styles.logoText, { color: colors.primary }]}>LoanCheck</Text>
          </View>
          <View style={styles.backBtn} />
        </View>
        {/* Step 4 indicator */}
        <View style={[styles.stepBadgeRow]}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                { backgroundColor: s <= 4 ? colors.primary : colors.border },
                s === 4 && styles.stepDotActive,
              ]}
            />
          ))}
          <Text style={[styles.stepText, { color: colors.primary }]}>Result</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Eligibility Result ── */}
        {!result.eligible ? (
          <View style={[styles.ineligibleCard, { backgroundColor: "#fef2f2", borderColor: colors.destructive }]}>
            <View style={[styles.ineligibleIconWrap, { backgroundColor: colors.destructive + "20" }]}>
              <Feather name="alert-circle" size={28} color={colors.destructive} />
            </View>
            <Text style={[styles.ineligibleTitle, { color: colors.destructive }]}>
              Insufficient Eligible EMI
            </Text>
            <Text style={[styles.ineligibleBody, { color: "#7f1d1d" }]}>
              Your existing obligations exceed the eligible FOIR limit. Consider reducing current EMIs, applying with a co-applicant, or exploring a lower loan amount.
            </Text>
          </View>
        ) : (
          <>
            {/* Score header */}
            <View style={[styles.scoreCard, { backgroundColor: colors.primary }]}>
              <View style={styles.scoreTop}>
                <View>
                  <Text style={styles.scoreLabel}>Eligible Loan Amount</Text>
                  <Text style={styles.scoreAmount}>₹{formatINR(result.eligibleLoanAmount)}</Text>
                </View>
                <View style={[styles.scoreBadge, { backgroundColor: riskColor }]}>
                  <Text style={styles.scoreBadgeText}>{riskLabel}</Text>
                </View>
              </View>
              <View style={styles.scoreStats}>
                <View style={styles.scoreStat}>
                  <Text style={styles.scoreStatLabel}>Monthly EMI</Text>
                  <Text style={styles.scoreStatValue}>₹{formatINR(result.eligibleEMI)}</Text>
                </View>
                <View style={styles.scoreStatDivider} />
                <View style={styles.scoreStat}>
                  <Text style={styles.scoreStatLabel}>FOIR Applied</Text>
                  <Text style={styles.scoreStatValue}>{Math.round(result.foirApplied * 100)}%</Text>
                </View>
                <View style={styles.scoreStatDivider} />
                <View style={styles.scoreStat}>
                  <Text style={styles.scoreStatLabel}>Profile Score</Text>
                  <Text style={styles.scoreStatValue}>{result.leadScore}/100</Text>
                </View>
              </View>
            </View>

            {/* Meta row */}
            <View style={[styles.metaRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.metaItem}>
                <Feather name="trending-up" size={14} color={colors.mutedForeground} />
                <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Surplus Income</Text>
                <Text style={[styles.metaValue, { color: colors.foreground }]}>₹{formatINR(result.surplusIncome)}/mo</Text>
              </View>
              <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
              <View style={styles.metaItem}>
                <Feather name="award" size={14} color={colors.primary} />
                <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Lender Tier</Text>
                <Text style={[styles.metaValue, { color: colors.primary }]} numberOfLines={2}>{lenderTierMsg}</Text>
              </View>
            </View>

            {/* Per-lender breakdown */}
            {result.lenderBreakdown && result.lenderBreakdown.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Lender-wise Eligibility</Text>
                <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                  Based on your employer's category with each lender
                </Text>
                {result.lenderBreakdown.map((lb, i) => (
                  <LenderCard key={i} lender={lb} colors={colors} isLast={i === (result.lenderBreakdown?.length || 0) - 1} />
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Divider ── */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ── Lead Capture / Thank You ── */}
        {submitted ? (
          <View style={styles.thankYou}>
            <View style={[styles.thankYouIconWrap, { backgroundColor: colors.accent }]}>
              <Feather name="check-circle" size={44} color={colors.primary} />
            </View>
            <Text style={[styles.thankYouTitle, { color: colors.foreground }]}>You're all set, {name.split(" ")[0]}!</Text>
            <Text style={[styles.thankYouBody, { color: colors.mutedForeground }]}>
              Our loan advisors will call you on{" "}
              <Text style={{ fontWeight: "700", color: colors.foreground }}>+91 {mobile}</Text>
              {" "}within 24 hours with personalised offers.
            </Text>
            <View style={[styles.refCard, { backgroundColor: colors.surface ?? colors.accent, borderColor: colors.primary + "30" }]}>
              <Text style={[styles.refLabel, { color: colors.mutedForeground }]}>Your Profile Score</Text>
              <Text style={[styles.refScore, { color: colors.primary }]}>{result.leadScore} / 100</Text>
            </View>
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: colors.primary }]}
              onPress={() => { reset(); router.replace("/"); }}
            >
              <Text style={[styles.resetBtnText, { color: colors.primary }]}>Calculate Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>
              Get personalised loan offers
            </Text>
            <Text style={[styles.formSub, { color: colors.mutedForeground }]}>
              Free • No spam • Your data is secure
            </Text>

            {/* Contact pre-filled from Screen 1 */}
            <View style={[styles.prefillCard, { backgroundColor: colors.surface ?? colors.accent, borderColor: colors.primary + "40" }]}>
              <Feather name="user-check" size={14} color={colors.primary} />
              <Text style={[styles.prefillText, { color: colors.primary }]}>
                Contact pre-filled: {contact.full_name} · +91 {contact.mobile}
              </Text>
            </View>

            <FormField label="Full Name" value={name} onChangeText={setName} error={errors.name} placeholder="Your full name" colors={colors} />
            <FormField label="Mobile Number" value={mobile} onChangeText={(t: string) => setMobile(t.replace(/\D/g, "").slice(0, 10))} error={errors.mobile} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} colors={colors} />
            <FormField label="City" value={city} onChangeText={setCity} error={errors.city} placeholder="Your city" colors={colors} />
            <FormField label="Pincode" value={pincode} onChangeText={setPincode} error={errors.pincode} placeholder="6-digit pincode" keyboardType="numeric" maxLength={6} colors={colors} />
            <FormField
              label="Date of Birth (Optional)"
              value={dob}
              onChangeText={setDob}
              error={errors.dob}
              placeholder="YYYY-MM-DD"
              helperText="Helps verify age eligibility (21–65 years)"
              colors={colors}
            />
            <FormField
              label="Last 4 of PAN (Optional)"
              value={panLast4}
              onChangeText={(t: string) => setPanLast4(t.toUpperCase())}
              error={errors.panLast4}
              placeholder="e.g. 1234"
              helperText="Helps get more accurate lender offers"
              maxLength={4}
              autoCapitalize="characters"
              colors={colors}
            />

            {submitError ? (
              <View style={[styles.errorBanner, { backgroundColor: "#fef2f2", borderColor: colors.destructive }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
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
                  <Text style={styles.submitBtnText}>Get My Loan Offers →</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>
              By submitting, you agree to be contacted by our loan advisors.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function LenderCard({ lender, colors, isLast }: { lender: LenderBreakdown; colors: any; isLast: boolean }) {
  const foirPct = Math.round(lender.max_foir * 100);
  const foirColor = lender.max_foir >= 0.7 ? colors.success : lender.max_foir >= 0.6 ? colors.warning : colors.destructive;
  const catDisplay = CATEGORY_DISPLAY[lender.category] || lender.category;

  return (
    <View style={[lenderStyles.card, { borderColor: colors.border }, !isLast && lenderStyles.cardBorder]}>
      <View style={lenderStyles.header}>
        <View style={[lenderStyles.dot, { backgroundColor: foirColor }]} />
        <Text style={[lenderStyles.name, { color: colors.foreground }]}>{lender.lender_display}</Text>
        <View style={[lenderStyles.catBadge, { backgroundColor: foirColor + "20" }]}>
          <Text style={[lenderStyles.catText, { color: foirColor }]}>{catDisplay}</Text>
        </View>
      </View>
      <View style={lenderStyles.stats}>
        <View style={lenderStyles.stat}>
          <Text style={[lenderStyles.statLabel, { color: colors.mutedForeground }]}>Max FOIR</Text>
          <Text style={[lenderStyles.statValue, { color: foirColor }]}>{foirPct}%</Text>
        </View>
        <View style={[lenderStyles.statDiv, { backgroundColor: colors.border }]} />
        <View style={lenderStyles.stat}>
          <Text style={[lenderStyles.statLabel, { color: colors.mutedForeground }]}>EMI/mo</Text>
          <Text style={[lenderStyles.statValue, { color: colors.foreground }]}>₹{lender.eligible_emi.toLocaleString("en-IN")}</Text>
        </View>
        <View style={[lenderStyles.statDiv, { backgroundColor: colors.border }]} />
        <View style={lenderStyles.stat}>
          <Text style={[lenderStyles.statLabel, { color: colors.mutedForeground }]}>Loan Amt</Text>
          <Text style={[lenderStyles.statValue, { color: colors.foreground }]}>
            {lender.eligible_loan_amount >= 100000
              ? `₹${(lender.eligible_loan_amount / 100000).toFixed(1)}L`
              : `₹${lender.eligible_loan_amount.toLocaleString("en-IN")}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

function FormField({ label, value, onChangeText, error, placeholder, helperText, colors, ...rest }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[ffStyles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        style={[
          ffStyles.input,
          {
            borderColor: error ? colors.destructive : focused ? colors.primary : colors.border,
            color: colors.foreground,
            backgroundColor: colors.card,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
      {helperText && !error && (
        <Text style={[ffStyles.helper, { color: colors.mutedForeground }]}>{helperText}</Text>
      )}
      {error && <Text style={[ffStyles.error, { color: colors.destructive }]}>⚠ {error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  backBtn: { width: 36 },
  backCircle: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoArea: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoIcon: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  stepBadgeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepDot: { width: 20, height: 4, borderRadius: 2 },
  stepDotActive: { width: 28 },
  stepText: { fontSize: 12, fontWeight: "700", marginLeft: 6 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },

  ineligibleCard: { borderWidth: 1.5, borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 16 },
  ineligibleIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  ineligibleTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  ineligibleBody: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  scoreCard: { borderRadius: 20, padding: 20, marginBottom: 14 },
  scoreTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  scoreLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "500", marginBottom: 4 },
  scoreAmount: { color: "#fff", fontSize: 30, fontWeight: "800" },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  scoreBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  scoreStats: { flexDirection: "row", alignItems: "center" },
  scoreStat: { flex: 1, alignItems: "center" },
  scoreStatLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginBottom: 4, fontWeight: "500" },
  scoreStatValue: { color: "#fff", fontSize: 17, fontWeight: "800" },
  scoreStatDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.25)" },

  metaRow: { flexDirection: "row", borderWidth: 1, borderRadius: 14, marginBottom: 14, overflow: "hidden" },
  metaItem: { flex: 1, padding: 14, alignItems: "center", gap: 4 },
  metaDivider: { width: 1 },
  metaLabel: { fontSize: 11, fontWeight: "500" },
  metaValue: { fontSize: 13, fontWeight: "700", textAlign: "center" },

  section: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  sectionSub: { fontSize: 12, marginBottom: 14 },

  divider: { height: 1, marginVertical: 20 },

  thankYou: { alignItems: "center", paddingVertical: 16 },
  thankYouIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  thankYouTitle: { fontSize: 22, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  thankYouBody: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 20, paddingHorizontal: 8 },
  refCard: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, marginBottom: 20, alignItems: "center" },
  refLabel: { fontSize: 12, marginBottom: 4 },
  refScore: { fontSize: 28, fontWeight: "800" },
  resetBtn: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  resetBtnText: { fontSize: 15, fontWeight: "700" },

  formTitle: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  formSub: { fontSize: 13, marginBottom: 16 },
  prefillCard: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 16 },
  prefillText: { fontSize: 13, fontWeight: "500", flex: 1 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { fontSize: 13, flex: 1 },
  submitBtn: { height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  submitBtnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },
  footerNote: { fontSize: 11, textAlign: "center" },
});

const lenderStyles = StyleSheet.create({
  card: { paddingVertical: 12 },
  cardBorder: { borderBottomWidth: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  name: { fontSize: 14, fontWeight: "600", flex: 1 },
  catBadge: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  catText: { fontSize: 11, fontWeight: "600" },
  stats: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 10, marginBottom: 2, fontWeight: "500" },
  statValue: { fontSize: 14, fontWeight: "700" },
  statDiv: { width: 1, height: 28 },
});

const ffStyles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, minHeight: 50,
  },
  helper: { fontSize: 12, marginTop: 4 },
  error: { fontSize: 12, marginTop: 4 },
});
