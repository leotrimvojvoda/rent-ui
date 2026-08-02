# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Rent-API** is the backend for a car-rental marketplace. A rental-company owner registers, opens a
company, and lists cars; anyone can browse the published ones without an account; a signed-in client
requests a car for a date range; the owner approves, hands it over, and takes it back. Both sides
are kept informed in-app and by email.

Java 21 · Spring Boot 4 · PostgreSQL 16 · Flyway · MapStruct · Testcontainers. One deployable JAR,
configured entirely by environment variables. External services sit behind interfaces so the
provider stays swappable — **Brevo** for email, **Cloudinary** for images, **Sentry** for errors.

### What it does

- **Identity** — signup as client or owner, email verification by one-time code, login, `/me`,
  logout, password reset. Stateless JWT with a short access token and a rotating refresh token.
- **Companies** — exactly one per owner, and the tenancy boundary everything else hangs off.
- **Fleet** — cars with make/model/year/plate, duration-based price tiers, photos, and an explicit
  publish switch separate from availability.
- **Public catalog** — anonymous paged search by city, make, model, price and **date availability**,
  plus a car detail view. Deliberately a subset of what the owner sees.
- **Rentals** — request → approve → activate → complete, with reject/cancel/expire. Double booking
  is impossible at the database level; the price is computed server-side and snapshotted.
- **Notifications** — in-app feed with an unread count, the same events by email, and scheduled
  pickup/return reminders.
- **Operations** — rate-limited auth endpoints, per-request correlation ids, domain metrics,
  structured logs, generated API docs, and k6 load scripts.

### Out of scope, on purpose

Branches and multi-location companies, employees and extra roles, payments and invoicing, loyalty and
promotions, test drives, GPS/insurance integrations, chat, OAuth2 login, bot protection, and
real-time push. **None of these may complicate the core model.** The rate-limit filter leaves room
for a bot-challenge filter and the notification rows leave room for SSE — that is as far as either
goes.

`claude-sessions/` holds a write-up per milestone. **Read the latest before starting work** — they
record why things are the way they are, including the mistakes.

## Commands

```bash
make help        # List every target
make env         # Create .env from .env.example (required once, before db-up/stack-up)
make db-up       # Start PostgreSQL (required before running locally)
make run         # Run with the `local` Spring profile
make build       # Build the JAR, skipping tests
make test        # Full test suite — needs a running Docker daemon for Testcontainers
make lint        # Checkstyle (blocking: 0 violations expected)
make stack-up    # Build and start app + database
make api-docs    # Regenerate docs/openapi.json + docs/API.md (needs the app running)
make load-seed   # Seed a running stack for the k6 load scripts, then load-search / load-booking
```

There is no `mvn` on the PATH here — use `./mvnw` directly, which is what the Makefile does.

```bash
./mvnw test -Dtest=SignupAndVerificationTest
./mvnw test -Dtest=SignupAndVerificationTest#verifyEnablesAccount
./mvnw clean verify          # what CI runs
./mvnw checkstyle:check      # lint alone
```

**`verify` does not run Checkstyle** — it is bound to its own goal. Run both before calling work
done, or lint violations will surface in CI after a green local build.

**Verifying by hand: assert the status of every setup call.** This has produced a false-positive
twice — once an expired token made setup calls 401 silently, once an app failed to start on a busy
port and health answered from a *stale instance still listening*. A cold Spring Boot start here
takes ~5s; "UP after 1s" means something else is serving. Kill port 8080 and check the log has
exactly one `Started RentApiApplication`.

When a script has helper functions that return values on stdout, send their diagnostics to
**stderr** — otherwise "ok" lines get captured into tokens and the request fails in a way that
looks like a server bug.

## Stack notes that will bite you

- **Spring Boot 4 / Spring Framework 7.** Several APIs moved relative to Boot 3 tutorials.
- **Jackson 3.** The auto-configured mapper is `tools.jackson.databind.ObjectMapper`, *not*
  `com.fasterxml.jackson.databind.ObjectMapper`. Jackson 2 is on the classpath transitively; wiring
  it will fail at startup with "no qualifying bean". Annotations stay in
  `com.fasterxml.jackson.annotation`.
- **Java 21 target**, though the local JDK may be newer.

## Architecture

```
com.rentapi
├── core/<feature>/        # Domain features: entity, repository, service (+Impl), mapper, dto/
│   ├── car/               # Car, PriceTier, CarImage, tenant-scoped repositories
│   │   └── publiccatalog/ # The anonymous browse side — separate repository and DTOs
│   ├── city/              # Seeded reference data
│   ├── company/           # The tenancy boundary — one per owner
│   └── user/              # User, Role enum, UserRepository, UserMapper, dto/response/
└── infrastructure/        # Cross-cutting concerns
    ├── async/             # @Async executors
    ├── base/              # BaseEntity, JPA auditing
    ├── email/             # EmailSender abstraction + Brevo/logging implementations
    ├── exception/         # ErrorCode, ApiException, ApiError, GlobalExceptionHandler
    ├── logging/           # LoggingAspect (+ secret redaction)
    ├── monitoring/        # Sentry request context
    ├── openapi/           # springdoc configuration
    ├── security/          # JWT, filter chain, auth endpoints, tokens, TenantContext
    ├── storage/           # ImageStorage abstraction + Cloudinary/in-memory implementations
    └── validation/        # Custom constraints
```

`core/` is the domain, one package per feature; `infrastructure/` is everything cross-cutting that
the domain uses but does not own. Not shown above because they arrived later: `core/rental/` and
`core/notification/`, and under `infrastructure/`, `ratelimit/` and `scheduling/`.

### Adding a domain module

Follow `core/user/`: `Entity extends BaseEntity` (UUID PK, `created_at`/`updated_at`/`created_by`
filled by Spring Data auditing), `Repository extends JpaRepository`, `Service` interface +
`ServiceImpl`, MapStruct `Mapper` (`@Mapper(componentModel = "spring")`), and
`dto/request` / `dto/response`. Entities never leave the service layer.

## API conventions

- Base path `/api/v1` (`server.servlet.context-path`). MockMvc requests in tests omit it.
- **One error envelope**, produced only by `GlobalExceptionHandler`, `RestAuthenticationEntryPoint`,
  `RestAccessDeniedHandler`, and `RateLimitFilter` — all four go through `ApiErrorFactory`, so there
  is exactly one format. Nothing else may write an error body.
  ```json
  { "code": "VALIDATION_FAILED", "message": "...", "timestamp": "...", "path": "...",
    "fieldErrors": [{ "field": "password", "message": "..." }] }
  ```
  `code` is a stable `ErrorCode` enum name — the client contract. `message` comes from
  `i18n/messages.properties` and may change freely. Field errors never echo the rejected value.
- New error conditions get a new `ErrorCode` constant (which carries its HTTP status) and a
  matching `error.<NAME>` key in the bundle. Throw `new ApiException(ErrorCode.X)`.
- Collections return a page object; `spring.data.web.pageable.max-page-size` caps size at 100.
- 404 for both missing and tenancy-hidden resources — existence must never leak.

## Multi-tenancy

The **company is the tenancy boundary**; an owner has exactly one.

- `TenantContext.currentCompanyId()` is the single source of the current tenant. **No controller or
  service method accepts a company id from the caller** — that would make the tenant a request
  parameter.
- Owner-side repositories extend `Repository`, **not** `JpaRepository`, so `findById` and `findAll`
  are not inherited and an unscoped query is not one keystroke away. Every read takes a company id.
- A cross-tenant miss is a **404, never a 403**: a 403 would confirm the resource exists and turn any
  id into an existence oracle.
- `TenantIsolationTest` is the proof. **Extend it alongside each new owner-side feature**, in the
  same change — never as a follow-up.

## Security

- Stateless JWT. Short-lived access token (15 min) + opaque, revocable, **rotating** refresh token
  (30 days). Only hashes are persisted: SHA-256 for refresh tokens, BCrypt for one-time codes.
- The public surface is the `PUBLIC_AUTH_ENDPOINTS` array in `SecurityConfiguration` plus
  `/actuator/health` and, outside prod, the API docs. **Everything else requires a token** — add
  new public routes there and nowhere else.
- `JwtAuthenticationFilter` never rejects a request itself: a bad token leaves the request
  anonymous and the entry point returns a generic 401. Token problems never surface as 403 or 500,
  and never explain themselves.
- The filter reloads the user on every request and refuses disabled accounts, so disabling an
  account invalidates tokens already issued.
- **Account enumeration is a bug.** Signup and password-reset return byte-identical responses for
  known and unknown emails. Login checks `enabled` only *after* the password verifies — that is why
  `SecurityConfiguration` disables `DaoAuthenticationProvider`'s pre-authentication checks.
- CORS origins are explicit per environment; `CorsProperties` throws at startup on `*`.
- `SecurityContext` is the only way to reach the caller.

## Things the database guarantees

Prefer a constraint over a service check. Current ones worth knowing:

- `uq_companies_owner` — one company per owner.
- `ux_cars_company_plate` — plate uniqueness per company, ignoring case, spaces, and hyphens.
- `ex_price_tiers_no_overlap` — a GiST exclusion constraint stopping a car's price brackets from
  overlapping, so a rental's price is never ambiguous. Needs `btree_gist`.
- `ex_rentals_no_overlap` — the same idea over time: a **partial** GiST exclusion constraint
  (`tstzrange(start_at, end_at)` per `car_id`, `WHERE status IN (...)`) making a double booking
  impossible even between concurrent transactions. Being partial is what lets a cancelled or
  completed rental release the car with no cleanup. `tstzrange` is `[)`, so back-to-back bookings
  that touch at an endpoint are allowed.
- `fk_rentals_car` has **no** `ON DELETE CASCADE`, unlike the rest of the catalog — a car with
  rental history must be retired rather than deleted, and the FK enforces that if the service check
  is ever bypassed.

Two JPA traps this cost us, both worth remembering:

- **Hibernate flushes inserts before deletes.** Replacing a constrained collection in one flush
  inserts the new rows while the old ones still exist. Clear, `flush()`, then insert.
- **A violation surfaces at commit**, after the service has returned, where it falls through to the
  generic handler. `flush()` inside the `try` to map it to a specific `ErrorCode`.
- A **cascade** assigns a child's identifier only at flush, so a response built from the child before
  then carries a null id. Save the child directly when the response needs its id.
- Two `@OneToMany` bags cannot be fetched in one entity graph (`MultipleBagFetchException`).

## Public vs owner-side reads

These are **different questions and must stay in different repositories**:

- `CarRepository` — "which car may this owner touch?" Every query takes a company id.
- `PublishedCarRepository` / `PublishedCarCriteriaBuilder` — "which car may anyone see?" No company id
  anywhere; every query filters to `published = true AND status = ACTIVE`, both conditions inside
  the query so a caller cannot forget one.

Public DTOs (`PublicCar*Response`) are a deliberate subset mapped by a **hand-written**
`PublicCarMapper`, not a generated one — so adding a field to `Car` cannot quietly publish it. Never
expose licence plates, car status, or company contact details there.

A hidden car (unpublished, retired, in maintenance) is a **404**, never an empty-but-200 or a 403.

Criteria-builder rules worth keeping:

- Do not fetch-join collections in a paged criteria query — Hibernate then paginates in memory. Load
  the page's collections in one follow-up query instead.
- The count query must reuse the same predicate method as the content query.
- Sorting is an enum, never a caller-supplied property name.
- Always append a stable tie-breaker (`id ASC`) to the ordering, or paging repeats and skips rows.
- Escape `%` and `_` in user text used in a `LIKE`.

## Rentals

- **Availability is a property of the database.** `ex_rentals_no_overlap` is the guarantee; the
  service's pre-check only buys a friendly `409 CAR_NOT_AVAILABLE` instead of a raw violation, and
  a `flush()` inside the `try` turns the race it cannot close into the same 409 on the same request.
- That `catch` covers **`DataIntegrityViolationException` *and* `ConcurrencyFailureException`**.
  Losing the race can surface either way — a constraint violation, or a lock/deadlock failure when
  several inserts wait on each other — and catching only the first turns a lost race into a 500.
  **A lost race must never be a 500.**
- `RentalStatus.blocking()` — `PENDING`, `APPROVED`, `ACTIVE` — is the single definition of "holds
  the car", used by the pre-check, the public date filter, and the constraint. The SQL cannot import
  it, so `constraintAndCodeAgreeOnWhatBlocks` reads `pg_get_constraintdef` and compares.
- **`RentalStateMachine.apply` is the only code that assigns a status**, including the scheduler's —
  which is why the expiry job loops instead of issuing a bulk `UPDATE`. `RentalAction` is the
  transition table as data, and this is where domain events are published from.
- Who may trigger what is the controllers' `@PreAuthorize`; the machine only knows statuses.
  Cancelling additionally requires the pickup time to be in the future.
- **Money is snapshotted at creation** (`dailyPrice`, `totalDays`, `totalPrice`) and never
  recomputed. The client never sends a price.
- `BillingRule` is the one place the day count is decided: a started 24-hour block from pickup, with
  an **exclusive** one-hour grace. 24h is one day, 25h is two — and so 7 days + 1 hour is *eight*
  days, at every boundary alike. That looks wrong and is not; `BillingRuleTest` pins it.
- Client and owner get **different response types**, neither a superset of the other: the client
  sees the company's contact details, the owner sees the client and the licence plate.
- The expiry job's cron is configuration (`rentapi.rentals.expiry-cron`); the test profile sets `-`
  to disable it and calls the service method directly.

## Notifications

- **Events, never inline calls.** `RentalStateMachine` announces every status a rental reaches
  (plus `announceCreated` for the one case that is not a transition), and
  `RentalNotificationListener` turns those into rows. The rental service knows nothing about
  notifications.
- Listeners are `@TransactionalEventListener(AFTER_COMMIT)` — a notification about a rental that
  rolled back would be a lie, and nothing in a listener can roll a booking back. `NotificationWriter`
  therefore runs `REQUIRES_NEW`.
- Events carry **identifiers only**: listeners run on a fresh persistence context, so an entity in
  an event would arrive detached.
- **The audience is on `NotificationType`**, not decided by the listener, so the in-app row and the
  email can never disagree about who gets it. `ACTIVE`/`COMPLETED` produce nothing on purpose.
- `ux_notifications_rental_type` makes one notification per rental per type impossible to exceed,
  which is what makes the reminder job idempotent — there is no "already reminded" flag anywhere.
- `RentalNotificationRepository` is the **one deliberately unscoped** repository. That is safe only
  because nothing in it is reachable from a request; keep it that way.
- Email goes through `EmailDelivery` (retry, swallows the final failure) shared with the identity
  emails, and one Thymeleaf template varied by text keys. The email body carries the *same* stored
  sentence as the in-app row.
- Both jobs' crons are configuration; the test profile sets `-` and calls the methods directly.

## Images

`ImageStorage` keeps the provider swappable: Cloudinary in prod, in-memory (`memory`) for local and
tests. Uploads are `multipart/form-data`, size-limited, and validated on **both** the declared
content type and the magic bytes — a declared content type is attacker-controlled. Storage keys are
UUID-based and independent of entity ids.

Unlike email, storage failures are **not** swallowed: they surface as `502 STORAGE_UNAVAILABLE`. The
one exception is deleting an object after its row is already gone, where failing would roll back a
committed delete; the orphan is logged instead.

## Configuration

- Profiles: `local` (verbose SQL, logging email sender), `test` (Testcontainers), `prod` (no
  defaults for anything secret, docs disabled).
- **Every secret comes from the environment.** `.env` is git-ignored; `.env.example` documents every
  variable without values. `application-prod.yml` deliberately has no fallbacks — a missing
  variable must stop the boot.
- `JwtProperties` validates the signing key at startup (present, Base64, ≥ 256 bits) with an
  actionable message.
- Sentry runs through the logback appender (`logback-spring.xml`), prod-only, DSN from the
  environment. `SentryRequestContextFilter` attaches request context and the user id — never PII.
- Schema is owned by versioned Flyway SQL; `ddl-auto` is `none` in every profile. All timestamps
  are `timestamptz`; `SchemaMigrationTest` enforces that.

## Rate limiting and observability

- `RateLimitFilter` runs **before authentication**, on `/auth/` only — everything else is gated by a
  token, which is a stronger limit than counting requests. A bot challenge would go alongside it.
- The bucket cache is **TTL-evicting and capped** (Caffeine). An unbounded map keyed by caller
  address is a memory leak with a friendly name. An evicted bucket comes back full, which is the
  safe direction to be wrong in.
- The key is **`getRemoteAddr()`, never `X-Forwarded-For`** — that header is attacker-controlled.
  Behind a proxy, set `server.forward-headers-strategy` instead.
- `RequestIdFilter` is ordered **first**, so a request rejected by the rate limiter or the security
  chain still gets an id. Inbound ids are honoured but **sanitised and length-capped** — they reach
  log output, and caller-controlled text in logs is how log injection works.
- `rentals.lifecycle{status=...}` is driven by the *same events as notifications*, so measuring
  costs the domain nothing. Add domain metrics there, not by scattering counters through services.

## Logging

`LoggingAspect` logs entry/exit/duration for every `@RestController` and `@Service`. Redaction has
two layers, and you need both:

- `SensitiveValues.describe` redacts **record components** whose names look like secrets. **If you
  add a DTO carrying a secret, check the field name matches that pattern.**
- `SensitiveValues.isSensitiveMember` redacts the **whole call** when the declaring class or the
  method name looks like it deals in secrets. This is what protects values with no name to judge —
  a bare `String` return, like `OneTimeCodeService.issue`'s verification code.

Anything reading a secret out of the logs (`load/seed.sh` does, for want of an inbox) must parse the
**rendered email**, not the aspect's output.

## API documentation

`docs/API.md` and `docs/openapi.json` are **generated** — `make api-docs` with the app running.
Never hand-edit them. The generator also parses `@PreAuthorize` from the controllers and
`ErrorCode.java`, because OpenAPI records "needs a token" but not "needs to be an owner". If
something in the manual is wrong, fix the source it was derived from.

## Testing

- `AbstractIntegrationTest` gives a full context against a **single PostgreSQL container shared by
  the whole run** (`PostgresContainer`), with the real migrations applied. Each test wipes the
  tables in `@BeforeEach`.
- Email goes to `RecordingEmailSender`; tests read the one-time code out of the rendered HTML.
  Delivery is genuinely async, so use `codeFor` / `awaitLastTo` / `awaitCount`, which wait.
- `SecurityMatrixTest` asserts every endpoint against anonymous / client / owner. **Add a row for
  each new endpoint in the same change.** Note the distinction it draws: a 401 from the filter chain
  (`code: UNAUTHENTICATED`) is a security rejection; a 401 from `/auth/login` with
  `INVALID_CREDENTIALS` is a business answer.
- The Postgres image tag is pinned identically in `PostgresContainer` and both compose files.
  Change all three together — the test schema must match production's engine.
- `SearchQueryBudgetTest` asserts that statement counts **do not grow with page size**. It exists
  because that is how an N+1 gets in — it caught a real one where `dailyPriceFrom` read each car's
  price tiers lazily, costing 30 queries for 25 cars instead of 4. If you touch a mapper or a
  criteria query, this is the test that tells you.
- `EndToEndFlowTest` walks the whole product promise through the API only, with no fixture
  shortcuts. Keep it that way — its value is that it uses nothing the tests invented.
- Real load tests live in `load/` (k6) and are **not** in CI: a threshold tuned to one machine is a
  false alarm on another.

## Checkstyle

`config/checkstyle/checkstyle.xml` is the official Google style from Checkstyle 10.13.0 with exactly
two deviations (120-char lines, 4-space indent) and the two `MissingJavadoc*` rules removed. When
upgrading Checkstyle, re-extract `google_checks.xml` from the new jar and re-apply those changes
rather than hand-patching. Lint is blocking and currently clean, including test sources.
