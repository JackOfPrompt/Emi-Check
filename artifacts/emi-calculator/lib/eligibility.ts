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
  itr_filed?: boolean;
  gst_registered?: boolean;
  overdue_last_6months?: boolean;
  salary_mode?: string;
}): number {
  let foir = profile.employment_type === "salaried" ? 0.65 : 0.55;

  if (profile.employment_type === "salaried") {
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

  if (profile.employment_type === "self_employed") {
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
}

export function calcEligibility(
  profile: {
    employment_type: string;
    monthly_net_income?: number;
    avg_monthly_bank_credit?: number;
    employer_category?: string;
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

  let score = 50;
  if (profile.employment_type === "salaried") {
    if (
      ["mnc", "listed", "government_psu"].includes(
        profile.employer_category || ""
      )
    )
      score += 15;
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
  };
}
