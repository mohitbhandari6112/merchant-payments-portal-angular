import { CurrencyPipe, DatePipe, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, map, Subscription } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import {
  APPLICATION_SORTS,
  APPLICATION_STATUSES,
  ApplicationSort,
  ApplicationStatus,
  ApplicationSummary,
  DashboardStats,
  EDITABLE_STATUSES,
  REVIEWABLE_STATUSES,
  RISK_LABELS,
  RISK_LEVELS,
  RiskLevel,
  SORT_LABELS,
  STATUS_LABELS,
} from '../../core/models/application.model';
import { ApplicationsService } from '../../core/services/applications.service';
import { PermissionService } from '../../core/services/permission.service';
import { toErrorMessage } from '../../core/utils/http-error';
import {
  AppIconComponent,
  AppIconName,
} from '../../shared/components/app-icon/app-icon.component';
import { RiskBadgeComponent } from '../../shared/components/risk-badge/risk-badge.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

const PAGE_SIZES: readonly number[] = [10, 20, 50];
const DEFAULT_SORT: ApplicationSort = 'updated-desc';

interface DashboardQuery {
  page: number;
  pageSize: number;
  search: string;
  status: ApplicationStatus | '';
  riskLevel: RiskLevel | '';
  sort: ApplicationSort;
}

interface StatCard {
  key: keyof DashboardStats;
  label: string;
  icon: AppIconName;
  tone: string;
}

function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? '', 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function parsePageSize(value: string | null): number {
  const pageSize = Number.parseInt(value ?? '', 10);

  return PAGE_SIZES.includes(pageSize) ? pageSize : 10;
}

function parseStatus(value: string | null): ApplicationStatus | '' {
  return value && (APPLICATION_STATUSES as readonly string[]).includes(value)
    ? (value as ApplicationStatus)
    : '';
}

function parseRiskLevel(value: string | null): RiskLevel | '' {
  return value && (RISK_LEVELS as readonly string[]).includes(value) ? (value as RiskLevel) : '';
}

function parseSort(value: string | null): ApplicationSort {
  return value && (APPLICATION_SORTS as readonly string[]).includes(value)
    ? (value as ApplicationSort)
    : DEFAULT_SORT;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    AppIconComponent,
    StatusBadgeComponent,
    RiskBadgeComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly applications = inject(ApplicationsService);
  private readonly auth = inject(AuthService);
  private readonly initialQuery = this.readInitialQuery();

  readonly permissions = inject(PermissionService);
  readonly currentUser = this.auth.currentUser;
  get statusOptions(): typeof APPLICATION_STATUSES {
    return APPLICATION_STATUSES;
  }
  get statusLabels(): typeof STATUS_LABELS {
    return STATUS_LABELS;
  }
  get riskOptions(): typeof RISK_LEVELS {
    return RISK_LEVELS;
  }
  get riskLabels(): typeof RISK_LABELS {
    return RISK_LABELS;
  }
  get sortOptions(): typeof APPLICATION_SORTS {
    return APPLICATION_SORTS;
  }
  get sortLabels(): typeof SORT_LABELS {
    return SORT_LABELS;
  }
  readonly pageSizes = [...PAGE_SIZES];
  readonly displayedColumns = [
    'application',
    'status',
    'risk',
    'owner',
    'volume',
    'updated',
    'actions',
  ];
  readonly statCards: readonly StatCard[] = [
    { key: 'total', label: 'Total applications', icon: 'assignment', tone: 'total' },
    { key: 'draft', label: 'Drafts', icon: 'edit', tone: 'draft' },
    { key: 'inReview', label: 'In review', icon: 'clock', tone: 'review' },
    { key: 'approved', label: 'Approved', icon: 'check-circle', tone: 'approved' },
    { key: 'changesRequested', label: 'Changes requested', icon: 'refresh', tone: 'changes' },
    { key: 'rejected', label: 'Rejected', icon: 'error', tone: 'rejected' },
  ];

  readonly searchControl = new FormControl(this.initialQuery.search, { nonNullable: true });
  readonly search = signal(this.initialQuery.search);
  readonly status = signal<ApplicationStatus | ''>(this.initialQuery.status);
  readonly riskLevel = signal<RiskLevel | ''>(this.initialQuery.riskLevel);
  readonly sort = signal<ApplicationSort>(this.initialQuery.sort);
  readonly page = signal(this.initialQuery.page);
  readonly pageSize = signal(this.initialQuery.pageSize);

  readonly items = signal<ApplicationSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly stats = signal<DashboardStats | null>(null);
  readonly statsLoading = signal(true);
  readonly statsError = signal<string | null>(null);

  readonly hasFilters = computed(
    () =>
      this.search().length > 0 ||
      this.status() !== '' ||
      this.riskLevel() !== '' ||
      this.sort() !== DEFAULT_SORT,
  );
  readonly workspaceLabel = computed(() => {
    switch (this.permissions.role()) {
      case 'SALES':
        return 'Your merchant applications and drafts';
      case 'REVIEWER':
        return 'Applications assigned to you for review';
      case 'ADMIN':
        return 'Every merchant application in the portal';
      default:
        return 'Merchant applications';
    }
  });
  readonly visibleRange = computed(() => {
    const total = this.total();

    if (total === 0 || this.items().length === 0) {
      return 'No applications to display';
    }

    const start = (this.page() - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.items().length - 1, total);

    return `Showing ${start}–${end} of ${total} applications`;
  });

  private listRequest: Subscription | null = null;
  private statsRequest: Subscription | null = null;

  constructor() {
    this.searchControl.valueChanges
      .pipe(
        map((value) => value.trim()),
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((search) => {
        this.search.set(search);
        this.page.set(1);
        this.syncUrl();
        this.loadApplications();
      });

    this.loadStats();
    this.loadApplications();
  }

  statValue(card: StatCard): number {
    return this.stats()?.[card.key] ?? 0;
  }

  setStatus(status: ApplicationStatus | ''): void {
    if (status === this.status()) {
      return;
    }

    this.status.set(status);
    this.page.set(1);
    this.syncUrl();
    this.loadApplications();
  }

  setRiskLevel(riskLevel: RiskLevel | ''): void {
    if (riskLevel === this.riskLevel()) {
      return;
    }

    this.riskLevel.set(riskLevel);
    this.page.set(1);
    this.syncUrl();
    this.loadApplications();
  }

  setSort(sort: ApplicationSort): void {
    if (sort === this.sort()) {
      return;
    }

    this.sort.set(sort);
    this.page.set(1);
    this.syncUrl();
    this.loadApplications();
  }

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.syncUrl();
    this.loadApplications();
  }

  clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.search.set('');
    this.status.set('');
    this.riskLevel.set('');
    this.sort.set(DEFAULT_SORT);
    this.page.set(1);
    this.syncUrl();
    this.loadApplications();
  }

  refresh(): void {
    this.loadStats();
    this.loadApplications();
  }

  retryApplications(): void {
    this.loadApplications();
  }

  retryStats(): void {
    this.loadStats();
  }

  rowActionLabel(item: ApplicationSummary): string {
    const role = this.permissions.role();

    if (role === 'SALES') {
      return EDITABLE_STATUSES.includes(item.status) ? 'Continue' : 'Open';
    }

    if (role === 'REVIEWER') {
      return REVIEWABLE_STATUSES.includes(item.status) ? 'Review' : 'Open';
    }

    if (role === 'ADMIN') {
      if (EDITABLE_STATUSES.includes(item.status)) {
        return 'Continue';
      }

      return REVIEWABLE_STATUSES.includes(item.status) ? 'Manage' : 'Open';
    }

    return 'Open';
  }

  rowActionIcon(item: ApplicationSummary): AppIconName {
    const role = this.permissions.role();

    if (role === 'SALES' && EDITABLE_STATUSES.includes(item.status)) {
      return 'edit';
    }

    if (role === 'REVIEWER' && REVIEWABLE_STATUSES.includes(item.status)) {
      return 'assignment';
    }

    if (role === 'ADMIN' && EDITABLE_STATUSES.includes(item.status)) {
      return 'edit';
    }

    if (role === 'ADMIN' && REVIEWABLE_STATUSES.includes(item.status)) {
      return 'shield';
    }

    return 'arrow-forward';
  }

  openApplication(item: ApplicationSummary): void {
    const canContinue = EDITABLE_STATUSES.includes(item.status);
    const target =
      canContinue && (this.permissions.role() === 'SALES' || this.permissions.role() === 'ADMIN')
        ? ['/applications', item.id, 'edit']
        : ['/applications', item.id];

    void this.router.navigate(target);
  }

  private loadApplications(): void {
    this.listRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);

    this.listRequest = this.applications
      .getApplications({
        page: this.page(),
        pageSize: this.pageSize(),
        search: this.search(),
        status: this.status(),
        riskLevel: this.riskLevel(),
        sort: this.sort(),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
        },
        error: (error: unknown) => {
          this.error.set(
            toErrorMessage(error, 'Unable to load applications. Please try again.'),
          );
        },
      });
  }

  private loadStats(): void {
    this.statsRequest?.unsubscribe();
    this.statsLoading.set(true);
    this.statsError.set(null);

    this.statsRequest = this.applications
      .getStats()
      .pipe(finalize(() => this.statsLoading.set(false)))
      .subscribe({
        next: (stats) => {
          this.stats.set(stats);
        },
        error: (error: unknown) => {
          this.statsError.set(
            toErrorMessage(error, 'Unable to load application totals. Please try again.'),
          );
        },
      });
  }

  private readInitialQuery(): DashboardQuery {
    const params = this.route.snapshot.queryParamMap;

    return {
      page: parsePage(params.get('page')),
      pageSize: parsePageSize(params.get('pageSize')),
      search: params.get('search')?.trim() ?? '',
      status: parseStatus(params.get('status')),
      riskLevel: parseRiskLevel(params.get('riskLevel')),
      sort: parseSort(params.get('sort')),
    };
  }

  private syncUrl(): void {
    const params = new URLSearchParams();

    if (this.page() > 1) {
      params.set('page', String(this.page()));
    }

    if (this.pageSize() !== 10) {
      params.set('pageSize', String(this.pageSize()));
    }

    if (this.search()) {
      params.set('search', this.search());
    }

    if (this.status()) {
      params.set('status', this.status());
    }

    if (this.riskLevel()) {
      params.set('riskLevel', this.riskLevel());
    }

    if (this.sort() !== DEFAULT_SORT) {
      params.set('sort', this.sort());
    }

    const path = this.router.url.split('?')[0];
    const query = params.toString();

    this.location.replaceState(query ? `${path}?${query}` : path);
  }
}
