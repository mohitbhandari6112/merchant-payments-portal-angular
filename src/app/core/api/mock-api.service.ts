import { HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import {
  APPLICATION_SORTS,
  APPLICATION_STATUSES,
  ApplicationDetail,
  ApplicationSort,
  ApplicationStatus,
  ApplicationSummary,
  BUSINESS_TYPES,
  BusinessType,
  CURRENCIES,
  Currency,
  DashboardStats,
  EDITABLE_STATUSES,
  REVIEWABLE_STATUSES,
  ReviewDecision,
  RiskAction,
  RiskEvent,
  RiskLevel,
  RISK_LEVELS,
} from '../models/application.model';
import { AuthSession, ReviewerOption, User, UserRole } from '../models/user.model';
import { maskEmail, maskPhone, maskTail } from '../utils/mask';
import {
  findMockReviewers,
  findMockUserByEmail,
  findMockUserById,
  getMockDatabase,
  getUserDisplayName,
  MockApplicationRecord,
  MockUser,
  persistMockDatabase,
} from './mock-database';
import {
  ACCESS_TOKEN_TTL_MS,
  ACCESS_TOKEN_TTL_SECONDS,
  createMockToken,
  decodeMockToken,
  REFRESH_TOKEN_TTL_MS,
} from './mock-token';

interface MockResponse {
  status: number;
  body: unknown;
}

interface ParsedQuery {
  page: number;
  pageSize: number;
  search: string;
  status: ApplicationStatus | '';
  riskLevel: RiskLevel | '';
  sort: ApplicationSort;
}

const MOCK_LATENCY_MS = 260;
const STATUS_SET = new Set<string>(APPLICATION_STATUSES);
const RISK_SET = new Set<string>(RISK_LEVELS);
const SORT_SET = new Set<string>(APPLICATION_SORTS);
const BUSINESS_TYPE_SET = new Set<string>(BUSINESS_TYPES);
const CURRENCY_SET = new Set<string>(CURRENCIES);
const REVIEW_DECISIONS: readonly ReviewDecision[] = [
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
];

class MockApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'MockApiError';
  }
}

function fail(status: number, message: string, code?: string): never {
  throw new MockApiError(status, message, code);
}

function ok(body: unknown, status = 200): MockResponse {
  return { status, body };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];

  return typeof value === 'string' ? value.trim() : '';
}

function readNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function publicUser(user: MockUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

@Injectable({ providedIn: 'root' })
export class MockApiService {
  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return timer(MOCK_LATENCY_MS).pipe(
      mergeMap(() => {
        try {
          const response = this.route(request);

          return of(
            new HttpResponse<unknown>({
              status: response.status,
              body: response.body,
              url: request.url,
            }),
          );
        } catch (error) {
          return throwError(() => this.toHttpError(error, request.url));
        }
      }),
    );
  }

  private route(request: HttpRequest<unknown>): MockResponse {
    const method = request.method.toUpperCase();
    const path = new URL(request.url, 'http://mock.local').pathname.replace(/^\/api/, '');

    if (path === '/auth/login' && method === 'POST') {
      return this.login(request);
    }

    if (path === '/auth/refresh' && method === 'POST') {
      return this.refresh(request);
    }

    if (path === '/auth/logout' && method === 'POST') {
      return ok(null, 204);
    }

    if (path === '/auth/me' && method === 'GET') {
      const user = this.requireUser(request);

      return ok(publicUser(user));
    }

    if (path === '/applications/stats' && method === 'GET') {
      return this.applicationStats(request);
    }

    if (path === '/reviewers' && method === 'GET') {
      return this.reviewers(request);
    }

    if (path === '/applications' && method === 'GET') {
      return this.listApplications(request);
    }

    if (path === '/applications' && method === 'POST') {
      return this.createApplication(request);
    }

    const match = /^\/applications\/([^/]+)(?:\/(draft|submit|review|assign))?$/.exec(path);

    if (match) {
      const applicationId = decodeURIComponent(match[1]);
      const action = match[2] ?? null;

      if (!action && method === 'GET') {
        return this.getApplication(request, applicationId);
      }

      if (action === 'draft' && method === 'PATCH') {
        return this.updateDraft(request, applicationId);
      }

      if (action === 'submit' && method === 'POST') {
        return this.submitApplication(request, applicationId);
      }

      if (action === 'review' && method === 'POST') {
        return this.reviewApplication(request, applicationId);
      }

      if (action === 'assign' && method === 'PATCH') {
        return this.assignApplication(request, applicationId);
      }
    }

    return fail(404, 'The requested mock API endpoint was not found.', 'NOT_FOUND');
  }

  private login(request: HttpRequest<unknown>): MockResponse {
    const body = asRecord(request.body);
    const email = readString(body, 'email').toLowerCase();
    const password = readString(body, 'password');

    if (!email || !password) {
      return fail(400, 'Email and password are required.', 'VALIDATION_ERROR');
    }

    const user = findMockUserByEmail(email);

    if (!user || user.password !== password) {
      return fail(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
    }

    return ok(this.createSession(user));
  }

  private refresh(request: HttpRequest<unknown>): MockResponse {
    const body = asRecord(request.body);
    const refreshToken = readString(body, 'refreshToken');
    const payload = decodeMockToken(refreshToken);

    if (!payload || payload.kind !== 'refresh' || payload.exp <= Date.now()) {
      return fail(401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED');
    }

    const user = findMockUserById(payload.sub);

    if (!user) {
      return fail(401, 'Your session is no longer valid.', 'SESSION_EXPIRED');
    }

    return ok(this.createSession(user));
  }

  private createSession(user: MockUser): AuthSession {
    const now = Date.now();

    return {
      user: publicUser(user),
      accessToken: createMockToken('access', user.id, now + ACCESS_TOKEN_TTL_MS),
      refreshToken: createMockToken('refresh', user.id, now + REFRESH_TOKEN_TTL_MS),
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  private requireUser(request: HttpRequest<unknown>): MockUser {
    const authorization = request.headers.get('Authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return fail(401, 'Sign in to continue.', 'UNAUTHENTICATED');
    }

    const payload = decodeMockToken(authorization.slice(7));

    if (!payload || payload.kind !== 'access' || payload.exp <= Date.now()) {
      return fail(401, 'Your access token has expired.', 'TOKEN_EXPIRED');
    }

    const user = findMockUserById(payload.sub);

    if (!user) {
      return fail(401, 'Your session is no longer valid.', 'UNAUTHENTICATED');
    }

    return user;
  }

  private requireRole(user: MockUser, roles: readonly UserRole[]): void {
    if (!roles.includes(user.role)) {
      fail(403, 'You do not have permission to perform this action.', 'FORBIDDEN');
    }
  }

  private listApplications(request: HttpRequest<unknown>): MockResponse {
    const user = this.requireUser(request);
    const query = this.parseQuery(request);
    const names = this.userNames();
    const visible = getMockDatabase().applications.filter((record) =>
      this.canAccess(user, record),
    );
    const searchable = visible.filter((record) => {
      if (query.status && record.status !== query.status) {
        return false;
      }

      if (query.riskLevel && record.riskLevel !== query.riskLevel) {
        return false;
      }

      if (!query.search) {
        return true;
      }

      const haystack = [
        record.reference,
        record.business.businessName,
        record.business.legalName,
        record.contact.contactName,
        names.get(record.ownerId),
        record.assigneeId ? names.get(record.assigneeId) : '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query.search);
    });

    searchable.sort((left, right) => this.compareRecords(left, right, query.sort));

    const start = (query.page - 1) * query.pageSize;
    const items = searchable
      .slice(start, start + query.pageSize)
      .map((record) => this.toSummary(record, names));

    return ok({
      items,
      total: searchable.length,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  private applicationStats(request: HttpRequest<unknown>): MockResponse {
    const user = this.requireUser(request);
    const records = getMockDatabase().applications.filter((record) => this.canAccess(user, record));
    const stats: DashboardStats = {
      total: records.length,
      draft: records.filter((record) => record.status === 'DRAFT').length,
      inReview: records.filter(
        (record) => record.status === 'SUBMITTED' || record.status === 'UNDER_REVIEW',
      ).length,
      approved: records.filter((record) => record.status === 'APPROVED').length,
      rejected: records.filter((record) => record.status === 'REJECTED').length,
      changesRequested: records.filter((record) => record.status === 'CHANGES_REQUESTED').length,
    };

    return ok(stats);
  }

  private getApplication(request: HttpRequest<unknown>, applicationId: string): MockResponse {
    const user = this.requireUser(request);
    const record = this.findRecord(applicationId);

    if (!this.canAccess(user, record)) {
      return fail(403, 'You do not have permission to view this application.', 'FORBIDDEN');
    }

    const revealSensitive = request.params.get('revealSensitive') === 'true';

    if (revealSensitive && !this.canRevealSensitive(user, record)) {
      return fail(403, 'Sensitive data is not available for this application.', 'FORBIDDEN');
    }

    return ok(this.toDetail(record, this.userNames(), revealSensitive));
  }

  private createApplication(request: HttpRequest<unknown>): MockResponse {
    const user = this.requireUser(request);
    this.requireRole(user, ['SALES', 'ADMIN']);
    const database = getMockDatabase();
    const now = new Date().toISOString();
    const id = `app-${crypto.randomUUID()}`;
    const record: MockApplicationRecord = {
      id,
      reference: this.nextReference(),
      ownerId: user.id,
      assigneeId: null,
      status: 'DRAFT',
      riskLevel: 'LOW',
      riskScore: 0,
      business: {
        businessName: '',
        legalName: '',
        businessType: 'SOLE_PROPRIETORSHIP',
        registrationNumber: '',
        country: '',
        city: '',
        address: '',
        postalCode: '',
        website: '',
      },
      contact: {
        contactName: '',
        contactEmail: '',
        contactPhone: '',
      },
      financial: {
        monthlyVolume: null,
        averageTicket: null,
        currency: 'USD',
        taxId: '',
        bankAccountNumber: '',
      },
      termsAccepted: false,
      riskHistory: [
        {
          id: `${id}-event-1`,
          action: 'CREATED',
          note: 'Draft created and saved automatically.',
          riskLevel: 'LOW',
          actorName: user.name,
          createdAt: now,
        },
      ],
      reviewerNotes: null,
      createdAt: now,
      updatedAt: now,
      submittedAt: null,
    };

    database.applications.unshift(record);
    persistMockDatabase();

    return ok(this.toDetail(record, this.userNames(), false), 201);
  }

  private updateDraft(request: HttpRequest<unknown>, applicationId: string): MockResponse {
    const user = this.requireUser(request);
    const record = this.findRecord(applicationId);

    if (!this.canEdit(user, record)) {
      return fail(403, 'This application cannot be edited by your account.', 'FORBIDDEN');
    }

    if (!EDITABLE_STATUSES.includes(record.status)) {
      return fail(
        409,
        'Only draft or changes-requested applications can be edited.',
        'INVALID_STATE',
      );
    }

    const body = asRecord(request.body);
    const business = asRecord(body['business']);
    const contact = asRecord(body['contact']);
    const financial = asRecord(body['financial']);
    const businessType = readString(business, 'businessType');
    const currency = readString(financial, 'currency');

    record.business = {
      businessName: readString(business, 'businessName'),
      legalName: readString(business, 'legalName'),
      businessType: BUSINESS_TYPE_SET.has(businessType)
        ? (businessType as BusinessType)
        : record.business.businessType,
      registrationNumber: readString(business, 'registrationNumber'),
      country: readString(business, 'country'),
      city: readString(business, 'city'),
      address: readString(business, 'address'),
      postalCode: readString(business, 'postalCode'),
      website: readString(business, 'website'),
    };
    record.contact = {
      contactName: readString(contact, 'contactName'),
      contactEmail: readString(contact, 'contactEmail'),
      contactPhone: readString(contact, 'contactPhone'),
    };
    record.financial = {
      monthlyVolume: readNullableNumber(financial['monthlyVolume']),
      averageTicket: readNullableNumber(financial['averageTicket']),
      currency: CURRENCY_SET.has(currency) ? (currency as Currency) : record.financial.currency,
      taxId: readString(financial, 'taxId'),
      bankAccountNumber: readString(financial, 'bankAccountNumber'),
    };
    record.termsAccepted = body['termsAccepted'] === true;
    record.updatedAt = new Date().toISOString();
    persistMockDatabase();

    return ok({ savedAt: record.updatedAt });
  }

  private submitApplication(request: HttpRequest<unknown>, applicationId: string): MockResponse {
    const user = this.requireUser(request);
    const record = this.findRecord(applicationId);

    if (!this.canEdit(user, record)) {
      return fail(403, 'This application cannot be submitted by your account.', 'FORBIDDEN');
    }

    if (!EDITABLE_STATUSES.includes(record.status)) {
      return fail(409, 'This application has already been submitted.', 'INVALID_STATE');
    }

    if (!this.hasRequiredSubmissionFields(record)) {
      return fail(
        422,
        'Complete every required field and accept the terms before submitting.',
        'INCOMPLETE_APPLICATION',
      );
    }

    const now = new Date().toISOString();

    record.status = 'SUBMITTED';
    record.submittedAt = now;
    record.updatedAt = now;
    record.riskHistory.push(
      this.riskEvent('SUBMITTED', 'Application submitted for compliance review.', user.name, 'LOW'),
    );
    persistMockDatabase();

    return ok(this.toDetail(record, this.userNames(), false));
  }

  private reviewApplication(request: HttpRequest<unknown>, applicationId: string): MockResponse {
    const user = this.requireUser(request);
    const record = this.findRecord(applicationId);

    if (!this.canReview(user, record)) {
      return fail(403, 'Only the assigned reviewer can review this application.', 'FORBIDDEN');
    }

    if (!REVIEWABLE_STATUSES.includes(record.status)) {
      return fail(409, 'This application is not awaiting a review decision.', 'INVALID_STATE');
    }

    const body = asRecord(request.body);
    const decision = readString(body, 'decision') as ReviewDecision;
    const riskLevel = readString(body, 'riskLevel') as RiskLevel;
    const notes = readString(body, 'notes');

    if (!REVIEW_DECISIONS.includes(decision)) {
      return fail(400, 'Select a valid review decision.', 'VALIDATION_ERROR');
    }

    if (!RISK_SET.has(riskLevel)) {
      return fail(400, 'Select a valid risk level.', 'VALIDATION_ERROR');
    }

    if (notes.length < 10) {
      return fail(400, 'Add a review note of at least 10 characters.', 'VALIDATION_ERROR');
    }

    const now = new Date().toISOString();
    const riskScore = riskLevel === 'LOW' ? 22 : riskLevel === 'MEDIUM' ? 54 : 86;

    record.status = decision;
    record.riskLevel = riskLevel;
    record.riskScore = riskScore;
    record.reviewerNotes = notes;
    record.updatedAt = now;
    record.riskHistory.push(this.riskEvent(decision, notes, user.name, riskLevel));
    persistMockDatabase();

    return ok(this.toDetail(record, this.userNames(), false));
  }

  private assignApplication(request: HttpRequest<unknown>, applicationId: string): MockResponse {
    const user = this.requireUser(request);
    this.requireRole(user, ['ADMIN']);
    const record = this.findRecord(applicationId);

    if (record.status === 'DRAFT') {
      return fail(409, 'Draft applications cannot be assigned.', 'INVALID_STATE');
    }

    if (record.status === 'APPROVED' || record.status === 'REJECTED') {
      return fail(409, 'Completed applications cannot be reassigned.', 'INVALID_STATE');
    }

    const body = asRecord(request.body);
    const reviewerId = readString(body, 'reviewerId');
    const reviewer = findMockUserById(reviewerId);

    if (!reviewer || reviewer.role !== 'REVIEWER') {
      return fail(400, 'Select a valid reviewer.', 'VALIDATION_ERROR');
    }

    record.assigneeId = reviewer.id;

    if (record.status === 'SUBMITTED') {
      record.status = 'UNDER_REVIEW';
    }

    record.updatedAt = new Date().toISOString();
    record.riskHistory.push(
      this.riskEvent('ASSIGNED', `Assigned to ${reviewer.name} for review.`, user.name, record.riskLevel),
    );
    persistMockDatabase();

    return ok(this.toDetail(record, this.userNames(), false));
  }

  private reviewers(request: HttpRequest<unknown>): MockResponse {
    const user = this.requireUser(request);
    this.requireRole(user, ['ADMIN']);
    const database = getMockDatabase();
    const options: ReviewerOption[] = findMockReviewers().map((reviewer) => ({
      ...publicUser(reviewer),
      openReviews: database.applications.filter(
        (record) =>
          record.assigneeId === reviewer.id &&
          (record.status === 'SUBMITTED' || record.status === 'UNDER_REVIEW'),
      ).length,
    }));

    return ok(options);
  }

  private parseQuery(request: HttpRequest<unknown>): ParsedQuery {
    const status = request.params.get('status') ?? '';
    const riskLevel = request.params.get('riskLevel') ?? '';
    const sort = request.params.get('sort') ?? '';

    return {
      page: this.readInt(request.params.get('page'), 1, 1, 10000),
      pageSize: this.readInt(request.params.get('pageSize'), 10, 5, 50),
      search: (request.params.get('search') ?? '').trim().toLowerCase(),
      status: STATUS_SET.has(status) ? (status as ApplicationStatus) : '',
      riskLevel: RISK_SET.has(riskLevel) ? (riskLevel as RiskLevel) : '',
      sort: SORT_SET.has(sort) ? (sort as ApplicationSort) : 'updated-desc',
    };
  }

  private readInt(value: string | null, fallback: number, min: number, max: number): number {
    const parsed = Number.parseInt(value ?? '', 10);

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
  }

  private compareRecords(
    left: MockApplicationRecord,
    right: MockApplicationRecord,
    sort: ApplicationSort,
  ): number {
    switch (sort) {
      case 'updated-asc':
        return left.updatedAt.localeCompare(right.updatedAt);
      case 'created-desc':
        return right.createdAt.localeCompare(left.createdAt);
      case 'business-asc':
        return left.business.businessName.localeCompare(right.business.businessName);
      case 'reference-asc':
        return left.reference.localeCompare(right.reference);
      case 'updated-desc':
      default:
        return right.updatedAt.localeCompare(left.updatedAt);
    }
  }

  private findRecord(applicationId: string): MockApplicationRecord {
    const record = getMockDatabase().applications.find(
      (application) => application.id === applicationId,
    );

    if (!record) {
      return fail(404, 'Application not found.', 'NOT_FOUND');
    }

    return record;
  }

  private canAccess(user: MockUser, record: MockApplicationRecord): boolean {
    if (user.role === 'ADMIN') {
      return true;
    }

    if (user.role === 'SALES') {
      return record.ownerId === user.id;
    }

    return record.assigneeId === user.id;
  }

  private canRevealSensitive(user: MockUser, record: MockApplicationRecord): boolean {
    if (user.role === 'ADMIN') {
      return true;
    }

    if (user.role === 'SALES') {
      return record.ownerId === user.id;
    }

    return record.assigneeId === user.id;
  }

  private canEdit(user: MockUser, record: MockApplicationRecord): boolean {
    return user.role === 'ADMIN' || record.ownerId === user.id;
  }

  private canReview(user: MockUser, record: MockApplicationRecord): boolean {
    if (user.role === 'ADMIN') {
      return true;
    }

    return user.role === 'REVIEWER' && record.assigneeId === user.id;
  }

  private hasRequiredSubmissionFields(record: MockApplicationRecord): boolean {
    const business = record.business;
    const contact = record.contact;
    const financial = record.financial;
    const requiredStrings = [
      business.businessName,
      business.legalName,
      business.registrationNumber,
      business.country,
      business.city,
      business.address,
      business.postalCode,
      contact.contactName,
      contact.contactEmail,
      contact.contactPhone,
      financial.taxId,
      financial.bankAccountNumber,
    ];

    return (
      requiredStrings.every((value) => value.trim().length > 0) &&
      (financial.monthlyVolume ?? 0) > 0 &&
      (financial.averageTicket ?? 0) > 0 &&
      record.termsAccepted
    );
  }

  private nextReference(): string {
    const year = new Date().getFullYear();
    const highest = getMockDatabase().applications.reduce((current, record) => {
      const match = /^MP-\d{4}-(\d+)$/.exec(record.reference);
      const value = match ? Number.parseInt(match[1], 10) : 0;

      return Math.max(current, value);
    }, 0);

    return `MP-${year}-${String(highest + 1).padStart(4, '0')}`;
  }

  private riskEvent(
    action: RiskAction,
    note: string,
    actorName: string,
    riskLevel: RiskLevel,
  ): RiskEvent {
    return {
      id: crypto.randomUUID(),
      action,
      note,
      riskLevel,
      actorName,
      createdAt: new Date().toISOString(),
    };
  }

  private userNames(): Map<string, string> {
    return new Map(getMockDatabase().users.map((user) => [user.id, user.name]));
  }

  private toSummary(
    record: MockApplicationRecord,
    names: Map<string, string>,
  ): ApplicationSummary {
    return {
      id: record.id,
      reference: record.reference,
      businessName: record.business.businessName || 'Untitled draft',
      status: record.status,
      riskLevel: record.riskLevel,
      ownerName: names.get(record.ownerId) ?? 'Unknown owner',
      assigneeName: getUserDisplayName(record.assigneeId),
      monthlyVolume: record.financial.monthlyVolume ?? 0,
      currency: record.financial.currency,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private toDetail(
    record: MockApplicationRecord,
    names: Map<string, string>,
    revealSensitive: boolean,
  ): ApplicationDetail {
    const sensitive = revealSensitive
      ? {
          contactEmail: record.contact.contactEmail,
          contactPhone: record.contact.contactPhone,
          taxId: record.financial.taxId,
          bankAccountNumber: record.financial.bankAccountNumber,
        }
      : {
          contactEmail: maskEmail(record.contact.contactEmail),
          contactPhone: maskPhone(record.contact.contactPhone),
          taxId: maskTail(record.financial.taxId, 4),
          bankAccountNumber: maskTail(record.financial.bankAccountNumber, 4),
        };

    return {
      id: record.id,
      reference: record.reference,
      status: record.status,
      riskLevel: record.riskLevel,
      riskScore: record.riskScore,
      ownerId: record.ownerId,
      ownerName: names.get(record.ownerId) ?? 'Unknown owner',
      assigneeId: record.assigneeId,
      assigneeName: getUserDisplayName(record.assigneeId),
      business: record.business,
      contactName: record.contact.contactName,
      financial: {
        monthlyVolume: record.financial.monthlyVolume ?? 0,
        averageTicket: record.financial.averageTicket ?? 0,
        currency: record.financial.currency,
      },
      sensitive,
      riskHistory: record.riskHistory,
      reviewerNotes: record.reviewerNotes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      submittedAt: record.submittedAt,
    };
  }

  private toHttpError(error: unknown, url: string): HttpErrorResponse {
    if (error instanceof MockApiError) {
      return new HttpErrorResponse({
        status: error.status,
        url,
        error: {
          message: error.message,
          code: error.code,
        },
      });
    }

    return new HttpErrorResponse({
      status: 500,
      url,
      error: {
        message: 'The mock API encountered an unexpected error.',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}
