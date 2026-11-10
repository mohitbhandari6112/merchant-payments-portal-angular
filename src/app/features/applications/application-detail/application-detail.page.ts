import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

import {
  ApplicationDetail,
  BUSINESS_TYPE_LABELS,
  EDITABLE_STATUSES,
  REVIEW_DECISIONS,
  REVIEW_DECISION_LABELS,
  REVIEWABLE_STATUSES,
  ReviewDecision,
  RISK_ACTION_LABELS,
  RISK_LABELS,
  RISK_LEVELS,
  RiskLevel,
} from '../../../core/models/application.model';
import { ReviewerOption } from '../../../core/models/user.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { PermissionService } from '../../../core/services/permission.service';
import { controlError } from '../../../core/utils/form-error';
import { toErrorMessage } from '../../../core/utils/http-error';
import { trimmedRequired } from '../../../core/utils/validators';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { RiskBadgeComponent } from '../../../shared/components/risk-badge/risk-badge.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

interface RefreshOptions {
  resetReview?: boolean;
  resetAssign?: boolean;
}

@Component({
  selector: 'app-application-detail-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    AppIconComponent,
    RiskBadgeComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './application-detail.page.html',
  styleUrl: './application-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly applications = inject(ApplicationsService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly permissions = inject(PermissionService);
  readonly id = input.required<string>();

  readonly businessTypeLabels = BUSINESS_TYPE_LABELS;
  readonly riskLabels = RISK_LABELS;
  readonly riskOptions = RISK_LEVELS;
  readonly decisionOptions = REVIEW_DECISIONS;
  readonly decisionLabels = REVIEW_DECISION_LABELS;
  readonly actionLabels = RISK_ACTION_LABELS;

  readonly reviewForm = this.formBuilder.group({
    decision: this.formBuilder.control<ReviewDecision | ''>('', Validators.required),
    riskLevel: this.formBuilder.control<RiskLevel>('LOW', Validators.required),
    notes: [
      '',
      [trimmedRequired, Validators.minLength(10), Validators.maxLength(1000)],
    ],
  });
  readonly assignForm = this.formBuilder.group({
    reviewerId: ['', Validators.required],
  });

  readonly application = signal<ApplicationDetail | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly refreshing = signal(false);
  readonly revealing = signal(false);
  readonly reviewing = signal(false);
  readonly assigning = signal(false);
  readonly revealed = signal(false);
  readonly notice = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly submittedNotice = signal(false);
  readonly reviewers = signal<ReviewerOption[]>([]);
  readonly reviewersLoading = signal(false);
  readonly reviewersError = signal<string | null>(null);

  readonly actionBusy = computed(
    () =>
      this.refreshing() ||
      this.revealing() ||
      this.reviewing() ||
      this.assigning(),
  );
  readonly canEdit = computed(() => {
    const application = this.application();

    return (
      !!application &&
      this.permissions.canEditApplication(application) &&
      EDITABLE_STATUSES.includes(application.status)
    );
  });
  readonly canReview = computed(() => {
    const application = this.application();

    return (
      !!application &&
      this.permissions.canReviewApplication(application) &&
      REVIEWABLE_STATUSES.includes(application.status)
    );
  });
  readonly canAssign = computed(() => {
    const application = this.application();

    if (!application || !this.permissions.canAssignReviewers()) {
      return false;
    }

    return (
      application.status !== 'DRAFT' &&
      application.status !== 'APPROVED' &&
      application.status !== 'REJECTED'
    );
  });
  readonly canReveal = computed(() => {
    const application = this.application();

    return !!application && this.permissions.canRevealSensitive(application);
  });
  readonly sensitiveActionLabel = computed(() =>
    this.revealed() ? 'Hide sensitive details' : 'Reveal sensitive details',
  );
  readonly riskPercent = computed(() => {
    const application = this.application();

    return application ? Math.min(100, Math.max(0, application.riskScore)) : 0;
  });
  readonly timeline = computed(() => {
    const application = this.application();

    return application ? [...application.riskHistory].reverse() : [];
  });

  private detailRequest: Subscription | null = null;
  private reviewersRequest: Subscription | null = null;

  constructor() {
    effect(() => {
      this.submittedNotice.set(
        this.route.snapshot.queryParamMap.get('submitted') === '1',
      );

      const request = this.loadInitial(this.id());

      return () => request.unsubscribe();
    });
  }

  retry(): void {
    this.loadInitial(this.id());
  }

  refresh(): void {
    this.refreshAfterAction(null);
  }

  retryReviewers(): void {
    this.loadReviewers();
  }

  toggleSensitive(): void {
    const application = this.application();

    if (!application || this.revealing()) {
      return;
    }

    const reveal = !this.revealed();
    this.detailRequest?.unsubscribe();
    this.revealing.set(true);
    this.actionError.set(null);
    this.notice.set(null);

    this.detailRequest = this.applications
      .getApplication(application.id, reveal)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.revealing.set(false)),
      )
      .subscribe({
        next: (detail) => {
          this.application.set(detail);
          this.revealed.set(reveal);
          this.notice.set(
            reveal
              ? 'Sensitive details are now visible for this session.'
              : 'Sensitive details are masked again.',
          );
        },
        error: (error: unknown) => {
          this.actionError.set(
            toErrorMessage(
              error,
              'Unable to change the visibility of sensitive details.',
            ),
          );
        },
      });
  }

  submitReview(): void {
    const application = this.application();

    if (!application || !this.canReview() || this.reviewing()) {
      return;
    }

    this.reviewForm.markAllAsTouched();

    if (this.reviewForm.invalid) {
      return;
    }

    const value = this.reviewForm.getRawValue();
    const decision = value.decision;

    if (!decision) {
      return;
    }

    this.reviewing.set(true);
    this.actionError.set(null);
    this.notice.set(null);

    this.applications
      .reviewApplication(application.id, {
        decision,
        riskLevel: value.riskLevel,
        notes: value.notes.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.reviewing.set(false)))
      .subscribe({
        next: () => {
          this.refreshAfterAction(this.reviewMessage(decision), {
            resetReview: true,
          });
        },
        error: (error: unknown) => {
          this.actionError.set(
            toErrorMessage(error, 'Unable to record this review decision.'),
          );
        },
      });
  }

  submitAssignment(): void {
    const application = this.application();

    if (!application || !this.canAssign() || this.assigning()) {
      return;
    }

    this.assignForm.markAllAsTouched();

    if (this.assignForm.invalid) {
      return;
    }

    const reviewerId = this.assignForm.controls.reviewerId.value;
    const reviewer = this.reviewers().find((option) => option.id === reviewerId);

    this.assigning.set(true);
    this.actionError.set(null);
    this.notice.set(null);

    this.applications
      .assignApplication(application.id, { reviewerId })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.assigning.set(false)))
      .subscribe({
        next: () => {
          this.refreshAfterAction(
            `${reviewer?.name ?? 'Reviewer'} is now assigned to this application.`,
            { resetAssign: true },
          );
        },
        error: (error: unknown) => {
          this.actionError.set(
            toErrorMessage(error, 'Unable to assign this reviewer.'),
          );
        },
      });
  }

  error(control: AbstractControl | null): string | null {
    return controlError(control);
  }

  dismissNotice(): void {
    this.notice.set(null);
  }

  dismissActionError(): void {
    this.actionError.set(null);
  }

  dismissSubmittedNotice(): void {
    this.submittedNotice.set(false);
  }

  private loadInitial(applicationId: string): Subscription {
    this.detailRequest?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(null);
    this.actionError.set(null);
    this.notice.set(null);
    this.application.set(null);
    this.revealed.set(false);

    this.detailRequest = this.applications
      .getApplication(applicationId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (application) => {
          this.application.set(application);
          this.syncForms(application);

          if (this.permissions.canAssignReviewers()) {
            this.loadReviewers();
          }
        },
        error: (error: unknown) => {
          this.loadError.set(
            toErrorMessage(error, 'Unable to load this application. Please try again.'),
          );
        },
      });

    return this.detailRequest;
  }

  private refreshAfterAction(
    message: string | null,
    options: RefreshOptions = {},
  ): void {
    const application = this.application();

    if (!application || this.refreshing()) {
      return;
    }

    this.detailRequest?.unsubscribe();
    this.refreshing.set(true);
    this.actionError.set(null);
    this.notice.set(message);

    this.detailRequest = this.applications
      .getApplication(application.id, this.revealed())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.refreshing.set(false)),
      )
      .subscribe({
        next: (detail) => {
          this.application.set(detail);

          if (options.resetReview) {
            this.syncReviewForm(detail);
          }

          if (options.resetAssign) {
            this.syncAssignForm(detail);
          }

          if (this.permissions.canAssignReviewers()) {
            this.loadReviewers();
          }
        },
        error: (error: unknown) => {
          this.actionError.set(
            toErrorMessage(error, 'Unable to refresh this application.'),
          );
        },
      });
  }

  private loadReviewers(): void {
    this.reviewersRequest?.unsubscribe();
    this.reviewersLoading.set(true);
    this.reviewersError.set(null);

    this.reviewersRequest = this.applications
      .getReviewers()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.reviewersLoading.set(false)),
      )
      .subscribe({
        next: (reviewers) => {
          this.reviewers.set(reviewers);
        },
        error: (error: unknown) => {
          this.reviewersError.set(
            toErrorMessage(error, 'Unable to load the reviewer list.'),
          );
        },
      });
  }

  private syncForms(application: ApplicationDetail): void {
    this.syncReviewForm(application);
    this.syncAssignForm(application);
  }

  private syncReviewForm(application: ApplicationDetail): void {
    this.reviewForm.reset({
      decision: '',
      riskLevel: application.riskLevel,
      notes: '',
    });
  }

  private syncAssignForm(application: ApplicationDetail): void {
    this.assignForm.reset({
      reviewerId: application.assigneeId ?? '',
    });
  }

  private reviewMessage(decision: ReviewDecision): string {
    switch (decision) {
      case 'APPROVED':
        return 'Application approved. The decision has been added to the risk history.';
      case 'REJECTED':
        return 'Application rejected. The decision has been added to the risk history.';
      case 'CHANGES_REQUESTED':
        return 'Changes requested. The merchant can now update and resubmit the application.';
    }
  }
}
