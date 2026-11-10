import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { RISK_LABELS, RiskLevel } from '../../../core/models/application.model';

@Component({
  selector: 'app-risk-badge',
  template: `
    <span [class]="'risk-' + riskLevel().toLowerCase()">
      <span class="dot" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    span {
      display: inline-flex;
      gap: 0.35rem;
      align-items: center;
      border-radius: 999px;
      padding: 0.24rem 0.55rem;
      font-size: 0.68rem;
      font-weight: 700;
      line-height: 1.35;
      white-space: nowrap;
    }

    .dot {
      width: 0.38rem;
      height: 0.38rem;
      border-radius: 50%;
      background: currentColor;
    }

    .risk-low {
      background: #e5f5ec;
      color: #12633f;
    }

    .risk-medium {
      background: #fff5df;
      color: #8a5a04;
    }

    .risk-high {
      background: #fdeaea;
      color: #a32626;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskBadgeComponent {
  readonly riskLevel = input.required<RiskLevel>();

  readonly label = computed(() => RISK_LABELS[this.riskLevel()]);
}
