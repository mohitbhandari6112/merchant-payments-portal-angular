# Merchant Payments Portal

A production-oriented merchant onboarding and review portal built with Angular 20. The application covers the full merchant application lifecycle: role-based sign-in, a server-paginated dashboard, a three-step application wizard with debounced draft autosave, a detailed review workspace with risk history, reviewer assignment, and API-level sensitive-field masking.

## Stack

- Angular 20.3 with standalone components and built-in `@if` / `@for` control flow.
- Angular Signals and `inject()` for state and dependency wiring.
- RxJS for search debouncing, autosave queues, HTTP refresh coordination, and async loading states.
- Reactive Forms with custom synchronous and cross-field validators.
- Angular Material 20 and SCSS responsive layouts. Bootstrap is not used.
- Angular Router with lazy `loadComponent()` routes and `CanActivateFn` guards.
- Vitest 3 and Angular TestBed through `@angular/build:unit-test`.
- In-browser mock API implemented as an HTTP interceptor with seeded, fictional data.

## Requirements

- Node.js 20.19+, 22.12+, or 24.x.
- npm 10+.

Verified locally with Node.js 24.12.0, npm 10.9.0, Angular 20.3.2, and Vitest 3.2.7.

## Getting started

```bash
npm install
npm start
```

Open `http://localhost:4200`.

### Available scripts

```bash
npm start              # Development server on port 4200
npm run build          # Production build with budgets and hashing
npm test -- --watch=false  # Headless Vitest suite
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Coverage report
```

## Demo accounts

All demo accounts use the password `demo1234`. Every seeded record is fictional and uses reserved `.test` domains.

| Role | Email | Scope |
| --- | --- | --- |
| SALES | `sales@merchant.test` | Maya Shrestha's applications and drafts |
| SALES | `sales2@merchant.test` | Daniel Okafor's applications and drafts |
| REVIEWER | `reviewer@merchant.test` | Applications assigned to Ravi Karki |
| REVIEWER | `reviewer2@merchant.test` | Applications assigned to Elena Rossi |
| ADMIN | `admin@merchant.test` | Every application and reviewer assignment |

The sign-in page exposes the three primary accounts as one-click demo buttons. The second sales and reviewer accounts are available for multi-user verification.

## Feature walkthrough

### 1. Authentication and session handling

- Sign in with a demo account or the demo-account buttons.
- The access token lives for 15 minutes; the refresh token lives for 7 days.
- Every API request receives an `Authorization: Bearer <token>` header from `authInterceptor`.
- When one or more requests receive `401 Unauthorized`, the interceptor refreshes the session once and retries the original request once.
- Concurrent `401` responses share a single `POST /api/auth/refresh` request through `AuthService.refresh()` and RxJS `shareReplay`.
- A failed refresh clears the session and redirects to `/login` with a safe `returnUrl`.
- Sessions survive a page reload through `localStorage`; expired refresh tokens are discarded at startup.

### 2. Dashboard

- The table is server-side paginated and sorted. The mock API performs filtering, sorting, and slicing.
- Search is debounced by 350 ms and combines with status, risk, and sort filters.
- Query state is written to the URL so filtered views can be bookmarked or shared.
- Loading skeletons, background-refresh indicators, an error banner with retry, and an empty state are all handled.
- Status-count cards are loaded from `/api/applications/stats` and scoped to the signed-in user.
- Row actions are permission-aware:
  - SALES can continue editable drafts or open submitted records.
  - REVIEWERS can review assigned applications.
  - ADMIN can continue editable records, manage reviews, and assign reviewers.

### 3. New application wizard

- Three steps: business details, contact and settlement profile, then review and submit.
- Validation includes required fields, trimmed values, email, phone, registration number, tax ID, bank account, postal code, website, numeric ranges, a cross-field average-ticket rule, and required terms acceptance.
- Every field error is rendered inline only after the field is touched or dirty.
- Drafts are created on entry with `POST /api/applications`.
- Form changes are debounced by 700 ms and saved with `PATCH /api/applications/:id/draft`.
- Saves are serialized. A revision counter prevents an older in-flight save from marking newer edits as saved.
- Save states are visible: saved at a time, unsaved changes, saving, and failed.
- A failed save preserves every form value and shows a retry action. Submission is blocked until the latest draft saves.
- "Save & exit" and the back action flush pending changes before navigating.
- Editable records open at `/applications/:id/edit`; submitted records show a locked state instead of an editable form.
- Resume loads the unmasked record for authorised owners so masked API values can never overwrite real saved sensitive data.

### 4. Application detail and review

- Sectioned view for business details, contact and settlement, risk history, reviewer notes, audit metadata, and data protection.
- Risk history is shown as a timeline with action, actor, timestamp, and risk level.
- REVIEWER and ADMIN users see the decision form; SALES users never render approval or rejection controls.
- Decisions are `APPROVED`, `REJECTED`, or `CHANGES_REQUESTED` and require a note of at least 10 characters.
- ADMIN users can assign a reviewer. Assigning a submitted application moves it to `UNDER_REVIEW` and records a risk event.
- Reviewer options include the number of open reviews for each reviewer.
- All action errors are recoverable and displayed without discarding the user's input.

### 5. Sensitive data and CSP

- Contact email, contact phone, tax ID, and bank account number are masked by the API by default.
- The detail page shows masked values until an authorised user requests a reveal.
- Reveal is a fresh authenticated request with `?revealSensitive=true`; it is not CSS hiding or client-side string manipulation.
- Reveal authorization is enforced by the mock API. ADMIN can reveal any accessible record; SALES and REVIEWERS can reveal records they own or are assigned to.
- The page explains the protection model to the user.
- `src/index.html` sets a Content-Security-Policy meta tag:
  - `default-src 'self'` blocks third-party script and asset origins.
  - `script-src 'self'` blocks inline and remote scripts.
  - `object-src 'none'` blocks plugin content.
  - `base-uri 'self'` and `form-action 'self'` restrict navigation and form targets.
  - `img-src 'self' data:` permits same-origin images and inline data images only.
  - `font-src 'self' data:` avoids external font hosts.
  - `connect-src 'self' ws: wss:` permits same-origin API calls and the development live-reload socket.
  - `style-src 'self' 'unsafe-inline'` is required by Angular Material's runtime style injection. A production deployment can tighten this with nonces or hashes and should serve CSP as an HTTP header rather than a meta tag.
- Icons are inline SVG components rather than an external icon font, keeping icon rendering compatible with the CSP.

## Architecture

```text
src/app
├── core
│   ├── api              Mock API interceptor, routes, seeded database, tokens
│   ├── auth             Session service, bearer/refresh interceptor, route guards, demo accounts
│   ├── models           Shared API, application, and user types plus display label maps
│   ├── services         Typed API wrapper and role/capability permission service
│   └── utils            Masking, validators, form-error messages, HTTP error mapping
├── features
│   ├── applications
│   │   ├── application-detail   Sectioned detail, reveal, review, assignment, risk timeline
│   │   └── new-application      Three-step wizard, validation, autosave queue, submission
│   ├── auth             Sign-in page with demo account shortcuts
│   ├── dashboard        Stats, filters, server-side table, pagination, row actions
│   └── errors           Not-found page
├── layout               Authenticated shell, navigation, user menu
└── shared               Inline SVG icon, status badge, risk badge
```

### Data flow

1. `AuthService` holds the session in a signal and mirrors it to `localStorage`.
2. `authInterceptor` attaches the bearer token and owns the single-flight refresh/retry flow.
3. `mockApiInterceptor` routes every `/api/*` request to `MockApiService`.
4. `MockApiService` validates the bearer token, resolves the current user, enforces role and record-level authorization, mutates the seeded database, and returns typed JSON responses.
5. Page components call `ApplicationsService`, which provides typed HTTP methods.
6. Page state is held in signals and computed values; RxJS handles asynchronous work and teardown.

### Mock API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Sign in and issue mock access and refresh tokens |
| POST | `/api/auth/refresh` | Rotate the session from a valid refresh token |
| POST | `/api/auth/logout` | Acknowledge sign-out |
| GET | `/api/applications` | Paginated, searched, filtered, sorted application list |
| GET | `/api/applications/stats` | Scoped status counts |
| POST | `/api/applications` | Create a draft |
| GET | `/api/applications/:id` | Application detail, masked unless `revealSensitive=true` is authorised |
| PATCH | `/api/applications/:id/draft` | Save draft fields |
| POST | `/api/applications/:id/submit` | Validate and submit a draft |
| POST | `/api/applications/:id/review` | Record an approval, rejection, or change request |
| PATCH | `/api/applications/:id/assign` | Assign a reviewer as ADMIN |
| GET | `/api/reviewers` | Reviewer options with open review counts |

The mock API adds 260 ms of latency so loading states are observable.

### Local persistence and reset

The mock API stores its database under `merchant-portal.mock-db.v1`; the session is stored under `merchant-portal.session.v1`.

To reset all local demo data, run this in the browser console and reload:

```js
localStorage.removeItem('merchant-portal.mock-db.v1');
localStorage.removeItem('merchant-portal.session.v1');
location.reload();
```

## Roles and permissions

| Capability | SALES | REVIEWER | ADMIN |
| --- | --- | --- | --- |
| View dashboard | Own records | Assigned records | All records |
| Create applications | Yes | No | Yes |
| Edit drafts and changes-requested records | Own records | No | All records |
| Submit applications | Own records | No | All records |
| Record review decisions | No | Assigned records | Yes |
| Assign reviewers | No | No | Yes |
| Reveal sensitive fields | Own records | Assigned records | All records |

Permissions are enforced twice: route guards and permission-aware UI control navigation and rendering, while `MockApiService` independently rejects unauthorised API calls with `403 Forbidden`.

## Security notes

- No real personal, customer, or payment card data is included.
- Demo credentials are intentionally public mock credentials for a local take-home application.
- Tokens are mock tokens containing a signed-shape payload with a subject, kind, expiry, and ID. They are not cryptographic JWTs and are not suitable for production.
- A production implementation should use short-lived access tokens, secure refresh cookies, server-side authorization, rate limiting, audit logging, and CSP delivered as an HTTP response header.
- Sensitive values are masked in the default API response, not merely hidden in the DOM.
- `returnUrl` is restricted to same-origin absolute paths to avoid open redirects.

## Testing

The suite uses Vitest with Angular TestBed.

```bash
npm test -- --watch=false
npm run test:coverage
```

Coverage focuses on the three primary pages plus the existing core shell/API specs:

- Dashboard rendering, scoped workspace labelling, role-aware row actions, server-driven filters/sorting/pagination, error banner with retry, and empty state.
- Wizard draft creation, resume with unmasked values, step validation, debounced autosave, failed-save preservation and retry, submit gating, locked state, and initialization retry.
- Detail page role visibility, sensitive reveal/hide through a fresh API request, review submission, admin reviewer assignment, load-error retry, and the submitted banner.
- Mock API sign-in scoping, single-flight refresh for concurrent callers, and expired-token retry.
- Root app creation and router outlet rendering.

## Manual verification checklist

1. Sign in as SALES and confirm the dashboard only shows Maya's records.
2. Create a new application; confirm the autosave indicator changes to saved.
3. Leave a required field empty and confirm the step will not advance.
4. Reload a draft at `/applications/:id/edit` and confirm the saved values are restored.
5. Submit a valid application and confirm the detail page shows the submitted banner and risk timeline.
6. Sign in as ADMIN, assign the application to a reviewer, and confirm the assignment event.
7. Sign in as that REVIEWER and confirm the decision form is visible.
8. Sign in as SALES and confirm the decision form is not rendered.
9. Toggle sensitive details as an authorised user and confirm masked values are replaced by the API response.
10. Resize below 760 px and confirm the dashboard table, wizard, and detail layout remain usable.

## AI assistance disclosure

AI coding assistance was used during implementation for architecture suggestions, code generation, documentation drafting, and test scaffolding. All generated code was reviewed in the repository, compiled with `npm run build`, exercised with the Vitest suite, and manually checked against the assignment requirements. The candidate remains responsible for the final implementation and for explaining the code during review.

## Known limitations

- The API is an in-browser mock, so data is scoped to the current browser profile and can be reset by clearing `localStorage`.
- Socket.IO real-time updates were intentionally skipped as an optional enhancement.
- File uploads and payment card collection are out of scope and intentionally absent.
- Component style budgets are set to 12 kB warning / 16 kB error to accommodate the richer wizard and detail layouts.
