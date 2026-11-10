import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, firstValueFrom, Subscription } from 'rxjs';

import {
  ApplicationDetail,
  ApplicationDraftPayload,
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  BusinessType,
  CURRENCIES,
  CURRENCY_LABELS,
  Currency,
  EDITABLE_STATUSES,
} from '../../../core/models/application.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { controlError } from '../../../core/utils/form-error';
import { toErrorMessage } from '../../../core/utils/http-error';
import {
  averageTicketWithinVolume,
  bankAccountValidator,
  emailValidator,
  phoneValidator,
  postalCodeValidator,
  registrationNumberValidator,
  taxIdValidator,
  trimmedRequired,
  websiteValidator,
} from '../../../core/utils/validators';
import {
  AppIconComponent,
  AppIconName,
} from '../../../shared/components/app-icon/app-icon.component';

type SaveState = 'saved' | 'pending' | 'saving' | 'error';

interface WizardStep {
  label: string;
  caption: string;
  icon: AppIconName;
}

const AUTOSAVE_DEBOUNCE_MS = 700;

@Component({
  selector: 'app-new-application-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    RouterLink,
    CurrencyPipe,
    AppIconComponent,
  ],
  templateUrl: './new-application.page.html',
  styleUrl: './new-application.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewApplicationPage implements OnInit {
  private readonly applications = inject(ApplicationsService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input<string>();

  readonly steps: readonly WizardStep[] = [
    {
      label: 'Business details',
      caption: 'Legal entity and registered address',
      icon: 'business',
    },
    {
      label: 'Contact & finances',
      caption: 'Primary contact and settlement profile',
      icon: 'person',
    },
    {
      label: 'Review & submit',
      caption: 'Confirm the details and accept the terms',
      icon: 'check-circle',
    },
  ];
  readonly businessTypes = BUSINESS_TYPES;
  readonly businessTypeLabels = BUSINESS_TYPE_LABELS;
  readonly currencies = CURRENCIES;
  readonly currencyLabels = CURRENCY_LABELS;

  readonly form = this.formBuilder.group({
    business: this.formBuilder.group({
      businessName: [
        '',
        [trimmedRequired, Validators.maxLength(120), Validators.required],
      ],
      legalName: ['', [trimmedRequired, Validators.maxLength(140), Validators.required]],
      businessType: ['SOLE_PROPRIETORSHIP' as BusinessType, Validators.required],
      registrationNumber: [
        '',
        [trimmedRequired, registrationNumberValidator, Validators.required],
      ],
      country: ['', [trimmedRequired, Validators.maxLength(60), Validators.required]],
      city: ['', [trimmedRequired, Validators.maxLength(80), Validators.required]],
      address: ['', [trimmedRequired, Validators.maxLength(160), Validators.required]],
      postalCode: ['', [trimmedRequired, postalCodeValidator, Validators.required]],
      website: ['', [websiteValidator, Validators.maxLength(140)]],
    }),
    contact: this.formBuilder.group({
      contactName: ['', [trimmedRequired, Validators.maxLength(100), Validators.required]],
      contactEmail: ['', [trimmedRequired, emailValidator, Validators.required]],
      contactPhone: ['', [trimmedRequired, phoneValidator, Validators.required]],
    }),
    financial: this.formBuilder.group(
      {
        monthlyVolume: this.formBuilder.control<number | null>(null, [
          Validators.required,
          Validators.min(1),
          Validators.max(100_000_000),
        ]),
        averageTicket: this.formBuilder.control<number | null>(null, [
          Validators.required,
          Validators.min(1),
          Validators.max(1_000_000),
        ]),
        currency: ['USD' as Currency, Validators.required],
        taxId: ['', [trimmedRequired, taxIdValidator, Validators.required]],
        bankAccountNumber: [
          '',
          [trimmedRequired, bankAccountValidator, Validators.required],
        ],
      },
      { validators: averageTicketWithinVolume },
    ),
    termsAccepted: [false, Validators.requiredTrue],
  });

  readonly step = signal(0);
  readonly snapshot = signal(this.form.getRawValue());
  readonly applicationId = signal<string | null>(null);
  readonly reference = signal<string | null>(null);
  readonly initializing = signal(true);
  readonly initError = signal<string | null>(null);
  readonly validationNotice = signal<string | null>(null);
  readonly saveState = signal<SaveState>('saved');
  readonly savedAt = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly exiting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly progress = computed(
    () => Math.round(((this.step() + 1) / this.steps.length) * 100),
  );
  readonly busy = computed(() => this.submitting() || this.exiting());
  readonly pageTitle = computed(() =>
    this.id() ? 'Continue application' : 'New merchant application',
  );
  readonly pageSubtitle = computed(() =>
    this.id()
      ? 'Update the saved draft, then submit it when every step is complete.'
      : 'Complete the three steps below. Your progress is saved as a draft while you work.',
  );
  readonly savedTime = computed(() => {
    const savedAt = this.savedAt();

    if (!savedAt) {
      return '';
    }

    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(savedAt));
  });
  readonly saveMessage = computed(() => {
    switch (this.saveState()) {
      case 'saving':
        return 'Saving draft…';
      case 'pending':
        return 'Unsaved changes';
      case 'error':
        return 'Draft not saved';
      case 'saved':
      default:
        return this.savedTime() ? `Saved at ${this.savedTime()}` : 'Draft saved';
    }
  });
  readonly saveIcon = computed<AppIconName>(() => {
    switch (this.saveState()) {
      case 'saving':
      case 'pending':
        return 'clock';
      case 'error':
        return 'warning';
      case 'saved':
      default:
        return 'check-circle';
    }
  });

  private revision = 0;
  private saveQueued = false;
  private saveChain: Promise<void> = Promise.resolve();
  private initSubscription: Subscription | null = null;

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.initializing()) {
          this.snapshot.set(this.form.getRawValue());
        }

        if (!this.initializing() && !this.submitting() && !this.exiting()) {
          this.revision += 1;

          if (this.saveState() !== 'saving') {
            this.saveState.set('pending');
          }
        }
      });

    this.form.valueChanges
      .pipe(debounceTime(AUTOSAVE_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.initializing() && !this.submitting() && !this.exiting()) {
          this.queueSave();
        }
      });
  }

  ngOnInit(): void {
    this.startInitialization();
  }

  retryInitialization(): void {
    this.startInitialization();
  }

  error(path: string): string | null {
    return controlError(this.form.get(path));
  }

  financialError(): string | null {
    const group = this.form.controls.financial;

    if (!group.touched && !group.dirty) {
      return null;
    }

    return group.errors?.['averageTicketTooHigh']
      ? 'Average ticket cannot be higher than the monthly volume.'
      : null;
  }

  selectStep(index: number): void {
    if (index < 0 || index >= this.steps.length || index > this.step()) {
      return;
    }

    this.step.set(index);
    this.scrollToTop();
  }

  editStep(index: number): void {
    this.step.set(index);
    this.scrollToTop();
  }

  goBack(): void {
    if (this.step() === 0) {
      return;
    }

    this.step.update((step) => step - 1);
    this.scrollToTop();
  }

  goNext(): void {
    const currentStep = this.step();
    this.markStepTouched(currentStep);

    if (!this.stepIsValid(currentStep)) {
      this.validationNotice.set(
        'Complete the highlighted required fields before continuing.',
      );
      return;
    }

    this.validationNotice.set(null);
    this.step.update((step) => Math.min(step + 1, this.steps.length - 1));
    this.queueSave();
    this.scrollToTop();
  }

  retrySave(): void {
    this.saveError.set(null);
    this.queueSave(true);
  }

  async saveAndExit(): Promise<void> {
    if (this.busy() || !this.applicationId()) {
      return;
    }

    this.exiting.set(true);
    await this.flushSave();
    this.exiting.set(false);

    if (this.saveState() === 'error') {
      return;
    }

    await this.router.navigate(['/dashboard']);
  }

  async leaveWizard(): Promise<void> {
    if (!this.applicationId() || this.initError()) {
      await this.router.navigate(['/dashboard']);
      return;
    }

    await this.saveAndExit();
  }

  async submit(): Promise<void> {
    if (this.busy() || !this.applicationId()) {
      return;
    }

    if (this.step() < this.steps.length - 1) {
      this.goNext();
      return;
    }

    this.form.markAllAsTouched();
    this.snapshot.set(this.form.getRawValue());
    this.submitError.set(null);

    if (this.form.invalid) {
      const invalidStep = this.firstInvalidStep();
      this.markStepTouched(invalidStep);
      this.step.set(invalidStep);
      this.validationNotice.set(
        invalidStep === this.steps.length - 1
          ? 'Accept the declaration before submitting your application.'
          : 'Some required details are missing. Review the highlighted fields and try again.',
      );
      this.scrollToTop();
      return;
    }

    const applicationId = this.applicationId();

    if (!applicationId) {
      return;
    }

    this.validationNotice.set(null);
    this.submitting.set(true);
    this.form.disable({ emitEvent: false });

    await this.flushSave();
    this.form.enable({ emitEvent: false });

    if (this.saveState() === 'error') {
      this.submitting.set(false);
      this.submitError.set(
        'Your application could not be saved, so it was not submitted. Retry the save and try again.',
      );
      return;
    }

    try {
      const application = await firstValueFrom(
        this.applications.submitApplication(applicationId),
      );

      await this.router.navigate(['/applications', application.id], {
        queryParams: { submitted: '1' },
      });
    } catch (error) {
      this.submitError.set(
        toErrorMessage(error, 'Unable to submit this application. Please try again.'),
      );
      this.submitting.set(false);
    }
  }

  private startInitialization(): void {
    this.initSubscription?.unsubscribe();
    this.initializing.set(true);
    this.initError.set(null);

    const applicationId = this.id();

    this.initSubscription = (
      applicationId
        ? this.applications.getApplication(applicationId, true)
        : this.applications.createApplication()
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (application) => {
          if (!EDITABLE_STATUSES.includes(application.status)) {
            this.applicationId.set(application.id);
            this.reference.set(application.reference);
            this.initializing.set(false);
            this.initError.set(
              'This application is no longer editable. Open it to view its current status and review history.',
            );
            return;
          }

          this.applyApplication(application);
        },
        error: (error: unknown) => {
          this.initializing.set(false);
          this.initError.set(
            toErrorMessage(
              error,
              'Unable to prepare your application draft. Please try again.',
            ),
          );
        },
      });
  }

  private applyApplication(application: ApplicationDetail): void {
    this.applicationId.set(application.id);
    this.reference.set(application.reference);
    this.form.patchValue(
      {
        business: application.business,
        contact: {
          contactName: application.contactName,
          contactEmail: application.sensitive.contactEmail,
          contactPhone: application.sensitive.contactPhone,
        },
        financial: {
          monthlyVolume:
            application.financial.monthlyVolume > 0
              ? application.financial.monthlyVolume
              : null,
          averageTicket:
            application.financial.averageTicket > 0
              ? application.financial.averageTicket
              : null,
          currency: application.financial.currency,
          taxId: application.sensitive.taxId,
          bankAccountNumber: application.sensitive.bankAccountNumber,
        },
        termsAccepted: application.termsAccepted,
      },
      { emitEvent: false },
    );
    this.form.markAsPristine();
    this.snapshot.set(this.form.getRawValue());
    this.revision = 0;
    this.savedAt.set(application.updatedAt);
    this.saveState.set('saved');
    this.saveError.set(null);
    this.initializing.set(false);
  }

  private markStepTouched(index: number): void {
    if (index === 0) {
      this.form.controls.business.markAllAsTouched();
    }

    if (index === 1) {
      this.form.controls.contact.markAllAsTouched();
      this.form.controls.financial.markAllAsTouched();
    }

    if (index === 2) {
      this.form.controls.termsAccepted.markAsTouched();
    }
  }

  private stepIsValid(index: number): boolean {
    if (index === 0) {
      return this.form.controls.business.valid;
    }

    if (index === 1) {
      return (
        this.form.controls.contact.valid &&
        this.form.controls.financial.valid
      );
    }

    return this.form.valid;
  }

  private firstInvalidStep(): number {
    if (!this.stepIsValid(0)) {
      return 0;
    }

    if (!this.stepIsValid(1)) {
      return 1;
    }

    return 2;
  }

  private queueSave(force = false): void {
    if (!this.applicationId() || (this.submitting() && !force)) {
      return;
    }

    if (this.saveQueued) {
      return;
    }

    this.saveQueued = true;
    this.saveChain = this.saveChain.then(() => this.persistLatest());
  }

  private async persistLatest(): Promise<void> {
    const applicationId = this.applicationId();

    if (!applicationId || !this.saveQueued) {
      return;
    }

    this.saveQueued = false;
    const revision = this.revision;
    const payload = this.buildPayload();
    this.saveState.set('saving');
    this.saveError.set(null);

    try {
      const result = await firstValueFrom(
        this.applications.saveDraft(applicationId, payload),
      );

      this.savedAt.set(result.savedAt);

      if (this.revision > revision) {
        this.saveState.set('pending');
        this.queueSave();
        return;
      }

      this.saveState.set('saved');
    } catch (error) {
      this.saveQueued = false;
      this.saveState.set('error');
      this.saveError.set(
        toErrorMessage(
          error,
          'Your draft could not be saved. Your entries are still here, so you can retry.',
        ),
      );
    }
  }

  private async flushSave(): Promise<void> {
    if (!this.applicationId()) {
      return;
    }

    this.queueSave(true);
    await this.saveChain;
  }

  private buildPayload(): ApplicationDraftPayload {
    const value = this.form.getRawValue();

    return {
      business: { ...value.business },
      contact: { ...value.contact },
      financial: { ...value.financial },
      termsAccepted: value.termsAccepted,
    };
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
