import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useFormStore } from "@/store/useFormStore";
import { StepLayout } from "@/components/StepLayout";
import { RadioCardGroup } from "@/components/RadioCard";
import { SelectInput } from "@/components/SelectInput";
import { CurrencyInput } from "@/components/CurrencyInput";
import { ToggleBoolean } from "@/components/ToggleBoolean";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function Screen1Employment() {
  const colors = useColors();
  const { employment, setEmployment } = useFormStore();

  const [empType, setEmpType] = useState(employment.employment_type || "");
  const [employerCategory, setEmployerCategory] = useState(employment.employer_category || "");
  const [monthlyIncome, setMonthlyIncome] = useState(employment.monthly_net_income || 0);
  const [workExp, setWorkExp] = useState<number | undefined>(employment.total_work_experience_years);
  const [tenureMonths, setTenureMonths] = useState<number | undefined>(employment.current_company_tenure_months);
  const [salaryMode, setSalaryMode] = useState(employment.salary_mode || "");
  const [salaryBank, setSalaryBank] = useState(employment.salary_bank_name || "");
  const [pfDeducted, setPfDeducted] = useState<boolean | undefined>(employment.pf_deducted);
  const [businessType, setBusinessType] = useState(employment.business_type || "");
  const [industryType, setIndustryType] = useState(employment.industry_type || "");
  const [avgBankCredit, setAvgBankCredit] = useState(employment.avg_monthly_bank_credit || 0);
  const [businessVintage, setBusinessVintage] = useState<number | undefined>(employment.business_vintage_years);
  const [itrFiled, setItrFiled] = useState<boolean | undefined>(employment.itr_filed);
  const [gstRegistered, setGstRegistered] = useState<boolean | undefined>(employment.gst_registered);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!empType) newErrors.empType = "Please select employment type";

    if (empType === "salaried") {
      if (!employerCategory) newErrors.employerCategory = "Please select employer type";
      if (!monthlyIncome || monthlyIncome < 10000)
        newErrors.monthlyIncome = "Minimum salary is ₹10,000";
      if (workExp === undefined) newErrors.workExp = "Required";
      if (tenureMonths === undefined) newErrors.tenureMonths = "Required";
      if (!salaryMode) newErrors.salaryMode = "Please select salary mode";
      if (pfDeducted === undefined) newErrors.pfDeducted = "Required";
    }

    if (empType === "self_employed") {
      if (!businessType) newErrors.businessType = "Required";
      if (!industryType) newErrors.industryType = "Required";
      if (!avgBankCredit || avgBankCredit < 10000)
        newErrors.avgBankCredit = "Minimum ₹10,000";
      if (businessVintage === undefined) newErrors.businessVintage = "Required";
      if (itrFiled === undefined) newErrors.itrFiled = "Required";
      if (gstRegistered === undefined) newErrors.gstRegistered = "Required";
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

    const data: any = { employment_type: empType };
    if (empType === "salaried") {
      Object.assign(data, {
        employer_category: employerCategory,
        monthly_net_income: monthlyIncome,
        total_work_experience_years: workExp,
        current_company_tenure_months: tenureMonths,
        salary_mode: salaryMode,
        salary_bank_name: salaryBank,
        pf_deducted: pfDeducted,
        business_type: null,
        industry_type: null,
        business_vintage_years: null,
        itr_filed: null,
        gst_registered: null,
        avg_monthly_bank_credit: null,
      });
    } else {
      Object.assign(data, {
        business_type: businessType,
        industry_type: industryType,
        avg_monthly_bank_credit: avgBankCredit,
        monthly_net_income: avgBankCredit,
        business_vintage_years: businessVintage,
        itr_filed: itrFiled,
        gst_registered: gstRegistered,
        employer_category: null,
        total_work_experience_years: null,
        current_company_tenure_months: null,
        salary_mode: null,
        salary_bank_name: null,
        pf_deducted: null,
      });
    }

    setEmployment(data);
    router.push("/obligations");
  };

  return (
    <StepLayout
      title="Employment & Income"
      subtitle="Tell us about your work and income"
      step={1}
      submitButton={
        <PrimaryButton
          title="Next"
          onPress={onNext}
          icon="arrow-right"
          testID="next-button"
        />
      }
    >
      <RadioCardGroup
        label="Employment Type"
        options={[
          { label: "Salaried", value: "salaried", subLabel: "Working for a company", icon: "briefcase" },
          { label: "Self Employed", value: "self_employed", subLabel: "Business / Freelance", icon: "trending-up" },
        ]}
        value={empType}
        onChange={(v) => { setEmpType(v as any); setErrors({}); }}
        error={errors.empType}
      />

      {empType === "salaried" && (
        <>
          <SelectInput
            label="Employer Type"
            value={employerCategory}
            onChange={(v) => setEmployerCategory(v as string)}
            error={errors.employerCategory}
            options={[
              { label: "MNC / Multinational", value: "mnc" },
              { label: "Listed Company (NSE/BSE)", value: "listed" },
              { label: "Private Limited", value: "pvt_ltd" },
              { label: "Government / PSU", value: "government_psu" },
              { label: "Small Firm / Startup", value: "small_firm" },
              { label: "Proprietorship", value: "proprietorship" },
            ]}
            placeholder="Select employer type"
          />
          <CurrencyInput
            label="Monthly Net Salary (In-Hand) ₹"
            value={monthlyIncome}
            onChangeValue={setMonthlyIncome}
            error={errors.monthlyIncome}
            placeholder="e.g. 50000"
          />
          <SelectInput
            label="Total Work Experience"
            value={workExp}
            onChange={(v) => setWorkExp(v as number)}
            error={errors.workExp}
            options={[
              { label: "0-1 years", value: 0 },
              { label: "1-2 years", value: 1 },
              { label: "2-5 years", value: 2 },
              { label: "5-10 years", value: 5 },
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
              { label: "6-12 months", value: 9 },
              { label: "1-2 years", value: 18 },
              { label: "2-5 years", value: 36 },
              { label: "5+ years", value: 60 },
            ]}
            placeholder="Select tenure"
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
          <View style={styles.textInputContainer}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              Salary Bank Name (Optional)
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder="e.g. HDFC, SBI, ICICI"
              placeholderTextColor={colors.mutedForeground}
              value={salaryBank}
              onChangeText={setSalaryBank}
            />
          </View>
          <ToggleBoolean
            label="Is PF (Provident Fund) deducted from salary?"
            value={pfDeducted}
            onChange={setPfDeducted}
            error={errors.pfDeducted}
          />
        </>
      )}

      {empType === "self_employed" && (
        <>
          <SelectInput
            label="Business Structure"
            value={businessType}
            onChange={(v) => setBusinessType(v as string)}
            error={errors.businessType}
            options={[
              { label: "Sole Proprietor", value: "proprietor" },
              { label: "Partnership Firm", value: "partnership" },
              { label: "Private Limited Company", value: "pvt_ltd" },
              { label: "Freelancer / Consultant", value: "freelancer" },
              { label: "Professional (CA / Doctor / Lawyer)", value: "professional" },
            ]}
            placeholder="Select structure"
          />
          <SelectInput
            label="Industry"
            value={industryType}
            onChange={(v) => setIndustryType(v as string)}
            error={errors.industryType}
            options={[
              { label: "Trading / Retail", value: "trading" },
              { label: "Manufacturing", value: "manufacturing" },
              { label: "Services", value: "services" },
              { label: "Professional Services", value: "professional" },
            ]}
            placeholder="Select industry"
          />
          <CurrencyInput
            label="Average Monthly Bank Credits ₹"
            value={avgBankCredit}
            onChangeValue={setAvgBankCredit}
            error={errors.avgBankCredit}
            helperText="Average amount credited to your business bank account per month"
            placeholder="e.g. 100000"
          />
          <SelectInput
            label="Business Age"
            value={businessVintage}
            onChange={(v) => setBusinessVintage(v as number)}
            error={errors.businessVintage}
            options={[
              { label: "Less than 1 year", value: 0 },
              { label: "1-2 years", value: 1 },
              { label: "2-3 years", value: 2 },
              { label: "3-5 years", value: 3 },
              { label: "5+ years", value: 5 },
            ]}
            placeholder="Select age"
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
        </>
      )}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  textInputContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 50,
  },
});
