import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import {
  ApplicationDetail,
  RiskEvent,
} from '../../../core/models/application.model';
import { AuthSession, ReviewerOption, User, UserRole } from '../../../core/models/user.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { ApplicationDetailPage } from './application-detail.page';

const USER_IDS: Record<UserRole, string> = {
  SALES: 'user-sales-1',
  REVIEWER: 'user-reviewer-1',
  ADMIN: 'user-admin-1',
};

const RISK_HISTORY: RiskEvent[] = [
  {
    id: 'event-1',
    action: 'CREATED',
    note: 'Draft created and saved automatically.',
    riskLevel: 'LOW',
    actorName: 'Maya Shrestha',
    createdAt: '2026-02-03T08:15:00.000Z',
  },
  {
    id: 'event-2',
    action: 'SUBMITTED',
    note: 'Application submitted for compliance review.',
    riskLevel: 'LOW',
    actorName: 'Maya Shrestha',
    createdAt: '2026-02-04T08:15:00.000Z',
  },
  {
    id: 'event-3',
    action: 'ASSIGNED',
    note: 'Assigned to Ravi Karki for review.',
    riskLevel: 'MEDIUM',
    actorName: 'Aarav Patel',
    createdAt: '2026-02-05T08:15:00.000Z',
  },
];

const REVIEWERS: ReviewerOption[] = [
  {
    id: 'user-reviewer-1',
    name: 'Ravi Karki',
    email: 'reviewer@merchant.test',
    role: 'REVIEWER',
    openReviews: 3,
  },
  {
    id: 'user-reviewer-2',
    name: 'Elena Rossi',
    email: 'reviewer2@merchant.test',
    role: 'REVIEWER',
    openReviews: 5,
  },
];

function makeDetail(overrides: Partial<ApplicationDetail> = {}): ApplicationDetail {
  return {
    id: 'app-0003',
    reference: 'MP-2026-0003',
    status: 'UNDER_REVIEW',
    riskLevel: 'MEDIUM',
    riskScore: 54,
    ownerId: 'user-sales-1',
    ownerName: 'Maya Shrestha',
    assigneeId: 'user-reviewer-1',
    assigneeName: 'Ravi Karki',
    business: {
      businessName: 'Himalayan Java',
      legalName: 'Himalayan Java LLC',
      businessType: 'PARTNERSHIP',
      registrationNumber: 'REG-2026-1001',
      country: 'Nepal',
      city: 'Kathmandu',
      address: '13 Durbar Marg',
      postalCode: '44600',
      website: 'https://himalayan-java.example.test',
    },
    contactName: 'Avery Morgan',
    financial: {
      monthlyVolume: 68500,
      averageTicket: 83,
      currency: 'EUR',
    },
    sensitive: {
      contactEmail: 'h•••••••••••••@example.test',
      contactPhone: '•••••• 6831',
      taxId: '••••• 3829',
      bankAccountNumber: '•••••• 4381',
    },
    riskHistory: RISK_HISTORY,
    reviewerNotes: null,
    termsAccepted: true,
    createdAt: '2026-02-03T08:15:00.000Z',
    updatedAt: '2026-02-05T08:15:00.000Z',
    submittedAt: '2026-02-04T08:15:00.000Z',
    ...overrides,
  };
}

const REVEALED_SENSITIVE = {
  contactEmail: 'himalayan-java@example.test',
  contactPhone: '+44 20 7946 6831',
  taxId: 'TAX-NP-100013',
  bankAccountNumber: '991000000081',
};

interface DetailStub {
  getApplication: ReturnType<typeof vi.fn>;
  getReviewers: ReturnType<typeof vi.fn>;
  reviewApplication: ReturnType<typeof vi.fn>;
  assignApplication: ReturnType<typeof vi.fn>;
  getApplications: ReturnType<typeof vi.fn>;
  getStats: ReturnType<typeof vi.fn>;
  createApplication: ReturnType<typeof vi.fn>;
  saveDraft: ReturnType<typeof vi.fn>;
  submitApplication: ReturnType<typeof vi.fn>;
}

function createStub(detail: ApplicationDetail = makeDetail()): DetailStub {
  return {
    getApplication: vi.fn((_id: string, reveal = false) =>
      of(reveal ? makeDetail({ ...detail, sensitive: REVEALED_SENSITIVE }) : detail),
    ),
    getReviewers: vi.fn(() => of(REVIEWERS)),
    reviewApplication: vi.fn((_id: string, payload: { notes: string; decision: string }) =>
      of(
        makeDetail({
          status: payload.decision as ApplicationDetail['status'],
          riskLevel: 'LOW',
          reviewerNotes: payload.notes,
          riskHistory: [
            ...RISK_HISTORY,
            {
              id: 'event-4',
              action: 'APPROVED',
              note: payload.notes,
              riskLevel: 'LOW',
              actorName: 'Ravi Karki',
              createdAt: '2026-02-06T08:15:00.000Z',
            },
          ],
        }),
      ),
    ),
    assignApplication: vi.fn((_id: string, payload: { reviewerId: string }) =>
      of(
        makeDetail({
          assigneeId: payload.reviewerId,
          assigneeName: 'Elena Rossi',
        }),
      ),
    ),
    getApplications: vi.fn(),
    getStats: vi.fn(),
    createApplication: vi.fn(),
    saveDraft: vi.fn(),
    submitApplication: vi.fn(),
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
  stub: DetailStub,
  queryParams: Record<string, string> = {},
): Promise<ComponentFixture<ApplicationDetailPage>> {
  const user = signal<User | null>(userFor(role));
  const params = new Map(Object.entries(queryParams));

  await TestBed.configureTestingModule({
    imports: [ApplicationDetailPage],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: { get: (key: string) => params.get(key) ?? null } } },
      },
      {
        provide: AuthService,
        useValue: { currentUser: user, session: signal<AuthSession | null>(null) },
      },
      { provide: ApplicationsService, useValue: stub },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ApplicationDetailPage);
  fixture.componentRef.setInput('id', 'app-0003');
  fixture.detectChanges();

  return fixture;
}

function buttonWithText(fixture: ComponentFixture<unknown>, text: string): HTMLButtonElement {
  const buttons = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
  ) as HTMLButtonElement[];
  const match = buttons.find((button) => button.textContent?.includes(text));

  if (!match) {
    throw new Error(`Button containing "${text}" was not rendered`);
  }

  return match;
}

describe('ApplicationDetailPage', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('hides reviewer actions from SALES while allowing an owned sensitive reveal', async () => {
    const stub = createStub();
    const fixture = await setup('SALES', stub);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Himalayan Java');
    expect(element.textContent).toContain('Reveal sensitive details');
    expect(element.textContent).toContain('Data protection');
    expect(element.textContent).not.toContain('Record decision');
    expect(element.textContent).not.toContain('Reviewer assignment');
    expect(stub.getApplication).toHaveBeenCalledWith('app-0003');

    buttonWithText(fixture, 'Reveal sensitive details').click();
    fixture.detectChanges();

    expect(stub.getApplication).toHaveBeenLastCalledWith('app-0003', true);
    expect(fixture.componentInstance.revealed()).toBe(true);
    expect(element.textContent).toContain(REVEALED_SENSITIVE.contactEmail);
    expect(element.textContent).toContain(REVEALED_SENSITIVE.taxId);
    expect(element.textContent).toContain('Hide sensitive details');
    expect(element.textContent).toContain('Sensitive details are now visible for this session.');

    buttonWithText(fixture, 'Hide sensitive details').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.revealed()).toBe(false);
    expect(element.textContent).toContain('Sensitive details are masked again.');
  });

  it('shows the decision form to the assigned REVIEWER and records a valid decision', async () => {
    const stub = createStub();
    const fixture = await setup('REVIEWER', stub);
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Record decision');
    expect(element.textContent).not.toContain('Reviewer assignment');
    expect(stub.getReviewers).not.toHaveBeenCalled();

    component.reviewForm.setValue({
      decision: 'APPROVED',
      riskLevel: 'LOW',
      notes: 'short',
    });
    component.submitReview();

    expect(stub.reviewApplication).not.toHaveBeenCalled();

    component.reviewForm.setValue({
      decision: 'APPROVED',
      riskLevel: 'LOW',
      notes: 'Identity, tax, and settlement details verified.',
    });
    component.submitReview();
    fixture.detectChanges();

    expect(stub.reviewApplication).toHaveBeenCalledWith('app-0003', {
      decision: 'APPROVED',
      riskLevel: 'LOW',
      notes: 'Identity, tax, and settlement details verified.',
    });
    expect(component.notice()).toContain('Application approved');
    expect(element.textContent).toContain('Application approved');
  });

  it('blocks a SALES user from recording a decision even if the method is called', async () => {
    const stub = createStub();
    const fixture = await setup('SALES', stub);

    fixture.componentInstance.reviewForm.setValue({
      decision: 'APPROVED',
      riskLevel: 'LOW',
      notes: 'Identity, tax, and settlement details verified.',
    });
    fixture.componentInstance.submitReview();

    expect(stub.reviewApplication).not.toHaveBeenCalled();
  });

  it('lets ADMIN load reviewers and assign an application', async () => {
    const stub = createStub();
    const fixture = await setup('ADMIN', stub);
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    expect(stub.getReviewers).toHaveBeenCalled();
    expect(element.textContent).toContain('Reviewer assignment');
    expect(element.textContent).toContain('Record decision');

    component.assignForm.setValue({ reviewerId: 'user-reviewer-2' });
    component.submitAssignment();
    fixture.detectChanges();

    expect(stub.assignApplication).toHaveBeenCalledWith('app-0003', {
      reviewerId: 'user-reviewer-2',
    });
    expect(component.notice()).toContain('Elena Rossi is now assigned');
  });

  it('renders a recoverable load error and retries the request', async () => {
    const stub = createStub();

    stub.getApplication
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 500,
              error: { message: 'The merchant record could not be loaded.' },
            }),
        ),
      )
      .mockReturnValue(of(makeDetail()));

    const fixture = await setup('SALES', stub);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Application unavailable');
    expect(element.textContent).toContain('The merchant record could not be loaded.');

    buttonWithText(fixture, 'Try again').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBeNull();
    expect(element.textContent).toContain('Himalayan Java');
  });

  it('shows the submission banner when the detail route reports a submission', async () => {
    const stub = createStub();
    const fixture = await setup('SALES', stub, { submitted: '1' });
    const element = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.submittedNotice()).toBe(true);
    expect(element.textContent).toContain('Application submitted. It is now queued for review.');
  });
});
