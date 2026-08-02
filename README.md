# Keyway (rent-ui)

The Angular 20 frontend of the Rent-API car-rental marketplace. Two personas share one app: **clients** browse a public catalog and request cars, **owners** run a company, a fleet, and the rental requests that come in for it.

Built with PrimeNG 20 and Tailwind CSS v4. It grew out of the sakai-ng template, but little of that is left.

## Running against the backend

```bash
npm install
npm start          # dev server on http://localhost:4200
```

The dev build talks to `http://localhost:8080/api/v1` (`src/environments/environment.development.ts`).

**The backend must allow this origin.** Add `http://localhost:4200` to the Rent-API `CORS_ALLOWED_ORIGINS` environment variable, or every request fails as a network error before it is ever authenticated.

The API contract lives in the backend repo (`API.md`, `BACKEND.md`) and is authoritative — it is not vendored here.

### Commands

| Command | What it does |
|---|---|
| `npm start` | Dev server (`npm run start:staging` for the staging API) |
| `npm run build` | Production build (`build:staging` for staging) |
| `npm run watch` | Development build, rebuilding on change |
| `npm run format` | Prettier over the tree — settings in `.prettierrc` |
| `npm test` | Karma. **There are no spec files yet.** |

## What it does

**Public** — landing page with an availability search; catalog with city, date, price and seat filters, all serialized into the URL; car detail with gallery, price tiers and the company behind the car.

**Client** — signup with email verification, booking with a live price estimate, rentals list and detail with the company's pick-up contact, cancellation any time before pick-up.

**Owner** — company setup and profile, fleet with publish toggles, car create/edit with an image manager and a price-tier editor, and the rental request queue: approve, reject, mark picked up, mark returned.

**Both** — notifications with a polled unread badge, light/dark/system theme, a session that survives a reload.

Deliberately **not** built, because the API has no support for it: profile editing, changing a password while signed in, admin screens, payments, reviews, favourites, chat, OAuth, image reordering, real-time push. See `PLAN.md` §7.

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
├── features/           # one folder per area; routes live in app.routes.ts
└── shared/
    ├── components/     # car card, pager, badges, empty state, notification row
    └── utils/          # money and date formatting, day-count estimate
```

Routes are declared in one place, `src/app/app.routes.ts`. The authenticated shell and the public site are **two sibling routes both at path `''`**; the shell carries a `canMatch` guard listing its own top-level segments, so the public site owns everything else without relying on router backtracking.

### Auth and session

Tokens are an **access/refresh pair** held by `TokenStorageService`. Identity comes from `GET /auth/me` — never from decoded JWT claims, since claim names are not part of the documented contract. `AuthService.currentUser` is a signal, populated at startup by `provideAppInitializer`.

`authInterceptor` attaches the bearer, and on a 401 refreshes **once for the whole burst**: concurrent requests share one in-flight refresh, so a rotating refresh token is never spent twice. If that refresh fails the session ends, and only the caller that actually ends it toasts and redirects — otherwise one dead session produces a toast per in-flight request.

### Errors

`core/errors/api-error.ts` is the single map from the API's error `code` to user-facing copy, and it is complete against `API.md`. **Branch on `code`, never on `message`** — `code` is a stable contract, `message` is localised copy.

`PAGE_OWNED_CODES` lists the codes the global interceptor never toasts — validation, auth branches, business conflicts, upload failures — because the page that made the call renders them inline where the user can act on them. Everything left over (network failures, 5xx, unknown codes) gets a toast.

### Design system

`PLAN.md` §3 is the authority. In short:

- **Palette and radii** come from `core/theme/keyway-preset.ts`, a `definePreset` over Aura. PrimeNG components and the layout SCSS read the same `--p-*` tokens, so the brand is applied in one place rather than per page.
- **Shell and `.keyway-*` classes** live in `src/assets/layout/_keyway.scss`.
- **Brand utilities** (`bg-keyway-green`, `font-display`, …) come from the `@theme` block in `src/assets/tailwind.css`.
- Fonts are Sora (display) and Instrument Sans (body). Green `#0f4c3a`, lime `#d7f26a`, cream `#f7f6f3`.
- One lime CTA per screen. Red is reserved for destructive actions and the notification badge.

There is no runtime theme configurator — the brand is fixed. Only light/dark/system remain, owned by `LayoutService` and persisted under the `themeMode` key. Dark mode toggles the `app-dark` class on `<html>`.

### Adding a page

Create `features/my-area/`, add the component, and register the route in `app.routes.ts` under the shell's `children` with `data: { breadcrumb: 'Page name' }` — the breadcrumb trail and the document title both read it. A detail page declared as a flat route can name its list with `breadcrumbParent`.

### CSS gotcha

Tailwind v4 runs through PostCSS, and Angular's esbuild builder only reads **`postcss.config.json`** — JSON, not `.js`. Restart the dev server after changing it. `@source "../app"` in `tailwind.css` is what makes Tailwind scan Angular templates; templates outside `src/app/` need their own `@source`. The dark variant is `app-dark`, not `dark`, so write `dark:` as usual and it maps across.

## Environments

| Config | File | `apiUrl` |
|---|---|---|
| development | `environment.development.ts` | `http://localhost:8080/api/v1` |
| staging | `environment.staging.ts` | `https://staging-api.example.com/api/v1` |
| production | `environment.ts` | `https://api.example.com/api/v1` |

`currencySymbol` is **assumed to be EUR** — the API sends money as a plain JSON number with no currency in the contract. If that assumption is wrong, change it in one place.

## Known gaps

- **No tests.** `npm test` is wired up but there are no spec files.
- **`npx eslint` fails** — the flat config has an unsupported `root` key. Pre-existing.
- **Nothing has been verified in a real browser.** No dark-mode, responsive or screen-reader pass has actually been run; the code follows the rules but the rendering is unconfirmed. See `PLAN.md` Phase 8.
- `chart.js` is still a dependency but nothing imports it.
