import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, EMPTY, finalize, Observable, shareReplay, tap, throwError } from 'rxjs';

import { decodeMockToken } from '../api/mock-token';
import { AuthCredentials, AuthSession, User } from '../models/user.model';

const SESSION_STORAGE_KEY = 'merchant-portal.session.v1';

function isSessionUsable(session: AuthSession | null): session is AuthSession {
  if (!session) {
    return false;
  }

  const accessToken = decodeMockToken(session.accessToken);
  const refreshToken = decodeMockToken(session.refreshToken);

  return Boolean(accessToken && refreshToken && refreshToken.exp > Date.now());
}

function readStoredSession(): AuthSession | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    const session = raw ? (JSON.parse(raw) as AuthSession) : null;

    if (!isSessionUsable(session)) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessionState = signal<AuthSession | null>(readStoredSession());
  private refreshRequest: Observable<AuthSession> | null = null;

  readonly session = this.sessionState.asReadonly();
  readonly currentUser = computed<User | null>(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => isSessionUsable(this.sessionState()));

  login(credentials: AuthCredentials): Observable<AuthSession> {
    return this.http
      .post<AuthSession>('/api/auth/login', credentials)
      .pipe(tap((session) => this.setSession(session)));
  }

  refresh(): Observable<AuthSession> {
    const session = this.sessionState();

    if (!session) {
      return throwError(() => new Error('Your session has expired. Please sign in again.'));
    }

    if (this.refreshRequest) {
      return this.refreshRequest;
    }

    this.refreshRequest = this.http
      .post<AuthSession>('/api/auth/refresh', { refreshToken: session.refreshToken })
      .pipe(
        tap((nextSession) => this.setSession(nextSession)),
        catchError((error: unknown) => {
          this.clearSession();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshRequest = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.refreshRequest;
  }

  logout(): void {
    const hadSession = this.sessionState() !== null;

    this.clearSession();

    if (hadSession) {
      this.http
        .post<void>('/api/auth/logout', {})
        .pipe(catchError(() => EMPTY))
        .subscribe();
    }

    void this.router.navigate(['/login']);
  }

  clearSession(): void {
    this.sessionState.set(null);

    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      return;
    }
  }

  private setSession(session: AuthSession): void {
    this.sessionState.set(session);

    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      return;
    }
  }
}
