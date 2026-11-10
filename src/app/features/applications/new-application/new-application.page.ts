import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-new-application-page',
  imports: [MatButtonModule, MatCardModule, RouterLink, AppIconComponent],
  template: `
    <section class="app-page">
      <p class="eyebrow">Merchant onboarding</p>
      <h1 class="page-title">New application</h1>
      <p class="page-subtitle">
        The guided application form will be added in the next checkpoint.
      </p>

      <mat-card appearance="outlined" class="placeholder-card">
        <mat-card-content>
          <span class="placeholder-icon">
            <app-icon name="assignment" [size]="26" />
          </span>
          <h2>Three-step wizard, built for recovery</h2>
          <div class="step-list">
            <div>
              <span>1</span>
              <p><strong>Business details</strong> legal name, registration, and address</p>
            </div>
            <div>
              <span>2</span>
              <p><strong>Contact and finances</strong> ownership contact, volume, and settlement</p>
            </div>
            <div>
              <span>3</span>
              <p><strong>Review and submit</strong> validation summary and terms acceptance</p>
            </div>
          </div>
          <p class="note">
            Drafts will autosave with debounce, preserve form state when saving fails, and
            restore when you return.
          </p>
          <a mat-stroked-button routerLink="/dashboard">
            <app-icon name="arrow-back" [size]="17" />
            Back to dashboard
          </a>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: `
    .placeholder-card {
      margin-top: 1.5rem;
      border-radius: var(--app-radius-lg);
    }

    .placeholder-card mat-card-content {
      max-width: 46rem;
      padding: 2rem;
    }

    .placeholder-icon {
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
      margin: 0 0 1rem;
      font-size: 1.15rem;
    }

    .step-list {
      display: grid;
      gap: 0.8rem;
      margin-bottom: 1.25rem;
    }

    .step-list div {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .step-list span {
      display: grid;
      flex: 0 0 auto;
      place-items: center;
      width: 1.6rem;
      height: 1.6rem;
      border-radius: 50%;
      background: color-mix(in srgb, var(--app-primary) 12%, transparent);
      color: var(--app-primary);
      font-size: 0.75rem;
      font-weight: 700;
    }

    .step-list p,
    .note {
      margin: 0;
      color: var(--app-muted);
      line-height: 1.6;
    }

    .step-list strong {
      color: var(--app-text);
    }

    .note {
      margin-bottom: 1.25rem;
      border-left: 3px solid var(--app-accent);
      padding-left: 0.85rem;
      font-size: 0.85rem;
    }

    a {
      gap: 0.4rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewApplicationPage {}
