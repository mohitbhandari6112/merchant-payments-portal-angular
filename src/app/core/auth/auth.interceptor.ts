import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';

const AUTH_RETRY = new HttpContextToken(() => false);

function isAuthEndpoint(url: string): boolean {
  const path = new URL(url, 'http://mock.local').pathname;

  return path === '/api/auth/login' || path === '/api/auth/refresh';
}

function redirectToLogin(router: Router): void {
  const currentUrl = router.url;

  if (currentUrl.startsWith('/login')) {
    return;
  }

  void router.navigate(['/login'], {
    queryParams: currentUrl && currentUrl !== '/' ? { returnUrl: currentUrl } : {},
  });
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (isAuthEndpoint(request.url)) {
    return next(request);
  }

  const accessToken = auth.session()?.accessToken;
  const authorizedRequest = accessToken
    ? request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;

      if (!isUnauthorized || request.context.get(AUTH_RETRY)) {
        return throwError(() => error);
      }

      if (!auth.isAuthenticated()) {
        auth.clearSession();
        redirectToLogin(router);
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap((session) => {
          const retriedRequest = request.clone({
            setHeaders: { Authorization: `Bearer ${session.accessToken}` },
            context: request.context.set(AUTH_RETRY, true),
          });

          return next(retriedRequest);
        }),
        catchError((refreshError: unknown) => {
          redirectToLogin(router);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
