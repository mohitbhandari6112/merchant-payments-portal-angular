import { computed, inject, Injectable } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { ApplicationDetail } from '../models/application.model';

type AccessControlledApplication = Pick<ApplicationDetail, 'ownerId' | 'assigneeId'>;

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);

  readonly role = computed(() => this.auth.currentUser()?.role ?? null);
  readonly canCreateApplication = computed(
    () => this.role() === 'SALES' || this.role() === 'ADMIN',
  );
  readonly canReviewApplications = computed(
    () => this.role() === 'REVIEWER' || this.role() === 'ADMIN',
  );
  readonly canAssignReviewers = computed(() => this.role() === 'ADMIN');
  readonly canViewAllApplications = computed(() => this.role() === 'ADMIN');

  canRevealSensitive(application: AccessControlledApplication): boolean {
    const user = this.auth.currentUser();

    if (!user) {
      return false;
    }

    if (user.role === 'ADMIN') {
      return true;
    }

    return application.ownerId === user.id || application.assigneeId === user.id;
  }

  canEditApplication(application: AccessControlledApplication): boolean {
    const user = this.auth.currentUser();

    if (!user) {
      return false;
    }

    return user.role === 'ADMIN' || application.ownerId === user.id;
  }

  canReviewApplication(application: AccessControlledApplication): boolean {
    const user = this.auth.currentUser();

    if (!user) {
      return false;
    }

    if (user.role === 'ADMIN') {
      return true;
    }

    return user.role === 'REVIEWER' && application.assigneeId === user.id;
  }
}
