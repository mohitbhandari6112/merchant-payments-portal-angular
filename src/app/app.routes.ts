import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · Merchant Payments Portal',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((module) => module.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell.component').then((module) => module.AppShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        title: 'Applications · Merchant Payments Portal',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((module) => module.DashboardPage),
      },
      {
        path: 'applications/new',
        title: 'New application · Merchant Payments Portal',
        canActivate: [roleGuard(['SALES', 'ADMIN'])],
        loadComponent: () =>
          import('./features/applications/new-application/new-application.page').then(
            (module) => module.NewApplicationPage,
          ),
      },
      {
        path: 'applications/:id/edit',
        title: 'Edit application · Merchant Payments Portal',
        canActivate: [roleGuard(['SALES', 'ADMIN'])],
        loadComponent: () =>
          import('./features/applications/new-application/new-application.page').then(
            (module) => module.NewApplicationPage,
          ),
      },
      {
        path: 'applications/:id',
        title: 'Application · Merchant Payments Portal',
        loadComponent: () =>
          import('./features/applications/application-detail/application-detail.page').then(
            (module) => module.ApplicationDetailPage,
          ),
      },
    ],
  },
  {
    path: '**',
    title: 'Page not found · Merchant Payments Portal',
    loadComponent: () =>
      import('./features/errors/not-found.page').then((module) => module.NotFoundPage),
  },
];
