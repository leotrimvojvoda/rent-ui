# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

**Keyway** is the Angular 20 frontend of Rent-API, a car-rental marketplace with two personas: clients who browse and book, owners who run a company and a fleet. It was built phase by phase against `PLAN.md`, which remains the authority on scope, the design system (§3) and what is deliberately out of scope (§7). The backend's `API.md` is the authority on the contract; it is not vendored here.

## Commands

```bash
npm start             # Dev server at http://localhost:4200
                      # (restart it to pick up postcss.config.json changes)
npm run start:staging # Dev server against the staging API
npm run build         # Production build — the check that actually matters
npm run build:staging
npm run watch         # Development build in watch mode
npm run format        # Prettier; settings in .prettierrc
npm test              # Karma — there are no spec files yet
```

`npx eslint` currently fails: the flat config has an unsupported `root` key. Pre-existing, unrelated to app code.

## Verifying a change

There is **no browser and no test suite** in this environment, so verification means:

1. `npx ng build --configuration production` — clean, including no warnings.
2. `npx ng serve` on a spare port and `curl` the affected routes for a 200.
3. For CSS: grep the built `dist/rent-ui/browser/styles-*.css` for the class or token you added.

Never claim a visual result. Say what was and was not verified.

## Architecture

```
src/app/
├── core/
│   ├── errors/         # api-error.ts — the one error-code → copy map
│   ├── forms/          # server-error binding, countdown helper
│   ├── guards/         # auth, role, app-shell, owner-company
│   ├── http/           # HttpContext tokens (skipErrorToast)
│   ├── interceptors/   # loading → error → auth (outermost first)
│   ├── layout/         # app shell + public shell, LayoutService
│   ├── models/         # one file per API resource
│   ├── services/       # one per API area, plus session and UI services
│   └── theme/          # keyway-preset.ts — the PrimeNG preset
├── features/           # one folder per area; all routes live in app.routes.ts
└── shared/
    ├── components/     # car card, pager, badges, empty state, notification row
    └── utils/          # money and date formatting, day-count estimate
```

Angular 20 idiom throughout: standalone components, signals (`signal`, `computed`, `input.required`, `output`), `@if`/`@for`/`@switch` control flow, `takeUntilDestroyed`. Match it.

### Routing

`src/app/app.routes.ts` holds every route. The authenticated shell and the public site are **two sibling routes both at path `''`** — the shell carries `canMatch: [appShellMatch]`, which lists its own top-level segments, so the public site owns everything else without relying on router backtracking. **Adding a new top-level authenticated segment means adding it to `APP_SHELL_SEGMENTS` too**, or it will fall through to the public site and 404.

Every route carries `data.breadcrumb`; detail pages declared as flat routes name their list with `data.breadcrumbParent`. Both the breadcrumb trail and the document title read this.

Owner routes carry `[roleGuard('OWNER'), ownerCompanyGuard]`; `company/setup` uses `companySetupGuard` instead, which is the inverse.

### Auth and session

- Tokens are an **access/refresh pair** in `TokenStorageService`. There is no `JwtService`.
- Identity comes from `GET /auth/me`, **never** from decoded JWT claims — claim names are not in the contract.
- `AuthService.currentUser` / `role` / `isClient` / `isOwner` are signals; `provideAppInitializer` populates them at startup.
- `authInterceptor` refreshes **once per burst**: concurrent 401s share one in-flight refresh, so a rotating refresh token is never spent twice.
- When a refresh fails, `AuthService.endExpiredSession()` returns whether *this* caller ended the session — only that one toasts and redirects.

### Errors

`core/errors/api-error.ts` is the single error-code → copy map, complete against `API.md`.

- **Branch on `code`, never on `message`.** `code` is a stable contract; `message` is localised copy.
- `PAGE_OWNED_CODES` are the codes the interceptor never toasts, because the page that made the call renders them inline where the user can act on them. A new business conflict handled inline belongs in that set.
- `skipErrorToast()` on a request silences the interceptor for calls whose failure the caller fully owns.
- Helpers: `errorCodeOf`, `hasErrorCode`, `errorMessage`, `fieldErrorsOf`, `retryAfterSeconds`.

### Contract facts that shape the UI

- Paged responses are `{data, page, size, totalPages, totalElements}`; `PageQuery` and `Pager` are both 0-based to match.
- **Money is a JSON number** — `40.00` parses to `40`. Always render through `formatMoney`, never recompute a total the server sent.
- Rental pricing is **snapshotted server-side** at creation. The client never sends or recalculates a price.
- Someone else's resource answers **404, not 403**. Treat 404 as "not yours or not there".
- Signup and password reset always answer 202 with an identical body — the response cannot reveal whether an email exists. Never write copy that implies otherwise.
- `/auth/*` is rate-limited to 10/min with `Retry-After`; auth screens render a countdown inline, never a toast.
- Rental statuses: `PENDING → APPROVED → ACTIVE → COMPLETED`, with `REJECTED`, `CANCELLED` and `EXPIRED` as dead ends. `PENDING`/`APPROVED`/`ACTIVE` all block the car.
- A car is publicly visible only when `published && status === 'ACTIVE'`.

### Design system

`PLAN.md` §3 is the authority; read it before styling anything.

- Palette, radii and form fields come from `core/theme/keyway-preset.ts` (a `definePreset` over Aura). PrimeNG components and the layout SCSS read the same `--p-*` tokens, so brand changes happen in one place.
- Shell and `.keyway-*` classes: `src/assets/layout/_keyway.scss`.
- Brand Tailwind utilities: the `@theme` block in `src/assets/tailwind.css`.
- Sora (display), Instrument Sans (body). Green `#0f4c3a`, lime `#d7f26a`, cream `#f7f6f3`.
- **One lime CTA per screen.** Red is only for destructive actions and the notification badge.
- No runtime theme configurator — the brand is fixed. Only light/dark/system remain.

### Shared building blocks

Reach for these before writing a new one: `EmptyState`, `Pager`, `CarCard`/`CarCardSkeleton`, `RentalStatusBadge`, `RentalTimeline`, `CarStatusBadge`/`PublishedBadge`, `NotificationRow`, `FieldError`, `StatusPage`.

Status copy lives with its badge: `STATUS_LABELS`, `CLIENT_STATUS_EXPLANATIONS` and `OWNER_STATUS_EXPLANATIONS` in `shared/components/rental-status-badge.ts`. Owner transitions and their confirm copy live in `features/company/rental-actions.ts` — that table is the single source for which actions a status allows.

Formatting goes through `shared/utils/format.ts` (`formatMoney`, `formatDailyPrice`, `formatDateTime`, `formatDate`, `formatRelativeTime`, `toUtcInstant`). Relative time is for notifications only; rental dates must stay unambiguous.

### CSS gotcha

Tailwind v4 runs through PostCSS and Angular's esbuild builder reads **`postcss.config.json`** only — JSON, not `.js`. `@source "../app"` in `tailwind.css` is what makes Tailwind scan Angular templates; templates outside `src/app/` need their own `@source`. The dark variant is `app-dark`, not `dark`.

## Traps worth remembering

- `@if (x(); as y)` is **not** allowed on an `@else if` branch (NG5002). Nest a fresh `@if` inside the `@else if` instead.
- `?? []` on a non-nullable field is a compile warning (NG8102).
- Tailwind class names containing `:` cannot go in `[class.foo]` bindings — use a computed class string.
- Prettier without `.prettierrc` reformats the whole tree; the config is there for a reason, don't bypass it.
- `divide-*` utilities are not part of tailwindcss-primeui's surface tokens — use `border-t border-surface` per row.

## Honesty rules for this repo

Several things here were invented once and had to be removed. Don't reintroduce them:

- **No fabricated social proof.** The landing page's testimonials and "4.8 ★ · 12k reviews" badge were placeholder copy from the design file; there is no reviews feature, so they were deleted. Do not write reviews, ratings, counts or customer quotes.
- **No product claims the contract does not support.** If copy promises a behaviour, there must be an endpoint behind it.
- Marketing copy that describes real behaviour (`STEPS` in `home.ts`) is fine and is marked static by design.
