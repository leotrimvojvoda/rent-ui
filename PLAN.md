# Angular Template — Feature Implementation Plan

This document is a step-by-step implementation plan for 10 cross-cutting features to be added to the Angular template. Each feature is self-contained and should be implemented in the order listed, since later features occasionally depend on earlier ones.

The project uses Angular 20 (standalone components, signals, functional guards/interceptors), PrimeNG 20, Tailwind v4, and communicates with a Spring Boot backend at `http://localhost:8080/api/v1`.

---

## Feature 1 — Toast Service + HTTP Error Interceptor

**Goal:** Provide a global toast notification system and automatically surface HTTP errors as toasts so that individual components don't need to handle generic error display.

### 1.1 Toast Service

Create `src/app/core/services/toast.service.ts`.

- Injectable, provided in `root`.
- Wrap PrimeNG's `MessageService` (from `primeng/api`).
- Expose convenience methods: `success(summary, detail?)`, `error(summary, detail?)`, `info(summary, detail?)`, `warn(summary, detail?)`.
- Each method calls `messageService.add(...)` with the appropriate `severity`, a sensible default `life` of 5 000 ms, and a `key` of `'global'`.
- This thin wrapper exists so the rest of the codebase never imports PrimeNG's `MessageService` directly; if the toast library is ever swapped, only this file changes.

### 1.2 HTTP Error Interceptor

Create `src/app/core/interceptors/error.interceptor.ts`.

- Functional `HttpInterceptorFn` (same pattern as the existing `authInterceptor`).
- Pipe the response through `catchError`.
- For `0` (network error): toast "Network error — please check your connection".
- For `403`: toast "You do not have permission to perform this action".
- For `404`: toast "The requested resource was not found".
- For `500+`: toast "Something went wrong on the server".
- **Do not handle `401` here** — that is Feature 2's responsibility.
- After toasting, re-throw the error so callers can still handle it locally if they want.

### 1.3 Wire It Up

- In `app.config.ts`, add `MessageService` to the `providers` array.
- In `app.config.ts`, add `errorInterceptor` to the `withInterceptors([...])` array **after** `authInterceptor`.
- In `app.layout.html`, add a single `<p-toast key="global" />` inside the layout shell so toasts render above everything.
- Also add `<p-toast key="global" />` to `app.component.html` so toasts work on pages outside AppLayout (login, register, etc.).

### 1.4 Refactor Existing Error Handling

- In `profile.ts`, replace the inline success/error message variables with calls to `toastService.success(...)` / `toastService.error(...)`. Remove the HTML that displays those messages.
- In `login.ts`, replace the inline `errorMessage` display with `toastService.error(...)`. Remove the HTML error block.
- In `register.ts`, same treatment.

---

## Feature 2 — Auth 401 Handling + `currentUser` Signal

**Goal:** Automatically redirect to login on 401 responses and provide a single reactive `currentUser` signal that any component can read without making an API call.

### 2.1 Extend the Error Interceptor (or create a dedicated 401 interceptor)

Add 401 handling to `error.interceptor.ts` (or create a separate `src/app/core/interceptors/unauth.interceptor.ts` — either is fine, but keeping it in the error interceptor is simpler).

- On `401`: call `jwtService.destroyToken()`, call `router.navigate(['/auth/login'])`, toast "Session expired — please log in again".
- Ensure this runs **before** the generic error handler so 401 is never double-toasted.

### 2.2 `currentUser` Signal

Extend `src/app/core/services/auth.service.ts`:

- Add a private `WritableSignal<UserResponse | null>` called `_currentUser`.
- Expose a public readonly `currentUser = this._currentUser.asReadonly()`.
- Add a computed signal `isLoggedIn = computed(() => this._currentUser() !== null)` (replaces the existing `isLoggedIn()` method).
- Add a method `loadCurrentUser()` that reads the `id` from the JWT, calls `userService.getById(id)`, and sets `_currentUser`.
- On `login()` success, after saving the token, call `loadCurrentUser()`.
- On `logout()`, set `_currentUser` to `null`.
- Add an `initialize()` method: if a token exists in storage, call `loadCurrentUser()`. Call this from `APP_INITIALIZER` in `app.config.ts` so the user is populated before the first route resolves.

### 2.3 Update Consumers

- `dashboard.ts`: replace `jwtService.getAttribute('id')` with `authService.currentUser()?.firstName`.
- `profile.ts`: pre-fill the form from `authService.currentUser()` instead of calling `userService.getById(...)` separately. After a successful update, refresh `currentUser` by calling `authService.loadCurrentUser()`.
- `app.topbar.html`: display the user's name/avatar from `authService.currentUser()`.
- `auth.guard.ts`: use `authService.isLoggedIn()` (the signal-based version).

---

## Feature 3 — Notification Bell

**Goal:** Add a notification bell icon in the topbar that shows a badge count and a dropdown panel listing recent notifications. This is a **frontend-only scaffold** — the actual notification data will come from a backend endpoint that each app will implement.

### 3.1 Notification Model

Create `src/app/core/models/notification.model.ts`:

```
NotificationItem {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string      // ISO date
  type: 'info' | 'warning' | 'error' | 'success'
  link?: string          // optional router link to navigate on click
}
```

### 3.2 Notification Service

Create `src/app/core/services/notification.service.ts`:

- Injectable, provided in `root`.
- `notifications = signal<NotificationItem[]>([])`.
- `unreadCount = computed(() => this.notifications().filter(n => !n.read).length)`.
- `loadNotifications()` — GET `/notifications` → sets the signal. *(Each app will implement this endpoint; for now the service is ready.)*
- `markAsRead(id: string)` — PUT `/notifications/{id}/read` → updates the local signal.
- `markAllAsRead()` — PUT `/notifications/read-all` → updates the local signal.

### 3.3 Notification Bell Component

Create `src/app/features/notifications/notification-bell.ts` (standalone component).

- An icon button (`pi pi-bell`) with a PrimeNG `Badge` showing `unreadCount()`.
- On click, toggle an `OverlayPanel` (or `Popover`) listing the most recent notifications.
- Each item shows title, relative time (e.g. "5 min ago"), and a colored dot by type.
- A "Mark all as read" link at the top of the panel.
- Clicking an item calls `markAsRead(id)` and navigates to `item.link` if present.

### 3.4 Wire It Up

- Add `<app-notification-bell />` to `app.topbar.html` next to the existing dark-mode toggle.
- Call `notificationService.loadNotifications()` in the topbar's `ngOnInit` (or from the `APP_INITIALIZER` after the user is loaded).

---

## Feature 4 — Global Loading Bar

**Goal:** Show a slim progress bar at the very top of the page while any HTTP request is in flight.

### 4.1 Loading Service

Create `src/app/core/services/loading.service.ts`:

- Injectable, provided in `root`.
- Private `activeRequests = signal(0)`.
- `isLoading = computed(() => this.activeRequests() > 0)`.
- `start()` → increment `activeRequests`.
- `stop()` → decrement (never below 0).

### 4.2 Loading Interceptor

Create `src/app/core/interceptors/loading.interceptor.ts`:

- Functional `HttpInterceptorFn`.
- Call `loadingService.start()` before passing the request.
- In `finalize()` (runs on both success and error), call `loadingService.stop()`.

### 4.3 Register the Interceptor

- In `app.config.ts`, add `loadingInterceptor` to `withInterceptors([...])` — put it **first** so it wraps everything.

### 4.4 Display the Bar

- In `app.component.html` (not the layout — we want it on every page), add a PrimeNG `<p-progressbar>` (or a simple CSS bar with an animation class) at the very top.
- Use `@if (loadingService.isLoading())` to conditionally show it.
- Style: `position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; height: 3px`. Use an indeterminate/animated mode.

---

## Feature 5 — Breadcrumbs

**Goal:** Render a breadcrumb trail on every authenticated page, driven by route data.

### 5.1 Route Data Convention

For each route in `app.routes.ts`, add a `data` property:

```ts
{ path: '', component: Dashboard, data: { breadcrumb: 'Home' } }
{ path: 'profile', component: Profile, data: { breadcrumb: 'Profile' } }
{ path: 'settings', component: Settings, data: { breadcrumb: 'Settings' } }
```

### 5.2 Breadcrumb Service

Create `src/app/core/services/breadcrumb.service.ts`:

- Injectable, provided in `root`.
- Inject `Router` and `ActivatedRoute`.
- Listen to `router.events` (filter for `NavigationEnd`).
- Walk the `ActivatedRoute` tree, collecting each segment's `data.breadcrumb`.
- Expose `breadcrumbs = signal<{ label: string, url: string }[]>([])`.

### 5.3 Breadcrumb Component

Create `src/app/core/layout/component/app.breadcrumb.ts` (standalone).

- Inject `BreadcrumbService`.
- Render PrimeNG's `<p-breadcrumb [model]="breadcrumbService.breadcrumbs()" [home]="home" />`.
- `home` item: icon `pi pi-home`, routerLink `/`.

### 5.4 Wire It Up

- Add `<app-breadcrumb />` in `app.layout.html` just above the `<router-outlet>`, inside the content area.

---

## Feature 6 — Role Guard

**Goal:** Protect routes so only users with specific roles can access them.

### 6.1 Create the Guard

Create `src/app/core/guards/role.guard.ts`:

- Export a factory function `roleGuard(...allowedRoles: string[]): CanActivateFn`.
- Inside the returned function: read the JWT payload's `roles` array from `jwtService.getAttribute('roles')`.
- If the user has at least one of the `allowedRoles`, allow access.
- Otherwise, navigate to `/auth/access` (the existing 403 page) and return `false`.

### 6.2 Usage Convention

Document in CLAUDE.md how to use it:

```ts
{
  path: 'admin',
  loadComponent: () => import('./features/admin/admin.ts'),
  canActivate: [roleGuard('ADMIN')]
}
```

No routes need the role guard right now — this is purely infrastructure for apps that extend the template.

---

## Feature 7 — Confirmation Dialog Service

**Goal:** Provide a programmatic way to show "Are you sure?" dialogs, backed by PrimeNG's `ConfirmationService`.

### 7.1 Confirmation Service Wrapper

Create `src/app/core/services/confirmation.service.ts`:

- Injectable, provided in `root`.
- Inject PrimeNG's `ConfirmationService`.
- Expose `confirm(options: { message: string, header?: string, icon?: string, acceptLabel?: string, rejectLabel?: string }): Promise<boolean>`.
- Internally, call `confirmationService.confirm(...)`, resolve the promise with `true` on accept, `false` on reject.

### 7.2 Wire It Up

- In `app.config.ts`, add PrimeNG's `ConfirmationService` to `providers`.
- In `app.layout.html`, add `<p-confirmDialog />`.
- In `app.component.html`, add `<p-confirmDialog />` (for pages outside the layout).

### 7.3 Example Usage

Add a confirmation step to the **logout** flow in `app.topbar.ts`:

```ts
async logout() {
  const confirmed = await confirmationService.confirm({
    message: 'Are you sure you want to log out?',
    header: 'Confirm Logout'
  });
  if (confirmed) {
    authService.logout();
    router.navigate(['/auth/login']);
  }
}
```

---

## Feature 8 — Page Title Service

**Goal:** Automatically set the browser tab title based on the current route.

### 8.1 Route Data Convention

Reuse the `breadcrumb` data already added in Feature 5. The page title will be `"{breadcrumb} | AppName"` (or just `"AppName"` for the root).

### 8.2 Title Strategy

Create `src/app/core/services/page-title.strategy.ts`:

- Extend Angular's `TitleStrategy`.
- Override `updateTitle(snapshot: RouterStateSnapshot)`.
- Walk the route tree to find the deepest `data.breadcrumb`.
- Call `this.title.setTitle(breadcrumb ? \`${breadcrumb} | AppName\` : 'AppName')`.
- The app name should come from a constant (e.g. `APP_NAME` in `environment.ts` or a shared constant file) so each app built on the template can change it in one place.

### 8.3 Register

- In `app.config.ts`, add `{ provide: TitleStrategy, useClass: PageTitleStrategy }` to `providers`.

---

## Feature 9 — Empty State Component

**Goal:** A reusable component for "no data" / "nothing here yet" states.

### 9.1 Component

Create `src/app/shared/components/empty-state.ts` (standalone):

- Inputs (all with sensible defaults):
  - `icon: string` — PrimeNG icon class, default `'pi pi-inbox'`.
  - `title: string` — default `'Nothing here yet'`.
  - `message: string` — default `''`.
  - `actionLabel: string` — optional button text.
  - `actionLink: string` — optional routerLink.
  - `actionClick: EventEmitter<void>` — optional click output.
- Template:
  - Centered container.
  - Large icon.
  - Title in a heading.
  - Subtitle/message paragraph.
  - If `actionLabel` is provided, show a PrimeNG `<p-button>` that either navigates via `routerLink` or emits `actionClick`.

### 9.2 Usage Convention

Document in CLAUDE.md:

```html
<app-empty-state
  icon="pi pi-users"
  title="No users found"
  message="Try adjusting your filters."
  actionLabel="Clear Filters"
  (actionClick)="clearFilters()"
/>
```

---

## Feature 10 — Environments (Staging / Production)

**Goal:** Provide separate environment configurations for development, staging, and production.

### 10.1 Create Environment Files

The project already has `environment.ts` (default) and `environment.development.ts`. Add:

- `src/environments/environment.staging.ts`:
  ```ts
  export const environment = {
    production: false,
    apiUrl: 'https://staging-api.example.com/api/v1',
    appName: 'MyApp (Staging)'
  };
  ```
- Update `src/environments/environment.ts` (production):
  ```ts
  export const environment = {
    production: true,
    apiUrl: 'https://api.example.com/api/v1',
    appName: 'MyApp'
  };
  ```
- Update `src/environments/environment.development.ts`:
  ```ts
  export const environment = {
    production: false,
    apiUrl: 'http://localhost:8080/api/v1',
    appName: 'MyApp (Dev)'
  };
  ```

### 10.2 Add `appName` to the Environment Interface

Create `src/environments/environment.interface.ts`:

```ts
export interface Environment {
  production: boolean;
  apiUrl: string;
  appName: string;
}
```

Each environment file should satisfy this interface so you get compile-time safety.

### 10.3 Angular Build Configuration

In `angular.json`, add a `staging` configuration under `architect > build > configurations`:

```json
"staging": {
  "fileReplacements": [
    {
      "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.staging.ts"
    }
  ],
  "optimization": true,
  "outputHashing": "all"
}
```

Also add a staging serve configuration that uses the staging build:

```json
"staging": {
  "buildTarget": "angular-template:build:staging"
}
```

### 10.4 NPM Scripts

In `package.json`, add:

```json
"start:staging": "ng serve --configuration staging",
"build:staging": "ng build --configuration staging"
```

### 10.5 Use `appName`

- The `PageTitleStrategy` (Feature 8) should read `environment.appName` instead of a hardcoded string.
- The login/register page logos or headers can display `environment.appName`.

---

## Suggested Implementation Order

The features are numbered in dependency order. Here's a summary:

| Order | Feature | Depends On |
|-------|---------|------------|
| 1 | Toast Service + HTTP Error Interceptor | — |
| 2 | Auth 401 Handling + currentUser Signal | Feature 1 (toasts) |
| 3 | Notification Bell | Feature 2 (currentUser) |
| 4 | Global Loading Bar | — |
| 5 | Breadcrumbs | — |
| 6 | Role Guard | — |
| 7 | Confirmation Dialog Service | — |
| 8 | Page Title Service | Feature 5 (route data), Feature 10 (appName) |
| 9 | Empty State Component | — |
| 10 | Environments (staging/prod) | — |

Features 4, 5, 6, 7, 9, and 10 have no dependencies and can technically be done in any order. However the numbered order is recommended because it introduces infrastructure (toasts, currentUser) before the features that consume it.

---

## CLAUDE.md Updates

After all features are implemented, the CLAUDE.md file should be updated to document:

1. The new services in `core/services/` (toast, loading, breadcrumb, notification, confirmation, page-title).
2. The new interceptors in `core/interceptors/` (error, loading).
3. The new guard in `core/guards/` (role guard).
4. The shared component in `shared/components/` (empty-state).
5. The route `data` convention (`breadcrumb` property).
6. The environment files and build configurations.
7. The npm scripts for staging builds.
