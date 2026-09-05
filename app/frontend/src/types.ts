export interface Recommendation {
  type: 'national' | 'state';
  name: string;
  code: string;
  state?: string;
  rate: number;
  maxLoan: number;
  monthlyEMI: number;
  quarterly: number;
  coverage: number;
  score: number;
  tenureYears: number;
  moratoriumMonths: number;
  incomeLimit?: number | string;
}

export interface RecommendResponse {
  input: Record<string, unknown>;
  total: number;
  recommendations: Recommendation[];
}

export interface ScheduleRow {
  quarter: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface EmiResponse {
  principal: number;
  monthlyEMI: number;
  quarterlyInstallment: number;
  moratoriumMonths: number;
  totalInterest: number;
  schedule: ScheduleRow[];
}

export interface Branch {
  partnerName: string;
  partnerType: string;
  branchName: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  lat: number;
  lng: number;
  distance_km?: number;
  gnpa_ratio?: number;
  npa_status?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  health_score?: number;
  is_eligible?: boolean;
}

export interface NearestResponse {
  user: { lat: number; lng: number };
  radius_km: number;
  total: number;
  branches: Branch[];
}

export interface PartnersResponse {
  total: number;
  count: number;
  offset: number;
  limit: number;
  branches: Branch[];
}

export interface SchemeSummary {
  code: string;
  name: string;
  rate: number;
  maxAmount: number;
  tenureYears: number;
  type: 'national';
}

export interface StateSchemeSummary {
  code: string;
  name: string;
  state: string;
  rate: number | null;
  maxAmount: number | null;
  incomeLimit: number | null;
  type: 'state';
}

export interface SchemesResponse {
  national: SchemeSummary[];
  state: StateSchemeSummary[];
}

export interface FundResponse {
  state: string;
  status: string;
  allocation_lakh?: number;
  actuals_lakh?: number;
  utilization?: number;
  label?: string;
  remaining_lakh?: number;
  overutilized?: boolean;
  note?: string;
}

export interface TranslateResult {
  translatedText: string;
  provider?: string;
  match?: number;
  targetLang: string;
  error?: string;
}

export const RESP_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi',
];

export const PARTNER_TYPES = [
  'SCA', 'PSB', 'Regional_Rural_Banks', 'Small_Finance_Banks', 'NBFC_MFIs', 'Other_Agencies',
];