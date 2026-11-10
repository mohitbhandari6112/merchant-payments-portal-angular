import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

import { ApplicationDetail } from '../../../core/models/application.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { toErrorMessage } from '../../../core/utils/http-error';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { RiskBadgeComponent } from '../../../shared/components/risk-badge/risk-badge.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-application-detail-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    AppIconComponent,
    RiskBadgeComponent,
    StatusBadgeComponent,
  ],
  template: `
    <section class="app-page detail-page">
      <a mat-button routerLink="/dashboard" class="back-link">
        <app-icon name="arrow-back" [size]="17" />
        Back to applications
      </a>

      @if (loading()) {
        <div class="detail-loading" aria-busy="true">
          <mat-progress-bar mode="indeterminate" aria-label="Loading application" />
          <p>Loading application…</p>
        </div>
      } @else if (error()) {
        <mat-card appearance="outlined" class="detail-card error-card">
          <mat-card-content>
            <app-icon name="error" [size]="26" />
            <h1>Unable to load this application</h1>
            <p>{{ error() }}</p>
            <div class="error-actions">
              <button mat-flat-button color="primary" type="button" (click)="retry()">
                <app-icon name="refresh" [size]="17" />
                Retry
              </button>
              <a mat-stroked-button routerLink="/dashboard">Back to dashboard</a>
            </div>
          </mat-card-content>
        </mat-card>
      } @else if (application(); as application) {
        <header class="detail-heading">
          <div>
            <p class="eyebrow">{{ application.reference }}</p>
            <h1 class="page-title">{{ application.business.businessName }}</h1>
            <p class="page-subtitle">
              {{ application.business.city }}, {{ application.business.country }} · Owner:
              {{ application.ownerName }}
            </p>
          </div>

          <div class="detail-badges">
            <app-status-badge [status]="application.status" />
            <app-risk-badge [riskLevel]="application.riskLevel" />
          </div>
        </header>

        <mat-card appearance="outlined" class="detail-card">
          <mat-card-content>
            <span class="stub-icon">
              <app-icon name="assignment" [size]="26" />
            </span>
            <h2>Full detail view is the next checkpoint</h2>
            <p class="stub-copy">
              Risk history, reviewer controls, sensitive-data reveal, and administrator
              assignment tools will be added here next.
            </p>

            <dl class="detail-summary">
              <div>
                <dt>Owner</dt>
                <dd>{{ application.ownerName }}</dd>
              </div>
              <div>
                <dt>Reviewer</dt>
                <dd>{{ application.assigneeName ?? 'Unassigned' }}</dd>
              </div>
              <div>
                <dt>Monthly volume</dt>
                <dd>
                  {{
                    application.financial.monthlyVolume
                      | currency: application.financial.currency : 'code' : '1.0-0'
                  }}
                </dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{{ application.updatedAt | date: 'MMM d, y, h:mm a' }}</dd>
              </div>
            </dl>
          </mat-card-content>
        </mat-card>
      }
    </section>
  `,
  styles: `
    .detail-page {
      padding-bottom: 2.5rem;
    }

    .back-link {
      gap: 0.35rem;
      margin: 0 0 0.5rem -0.6rem;
      color: var(--app-muted);
    }

    .detail-heading {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 1.4rem;
    }

    .detail-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      padding-top: 0.35rem;
    }

    .detail-card {
      border-radius: var(--app-radius-lg);
    }

    .detail-card mat-card-content {
      max-width: 55rem;
      padding: 2rem;
    }

    .stub-icon {
      display: grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      margin-bottom: 1rem;
      border-radius: 0.8rem;
      background: color-mix(in srgb, var(--app-primary) 10%, transparent);
      color: var(--app-primary);
    }

    h2 {
      margin: 0 0 0.55rem;
      font-size: 1.15rem;
    }

    .stub-copy {
      max-width: 58ch;
      margin: 0 0 1.5rem;
      color: var(--app-muted);
      line-height: 1.65;
    }

    .detail-summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      margin: 0;
      border-top: 1px solid var(--app-border);
      padding-top: 1.4rem;
    }

    .detail-summary div {
      display: grid;
      gap: 0.25rem;
    }

    dt {
      color: var(--app-muted);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    dd {
      margin: 0;
      font-size: 0.87rem;
      font-weight: 600;
    }

    .detail-loading {
      display: grid;
      gap: 0.9rem;
      margin-top: 1rem;
    }

    .detail-loading p {
      margin: 0;
      color: var(--app-muted);
      font-size: 0.85rem;
    }

    .error-card mat-card-content {
      display: grid;
      justify-items: start;
      color: var(--app-danger);
    }

    .error-card h1 {
      margin: 0.75rem 0 0.4rem;
      font-size: 1.25rem;
    }

    .error-card p {
      margin: 0 0 1.2rem;
      color: var(--app-muted);
    }

    .error-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
    }

    .error-actions a,
    .error-actions button {
      gap: 0.35rem;
    }

    @media (max-width: 640px) {
      .detail-card mat-card-content {
        padding: 1.25rem;
      }

      .detail-summary {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationDetailPage {
  private readonly applications = inject(ApplicationsService);

  readonly id = input.required<string>();
  readonly application = signal<ApplicationDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const subscription = this.load(this.id());

      return () => subscription.unsubscribe();
    });
  }

  retry(): void {
    this.load(this.id());
  }

  private load(applicationId: string): Subscription {
    this.loading.set(true);
    this.error.set(null);
    this.application.set(null);

    return this.applications
      .getApplication(applicationId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (application) => {
          this.application.set(application);
        },
        error: (error: unknown) => {
          this.error.set(
            toErrorMessage(error, 'Unable to load this application. Please try again.'),
          );
        },
      });
  }
}
