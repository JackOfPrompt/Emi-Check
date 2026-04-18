import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useFormStore } from "@/store/useFormStore";
import { supabase } from "@/lib/supabase";
import { StepLayout } from "@/components/StepLayout";
import { RadioCardGroup } from "@/components/RadioCard";
import { SelectInput } from "@/components/SelectInput";
import { CurrencyInput } from "@/components/CurrencyInput";
import { ToggleBoolean } from "@/components/ToggleBoolean";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmployerSearch } from "@/components/EmployerSearch";
import { EmployerResult } from "@/hooks/useEmployerSearch";

// Map lender DB category → our form employer_category for fallback
function mapBestCategoryToFormCategory(bestCat: string): string {
  const upper = bestCat?.toUpperCase() || "";
  if (["SUPER_CAT_A", "CAT_SA", "ELITE", "SUPER_PRIME", "DIAMOND_PLUS", "DIAMOND"].includes(upper)) return "mnc";
  if (["CAT_A", "CAT_B", "GOLD_PLUS", "GOLD", "PREFERRED", "ACE_PLUS"].includes(upper)) return "listed";
  if (["CAT_C", "CAT_D", "SILVER_PLUS", "SILVER", "PREFERRED", "ACE", "SELECT_ITBPO"].includes(upper)) return "pvt_ltd";
  if (["CAT_A_PSU", "CSC_C", "CSC_D", "TATA_GROUP"].includes(upper)) return "government_psu";
  if (["CAT_E", "OPEN_MARKET"].includes(upper)) return "small_firm";
  return "pvt_ltd"; // sensible default
}

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

function FieldInput({ label, value, onChangeText, error, placeholder, keyboardType, maxLength, autoCapitalize, colors }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[fieldStyles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        style={[
          fieldStyles.input,
          {
            borderColor: error ? colors.destructive : focused ? colors.primary : colors.border,
            backgroundColor: colors.card,
            color: colors.foreground,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={keyboardType || "default"}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize || "words"}
      />
      {error && <Text style={[fieldStyles.error, { color: colors.destructive }]}>⚠ {error}</Text>}
    </View>
  );
}

export default function Screen1Employment() {
  const colors = useColors();
  const { contact, employment, setContact, setEmployment, setLeadId } = useFormStore();

  const [saving, setSaving] = useState(false);

  // Contact
  const [fullName, setFullName] = useState(contact.full_name || "");
  const [mobile, setMobile] = useState(contact.mobile || "");

  // Employment
  const [empType, setEmpType] = useState(employment.employment_type || "");
  const [employerData, setEmployerData] = useState<EmployerResult | null>(employment.employer_data || null);
  const [employerCategory, setEmployerCategory] = useState(employment.employer_category || "");

  // Auto-fill employer category when employer is selected/cleared
  const handleEmployerSelect = (emp: EmployerResult | null) => {
    setEmployerData(emp);
    if (emp && emp.best_category !== "UNLISTED" && !emp.is_blocked) {
      // Auto-map DB category to form category
      setEmployerCategory(mapBestCategoryToFormCategory(emp.best_category));
    } else if (!emp) {
      setEmployerCategory("");
    }
    // For UNLISTED, keep existing value so user can pick manually
  };
  const [monthlyIncome, setMonthlyIncome] = useState(employment.monthly_net_income || 0);
  const [workExp, setWorkExp] = useState<number | undefined>(employment.total_work_experience_years);
  const [tenureMonths, setTenureMonths] = useState<number | undefined>(employment.current_company_tenure_months);
  const [salaryMode, setSalaryMode] = useState(employment.salary_mode || "");
  const [salaryBank, setSalaryBank] = useState(employment.salary_bank_name || "");
  const [pfDeducted, setPfDeducted] = useState<boolean | undefined>(employment.pf_deducted);

  // Self-employed
  const [businessType, setBusinessType] = useState(employment.business_type || "");
  const [industryType, setIndustryType] = useState(employment.industry_type || "");
  const [avgBankCredit, setAvgBankCredit] = useState(employment.avg_monthly_bank_credit || 0);
  const [businessVintage, setBusinessVintage] = useState<number | undefined>(employment.business_vintage_years);
  const [itrFiled, setItrFiled] = useState<boolean | undefined>(employment.itr_filed);
  const [gstRegistered, setGstRegistered] = useState<boolean | undefined>(employment.gst_registered);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) newErrors.fullName = "Enter your full name";
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) newErrors.mobile = "Enter valid 10-digit mobile number";
    if (!empType) newErrors.empType = "Please select employment type";

    if (empType === "salaried") {
      // Category required only when employer not found in DB (UNLISTED or no employer selected)
      const employerFoundInDB = employerData && employerData.best_category !== "UNLISTED" && !employerData.is_blocked;
      if (!employerFoundInDB && !employerCategory) newErrors.employerCategory = "Please select employer type";
      if (!monthlyIncome || monthlyIncome < 10000) newErrors.monthlyIncome = "Minimum salary ₹10,000";
      if (workExp === undefined) newErrors.workExp = "Required";
      if (tenureMonths === undefined) newErrors.tenureMonths = "Required";
      if (!salaryMode) newErrors.salaryMode = "How do you receive salary?";
      if (pfDeducted === undefined) newErrors.pfDeducted = "Required";
    }

    if (empType === "self_employed") {
      if (!businessType) newErrors.businessType = "Required";
      if (!industryType) newErrors.industryType = "Required";
      if (!avgBankCredit || avgBankCredit < 10000) newErrors.avgBankCredit = "Minimum ₹10,000";
      if (businessVintage === undefined) newErrors.businessVintage = "Required";
      if (itrFiled === undefined) newErrors.itrFiled = "Required";
      if (gstRegistered === undefined) newErrors.gstRegistered = "Required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onNext = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    const contactData = { full_name: fullName.trim(), mobile };
    setContact(contactData);

    const empData: any = { employment_type: empType };
    if (empType === "salaried") {
      // Use auto-mapped category when employer found in DB, otherwise use manually selected one
      const finalCategory = (employerData && employerData.best_category !== "UNLISTED" && !employerData.is_blocked)
        ? mapBestCategoryToFormCategory(employerData.best_category)
        : employerCategory;
      Object.assign(empData, {
        employer_name: employerData?.employer_name || null,
        employer_data: employerData || null,
        employer_category: finalCategory,
        monthly_net_income: monthlyIncome,
        total_work_experience_years: workExp,
        current_company_tenure_months: tenureMonths,
        salary_mode: salaryMode,
        salary_bank_name: salaryBank || null,
        pf_deducted: pfDeducted,
        business_type: null, industry_type: null, business_vintage_years: null,
        itr_filed: null, gst_registered: null, avg_monthly_bank_credit: null,
      });
    } else {
      Object.assign(empData, {
        business_type: businessType, industry_type: industryType,
        avg_monthly_bank_credit: avgBankCredit, monthly_net_income: avgBankCredit,
        business_vintage_years: businessVintage, itr_filed: itrFiled, gst_registered: gstRegistered,
        employer_name: null, employer_data: null, employer_category: null,
        total_work_experience_years: null, current_company_tenure_months: null,
        salary_mode: null, salary_bank_name: null, pf_deducted: null,
      });
    }
    setEmployment(empData);

    // Save partial lead to capture drop-offs
    try {
      const { data } = await supabase
        .from("emi_calc_leads")
        .insert({
          name: fullName.trim(),
          mobile,
          employment_type: empType,
          employer_category: empType === "salaried" ? employerCategory : null,
          monthly_net_income: empType === "salaried" ? monthlyIncome : null,
          avg_monthly_bank_credit: empType === "self_employed" ? avgBankCredit : null,
          status: "partial",
          source: "organic",
        })
        .select("id")
        .single();
      if (data?.id) setLeadId(data.id);
    } catch {
      // Silently continue — partial save is best-effort
    }

    setSaving(false);
    router.push("/obligations");
  };

  return (
    <StepLayout
      title="Your Profile"
      subtitle="We'll find the best loan options tailored for you"
      step={1}
      submitButton={
        <PrimaryButton
          title="Continue"
          onPress={onNext}
          icon="arrow-right"
          loading={saving}
          testID="next-button"
        />
      }
    >
      {/* Contact Info — always shown */}
      <SectionCard title="Contact Details" colors={colors}>
        <FieldInput
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName}
          placeholder="Your full name"
          colors={colors}
        />
        <View style={{ marginBottom: 0 }}>
          <Text style={[fieldStyles.label, { color: colors.foreground }]}>Mobile Number</Text>
          <View style={[
            fieldStyles.inputRow,
            {
              borderColor: errors.mobile ? colors.destructive : colors.border,
              backgroundColor: colors.card,
            }
          ]}>
            <Text style={[fieldStyles.prefix, { color: colors.mutedForeground }]}>+91</Text>
            <TextInput
              style={[fieldStyles.inputInner, { color: colors.foreground }]}
              placeholder="10-digit mobile"
              placeholderTextColor={colors.mutedForeground}
              value={mobile}
              onChangeText={(t) => setMobile(t.replace(/\D/g, "").slice(0, 10))}
              keyboardType="phone-pad"
              maxLength={10}
              autoCapitalize="none"
            />
          </View>
          {errors.mobile && <Text style={[fieldStyles.error, { color: colors.destructive }]}>⚠ {errors.mobile}</Text>}
        </View>
      </SectionCard>

      {/* Employment Type */}
      <SectionCard title="Employment Type" colors={colors}>
        <RadioCardGroup
          options={[
            { label: "Salaried", value: "salaried", subLabel: "Working for a company or employer", icon: "briefcase" },
            { label: "Self Employed", value: "self_employed", subLabel: "Own business, freelance or professional", icon: "trending-up" },
          ]}
          value={empType}
          onChange={(v) => { setEmpType(v as any); setErrors({}); }}
          error={errors.empType}
        />
      </SectionCard>

      {/* Salaried fields */}
      {empType === "salaried" && (
        <>
          <SectionCard title="Employer Details" colors={colors}>
            <EmployerSearch
              value={employerData}
              onSelect={handleEmployerSelect}
              error={errors.employerSearch}
            />

            {/* Show auto-detected category badge when employer found in DB */}
            {employerData && employerData.best_category !== "UNLISTED" && !employerData.is_blocked ? (
              <View style={[autoDetectStyles.banner, { backgroundColor: colors.accent, borderColor: colors.primary + "30" }]}>
                <Feather name="zap" size={13} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[autoDetectStyles.label, { color: colors.primary }]}>
                    Employer category auto-detected
                  </Text>
                  <Text style={[autoDetectStyles.sub, { color: colors.mutedForeground }]}>
                    Lender category: {employerData.best_category} · FOIR {Math.round((employerData.best_foir || 0) * 100)}%
                  </Text>
                </View>
              </View>
            ) : (
              /* Show category dropdown when UNLISTED or no employer selected */
              <SelectInput
                label={employerData?.best_category === "UNLISTED"
                  ? "Employer Category (required — employer not in database)"
                  : "Employer Category"}
                value={employerCategory}
                onChange={(v) => setEmployerCategory(v as string)}
                error={errors.employerCategory}
                options={[
                  { label: "MNC / Multinational", value: "mnc", subLabel: "e.g. Google, Amazon, Infosys" },
                  { label: "Listed Company (NSE/BSE)", value: "listed", subLabel: "Publicly listed Indian company" },
                  { label: "Private Limited", value: "pvt_ltd", subLabel: "Registered Pvt Ltd company" },
                  { label: "Government / PSU", value: "government_psu", subLabel: "Govt, PSU, Defence, Railways" },
                  { label: "Small Firm / Startup", value: "small_firm", subLabel: "Unregistered or small business" },
                  { label: "Proprietorship", value: "proprietorship", subLabel: "Owner-run shop or firm" },
                ]}
                placeholder="Select employer category"
                helperText={!employerData ? "Or search your employer above for better accuracy" : undefined}
              />
            )}
          </SectionCard>

          <SectionCard title="Income Details" colors={colors}>
            <CurrencyInput
              label="Monthly Take-Home Salary ₹"
              value={monthlyIncome}
              onChangeValue={setMonthlyIncome}
              error={errors.monthlyIncome}
              placeholder="e.g. 50,000"
              helperText="Net salary credited to your account after deductions"
            />
            <RadioCardGroup
              label="Salary Received Via"
              options={[
                { label: "Bank Transfer", value: "bank_transfer", icon: "credit-card" },
                { label: "Cash", value: "cash", icon: "dollar-sign" },
              ]}
              value={salaryMode}
              onChange={(v) => setSalaryMode(v)}
              error={errors.salaryMode}
              horizontal
            />
            <FieldInput
              label="Salary Bank (Optional)"
              value={salaryBank}
              onChangeText={setSalaryBank}
              placeholder="e.g. HDFC, SBI, ICICI"
              colors={colors}
            />
          </SectionCard>

          <SectionCard title="Work Experience" colors={colors}>
            <SelectInput
              label="Total Work Experience"
              value={workExp}
              onChange={(v) => setWorkExp(v as number)}
              error={errors.workExp}
              options={[
                { label: "Less than 1 year", value: 0 },
                { label: "1–2 years", value: 1 },
                { label: "2–5 years", value: 2 },
                { label: "5–10 years", value: 5 },
                { label: "10+ years", value: 10 },
              ]}
              placeholder="Select experience"
            />
            <SelectInput
              label="Time at Current Company"
              value={tenureMonths}
              onChange={(v) => setTenureMonths(v as number)}
              error={errors.tenureMonths}
              options={[
                { label: "Less than 6 months", value: 3 },
                { label: "6–12 months", value: 9 },
                { label: "1–2 years", value: 18 },
                { label: "2–5 years", value: 36 },
                { label: "5+ years", value: 60 },
              ]}
              placeholder="Select tenure"
            />
            <ToggleBoolean
              label="Is PF (Provident Fund) deducted from salary?"
              value={pfDeducted}
              onChange={setPfDeducted}
              error={errors.pfDeducted}
            />
          </SectionCard>
        </>
      )}

      {/* Self-employed fields */}
      {empType === "self_employed" && (
        <>
          <SectionCard title="Business Details" colors={colors}>
            <SelectInput
              label="Business Structure"
              value={businessType}
              onChange={(v) => setBusinessType(v as string)}
              error={errors.businessType}
              options={[
                { label: "Sole Proprietor", value: "proprietor", subLabel: "Single owner, no registration needed" },
                { label: "Partnership Firm", value: "partnership", subLabel: "2+ partners" },
                { label: "Private Limited Company", value: "pvt_ltd", subLabel: "Registered Pvt Ltd" },
                { label: "Freelancer / Consultant", value: "freelancer", subLabel: "Project-based work" },
                { label: "Professional (CA/Doctor/Lawyer)", value: "professional", subLabel: "Licensed profession" },
              ]}
              placeholder="Select business structure"
            />
            <SelectInput
              label="Industry / Sector"
              value={industryType}
              onChange={(v) => setIndustryType(v as string)}
              error={errors.industryType}
              options={[
                { label: "Trading / Retail", value: "trading" },
                { label: "Manufacturing", value: "manufacturing" },
                { label: "Services", value: "services" },
                { label: "Professional Services", value: "professional" },
                { label: "Real Estate", value: "real_estate" },
                { label: "IT / Technology", value: "technology" },
              ]}
              placeholder="Select industry"
            />
            <SelectInput
              label="Business Age"
              value={businessVintage}
              onChange={(v) => setBusinessVintage(v as number)}
              error={errors.businessVintage}
              options={[
                { label: "Less than 1 year", value: 0 },
                { label: "1–2 years", value: 1 },
                { label: "2–3 years", value: 2 },
                { label: "3–5 years", value: 3 },
                { label: "5+ years", value: 5 },
              ]}
              placeholder="Select business age"
            />
          </SectionCard>

          <SectionCard title="Income & Compliance" colors={colors}>
            <CurrencyInput
              label="Average Monthly Bank Credits ₹"
              value={avgBankCredit}
              onChangeValue={setAvgBankCredit}
              error={errors.avgBankCredit}
              helperText="Average monthly credits to your business bank account"
              placeholder="e.g. 1,00,000"
            />
            <ToggleBoolean
              label="ITR Filed in Last 2 Years?"
              value={itrFiled}
              onChange={setItrFiled}
              error={errors.itrFiled}
            />
            <ToggleBoolean
              label="GST Registered?"
              value={gstRegistered}
              onChange={setGstRegistered}
              error={errors.gstRegistered}
            />
          </SectionCard>
        </>
      )}
    </StepLayout>
  );
}

const sectionStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 14,
    overflow: "hidden",
  },
  titleRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  body: {
    padding: 16,
    paddingBottom: 4,
  },
});

const autoDetectStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  sub: { fontSize: 12 },
});

const fieldStyles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 50,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  prefix: {
    fontSize: 15,
    fontWeight: "600",
    marginRight: 6,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  inputInner: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
    paddingLeft: 8,
  },
  error: { fontSize: 12, marginTop: 4 },
});
