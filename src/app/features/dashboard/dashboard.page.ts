import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ROLE_LABELS } from '../../core/models/user.model';
import { PermissionService } from '../../core/services/permission.service';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [MatButtonModule, MatCardModule, RouterLink, AppIconComponent],
  template: `
    <section class="app-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">Operations overview</p>
          <h1 class="page-title">Merchant applications</h1>
          <p class="page-subtitle">
            Welcome back, {{ currentUser()?.name }}. This is the {{ roleLabel() }} workspace.
          </p>
        </div>

        @if (permissions.canCreateApplication()) {
          <a mat-flat-button color="primary" routerLink="/applications/new">
            <app-icon name="add" [size]="18" />
            New application
          </a>
        }
      </div>

      <mat-card appearance="outlined" class="placeholder-card">
        <mat-card-content>
          <span class="placeholder-icon">
            <app-icon name="dashboard" [size]="26" />
          </span>
          <h2>Dashboard foundation is ready</h2>
          <p>
            The next checkpoint adds server-side pagination, status and risk filters,
            search, loading skeletons, retry handling, and permission-aware row actions.
          </p>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: `
    .page-heading {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .page-heading a {
      gap: 0.4rem;
    }

    .placeholder-card {
      border-radius: var(--app-radius-lg);
    }

    .placeholder-card mat-card-content {
      display: grid;
      justify-items: start;
      max-width: 42rem;
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
      margin: 0 0 0.6rem;
      font-size: 1.15rem;
    }

    p {
      margin: 0;
      color: var(--app-muted);
      line-height: 1.65;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly auth = inject(AuthService);

  readonly permissions = inject(PermissionService);
  readonly currentUser = this.auth.currentUser;
  readonly roleLabel = computed(() => {
    const user = this.currentUser();

    return user ? ROLE_LABELS[user.role] : '';
  });
}
