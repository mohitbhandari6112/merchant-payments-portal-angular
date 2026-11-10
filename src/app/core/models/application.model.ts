export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ReviewDecision = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export type RiskAction =
  | 'CREATED'
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED';

export type BusinessType =
  | 'SOLE_PROPRIETORSHIP'
  | 'PARTNERSHIP'
  | 'PRIVATE_LIMITED'
  | 'PUBLIC_LIMITED'
  | 'NON_PROFIT';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'NPR' | 'INR';

export type ApplicationSort =
  | 'updated-desc'
  | 'updated-asc'
  | 'created-desc'
  | 'business-asc'
  | 'reference-asc';

export interface BusinessInfo {
  businessName: string;
  legalName: string;
  businessType: BusinessType;
  registrationNumber: string;
  country: string;
  city: string;
  address: string;
  postalCode: string;
  website: string;
}

export interface ContactInfo {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface FinancialInfo {
  monthlyVolume: number | null;
  averageTicket: number | null;
  currency: Currency;
  taxId: string;
  bankAccountNumber: string;
}

export interface SensitiveFields {
  contactEmail: string;
  contactPhone: string;
  taxId: string;
  bankAccountNumber: string;
}

export interface ApplicationDraftPayload {
  business: BusinessInfo;
  contact: ContactInfo;
  financial: FinancialInfo;
  termsAccepted: boolean;
}

export interface ApplicationSummary {
  id: string;
  reference: string;
  businessName: string;
  status: ApplicationStatus;
  riskLevel: RiskLevel;
  ownerName: string;
  assigneeName: string | null;
  monthlyVolume: number;
  currency: Currency;
  createdAt: string;
  updatedAt: string;
}

export interface RiskEvent {
  id: string;
  action: RiskAction;
  note: string;
  riskLevel: RiskLevel;
  actorName: string;
  createdAt: string;
}

export interface ApplicationDetail {
  id: string;
  reference: string;
  status: ApplicationStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  ownerId: string;
  ownerName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  business: BusinessInfo;
  contactName: string;
  financial: {
    monthlyVolume: number;
    averageTicket: number;
    currency: Currency;
  };
  sensitive: SensitiveFields;
  riskHistory: RiskEvent[];
  reviewerNotes: string | null;
  termsAccepted: boolean;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

export interface ReviewPayload {
  decision: ReviewDecision;
  riskLevel: RiskLevel;
  notes: string;
}

export interface AssignPayload {
  reviewerId: string;
}

export interface DashboardStats {
  total: number;
  draft: number;
  inReview: number;
  approved: number;
  rejected: number;
  changesRequested: number;
}

export interface ApplicationQuery {
  page: number;
  pageSize: number;
  search: string;
  status: ApplicationStatus | '';
  riskLevel: RiskLevel | '';
  sort: ApplicationSort;
}

export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
];

export const RISK_LEVELS: readonly RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];

export const REVIEW_DECISIONS: readonly ReviewDecision[] = [
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
];

export const BUSINESS_TYPES: readonly BusinessType[] = [
  'SOLE_PROPRIETORSHIP',
  'PARTNERSHIP',
  'PRIVATE_LIMITED',
  'PUBLIC_LIMITED',
  'NON_PROFIT',
];

export const CURRENCIES: readonly Currency[] = ['USD', 'EUR', 'GBP', 'NPR', 'INR'];

export const APPLICATION_SORTS: readonly ApplicationSort[] = [
  'updated-desc',
  'updated-asc',
  'created-desc',
  'business-asc',
  'reference-asc',
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: 'Low risk',
  MEDIUM: 'Medium risk',
  HIGH: 'High risk',
};

export const REVIEW_DECISION_LABELS: Record<ReviewDecision, string> = {
  APPROVED: 'Approve application',
  REJECTED: 'Reject application',
  CHANGES_REQUESTED: 'Request changes',
};

export const RISK_ACTION_LABELS: Record<RiskAction, string> = {
  CREATED: 'Draft created',
  SUBMITTED: 'Submitted for review',
  ASSIGNED: 'Reviewer assigned',
  APPROVED: 'Application approved',
  REJECTED: 'Application rejected',
  CHANGES_REQUESTED: 'Changes requested',
};

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  SOLE_PROPRIETORSHIP: 'Sole proprietorship',
  PARTNERSHIP: 'Partnership',
  PRIVATE_LIMITED: 'Private limited company',
  PUBLIC_LIMITED: 'Public limited company',
  NON_PROFIT: 'Non-profit organisation',
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'US dollar (USD)',
  EUR: 'Euro (EUR)',
  GBP: 'Pound sterling (GBP)',
  NPR: 'Nepalese rupee (NPR)',
  INR: 'Indian rupee (INR)',
};

export const SORT_LABELS: Record<ApplicationSort, string> = {
  'updated-desc': 'Recently updated',
  'updated-asc': 'Least recently updated',
  'created-desc': 'Newest first',
  'business-asc': 'Business name A–Z',
  'reference-asc': 'Reference A–Z',
};

export const EDITABLE_STATUSES: readonly ApplicationStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];

export const REVIEWABLE_STATUSES: readonly ApplicationStatus[] = ['SUBMITTED', 'UNDER_REVIEW'];
