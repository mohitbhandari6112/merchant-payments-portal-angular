import { DEMO_PASSWORD } from '../auth/demo-accounts';
import {
  ApplicationStatus,
  BusinessInfo,
  BusinessType,
  ContactInfo,
  Currency,
  FinancialInfo,
  RiskEvent,
  RiskLevel,
} from '../models/application.model';
import { User } from '../models/user.model';

export interface MockUser extends User {
  password: string;
}

export interface MockApplicationRecord {
  id: string;
  reference: string;
  ownerId: string;
  assigneeId: string | null;
  status: ApplicationStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  business: BusinessInfo;
  contact: ContactInfo;
  financial: FinancialInfo;
  termsAccepted: boolean;
  riskHistory: RiskEvent[];
  reviewerNotes: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

export interface MockDatabase {
  version: number;
  users: MockUser[];
  applications: MockApplicationRecord[];
}

const STORAGE_KEY = 'merchant-portal.mock-db.v1';
const DATABASE_VERSION = 1;

const SALES_ONE = 'user-sales-1';
const SALES_TWO = 'user-sales-2';
const REVIEWER_ONE = 'user-reviewer-1';
const REVIEWER_TWO = 'user-reviewer-2';
const ADMIN = 'user-admin-1';

const BUSINESS_NAMES = [
  'Northwind Traders',
  'Himalayan Java',
  'Aurora Digital',
  'Bluegrass Grocers',
  'Cedar & Co',
  'Summit Fitness',
  'Pixel Pantry',
  'Everest Outfitters',
  'Lakeside Pharmacy',
  'Urban Nest',
  'Orbit Electronics',
  'GreenLeaf Organics',
  'Atlas Freight',
  'Maple & Stone',
  'Bright Path Learning',
  'Copper Kettle',
  'Nova Health',
  'Silverline Auto',
  'Harbor Books',
  'Terra Coffee',
  'Juniper Toys',
  'Velocity Sports',
  'Moonlight Bakery',
  'Anchor Hardware',
  'Sunrise Dental',
  'Pinecone Market',
  'Ember Studio',
  'Clearwater Spa',
];

const CONTACT_NAMES = [
  'Alex Morgan',
  'Priya Sharma',
  'Jonas Weber',
  'Taylor Brooks',
  'Morgan Lee',
  'Amelia Clarke',
  'Arjun Mehta',
  'Sofia Alvarez',
  'Noah Williams',
  'Anika Rai',
  'Liam Chen',
  'Isabella Rossi',
  'Ethan Carter',
  'Maya Gurung',
  'Lucas Martin',
  'Zara Khan',
  'Oliver Grant',
  'Nina Joshi',
  'Samuel Reed',
  'Ishita Shah',
  'Henry Walsh',
  'Leila Haddad',
  'Jack Bennett',
  'Tara Thapa',
  'Daniel Kim',
  'Emma Wilson',
  'Rohan Desai',
  'Chloe Adams',
];

const LOCATIONS = [
  { city: 'Portland', country: 'United States', postalCode: '97205', phone: '+1 503 555' },
  { city: 'Kathmandu', country: 'Nepal', postalCode: '44600', phone: '+977 1 555' },
  { city: 'Berlin', country: 'Germany', postalCode: '10115', phone: '+49 30 555' },
  { city: 'Austin', country: 'United States', postalCode: '78701', phone: '+1 512 555' },
  { city: 'Toronto', country: 'Canada', postalCode: 'M5H 2N2', phone: '+1 416 555' },
  { city: 'London', country: 'United Kingdom', postalCode: 'EC1A 1BB', phone: '+44 20 555' },
  { city: 'Pune', country: 'India', postalCode: '411001', phone: '+91 20 555' },
];

const STREETS = [
  'Harbor Lane',
  'Durbar Marg',
  'Friedrichstrasse',
  'Congress Avenue',
  'King Street West',
  'Bishopsgate',
  'MG Road',
  'Pine Street',
];

const BUSINESS_TYPES: readonly BusinessType[] = [
  'SOLE_PROPRIETORSHIP',
  'PARTNERSHIP',
  'PRIVATE_LIMITED',
  'PUBLIC_LIMITED',
  'NON_PROFIT',
];

const CURRENCIES: readonly Currency[] = ['USD', 'EUR', 'GBP', 'NPR', 'INR'];

const STATUS_CYCLE: readonly ApplicationStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'SUBMITTED',
];

const RISK_CYCLE: readonly RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];

const RISK_SCORES: Record<RiskLevel, number> = {
  LOW: 22,
  MEDIUM: 54,
  HIGH: 86,
};

const REVIEWER_NOTES: Partial<Record<ApplicationStatus, string>> = {
  APPROVED: 'Identity, tax, and settlement details verified. Approved for onboarding.',
  REJECTED: 'Adverse media and onboarding documents require escalation. Application rejected.',
  CHANGES_REQUESTED:
    'Please provide clearer proof of business address and re-upload the registration certificate.',
};

let cachedDatabase: MockDatabase | null = null;

function createUsers(): MockUser[] {
  return [
    {
      id: SALES_ONE,
      name: 'Maya Shrestha',
      email: 'sales@merchant.test',
      role: 'SALES',
      password: DEMO_PASSWORD,
    },
    {
      id: SALES_TWO,
      name: 'Daniel Okafor',
      email: 'sales2@merchant.test',
      role: 'SALES',
      password: DEMO_PASSWORD,
    },
    {
      id: REVIEWER_ONE,
      name: 'Ravi Karki',
      email: 'reviewer@merchant.test',
      role: 'REVIEWER',
      password: DEMO_PASSWORD,
    },
    {
      id: REVIEWER_TWO,
      name: 'Elena Rossi',
      email: 'reviewer2@merchant.test',
      role: 'REVIEWER',
      password: DEMO_PASSWORD,
    },
    {
      id: ADMIN,
      name: 'Aarav Patel',
      email: 'admin@merchant.test',
      role: 'ADMIN',
      password: DEMO_PASSWORD,
    },
  ];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function addHours(value: string, hours: number): string {
  return new Date(new Date(value).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function createRiskHistory(
  id: string,
  index: number,
  ownerName: string,
  reviewerName: string | null,
  status: ApplicationStatus,
  riskLevel: RiskLevel,
  createdAt: string,
  submittedAt: string | null,
  updatedAt: string,
): RiskEvent[] {
  const events: RiskEvent[] = [
    {
      id: `${id}-event-1`,
      action: 'CREATED',
      note: 'Draft created and saved automatically.',
      riskLevel: 'LOW',
      actorName: ownerName,
      createdAt,
    },
  ];

  if (submittedAt) {
    events.push({
      id: `${id}-event-2`,
      action: 'SUBMITTED',
      note: 'Application submitted for compliance review.',
      riskLevel: 'LOW',
      actorName: ownerName,
      createdAt: submittedAt,
    });
  }

  if (reviewerName) {
    events.push({
      id: `${id}-event-${events.length + 1}`,
      action: 'ASSIGNED',
      note: `Assigned to ${reviewerName} for review.`,
      riskLevel,
      actorName: 'Aarav Patel',
      createdAt: addHours(createdAt, 30 + index),
    });
  }

  if (status === 'APPROVED' || status === 'REJECTED' || status === 'CHANGES_REQUESTED') {
    events.push({
      id: `${id}-event-${events.length + 1}`,
      action: status,
      note: REVIEWER_NOTES[status] ?? 'Risk decision recorded.',
      riskLevel,
      actorName: reviewerName ?? 'Aarav Patel',
      createdAt: updatedAt,
    });
  }

  return events.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function createSeedApplication(index: number, users: MockUser[]): MockApplicationRecord {
  const businessName = BUSINESS_NAMES[index % BUSINESS_NAMES.length];
  const contactName = CONTACT_NAMES[index % CONTACT_NAMES.length];
  const location = LOCATIONS[index % LOCATIONS.length];
  const businessType = BUSINESS_TYPES[index % BUSINESS_TYPES.length];
  const currency = CURRENCIES[index % CURRENCIES.length];
  const status = STATUS_CYCLE[index % STATUS_CYCLE.length];
  const riskLevel = RISK_CYCLE[index % RISK_CYCLE.length];
  const ownerId = index % 3 === 0 ? SALES_TWO : SALES_ONE;
  const owner = users.find((user) => user.id === ownerId) as MockUser;
  const reviewerId = index % 2 === 0 ? REVIEWER_ONE : REVIEWER_TWO;
  const reviewer = users.find((user) => user.id === reviewerId) as MockUser;
  const unassigned = status === 'SUBMITTED' && index % 4 === 0;
  const assigneeId = status === 'DRAFT' || unassigned ? null : reviewerId;
  const assignee = assigneeId
    ? (users.find((user) => user.id === assigneeId) as MockUser)
    : null;

  const slug = slugify(businessName);
  const month = 1 + (index % 9);
  const day = 2 + (index % 24);
  const createdAt = new Date(Date.UTC(2026, month - 1, day, 8 + (index % 6), 15)).toISOString();
  const submittedAt = status === 'DRAFT' ? null : addHours(createdAt, 20 + index);
  const updatedAt =
    status === 'DRAFT'
      ? addHours(createdAt, 2)
      : status === 'APPROVED' || status === 'REJECTED' || status === 'CHANGES_REQUESTED'
        ? addHours(createdAt, 96 + index)
        : assigneeId
          ? addHours(createdAt, 42 + index)
          : (submittedAt as string);

  return {
    id: `app-${String(index + 1).padStart(4, '0')}`,
    reference: `MP-2026-${String(index + 1).padStart(4, '0')}`,
    ownerId,
    assigneeId,
    status,
    riskLevel,
    riskScore: RISK_SCORES[riskLevel],
    business: {
      businessName,
      legalName: `${businessName} ${businessType === 'NON_PROFIT' ? 'Foundation' : 'LLC'}`,
      businessType,
      registrationNumber: `REG-2026-${String(1000 + index)}`,
      country: location.country,
      city: location.city,
      address: `${10 + index * 3} ${STREETS[index % STREETS.length]}`,
      postalCode: location.postalCode,
      website: `https://${slug}.example.test`,
    },
    contact: {
      contactName,
      contactEmail: `${slug}@example.test`,
      contactPhone: `${location.phone} ${String(1000 + index)}`,
    },
    financial: {
      monthlyVolume: 50000 + index * 18500,
      averageTicket: 35 + (index % 9) * 12,
      currency,
      taxId: `TAX-${location.country.slice(0, 2).toUpperCase()}-${String(100000 + index * 13)}`,
      bankAccountNumber: `99${String(1000000000 + index * 81).padStart(10, '0')}`,
    },
    termsAccepted: status !== 'DRAFT',
    riskHistory: createRiskHistory(
      `app-${String(index + 1).padStart(4, '0')}`,
      index,
      owner.name,
      assignee?.name ?? null,
      status,
      riskLevel,
      createdAt,
      submittedAt,
      updatedAt,
    ),
    reviewerNotes: REVIEWER_NOTES[status] ?? null,
    createdAt,
    updatedAt,
    submittedAt,
  };
}

function createSeedDatabase(): MockDatabase {
  const users = createUsers();

  return {
    version: DATABASE_VERSION,
    users,
    applications: Array.from({ length: BUSINESS_NAMES.length }, (_, index) =>
      createSeedApplication(index, users),
    ),
  };
}

function readStoredDatabase(): MockDatabase | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<MockDatabase>;

    if (
      parsed.version !== DATABASE_VERSION ||
      !Array.isArray(parsed.users) ||
      !Array.isArray(parsed.applications)
    ) {
      return null;
    }

    return parsed as MockDatabase;
  } catch {
    return null;
  }
}

export function persistMockDatabase(): void {
  if (!cachedDatabase || typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedDatabase));
  } catch {
    return;
  }
}

export function getMockDatabase(): MockDatabase {
  if (cachedDatabase) {
    return cachedDatabase;
  }

  cachedDatabase = readStoredDatabase() ?? createSeedDatabase();
  persistMockDatabase();

  return cachedDatabase;
}

export function findMockUserByEmail(email: string): MockUser | undefined {
  const normalized = email.trim().toLowerCase();

  return getMockDatabase().users.find((user) => user.email.toLowerCase() === normalized);
}

export function findMockUserById(id: string): MockUser | undefined {
  return getMockDatabase().users.find((user) => user.id === id);
}

export function findMockReviewers(): MockUser[] {
  return getMockDatabase().users.filter((user) => user.role === 'REVIEWER');
}

export function getUserDisplayName(userId: string | null): string | null {
  if (!userId) {
    return null;
  }

  return getMockDatabase().users.find((user) => user.id === userId)?.name ?? null;
}
