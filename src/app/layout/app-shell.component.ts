import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { ROLE_LABELS } from '../core/models/user.model';
import { PermissionService } from '../core/services/permission.service';
import {
  AppIconComponent,
  AppIconName,
} from '../shared/components/app-icon/app-icon.component';

interface NavigationItem {
  label: string;
  path: string;
  icon: AppIconName;
  description: string;
}

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatDividerModule,
    MatMenuModule,
    AppIconComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly permissions = inject(PermissionService);
  private readonly router = inject(Router);

  readonly currentUser = this.auth.currentUser;
  readonly menuOpen = signal(false);
  readonly roleLabel = computed(() => {
    const user = this.currentUser();

    return user ? ROLE_LABELS[user.role] : '';
  });
  readonly initials = computed(() => {
    const name = this.currentUser()?.name ?? '';

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });
  readonly navigation = computed<NavigationItem[]>(() => {
    const items: NavigationItem[] = [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: 'dashboard',
        description: 'Browse merchant applications',
      },
    ];

    if (this.permissions.canCreateApplication()) {
      items.push({
        label: 'New application',
        path: '/applications/new',
        icon: 'add',
        description: 'Start a merchant onboarding draft',
      });
    }

    return items;
  });

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.closeMenu();
    this.auth.logout();
  }

  goHome(): void {
    this.closeMenu();
    void this.router.navigate(['/dashboard']);
  }
}
