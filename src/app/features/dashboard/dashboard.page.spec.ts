import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageEvent } from '@angular/material/paginator';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import {
  ApplicationStatus,
  ApplicationSummary,
  DashboardStats,
  RiskLevel,
} from '../../core/models/application.model';
import { AuthSession, User, UserRole } from '../../core/models/user.model';
import { ApplicationsService } from '../../core/services/applications.service';
import { DashboardPage } from './dashboard.page';

const USER_IDS: Record<UserRole, string> = {
  SALES: 'user-sales-1',
  REVIEWER: 'user-reviewer-1',
  ADMIN: 'user-admin-1',
};

const STATS: DashboardStats = {
  total: 2,
  draft: 1,
  inReview: 1,
  approved: 0,
  rejected: 0,
  changesRequested: 0,
};

const ITEMS: ApplicationSummary[] = [
  {
    id: 'app-0001',
    reference: 'MP-2026-0001',
    businessName: 'Northwind Traders',
    status: 'DRAFT',
    riskLevel: 'LOW',
    ownerName: 'Maya Shrestha',
    assigneeName: null,
    monthlyVolume: 50000,
    currency: 'USD',
    createdAt: '2026-01-02T08:15:00.000Z',
    updatedAt: '2026-01-02T10:15:00.000Z',
  },
  {
    id: 'app-0002',
    reference: 'MP-2026-0002',
    businessName: 'Himalayan Java',
    status: 'SUBMITTED',
    riskLevel: 'HIGH',
    ownerName: 'Maya Shrestha',
    assigneeName: 'Ravi Karki',
    monthlyVolume: 68500,
    currency: 'EUR',
    createdAt: '2026-01-03T08:15:00.000Z',
    updatedAt: '2026-01-04T10:15:00.000Z',
  },
];

interface ApplicationsStub {
  getApplications: ReturnType<typeof vi.fn>;
  getStats: ReturnType<typeof vi.fn>;
  getApplication: ReturnType<typeof vi.fn>;
  createApplication: ReturnType<typeof vi.fn>;
  saveDraft: ReturnType<typeof vi.fn>;
  submitApplication: ReturnType<typeof vi.fn>;
  reviewApplication: ReturnType<typeof vi.fn>;
  assignApplication: ReturnType<typeof vi.fn>;
  getReviewers: ReturnType<typeof vi.fn>;
}

function createStub(items: ApplicationSummary[] = ITEMS): ApplicationsStub {
  return {
    getApplications: vi.fn(() =>
      of({
        items,
        total: items.length,
        page: 1,
        pageSize: 10,
      }),
    ),
    getStats: vi.fn(() => of(STATS)),
    getApplication: vi.fn(),
    createApplication: vi.fn(),
    saveDraft: vi.fn(),
    submitApplication: vi.fn(),
    reviewApplication: vi.fn(),
    assignApplication: vi.fn(),
    getReviewers: vi.fn(),
  };
}

function userFor(role: UserRole): User {
  return {
    id: USER_IDS[role],
    name: `${role} user`,
    email: `${role.toLowerCase()}@merchant.test`,
    role,
  };
}

async function setup(
  role: UserRole,
  stub: ApplicationsStub = createStub(),
): Promise<{ fixture: ComponentFixture<DashboardPage>; stub: ApplicationsStub }> {
  const user = signal<User | null>(userFor(role));

  await TestBed.configureTestingModule({
    imports: [DashboardPage],
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: { currentUser: user, session: signal<AuthSession | null>(null) },
      },
      { provide: ApplicationsService, useValue: stub },
    ],
  }).compileComponents();

  return { fixture: TestBed.createComponent(DashboardPage), stub };
}

function summary(status: ApplicationStatus, riskLevel: RiskLevel = 'LOW'): ApplicationSummary {
  return { ...ITEMS[0], status, riskLevel };
}

describe('DashboardPage', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders the scoped workspace, stats, and application rows', async () => {
    const { fixture, stub } = await setup('SALES');

    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(stub.getApplications).toHaveBeenCalledTimes(1);
    expect(stub.getStats).toHaveBeenCalledTimes(1);
    expect(text).toContain('Your merchant applications and drafts');
    expect(text).toContain('Showing 1–2 of 2 applications');
    expect(text).toContain('Northwind Traders');
    expect(text).toContain('Himalayan Java');
    expect(text).toContain('New application');
    expect(fixture.nativeElement.querySelectorAll('tr[mat-row]')).toHaveLength(2);
  });

  it('adapts row actions and creation links to the signed-in role', async () => {
    const sales = await setup('SALES');

    expect(sales.fixture.componentInstance.rowActionLabel(summary('DRAFT'))).toBe('Continue');
    expect(sales.fixture.componentInstance.rowActionLabel(summary('SUBMITTED'))).toBe('Open');
    expect(sales.fixture.componentInstance.permissions.canCreateApplication()).toBe(true);

    TestBed.resetTestingModule();

    const reviewer = await setup('REVIEWER');

    expect(reviewer.fixture.componentInstance.rowActionLabel(summary('DRAFT'))).toBe('Open');
    expect(reviewer.fixture.componentInstance.rowActionLabel(summary('SUBMITTED'))).toBe('Review');
    expect(reviewer.fixture.componentInstance.rowActionLabel(summary('APPROVED'))).toBe('Open');
    expect(reviewer.fixture.componentInstance.permissions.canCreateApplication()).toBe(false);

    TestBed.resetTestingModule();

    const admin = await setup('ADMIN');

    expect(admin.fixture.componentInstance.rowActionLabel(summary('DRAFT'))).toBe('Continue');
    expect(admin.fixture.componentInstance.rowActionLabel(summary('UNDER_REVIEW'))).toBe('Manage');
    expect(admin.fixture.componentInstance.permissions.canAssignReviewers()).toBe(true);
  });

  it('sends filters, sorting, and pagination to the server', async () => {
    const { fixture, stub } = await setup('ADMIN');
    const component = fixture.componentInstance;

    component.setStatus('APPROVED');
    expect(stub.getApplications).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, status: 'APPROVED' }),
    );

    component.setRiskLevel('HIGH');
    expect(stub.getApplications).toHaveBeenLastCalledWith(
      expect.objectContaining({ riskLevel: 'HIGH' }),
    );

    component.setSort('business-asc');
    expect(stub.getApplications).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'business-asc' }),
    );

    component.onPageChange({
      pageIndex: 2,
      pageSize: 20,
      length: 100,
      previousPageIndex: 0,
    } as PageEvent);

    expect(stub.getApplications).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 3, pageSize: 20 }),
    );

    component.clearFilters();

    expect(component.hasFilters()).toBe(false);
    expect(stub.getApplications).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        search: '',
        status: '',
        riskLevel: '',
        sort: 'updated-desc',
      }),
    );
  });

  it('shows an error banner and recovers after retry', async () => {
    const stub = createStub();

    stub.getApplications
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 500,
              error: { message: 'The application list is temporarily unavailable.' },
            }),
        ),
      )
      .mockReturnValue(
        of({ items: ITEMS, total: ITEMS.length, page: 1, pageSize: 10 }),
      );

    const { fixture } = await setup('SALES', stub);

    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBe(
      'The application list is temporarily unavailable.',
    );

    const banner = fixture.nativeElement.querySelector('.table-error') as HTMLElement | null;

    expect(banner?.textContent).toContain('Could not load applications');
    expect(banner?.textContent).toContain('The application list is temporarily unavailable.');

    (banner?.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBeNull();
    expect(fixture.componentInstance.items()).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('tr[mat-row]')).toBeTruthy();
  });

  it('renders the empty state for a filtered search with no results', async () => {
    const stub = createStub([]);
    const { fixture } = await setup('REVIEWER', stub);

    fixture.detectChanges();
    fixture.componentInstance.setStatus('APPROVED');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('No matching applications');
    expect(text).toContain('Try a different search term or clear the active filters.');
    expect(text).not.toContain('New application');
  });
});
