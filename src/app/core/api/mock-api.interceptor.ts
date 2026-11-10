import { HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MockApiService } from './mock-api.service';

function isMockApiRequest(url: string): boolean {
  const path = new URL(url, 'http://mock.local').pathname;

  return path === '/api' || path.startsWith('/api/');
}

export const mockApiInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next,
): Observable<HttpEvent<unknown>> => {
  if (!isMockApiRequest(request.url)) {
    return next(request);
  }

  return inject(MockApiService).handle(request);
};
