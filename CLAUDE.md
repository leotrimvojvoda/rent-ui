# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm start             # Dev server at http://localhost:4200 (requires restart to pick up postcss.config.json changes)
npm start:staging     # Dev server using staging environment
npm run build         # Production build
npm run build:staging # Staging build
npm run watch         # Development build with watch mode

# Linting & formatting
npm run format        # Prettier over all .ts, .html, .js files

# Testing
npm test              # Run all tests via Karma
```

## Architecture

### Package structure

```
src/app/
├── core/
│   ├── guards/         # authGuard, roleGuard — route protection
│   ├── interceptors/   # authInterceptor, errorInterceptor, loadingInterceptor
│   ├── layout/
│   │   ├── component/  # AppLayout shell + topbar, sidebar, menu, footer, breadcrumb
│   │   └── service/    # LayoutService — dark mode, theme mode, sidebar state
│   ├── models/         # auth.model.ts, user.model.ts, notification.model.ts
│   └── services/       # AuthService, JwtService, UserService, ToastService,
│                       # LoadingService, BreadcrumbService, NotificationService,
│                       # ConfirmDialogService, PageTitleStrategy
├── features/
│   ├── auth/           # login, register, access-denied, error pages (outside AppLayout)
│   ├── dashboard/      # home page (inside AppLayout, guard-protected)
│   ├── notifications/  # NotificationBell component (used in topbar)
│   ├── profile/        # edit profile — uses currentUser signal
│   ├── settings/       # theme switcher (light/dark/system) + change-password stub
│   └── notfound/       # 404 page
└── shared/
    └── components/     # EmptyState — reusable "no data" placeholder
```

### Routing

All authenticated pages live as children of the root `AppLayout` route, which is protected by `authGuard`. Auth pages (`/auth/*`) are outside `AppLayout` and use their own full-page layout.

Each route carries a `data.breadcrumb` property used by both the breadcrumb trail and the page title strategy.

```
/                → Dashboard (authGuard)    breadcrumb: 'Home'
/profile         → Profile  (authGuard)    breadcrumb: 'Profile'
/settings        → Settings (authGuard)    breadcrumb: 'Settings'
/auth/login      → Login    (no guard)
/auth/register   → Register (no guard)
/auth/access     → 403 page
/auth/error      → generic error page
/notfound        → 404 page
```

To add a new protected page: create `features/my-feature/`, add the component and route inside the root `AppLayout` children in `app.routes.ts` with a `data: { breadcrumb: 'Page Name' }` property.

### Auth flow

1. `JwtService` stores the raw JWT in `localStorage` under the key `token`.
2. The JWT payload includes `id` (UUID), `sub` (email), and `roles`. Use `jwtService.getAttribute('id')` etc. to read them without a separate API call.
3. `authInterceptor` reads the token and sets the `Authorization: Bearer` header on every outbound request.
4. `AuthService.login()` → `POST /auth/sign-in`; `AuthService.register()` → `POST /users`.
5. `AuthService.currentUser` is a readonly signal populated on login and on app startup via `APP_INITIALIZER`. Use `authService.currentUser()` to read the user from any component.
6. `AuthService.isLoggedIn` is a computed signal derived from `currentUser`.
7. On 401 responses, `errorInterceptor` destroys the token, redirects to login, and shows a toast.

### Role guard

Use `roleGuard` to restrict routes by role. It reads the `roles` array from the JWT and redirects to `/auth/access` if the user lacks the required role.

```ts
import { roleGuard } from './core/guards/role.guard';

{ path: 'admin', loadComponent: () => import('./features/admin/admin'), canActivate: [roleGuard('ADMIN')] }
```

### Toast notifications

`ToastService` wraps PrimeNG's `MessageService`. Use it instead of importing `MessageService` directly:

```ts
toastService.success('Saved', 'Your changes have been saved.');
toastService.error('Failed', 'Something went wrong.');
toastService.info('Note', 'Optional detail text.');
toastService.warn('Warning', 'Check your input.');
```

HTTP errors are automatically surfaced as toasts by `errorInterceptor` (network errors, 401, 403, 404, 500+).

### Confirmation dialogs

`ConfirmDialogService` wraps PrimeNG's `ConfirmationService` with a promise-based API:

```ts
const confirmed = await confirmDialogService.confirm({
    message: 'Delete this item?',
    header: 'Confirm Delete'
});
if (confirmed) { /* proceed */ }
```

### Global loading bar

`LoadingService` tracks in-flight HTTP requests. `loadingInterceptor` increments/decrements a counter automatically. A fixed progress bar at the top of the page shows when any request is active. No component-level wiring needed.

### Breadcrumbs

Driven by route `data.breadcrumb`. `BreadcrumbService` listens to router events and builds the trail. `AppBreadcrumb` renders it above the router outlet inside `AppLayout`.

### Page title

`PageTitleStrategy` reads the deepest `data.breadcrumb` from the route tree and sets the document title to `"{breadcrumb} | {appName}"`. The app name comes from `environment.appName`.

### Notification bell

`NotificationService` provides signals for notification data. `NotificationBell` component in the topbar shows a bell icon with unread badge count and a popover panel. Backend endpoints expected: `GET /notifications`, `PUT /notifications/{id}/read`, `PUT /notifications/read-all`.

### Empty state component

Reusable component for "no data" states:

```html
<app-empty-state
    icon="pi pi-users"
    title="No users found"
    message="Try adjusting your filters."
    actionLabel="Clear Filters"
    (actionClick)="clearFilters()"
/>
```

### Theme / dark mode

`LayoutService` owns all theme state. `ThemeMode` (`'light' | 'dark' | 'system'`) is persisted to `localStorage` under the key `themeMode` and initialized on startup. System mode sets up a `matchMedia('prefers-color-scheme: dark')` listener. Dark mode is toggled by adding/removing the `app-dark` class on `<html>`. Call `layoutService.setThemeMode(mode)` to change it from any component.

### CSS setup (important gotcha)

Tailwind v4 utility classes are generated via PostCSS. Angular 20's esbuild builder only reads **`postcss.config.json`** (JSON, not `.js`). The `@source "../app"` directive in `src/assets/tailwind.css` is required so Tailwind scans Angular templates from `src/app/`. If you add templates outside `src/app/` they will need an additional `@source` directive. Dark-mode variant is `app-dark` (not `dark`), configured in `tailwind.css` as `@custom-variant dark (&:where(.app-dark, .app-dark *))`.

### Adding a new domain service

Follow the `UserService` pattern in `core/services/`:
- Inject `HttpClient`, call `environment.apiUrl` for the base URL.
- Models go in `core/models/` alongside `user.model.ts`.

### Environments

Three environment configurations are available:

| Config | File | `apiUrl` | `appName` |
|--------|------|----------|-----------|
| development | `environment.development.ts` | `http://localhost:8080/api/v1` | MyApp (Dev) |
| staging | `environment.staging.ts` | `https://staging-api.example.com/api/v1` | MyApp (Staging) |
| production | `environment.ts` | `https://api.example.com/api/v1` | MyApp |

All environment files implement the `Environment` interface from `environment.interface.ts`. The `appName` field is used by `PageTitleStrategy` for the browser tab title.

### Backend contract

Expects a Spring Boot backend at the URL configured in the active environment. Key endpoints:

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/sign-in` | public |
| POST | `/users` | public (register) |
| GET | `/users/{id}` | bearer |
| PUT | `/users/{id}` | bearer |
| GET | `/notifications` | bearer |
| PUT | `/notifications/{id}/read` | bearer |
| PUT | `/notifications/read-all` | bearer |
