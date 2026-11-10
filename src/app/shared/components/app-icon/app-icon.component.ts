import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AppIconName =
  | 'dashboard'
  | 'add'
  | 'logout'
  | 'menu'
  | 'shield'
  | 'person'
  | 'assignment'
  | 'close'
  | 'search'
  | 'chevron-down'
  | 'eye'
  | 'eye-off'
  | 'check'
  | 'warning'
  | 'clock'
  | 'edit'
  | 'arrow-back'
  | 'arrow-forward'
  | 'lock'
  | 'email'
  | 'phone'
  | 'business'
  | 'filter'
  | 'refresh'
  | 'check-circle'
  | 'error'
  | 'info';

const ICONS: Record<AppIconName, readonly string[]> = {
  dashboard: ['M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z'],
  add: ['M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z'],
  logout: [
    'M10.1 17.1 11.5 18.5 17 13l-5.5-5.5-1.4 1.4 3.1 3.1H3v2h10.2l-3.1 3.1Z',
    'M19 3H5a2 2 0 0 0-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z',
  ],
  menu: ['M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z'],
  shield: [
    'M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm0 18c-3.2-1.1-6-5-6-9V6.3l6-2.2 6 2.2V11c0 4-2.8 7.9-6 9Z',
  ],
  person: [
    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z',
  ],
  assignment: [
    'M19 3h-4.2a3 3 0 0 0-5.6 0H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm7 16H5V5h2v3h10V5h2v14Z',
  ],
  close: [
    'm18.3 5.7-6.3 6.3-6.3-6.3-1.4 1.4 6.3 6.3-6.3 6.3 1.4 1.4 6.3-6.3 6.3 6.3 1.4-1.4-6.3-6.3 6.3-6.3-1.4-1.4Z',
  ],
  search: [
    'M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 13 15.5l.3.3v.8l5 5 1.5-1.5-5-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z',
  ],
  'chevron-down': ['m7.4 8.6 4.6 4.6 4.6-4.6L18 10l-6 6-6-6 1.4-1.4Z'],
  eye: [
    'M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  ],
  'eye-off': [
    'm2.4 3.8 17.8 17.8 1.4-1.4-3.1-3.1c2.2-1.7 3.6-3.8 4-5.1-1-2.5-5-7-10-7-1.5 0-2.9.4-4.1 1L3.8 2.4 2.4 3.8Zm9.6 2.2c4.1 0 7.4 3.2 8.5 5-.5 1.1-1.4 2.4-2.7 3.4l-2-2a5 5 0 0 0-6.2-6.2L8.2 6.5c1.1-.3 2.4-.5 3.8-.5Zm-3 3.5 4.1 4.1a3 3 0 0 1-4.1-4.1ZM12 19c-4.1 0-7.4-3.2-8.5-5 .4-.9 1.1-2 2.1-2.9l1.5 1.5c-.6.6-1.1 1.2-1.5 1.9 1.1 1.8 4.4 5 8.5 5 .7 0 1.4-.1 2-.3l1.7 1.7c-1.1.5-2.4.8-3.8.8Z',
  ],
  check: ['m9 16.2-4.2-4.2-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z'],
  warning: ['M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z'],
  clock: [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm.5-13H11v6l5.2 3.1.8-1.3-4.5-2.7V7Z',
  ],
  edit: [
    'M3 17.3V21h3.7L17.8 9.9l-3.7-3.7L3 17.3ZM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7 1.8-1.8Z',
  ],
  'arrow-back': ['M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2Z'],
  'arrow-forward': ['M4 13h12.2l-5.6 5.6L12 20l8-8-8-8-1.4 1.4 5.6 5.6H4v2Z'],
  lock: [
    'M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2ZM9 6a3 3 0 0 1 6 0v2H9V6Zm9 14H6V10h12v10Z',
  ],
  email: [
    'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z',
  ],
  phone: [
    'M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.58 3.6.58a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.22 2.2Z',
  ],
  business: [
    'M12 7V3H2v18h20V7H12ZM6 19H4v-2h2v2Zm0-4H4v-2h2v2Zm0-4H4V9h2v2Zm0-4H4V5h2v2Zm4 12H8v-2h2v2Zm0-4H8v-2h2v2Zm0-4H8V9h2v2Zm0-4H8V5h2v2Zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10Zm-2-8h-2v2h2v-2Zm0 4h-2v2h2v-2Z',
  ],
  filter: ['M10 18h4v-2h-4v2ZM3 6v2h18V6H3Zm3 7h12v-2H6v2Z'],
  refresh: [
    'M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.3L13 11h7V4l-2.3 2.3Z',
  ],
  'check-circle': [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-2 15-5-5 1.4-1.4L10 14.2l7.6-7.6L19 8l-9 9Z',
  ],
  error: [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z',
  ],
  info: [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z',
  ],
};

@Component({
  selector: 'app-icon',
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      @for (path of paths(); track $index) {
        <path [attr.d]="path" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: 0 0 auto;
      line-height: 0;
    }

    svg {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIconComponent {
  readonly name = input.required<AppIconName>();
  readonly size = input(20);

  protected readonly paths = computed(() => ICONS[this.name()]);
}
