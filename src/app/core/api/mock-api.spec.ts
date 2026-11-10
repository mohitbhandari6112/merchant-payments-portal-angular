import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { authInterceptor } from '../auth/auth.interceptor';
import { AuthService } from '../auth/auth.service';
import { ApplicationQuery } from '../models/application.model';
import { ApplicationsService } from '../services/applications.service';
import { mockApiInterceptor } from './mock-api.interceptor';
import { createMockToken } from './mock-token';

const SESSION_STORAGE_KEY = 'merchant-portal.session.v1';
const QUERY: ApplicationQuery = {
  page: 1,
  pageSize: 10,
  search: '',
  status: '',
  riskLevel: '',
  sort: 'updated-desc',
};

function configureApi(): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor, mockApiInterceptor])),
    ],
  });
}

describe('mock API authentication flow', () => {
  beforeEach(() => {
    localStorage.clear();
    configureApi();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('signs a sales user in and scopes the application list to their records', async () => {
    const auth = TestBed.inject(AuthService);
    const applications = TestBed.inject(ApplicationsService);

    const session = await firstValueFrom(
      auth.login({ email: 'sales@merchant.test', password: 'demo1234' }),
    );
    const page = await firstValueFrom(applications.getApplications(QUERY));

    expect(session.user.role).toBe('SALES');
    expect(auth.isAuthenticated()).toBe(true);
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((item) => item.ownerName === 'Maya Shrestha')).toBe(true);
  });

  it('shares one refresh request between concurrent callers', async () => {
    const auth = TestBed.inject(AuthService);

    await firstValueFrom(auth.login({ email: 'admin@merchant.test', password: 'demo1234' }));

    const [first, second] = await Promise.all([
      firstValueFrom(auth.refresh()),
      firstValueFrom(auth.refresh()),
    ]);

    expect(first.accessToken).toBe(second.accessToken);
    expect(first.user.role).toBe('ADMIN');
  });

  it('refreshes an expired access token and retries the failed request once', async () => {
    const now = Date.now();
    const expiredSession = {
      user: {
        id: 'user-sales-1',
        name: 'Maya Shrestha',
        email: 'sales@merchant.test',
        role: 'SALES',
      },
      accessToken: createMockToken('access', 'user-sales-1', now - 60_000),
      refreshToken: createMockToken('refresh', 'user-sales-1', now + 60_000),
      expiresIn: 900,
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(expiredSession));

    const auth = TestBed.inject(AuthService);
    const applications = TestBed.inject(ApplicationsService);

    expect(auth.isAuthenticated()).toBe(true);

    const page = await firstValueFrom(applications.getApplications(QUERY));
    const refreshedSession = auth.session();

    expect(page.total).toBeGreaterThan(0);
    expect(refreshedSession?.accessToken).not.toBe(expiredSession.accessToken);
    expect(refreshedSession?.user.id).toBe('user-sales-1');
  });
});
