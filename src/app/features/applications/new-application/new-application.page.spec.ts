import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ApplicationDetail } from '../../../core/models/application.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { NewApplicationPage } from './new-application.page';

function makeDetail(overrides: Partial<ApplicationDetail> = {}): ApplicationDetail {
  return {
    id: 'app-0003',
    reference: 'MP-2026-0003',
    status: 'DRAFT',
    riskLevel: 'LOW',
    riskScore: 0,
    ownerId: 'user-sales-1',
    ownerName: 'Maya Shrestha',
    assigneeId: null,
    assigneeName: null,
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
    contactName: '',
    financial: {
      monthlyVolume: 0,
      averageTicket: 0,
      currency: 'USD',
    },
    sensitive: {
      contactEmail: '',
      contactPhone: '',
      taxId: '',
      bankAccountNumber: '',
    },
    riskHistory: [],
    reviewerNotes: null,
    termsAccepted: false,
    createdAt: '2026-02-03T08:15:00.000Z',
    updatedAt: '2026-02-03T10:15:00.000Z',
    submittedAt: null,
    ...overrides,
  };
}

const COMPLETE_DETAIL = makeDetail({
  business: {
    businessName: 'Lumen Harbor',
    legalName: 'Lumen Harbor Ltd',
    businessType: 'PRIVATE_LIMITED',
    registrationNumber: 'REG-99182',
    country: 'United Kingdom',
    city: 'Bristol',
    address: '18 Harbor Lane',
    postalCode: 'BS1 4DJ',
    website: 'https://lumen-harbor.test',
  },
  contactName: 'Priya Nair',
  financial: {
    monthlyVolume: 85000,
    averageTicket: 145,
    currency: 'GBP',
  },
  sensitive: {
    contactEmail: 'priya@lumen-harbor.test',
    contactPhone: '+44 117 496 0182',
    taxId: 'GB-884201',
    bankAccountNumber: '99887766554433',
  },
  termsAccepted: true,
});

interface WizardStub {
  createApplication: ReturnType<typeof vi.fn>;
  getApplication: ReturnType<typeof vi.fn>;
  saveDraft: ReturnType<typeof vi.fn>;
  submitApplication: ReturnType<typeof vi.fn>;
  getApplications: ReturnType<typeof vi.fn>;
  getStats: ReturnType<typeof vi.fn>;
  reviewApplication: ReturnType<typeof vi.fn>;
  assignApplication: ReturnType<typeof vi.fn>;
  getReviewers: ReturnType<typeof vi.fn>;
}

function createStub(): WizardStub {
  return {
    createApplication: vi.fn(() => of(makeDetail())),
    getApplication: vi.fn(() => of(COMPLETE_DETAIL)),
    saveDraft: vi.fn(() => of({ savedAt: '2026-02-03T10:20:00.000Z' })),
    submitApplication: vi.fn(() =>
      of(
        makeDetail({
          status: 'SUBMITTED',
          submittedAt: '2026-02-03T10:30:00.000Z',
        }),
      ),
    ),
    getApplications: vi.fn(),
    getStats: vi.fn(),
    reviewApplication: vi.fn(),
    assignApplication: vi.fn(),
    getReviewers: vi.fn(),
  };
}

async function setup(
  stub: WizardStub = createStub(),
  id?: string,
): Promise<{
  fixture: ComponentFixture<NewApplicationPage>;
  stub: WizardStub;
  router: Router;
}> {
  await TestBed.configureTestingModule({
    imports: [NewApplicationPage],
    providers: [provideRouter([]), { provide: ApplicationsService, useValue: stub }],
  }).compileComponents();

  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

  const fixture = TestBed.createComponent(NewApplicationPage);

  if (id) {
    fixture.componentRef.setInput('id', id);
  }

  fixture.detectChanges();

  return { fixture, stub, router };
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function fillBusiness(component: NewApplicationPage): void {
  component.form.controls.business.patchValue({
    businessName: 'Lumen Harbor',
    legalName: 'Lumen Harbor Ltd',
    businessType: 'PRIVATE_LIMITED',
    registrationNumber: 'REG-99182',
    country: 'United Kingdom',
    city: 'Bristol',
    address: '18 Harbor Lane',
    postalCode: 'BS1 4DJ',
    website: 'https://lumen-harbor.test',
  });
}

function fillContactAndFinancial(component: NewApplicationPage): void {
  component.form.controls.contact.patchValue({
    contactName: 'Priya Nair',
    contactEmail: 'priya@lumen-harbor.test',
    contactPhone: '+44 117 496 0182',
  });
  component.form.controls.financial.patchValue({
    monthlyVolume: 85000,
    averageTicket: 145,
    currency: 'GBP',
    taxId: 'GB-884201',
    bankAccountNumber: '99887766554433',
  });
}

describe('NewApplicationPage', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates a draft and initializes the wizard for a new application', async () => {
    const stub = createStub();
    const { fixture } = await setup(stub);
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    expect(stub.createApplication).toHaveBeenCalledTimes(1);
    expect(component.applicationId()).toBe('app-0003');
    expect(component.reference()).toBe('MP-2026-0003');
    expect(component.initializing()).toBe(false);
    expect(component.step()).toBe(0);
    expect(component.saveState()).toBe('saved');
    expect(element.textContent).toContain('New merchant application');
    expect(element.textContent).toContain('MP-2026-0003');
    expect(element.textContent).toMatch(/Saved at|Draft saved/);
    expect(element.textContent).toContain('Business details');
  });

  it('resumes a saved draft with the unmasked sensitive values', async () => {
    const stub = createStub();
    const { fixture } = await setup(stub, 'app-0003');
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    expect(stub.getApplication).toHaveBeenCalledWith('app-0003', true);
    expect(stub.createApplication).not.toHaveBeenCalled();
    expect(component.pageTitle()).toBe('Continue application');
    expect(component.form.controls.business.controls.businessName.value).toBe('Lumen Harbor');
    expect(component.form.controls.contact.controls.contactEmail.value).toBe(
      'priya@lumen-harbor.test',
    );
    expect(component.form.controls.financial.controls.taxId.value).toBe('GB-884201');
    expect(component.form.controls.financial.controls.bankAccountNumber.value).toBe(
      '99887766554433',
    );
    expect(component.form.controls.termsAccepted.value).toBe(true);
    expect(element.textContent).toContain('Continue application');
  });

  it('blocks step progression until the current step is valid', async () => {
    const { fixture } = await setup();
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    component.goNext();
    fixture.detectChanges();

    expect(component.step()).toBe(0);
    expect(component.validationNotice()).toBe(
      'Complete the highlighted required fields before continuing.',
    );
    expect(element.textContent).toContain('Complete the highlighted required fields');

    fillBusiness(component);
    component.goNext();
    fixture.detectChanges();

    expect(component.step()).toBe(1);
    expect(component.validationNotice()).toBeNull();
    expect(element.textContent).toContain('Contact and finances');

    fillContactAndFinancial(component);
    component.goNext();
    fixture.detectChanges();

    expect(component.step()).toBe(2);
    expect(element.textContent).toContain('Review and submit');
  });

  it('debounces form changes and autosaves the latest draft payload', async () => {
    const stub = createStub();
    const { fixture } = await setup(stub);
    const component = fixture.componentInstance;

    fillBusiness(component);

    expect(component.saveState()).toBe('pending');
    expect(stub.saveDraft).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 750));
    await flush();

    expect(stub.saveDraft).toHaveBeenCalledTimes(1);
    expect(stub.saveDraft).toHaveBeenCalledWith(
      'app-0003',
      expect.objectContaining({
        business: expect.objectContaining({ businessName: 'Lumen Harbor' }),
      }),
    );
    expect(component.saveState()).toBe('saved');
    expect(component.savedAt()).toBe('2026-02-03T10:20:00.000Z');
  });

  it('preserves form values after a failed save and retries successfully', async () => {
    const stub = createStub();

    stub.saveDraft.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            error: { message: 'The draft could not be saved.' },
          }),
      ),
    );

    const { fixture } = await setup(stub);
    const component = fixture.componentInstance;

    fillBusiness(component);
    component.goNext();
    await flush();

    expect(component.saveState()).toBe('error');
    expect(component.saveError()).toBe('The draft could not be saved.');
    expect(component.form.controls.business.controls.businessName.value).toBe('Lumen Harbor');

    stub.saveDraft.mockReturnValue(of({ savedAt: '2026-02-03T10:25:00.000Z' }));
    component.retrySave();
    await flush();

    expect(stub.saveDraft).toHaveBeenCalledTimes(2);
    expect(component.saveState()).toBe('saved');
    expect(component.saveError()).toBeNull();
    expect(component.form.controls.business.controls.legalName.value).toBe('Lumen Harbor Ltd');
  });

  it('validates the declaration and submits a complete application', async () => {
    const stub = createStub();
    const { fixture, router } = await setup(stub);
    const component = fixture.componentInstance;

    fillBusiness(component);
    fillContactAndFinancial(component);
    component.step.set(2);

    await component.submit();

    expect(component.validationNotice()).toBe(
      'Accept the declaration before submitting your application.',
    );
    expect(stub.submitApplication).not.toHaveBeenCalled();

    component.form.controls.termsAccepted.setValue(true);
    await component.submit();
    await flush();

    expect(stub.saveDraft).toHaveBeenCalled();
    expect(stub.submitApplication).toHaveBeenCalledWith('app-0003');
    expect(router.navigate).toHaveBeenCalledWith(['/applications', 'app-0003'], {
      queryParams: { submitted: '1' },
    });
  });

  it('shows a locked state for a record that is no longer editable', async () => {
    const stub = createStub();

    stub.getApplication.mockReturnValue(of(makeDetail({ status: 'APPROVED' })));

    const { fixture } = await setup(stub, 'app-0003');
    const element = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.initError()).toContain('no longer editable');
    expect(element.textContent).toContain('Application locked');
    expect(element.textContent).toContain('View application');
  });

  it('recovers when creating a draft initially fails', async () => {
    const stub = createStub();

    stub.createApplication
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 500,
              error: { message: 'The draft service is unavailable.' },
            }),
        ),
      )
      .mockReturnValue(of(makeDetail()));

    const { fixture } = await setup(stub);
    const element = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.initError()).toBe('The draft service is unavailable.');
    expect(element.textContent).toContain('Draft could not be created');

    fixture.componentInstance.retryInitialization();
    fixture.detectChanges();

    expect(fixture.componentInstance.initError()).toBeNull();
    expect(fixture.componentInstance.applicationId()).toBe('app-0003');
    expect(element.textContent).toContain('Business details');
  });
});
