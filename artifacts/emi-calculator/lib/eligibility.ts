import { EmployerResult } from "@/hooks/useEmployerSearch";

export const RATE_DEFAULTS: Record<string, number> = {
  personal: 14,
  home: 8.5,
  lap: 11,
  business: 16,
};

export function calcCCObligation(cc_outstanding: number): number {
  return (cc_outstanding || 0) * 0.05;
}

export function calcTotalExistingEMI(obligations: {
  home_loan_emi?: number;
  personal_loan_emi?: number;
  business_loan_emi?: number;
  vehicle_loan_emi?: number;
}): number {
  return (
    (obligations.home_loan_emi || 0) +
    (obligations.personal_loan_emi || 0) +
    (obligations.business_loan_emi || 0) +
    (obligations.vehicle_loan_emi || 0)
  );
}

export function calcFOIR(profile: {
  employment_type: string;
  employer_category?: string;
  employer_data?: EmployerResult | null;
  itr_filed?: boolean;
  gst_registered?: boolean;
  overdue_last_6months?: boolean;
  salary_mode?: string;
}): number {
  let foir: number;

  if (profile.employment_type === "salaried") {
    // Phase 2: use employer best_foir from lender database if available
    if (
      profile.employer_data &&
      !profile.employer_data.is_blocked &&
      profile.employer_data.best_foir > 0
    ) {
      foir = profile.employer_data.best_foir;
    } else {
      // Fallback to category-based FOIR
      foir = 0.65;
      if (
        ["mnc", "listed", "government_psu"].includes(
          profile.employer_category || ""
        )
      ) {
        foir = 0.75;
      } else if (profile.employer_category === "pvt_ltd") {
        foir = 0.7;
      }
    }
  } else {
    // Self-employed
    foir = 0.55;
    if (profile.itr_filed && profile.gst_registered) {
      foir = 0.65;
    } else if (profile.itr_filed) {
      foir = 0.6;
    }
  }

  if (profile.overdue_last_6months) foir -= 0.15;
  if (profile.salary_mode === "cash") foir -= 0.1;

  return Math.min(0.8, Math.max(0.3, foir));
}

export interface LenderBreakdown {
  lender: string;
  lender_display: string;
  category: string;
  max_foir: number;
  eligible_emi: number;
  eligible_loan_amount: number;
}

export interface EligibilityResult {
  eligible: boolean;
  eligibleEMI: number;
  eligibleLoanAmount: number;
  foirApplied: number;
  totalObligations: number;
  surplusIncome: number;
  riskCategory: "low" | "medium" | "high";
  leadScore: number;
  interestRateAssumed?: number;
  lenderBreakdown?: LenderBreakdown[];
}

export function calcEligibility(
  profile: {
    employment_type: string;
    monthly_net_income?: number;
    avg_monthly_bank_credit?: number;
    employer_category?: string;
    employer_data?: EmployerResult | null;
    current_company_tenure_months?: number;
    salary_mode?: string;
    pf_deducted?: boolean;
    itr_filed?: boolean;
    gst_registered?: boolean;
    business_vintage_years?: number;
  },
  obligations: {
    home_loan_emi?: number;
    personal_loan_emi?: number;
    business_loan_emi?: number;
    vehicle_loan_emi?: number;
    cc_outstanding?: number;
    overdue_last_6months?: boolean;
  },
  loanIntent: {
    loan_type: string;
    preferred_tenure_months?: number;
  }
): EligibilityResult {
  const income =
    profile.employment_type === "salaried"
      ? profile.monthly_net_income || 0
      : profile.avg_monthly_bank_credit || 0;

  const totalExistingEMI = calcTotalExistingEMI(obligations);
  const ccObligation = calcCCObligation(obligations.cc_outstanding || 0);
  const totalObligations = totalExistingEMI + ccObligation;
  const foir = calcFOIR({ ...profile, ...obligations });
  const eligibleEMI = income * foir - totalObligations;

  if (eligibleEMI <= 0) {
    return {
      eligible: false,
      eligibleEMI: 0,
      eligibleLoanAmount: 0,
      foirApplied: foir,
      totalObligations,
      surplusIncome: 0,
      riskCategory: "high",
      leadScore: 10,
    };
  }

  const rate = RATE_DEFAULTS[loanIntent.loan_type] || 12;
  const tenure = loanIntent.preferred_tenure_months || 60;
  const monthlyRate = rate / 12 / 100;
  const loanAmount =
    eligibleEMI * ((1 - Math.pow(1 + monthlyRate, -tenure)) / monthlyRate);

  // Per-lender breakdown when employer data is available
  let lenderBreakdown: LenderBreakdown[] | undefined;
  if (
    profile.employer_data &&
    !profile.employer_data.is_blocked &&
    profile.employer_data.lender_categories?.length > 0
  ) {
    lenderBreakdown = profile.employer_data.lender_categories
      .filter((lc) => lc.max_foir > 0)
      .map((lc) => {
        let lFoir = lc.max_foir;
        if (obligations.overdue_last_6months) lFoir = Math.max(0.3, lFoir - 0.15);
        if (profile.salary_mode === "cash") lFoir = Math.max(0.3, lFoir - 0.1);
        const lEligibleEMI = Math.max(0, income * lFoir - totalObligations);
        const lLoanAmount =
          lEligibleEMI > 0
            ? lEligibleEMI *
              ((1 - Math.pow(1 + monthlyRate, -tenure)) / monthlyRate)
            : 0;
        return {
          lender: lc.lender,
          lender_display: lc.lender_display,
          category: lc.category,
          max_foir: lc.max_foir,
          eligible_emi: Math.round(lEligibleEMI),
          eligible_loan_amount: Math.round(lLoanAmount),
        };
      })
      .filter((lc) => lc.eligible_loan_amount > 0)
      .slice(0, 5);
  }

  let score = 50;
  if (profile.employment_type === "salaried") {
    if (
      ["mnc", "listed", "government_psu"].includes(
        profile.employer_category || ""
      )
    )
      score += 15;
    if (profile.employer_data && !profile.employer_data.is_blocked) {
      if (profile.employer_data.best_foir >= 0.75) score += 15;
      else if (profile.employer_data.best_foir >= 0.65) score += 10;
    }
    if ((profile.current_company_tenure_months || 0) >= 24) score += 10;
    if (profile.salary_mode === "bank_transfer") score += 10;
    if (profile.pf_deducted) score += 5;
  } else {
    if (profile.itr_filed) score += 15;
    if (profile.gst_registered) score += 10;
    if ((profile.business_vintage_years || 0) >= 3) score += 10;
  }
  if (obligations.overdue_last_6months) score -= 25;
  if (foir > 0.7) score -= 10;
  score = Math.min(100, Math.max(0, score));

  const riskCategory: "low" | "medium" | "high" =
    score >= 70 ? "low" : score >= 40 ? "medium" : "high";

  return {
    eligible: true,
    eligibleEMI: Math.round(eligibleEMI),
    eligibleLoanAmount: Math.round(loanAmount),
    foirApplied: foir,
    totalObligations: Math.round(totalObligations),
    surplusIncome: Math.round(income - income * foir),
    riskCategory,
    leadScore: score,
    interestRateAssumed: rate,
    lenderBreakdown,
  };
}
