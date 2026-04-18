/**
 * eligibilityService.ts
 * Clean service layer for EMI calculation and eligibility checks.
 * Wraps the FOIR-based engine in lib/eligibility.ts and handles Supabase persistence.
 */

import {
  calcEligibility,
  calcTotalExistingEMI,
  calcCCObligation,
  RATE_DEFAULTS,
  EligibilityResult,
} from "@/lib/eligibility";
import { supabase } from "@/lib/supabase";

export type LoanType = "personal" | "home" | "lap" | "business";

export interface EligibilityInput {
  // Employment
  employment_type: "salaried" | "self_employed";
  monthly_net_income?: number;
  avg_monthly_bank_credit?: number;
  employer_category?: string;
  employer_data?: any;
  current_company_tenure_months?: number;
  salary_mode?: string;
  pf_deducted?: boolean;
  itr_filed?: boolean;
  gst_registered?: boolean;
  business_vintage_years?: number;

  // Obligations
  home_loan_emi?: number;
  personal_loan_emi?: number;
  business_loan_emi?: number;
  vehicle_loan_emi?: number;
  cc_outstanding?: number;
  overdue_last_6months?: boolean;

  // Loan intent
  loan_type: LoanType;
  preferred_tenure_months: number;
  requested_loan_amount?: number;
}

export interface EMIBreakdown {
  principal: number;
  ratePercent: number;
  tenureMonths: number;
  monthlyEMI: number;
  totalPayable: number;
  totalInterest: number;
}

/**
 * Calculate monthly EMI for a given principal, annual rate, and tenure.
 */
export function calculateEMI(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number
): EMIBreakdown {
  if (!principal || !tenureMonths) {
    return {
      principal,
      ratePercent: annualRatePercent,
      tenureMonths,
      monthlyEMI: 0,
      totalPayable: 0,
      totalInterest: 0,
    };
  }

  const monthlyRate = annualRatePercent / 12 / 100;
  const emi =
    monthlyRate === 0
      ? principal / tenureMonths
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -tenureMonths));

  const totalPayable = emi * tenureMonths;

  return {
    principal,
    ratePercent: annualRatePercent,
    tenureMonths,
    monthlyEMI: Math.round(emi),
    totalPayable: Math.round(totalPayable),
    totalInterest: Math.round(totalPayable - principal),
  };
}

/**
 * Get the default annual interest rate for a loan type.
 */
export function getRateForLoanType(loanType: LoanType): number {
  return RATE_DEFAULTS[loanType] ?? 14;
}

/**
 * Calculate total existing monthly obligations (existing EMIs + CC component).
 */
export function getTotalObligations(input: Partial<EligibilityInput>): number {
  const existingEMI = calcTotalExistingEMI({
    home_loan_emi: input.home_loan_emi,
    personal_loan_emi: input.personal_loan_emi,
    business_loan_emi: input.business_loan_emi,
    vehicle_loan_emi: input.vehicle_loan_emi,
  });
  return existingEMI + calcCCObligation(input.cc_outstanding ?? 0);
}

/**
 * Full FOIR-based eligibility check.
 * Returns max eligible loan amount, EMI capacity, per-lender breakdown, lead score, etc.
 */
export function checkEligibility(input: EligibilityInput): EligibilityResult {
  const profile = {
    employment_type: input.employment_type,
    monthly_net_income: input.monthly_net_income,
    avg_monthly_bank_credit: input.avg_monthly_bank_credit,
    employer_category: input.employer_category,
    employer_data: input.employer_data ?? null,
    current_company_tenure_months: input.current_company_tenure_months,
    salary_mode: input.salary_mode,
    pf_deducted: input.pf_deducted,
    itr_filed: input.itr_filed,
    gst_registered: input.gst_registered,
    business_vintage_years: input.business_vintage_years,
  };

  const obligations = {
    home_loan_emi: input.home_loan_emi,
    personal_loan_emi: input.personal_loan_emi,
    business_loan_emi: input.business_loan_emi,
    vehicle_loan_emi: input.vehicle_loan_emi,
    cc_outstanding: input.cc_outstanding,
    overdue_last_6months: input.overdue_last_6months,
  };

  return calcEligibility(profile, obligations, {
    loan_type: input.loan_type,
    preferred_tenure_months: input.preferred_tenure_months,
  });
}

/**
 * Store eligibility result in Supabase (database-only, no auth required).
 * Call this after a successful eligibility check.
 * Returns the inserted row ID, or null on failure.
 */
export async function saveEligibilityResult(params: {
  name?: string;
  mobile?: string;
  input: EligibilityInput;
  result: EligibilityResult;
}): Promise<string | null> {
  const { name, mobile, input, result } = params;

  try {
    const { data, error } = await supabase
      .from("emi_calc_leads")
      .upsert(
        {
          name: name ?? null,
          mobile: mobile ?? null,
          employment_type: input.employment_type,
          loan_type: input.loan_type,
          requested_loan_amount: input.requested_loan_amount ?? null,
          preferred_tenure_months: input.preferred_tenure_months,
          eligible_loan_amount: result.eligibleLoanAmount,
          eligible_emi: result.eligibleEMI,
          foir_applied: result.foirApplied,
          lead_score: result.leadScore,
          risk_category: result.riskCategory,
          status: name && mobile ? "new" : "partial",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "mobile" }
      )
      .select("id")
      .single();

    if (error) {
      console.warn("[eligibilityService] Supabase save failed:", error.message);
      return null;
    }

    return data?.id ?? null;
  } catch (err) {
    console.warn("[eligibilityService] Supabase save error:", err);
    return null;
  }
}
