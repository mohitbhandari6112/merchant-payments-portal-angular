import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-not-found-page',
  imports: [MatButtonModule, RouterLink, AppIconComponent],
  template: `
    <section class="app-page not-found">
      <span class="not-found-code">404</span>
      <span class="not-found-icon">
        <app-icon name="search" [size]="28" />
      </span>
      <h1 class="page-title">Page not found</h1>
      <p class="page-subtitle">
        The page you requested does not exist or may have moved.
      </p>
      <a mat-flat-button color="primary" [routerLink]="auth.isAuthenticated() ? '/dashboard' : '/login'">
        <app-icon name="arrow-back" [size]="17" />
        {{ auth.isAuthenticated() ? 'Back to dashboard' : 'Go to sign in' }}
      </a>
    </section>
  `,
  styles: `
    .not-found {
      display: grid;
      justify-items: center;
      max-width: 34rem;
      padding-block: 4rem;
      text-align: center;
    }

    .not-found-code {
      color: color-mix(in srgb, var(--app-primary) 20%, transparent);
      font-size: clamp(4rem, 16vw, 7rem);
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.06em;
    }

    .not-found-icon {
      display: grid;
      place-items: center;
      width: 3.25rem;
      height: 3.25rem;
      margin: -0.5rem 0 1rem;
      border-radius: 50%;
      background: color-mix(in srgb, var(--app-primary) 10%, transparent);
      color: var(--app-primary);
    }

    .page-subtitle {
      margin-bottom: 1.5rem;
    }

    a {
      gap: 0.4rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  readonly auth = inject(AuthService);
}
