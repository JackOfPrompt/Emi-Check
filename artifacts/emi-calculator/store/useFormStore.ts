import { create } from "zustand";
import { EligibilityResult } from "@/lib/eligibility";
import { EmployerResult } from "@/hooks/useEmployerSearch";

export interface ContactData {
  full_name: string;
  mobile: string;
}

export interface EmploymentData {
  employment_type: "salaried" | "self_employed" | "";
  // Salaried
  employer_name?: string;
  employer_data?: EmployerResult | null;
  employer_category?: string;
  total_work_experience_years?: number;
  current_company_tenure_months?: number;
  pf_deducted?: boolean;
  salary_mode?: "bank_transfer" | "cash";
  salary_bank_name?: string;
  monthly_net_income?: number;
  // Self-employed
  business_type?: string;
  industry_type?: string;
  business_vintage_years?: number;
  itr_filed?: boolean;
  gst_registered?: boolean;
  avg_monthly_bank_credit?: number;
}

export interface ObligationsData {
  home_loan_emi: number;
  personal_loan_emi: number;
  business_loan_emi: number;
  vehicle_loan_emi: number;
  active_loan_count: number;
  total_cc_limit: number;
  cc_outstanding: number;
  overdue_last_6months: boolean;
}

export interface LoanIntentData {
  loan_type: string;
  requested_loan_amount: number;
  preferred_tenure_months: number;
}

export interface MetaData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  source: string;
}

interface FormStore {
  contact: ContactData;
  employment: EmploymentData;
  obligations: ObligationsData;
  loanIntent: LoanIntentData;
  result: EligibilityResult | null;
  meta: MetaData;
  leadId: string | null;

  setContact: (data: ContactData) => void;
  setEmployment: (data: EmploymentData) => void;
  setObligations: (data: ObligationsData) => void;
  setLoanIntent: (data: LoanIntentData) => void;
  setResult: (result: EligibilityResult) => void;
  setMeta: (meta: MetaData) => void;
  setLeadId: (id: string) => void;
  reset: () => void;
}

const defaultContact: ContactData = {
  full_name: "",
  mobile: "",
};

const defaultObligations: ObligationsData = {
  home_loan_emi: 0,
  personal_loan_emi: 0,
  business_loan_emi: 0,
  vehicle_loan_emi: 0,
  active_loan_count: 0,
  total_cc_limit: 0,
  cc_outstanding: 0,
  overdue_last_6months: false,
};

const defaultLoanIntent: LoanIntentData = {
  loan_type: "",
  requested_loan_amount: 0,
  preferred_tenure_months: 60,
};

export const useFormStore = create<FormStore>((set) => ({
  contact: defaultContact,
  employment: { employment_type: "" },
  obligations: defaultObligations,
  loanIntent: defaultLoanIntent,
  result: null,
  meta: { source: "organic" },
  leadId: null,

  setContact: (data) => set({ contact: data }),
  setEmployment: (data) => set({ employment: data }),
  setObligations: (data) => set({ obligations: data }),
  setLoanIntent: (data) => set({ loanIntent: data }),
  setResult: (result) => set({ result }),
  setMeta: (meta) => set({ meta }),
  setLeadId: (id) => set({ leadId: id }),
  reset: () =>
    set({
      contact: defaultContact,
      employment: { employment_type: "" },
      obligations: defaultObligations,
      loanIntent: defaultLoanIntent,
      result: null,
      leadId: null,
    }),
}));
