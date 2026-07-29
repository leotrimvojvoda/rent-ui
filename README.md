# Angular Template

A production-ready Angular 20 starter template with authentication, role-based access control, dark mode, and a full admin layout built on PrimeNG and Tailwind CSS v4.

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | Angular 20 (standalone components, signals) |
| UI Components | PrimeNG 20 + PrimeIcons 7 |
| Theming | @primeuix/themes (Aura / Lara / Nora presets) |
| CSS | Tailwind CSS v4 via PostCSS + tailwindcss-primeui |
| Charts | Chart.js 4.4.2 |
| HTTP | Angular HttpClient with interceptors |
| State | Angular Signals + RxJS 7.8 |
| Language | TypeScript 5.8 |

## Features

- **Authentication** — Login, register, JWT token management, auto-attach Bearer header, logout on 401
- **Role-based access control** — `authGuard` + `roleGuard` for route protection
- **Dark / Light / System theme** — persisted to `localStorage`, responds to OS preference
- **Live theme configurator** — floating panel to switch PrimeNG preset, primary color, and surface palette at runtime
- **Admin layout shell** — sidebar, topbar, footer, breadcrumbs auto-generated from route metadata
- **User profile** — view and edit first name, last name, email via `GET/PUT /users/{id}`
- **Global toast notifications** — success / error / info / warn via `ToastService`
- **HTTP loading bar** — progress bar tracks all in-flight requests via `LoadingInterceptor`
- **Global error handling** — `ErrorInterceptor` handles 401, 403, 404, and 5xx responses
- **Confirmation dialogs** — powered by PrimeNG `ConfirmationService`
- **Mock auth mode** — bypass the backend during development with a locally generated JWT

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── guards/
│   │   │   ├── auth.guard.ts              # Redirect unauthenticated users to /auth/login
│   │   │   └── role.guard.ts              # Role-based route protection
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts        # Attach Authorization: Bearer header
│   │   │   ├── error.interceptor.ts       # Handle 401 / 403 / 404 / 5xx globally
│   │   │   └── loading.interceptor.ts     # Track active requests for progress bar
│   │   ├── layout/
│   │   │   ├── component/
│   │   │   │   ├── app.layout.ts          # Authenticated shell wrapper
│   │   │   │   ├── app.topbar.ts          # Top navigation bar
│   │   │   │   ├── app.sidebar.ts         # Collapsible sidebar
│   │   │   │   ├── app.menu.ts            # Menu item definitions
│   │   │   │   ├── app.menuitem.ts        # Recursive menu item component
│   │   │   │   ├── app.breadcrumb.ts      # Dynamic breadcrumbs
│   │   │   │   ├── app.footer.ts          # Page footer
│   │   │   │   ├── app.configurator.ts    # Runtime theme configurator panel
│   │   │   │   └── app.floatingconfigurator.ts  # Floating trigger button
│   │   │   └── service/
│   │   │       └── layout.service.ts      # Theme mode, dark toggle, sidebar state
│   │   ├── models/
│   │   │   ├── auth.model.ts              # LoginCredentials, AuthResponse
│   │   │   ├── user.model.ts              # UserResponse, UpdateUserRequest
│   │   │   └── notification.model.ts      # NotificationItem
│   │   └── services/
│   │       ├── auth.service.ts            # Login, register, currentUser signal
│   │       ├── jwt.service.ts             # Token storage and JWT decoding
│   │       ├── user.service.ts            # GET / PUT /users/{id}
│   │       ├── toast.service.ts           # Success / error / info / warn toasts
│   │       ├── loading.service.ts         # activeRequests counter signal
│   │       ├── breadcrumb.service.ts      # Build breadcrumbs from route data
│   │       ├── notification.service.ts    # Notification list management
│   │       ├── confirmation.service.ts    # Confirmation dialog wrapper
│   │       └── page-title.strategy.ts     # Custom TitleStrategy
│   ├── features/
│   │   ├── auth/                          # Public pages (no guard)
│   │   │   ├── login.ts
│   │   │   ├── register.ts
│   │   │   ├── access.ts                  # 403 Forbidden
│   │   │   ├── error.ts                   # Generic error
│   │   │   └── auth.routes.ts
│   │   ├── dashboard/                     # Home page (guard-protected)
│   │   ├── profile/                       # Edit profile (guard-protected)
│   │   ├── settings/                      # Theme switcher (guard-protected)
│   │   ├── notifications/                 # Notification bell
│   │   └── notfound/                      # 404 page
│   ├── shared/
│   │   └── components/
│   │       └── empty-state.ts
│   ├── app.component.ts
│   ├── app.config.ts                      # Providers, interceptors, PrimeNG config
│   └── app.routes.ts
├── assets/
│   ├── tailwind.css                       # Tailwind v4 entry + custom dark variant
│   ├── layout/                            # SCSS partials for layout shell
│   └── styles.scss                        # Global styles entry
└── environments/
    ├── environment.ts
    ├── environment.development.ts
    └── environment.staging.ts
```

## Routing

All authenticated pages are children of the `AppLayout` shell route and protected by `authGuard`. Auth pages use their own full-page layout outside the shell.

| Path | Page | Guard |
|------|------|-------|
| `/` | Dashboard | `authGuard` |
| `/profile` | Profile | `authGuard` |
| `/settings` | Settings | `authGuard` |
| `/auth/login` | Login | — |
| `/auth/register` | Register | — |
| `/auth/access` | 403 Forbidden | — |
| `/auth/error` | Error | — |
| `/notfound` | 404 | — |
| `**` | → `/notfound` | — |

To add a protected page: create `src/app/features/my-feature/`, add the component, and register the route inside the `AppLayout` children in `app.routes.ts`.

## Authentication

1. `AuthService.login()` posts credentials to `POST /auth/sign-in` and stores the returned JWT via `JwtService.saveToken()`.
2. The JWT payload contains `id` (UUID), `sub` (email), `roles`, and `exp`. Read them with `jwtService.getAttribute('id')` — no extra API call needed.
3. `authInterceptor` reads the token from `localStorage` and sets `Authorization: Bearer <token>` on every outbound request.
4. `errorInterceptor` catches 401 responses, clears the token, and redirects to `/auth/login`.
5. The login page includes a **No Backend** toggle that generates a mock JWT locally — useful for UI development without a running server.

## Theme System

`LayoutService` owns all theme state:

- **`ThemeMode`** — `'light' | 'dark' | 'system'` persisted to `localStorage` under the key `themeMode`.
- System mode listens to `matchMedia('(prefers-color-scheme: dark)')` and reacts automatically.
- Dark mode is activated by toggling the `app-dark` class on `<html>`.
- The floating configurator lets you switch the PrimeNG **preset** (Aura / Lara / Nora), **primary color**, and **surface palette** at runtime via `updatePreset` / `updateSurfacePalette` from `@primeuix/themes`.

Call `layoutService.setThemeMode(mode)` from any component to change the theme.

The Tailwind dark variant is `app-dark` (not the default `dark`), configured in `tailwind.css`:

```css
@custom-variant dark (&:where(.app-dark, .app-dark *));
```

## Adding a Domain Service

Follow the `UserService` pattern in `core/services/`:

- Inject `HttpClient`, use `environment.apiUrl` as the base URL.
- Place models in `core/models/` alongside the existing ones.

## Backend Contract

Expects a REST API at the URL defined in `src/environments/environment.ts`.

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/auth/sign-in` | Public |
| `POST` | `/users` | Public (register) |
| `GET` | `/users/{id}` | Bearer |
| `PUT` | `/users/{id}` | Bearer |

## Commands

```bash
npm start              # Dev server → http://localhost:4200
npm run start:staging  # Dev server with staging environment
npm run build          # Production build
npm run watch          # Dev build in watch mode
npm run format         # Run Prettier over all .ts, .html, .js files
npm test               # Run unit tests via Karma
```

## CSS / Tailwind Notes

- Angular 20's esbuild builder reads **`postcss.config.json`** (JSON format only, not `.js`). Restart the dev server after any changes to this file.
- The `@source "../app"` directive in `tailwind.css` tells Tailwind where to scan for class names. Add additional `@source` directives if you place templates outside `src/app/`.
- Use the `dark:` utility prefix as normal — it maps to the custom `app-dark` variant automatically.
