import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ApplicationStatus, STATUS_LABELS } from '../../../core/models/application.model';

@Component({
  selector: 'app-status-badge',
  template: `<span [class]="badgeClass()">{{ label() }}</span>`,
  styles: `
    :host {
      display: inline-flex;
    }

    span {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 0.24rem 0.55rem;
      font-size: 0.68rem;
      font-weight: 700;
      line-height: 1.35;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .status-draft {
      background: #eef2f6;
      color: #536475;
    }

    .status-submitted {
      background: #e8f1fb;
      color: #1f6098;
    }

    .status-under_review {
      background: #fff5df;
      color: #8a5a04;
    }

    .status-changes_requested {
      background: #fff0e3;
      color: #9a4f09;
    }

    .status-approved {
      background: #e5f5ec;
      color: #12633f;
    }

    .status-rejected {
      background: #fdeaea;
      color: #a32626;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly status = input.required<ApplicationStatus>();

  readonly label = computed(() => STATUS_LABELS[this.status()]);
  readonly badgeClass = computed(() => `status-${this.status().toLowerCase()}`);
}
