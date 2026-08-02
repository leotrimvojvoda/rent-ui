# Rent-API — API manual

> **Generated** from the running application's OpenAPI spec by `make api-docs`. Do not edit by hand — regenerate it.

Version `1.0.0` · 34 paths · 40 schemas

---

## Contents

- [Authentication](#authentication)
- [Cities](#cities)
- [Public catalog](#public-catalog)
- [Companies](#companies)
- [Cars](#cars)
- [Rentals](#rentals)
- [Company rentals](#company-rentals)
- [Notifications](#notifications)
- [Conventions](#conventions)
- [Error codes](#error-codes)
- [Schemas](#schemas)

---

## Conventions

**Base URL** — `http://localhost:8080/api/v1`. Every path below is relative to it, so `POST /auth/login` is `POST http://localhost:8080/api/v1/auth/login`.

**Content type** — `application/json` everywhere except image upload, which is `multipart/form-data`. Image bytes never travel inside JSON.

**Authentication** — a bearer token on every non-public request:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

Access tokens last 15 minutes. When one expires you get `401 UNAUTHENTICATED`; call `POST /auth/refresh` with the refresh token to get a new pair. **Refresh tokens rotate** — the old one stops working the moment you use it, so always store the new one.

**Timestamps** are ISO-8601 in UTC (`2026-08-04T09:00:00Z`). Send them that way too.

**Money** is a JSON **number** with two decimals (`"dailyPrice": 40.00`). Note that `JSON.parse` turns that into the double `40`, so format for display with `toFixed(2)` rather than printing it raw. For summing many amounts, or anywhere a cent matters, work in integer cents or a decimal library — do not accumulate doubles.

On the way *in*, both `40.00` and `"40.00"` are accepted.

**Paging** — every collection returns the same envelope:

```json
{
  "data": [
    "..."
  ],
  "page": 0,
  "size": 20,
  "totalPages": 3,
  "totalElements": 47
}
```

Request pages with `?page=0&size=20`. `size` is **capped at 100** server-side.

**Request tracing** — every response carries an `X-Request-Id` header. Include it when reporting a bug and it can be found in the logs. You may also send your own.

**Rate limiting** — `/auth/*` allows 10 requests per minute per caller. Exceeding it gives `429 TOO_MANY_REQUESTS` with a `Retry-After` header (seconds). Nothing else is rate limited.

**404 vs 403** — asking for something that exists but is not yours returns **404**, not 403. This is deliberate: a 403 would confirm the thing exists. Do not treat a 404 as "deleted".

---

## Authentication

### `POST /auth/login`

Exchange credentials for an access token and a refresh token.

**Access:** **Public** — no token

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | — |
| `password` | string | yes | — |

```json
{
  "email": "client@example.com",
  "password": "Sup3rSecret!"
}
```

**Responses**

| Status | Meaning |
|---|---|
| `200` | Authenticated |
| `401` | Bad credentials or unverified account |

Example `200` response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "8f2b1c9e-...-opaque",
  "tokenType": "string",
  "expiresInSeconds": 0
}
```

---

### `POST /auth/logout`

Revoke every refresh token of the current user.

**Access:** Any signed-in user

**Responses**

| Status | Meaning |
|---|---|
| `204` | Logged out |

---

### `GET /auth/me`

The currently authenticated user.

**Access:** Any signed-in user

**Responses**

| Status | Meaning |
|---|---|
| `200` | Current user |
| `401` | Not authenticated |

Example `200` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "firstName": "Arben",
  "lastName": "Krasniqi",
  "email": "client@example.com",
  "role": "CLIENT",
  "enabled": false,
  "createdAt": "2026-07-28T11:20:31Z"
}
```

---

### `POST /auth/password-reset/confirm`

Set a new password using a reset code.

**Access:** **Public** — no token

Revokes every refresh token of the account.

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | — |
| `code` | string | yes | — |
| `newPassword` | string | yes | — |

```json
{
  "email": "client@example.com",
  "code": "123456",
  "newPassword": "Sup3rSecret!"
}
```

**Responses**

| Status | Meaning |
|---|---|
| `200` | Password changed |
| `409` | Code invalid, expired, or exhausted |

Example `200` response:

```json
{
  "message": "New rental request for your Škoda Octavia."
}
```

---

### `POST /auth/password-reset/request`

Email a password-reset code.

**Access:** **Public** — no token

Always responds 202 with the same body, whether or not the email is registered.

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | — |

```json
{
  "email": "client@example.com"
}
```

**Responses**

| Status | Meaning |
|---|---|
| `202` | Request accepted |

Example `202` response:

```json
{
  "message": "New rental request for your Škoda Octavia."
}
```

---

### `POST /auth/refresh`

Exchange a refresh token for a new pair.

**Access:** **Public** — no token

Refresh tokens rotate: the presented token is revoked on use.

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `refreshToken` | string | yes | — |

```json
{
  "refreshToken": "8f2b1c9e-...-opaque"
}
```

**Responses**

| Status | Meaning |
|---|---|
| `200` | New token pair issued |
| `401` | Token unknown, expired, or revoked |

Example `200` response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "8f2b1c9e-...-opaque",
  "tokenType": "string",
  "expiresInSeconds": 0
}
```

---

### `POST /auth/resend-verification`

Send a fresh verification code, invalidating any previous one.

**Access:** **Public** — no token

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | — |

```json
{
  "email": "client@example.com"
}
```

**Responses**

| Status | Meaning |
|---|---|
| `202` | Request accepted |

Example `202` response:

```json
{
  "message": "New rental request for your Škoda Octavia."
}
```

---

### `POST /auth/signup`

Register as a client or an owner.

**Access:** **Public** — no token

Always responds 202 with the same body, whether or not the email is already registered. A verification code is emailed to new and unverified accounts.

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `firstName` | string | yes | Max 100 characters. |
| `lastName` | string | yes | Max 100 characters. |
| `email` | string | yes | — |
| `password` | string | yes | — |
| `role` | enum: `CLIENT`, `OWNER` | yes | — |

```json
{
  "firstName": "Arben",
  "lastName": "Krasniqi",
  "email": "client@example.com",
  "password": "Sup3rSecret!",
  "role": "CLIENT"
}
```

**Responses**

| Status | Meaning |
|---|---|
| `202` | Signup accepted |
| `400` | Validation failed |

Example `202` response:

```json
{
  "message": "New rental request for your Škoda Octavia."
}
```

---

### `POST /auth/verify-email`

Confirm an email address with the code that was sent to it.

**Access:** **Public** — no token

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | — |
| `code` | string | yes | — |

```json
{
  "email": "client@example.com",
  "code": "123456"
}
```

**Responses**

| Status | Meaning |
|---|---|
| `200` | Email verified |
| `409` | Code invalid, expired, or exhausted |

Example `200` response:

```json
{
  "message": "New rental request for your Škoda Octavia."
}
```

---

## Cities

### `GET /cities`

Every city a company can be located in.

**Access:** **Public** — no token

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Prishtina Rentals",
    "country": "XK"
  }
]
```

---

## Public catalog

### `POST /public/cars/filter`

Search published cars.

**Access:** **Public** — no token

Filters live in the request body; paging and size are query parameters
(`?page=0&size=20`). An empty body returns everything published.

Supplying `availableFrom` and `availableTo` hides cars already booked for part of that
range, so every result is a car that can actually be requested. Both are required
together.

**Query parameters**

| Name | Type | Required | Notes |
|---|---|---|---|
| `page` | integer | no | 0-based. Default `0`. |
| `size` | integer | no | Default `20`, **capped at 100**. |
| `sort` | string | no | Rarely needed; most endpoints have a fixed order. |

**Request body** (`application/json`) — optional

| Field | Type | Required | Notes |
|---|---|---|---|
| `cityId` | string (UUID) | no | — |
| `make` | string | no | Max 80 characters. |
| `model` | string | no | Max 80 characters. |
| `minDailyPrice` | number | no | — |
| `maxDailyPrice` | number | no | — |
| `availableFrom` | string (ISO-8601 UTC) | no | — |
| `availableTo` | string (ISO-8601 UTC) | no | — |
| `sort` | enum: `PRICE_ASC`, `PRICE_DESC`, `NEWEST`, `OLDEST` | no | — |

```json
{
  "cityId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "make": "Škoda",
  "model": "Octavia",
  "minDailyPrice": 20.00,
  "maxDailyPrice": 80.00,
  "availableFrom": "2026-08-04T09:00:00Z",
  "availableTo": "2026-08-07T09:00:00Z",
  "sort": "PRICE_ASC"
}
```

**Responses**

| Status | Meaning |
|---|---|
| `200` | A page of matching cars |
| `400` | Invalid filter |

Example `200` response:

```json
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "make": "Škoda",
      "model": "Octavia",
      "modelYear": 2022,
      "dailyPriceFrom": 30.00,
      "primaryImageUrl": "string",
      "company": {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "name": "Prishtina Rentals",
        "description": "Family-run since 2012.",
        "city": "Prishtinë",
        "address": "Rruga B 12, 10000"
      }
    }
  ],
  "page": 0,
  "size": 0,
  "totalPages": 0,
  "totalElements": 0
}
```

---

### `GET /public/cars/{carId}`

One published car, with its photos and pricing.

**Access:** **Public** — no token

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `carId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `200` | The car |
| `404` | No such published car — unpublished and retired cars are indistinguishable from missing ones |

Example `200` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "make": "Škoda",
  "model": "Octavia",
  "modelYear": 2022,
  "defaultDailyPrice": 40.00,
  "dailyPriceFrom": 30.00,
  "priceTiers": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "minDays": 3,
      "maxDays": 6,
      "dailyPrice": 30.00
    }
  ],
  "imageUrls": [
    "string"
  ],
  "company": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Prishtina Rentals",
    "description": "Family-run since 2012.",
    "city": "Prishtinë",
    "address": "Rruga B 12, 10000"
  }
}
```

---

## Companies

### `POST /companies`

Create the current owner's company.

**Access:** **OWNER** only

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Max 150 characters. |
| `description` | string | no | Max 2000 characters. |
| `cityId` | string (UUID) | yes | — |
| `address` | string | yes | Max 255 characters. |
| `contactEmail` | string | yes | — |
| `contactPhone` | string | yes | — |

```json
{
  "name": "Prishtina Rentals",
  "description": "Family-run since 2012.",
  "cityId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "address": "Rruga B 12, 10000",
  "contactEmail": "company@example.com",
  "contactPhone": "+38344123456"
}
```

**Responses**

| Status | Meaning |
|---|---|
| `201` | Company created |
| `409` | This owner already has a company |

Example `201` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Prishtina Rentals",
  "description": "Family-run since 2012.",
  "city": "Prishtinë",
  "address": "Rruga B 12, 10000",
  "contactEmail": "company@example.com",
  "contactPhone": "+38344123456",
  "createdAt": "2026-07-28T11:20:31Z"
}
```

---

### `GET /companies/me`

The current owner's company.

**Access:** **OWNER** only

**Responses**

| Status | Meaning |
|---|---|
| `200` | The company |
| `409` | No company created yet |

Example `200` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Prishtina Rentals",
  "description": "Family-run since 2012.",
  "city": "Prishtinë",
  "address": "Rruga B 12, 10000",
  "contactEmail": "company@example.com",
  "contactPhone": "+38344123456",
  "createdAt": "2026-07-28T11:20:31Z"
}
```

---

### `PUT /companies/me`

Update the current owner's company.

**Access:** **OWNER** only

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Max 150 characters. |
| `description` | string | no | Max 2000 characters. |
| `cityId` | string (UUID) | yes | — |
| `address` | string | yes | Max 255 characters. |
| `contactEmail` | string | yes | — |
| `contactPhone` | string | yes | — |

```json
{
  "name": "Prishtina Rentals",
  "description": "Family-run since 2012.",
  "cityId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "address": "Rruga B 12, 10000",
  "contactEmail": "company@example.com",
  "contactPhone": "+38344123456"
}
```

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Prishtina Rentals",
  "description": "Family-run since 2012.",
  "city": "Prishtinë",
  "address": "Rruga B 12, 10000",
  "contactEmail": "company@example.com",
  "contactPhone": "+38344123456",
  "createdAt": "2026-07-28T11:20:31Z"
}
```

---

## Cars

### `GET /cars`

The current owner's cars, paged.

**Access:** **OWNER** only

**Query parameters**

| Name | Type | Required | Notes |
|---|---|---|---|
| `page` | integer | no | 0-based. Default `0`. |
| `size` | integer | no | Default `20`, **capped at 100**. |
| `sort` | string | no | Rarely needed; most endpoints have a fixed order. |

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "make": "Škoda",
      "model": "Octavia",
      "modelYear": 2022,
      "licensePlate": "01-123-AB",
      "defaultDailyPrice": 40.00,
      "published": false,
      "status": "ACTIVE"
    }
  ],
  "page": 0,
  "size": 0,
  "totalPages": 0,
  "totalElements": 0
}
```

---

### `POST /cars`

Add a car to the current owner's company.

**Access:** **OWNER** only

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `make` | string | yes | Max 80 characters. |
| `model` | string | yes | Max 80 characters. |
| `modelYear` | integer | yes | — |
| `licensePlate` | string | yes | Max 20 characters. |
| `defaultDailyPrice` | number | yes | — |
| `status` | enum: `ACTIVE`, `IN_MAINTENANCE`, `RETIRED` | yes | — |

```json
{
  "make": "Škoda",
  "model": "Octavia",
  "modelYear": 2022,
  "licensePlate": "01-123-AB",
  "defaultDailyPrice": 40.00,
  "status": "ACTIVE"
}
```

**Responses**

| Status | Meaning |
|---|---|
| `201` | Car created |
| `409` | Plate already used, or no company yet |

Example `201` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "make": "Škoda",
  "model": "Octavia",
  "modelYear": 2022,
  "licensePlate": "01-123-AB",
  "defaultDailyPrice": 40.00,
  "published": false,
  "status": "ACTIVE",
  "priceTiers": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "minDays": 3,
      "maxDays": 6,
      "dailyPrice": 30.00
    }
  ],
  "images": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "url": "https://res.cloudinary.com/demo/image/upload/v1/cars/photo.jpg",
      "position": 0
    }
  ],
  "createdAt": "2026-07-28T11:20:31Z",
  "updatedAt": "2026-08-04T09:00:00Z"
}
```

---

### `DELETE /cars/{carId}`

Remove a car from the fleet.

**Access:** **OWNER** only

A car that has never been rented is deleted outright, along with its stored images.
One with rental history is retired and unpublished instead, so past rentals keep
naming a real car. Either way it leaves the catalog and cannot be booked again.

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `carId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

---

### `GET /cars/{carId}`

One car, with its price tiers and images.

**Access:** **OWNER** only

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `carId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `404` | No such car in this company |

---

### `PUT /cars/{carId}`

Update a car.

**Access:** **OWNER** only

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `carId` | string (UUID) | — |

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `make` | string | yes | Max 80 characters. |
| `model` | string | yes | Max 80 characters. |
| `modelYear` | integer | yes | — |
| `licensePlate` | string | yes | Max 20 characters. |
| `defaultDailyPrice` | number | yes | — |
| `status` | enum: `ACTIVE`, `IN_MAINTENANCE`, `RETIRED` | yes | — |

```json
{
  "make": "Škoda",
  "model": "Octavia",
  "modelYear": 2022,
  "licensePlate": "01-123-AB",
  "defaultDailyPrice": 40.00,
  "status": "ACTIVE"
}
```

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "make": "Škoda",
  "model": "Octavia",
  "modelYear": 2022,
  "licensePlate": "01-123-AB",
  "defaultDailyPrice": 40.00,
  "published": false,
  "status": "ACTIVE",
  "priceTiers": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "minDays": 3,
      "maxDays": 6,
      "dailyPrice": 30.00
    }
  ],
  "images": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "url": "https://res.cloudinary.com/demo/image/upload/v1/cars/photo.jpg",
      "position": 0
    }
  ],
  "createdAt": "2026-07-28T11:20:31Z",
  "updatedAt": "2026-08-04T09:00:00Z"
}
```

---

### `POST /cars/{carId}/images`

Upload a photo.

**Access:** **OWNER** only

multipart/form-data only — image data never travels as Base64 in JSON.

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `carId` | string (UUID) | — |

**Request body** (`multipart/form-data`) — optional

| Part | Type | Notes |
|---|---|---|
| `file` | file | JPEG, PNG or WebP. Max 10 MB. |

**Responses**

| Status | Meaning |
|---|---|
| `201` | Image stored |
| `400` | Empty or not an accepted image format |
| `413` | File too large |
| `502` | The image service is unavailable |

Example `201` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "url": "https://res.cloudinary.com/demo/image/upload/v1/cars/photo.jpg",
  "position": 0
}
```

---

### `DELETE /cars/{carId}/images/{imageId}`

Remove a photo, from the catalog and from storage.

**Access:** **OWNER** only

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `carId` | string (UUID) | — |
| `imageId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

---

### `PUT /cars/{carId}/price-tiers`

Replace the car's price tiers.

**Access:** **OWNER** only

The whole set is replaced at once. Brackets may not overlap.

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `carId` | string (UUID) | — |

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `tiers` | array of [`PriceTierRequest`](#pricetierrequest) | yes | — |

```json
{
  "tiers": [
    {
      "minDays": 3,
      "maxDays": 6,
      "dailyPrice": 30.00
    }
  ]
}
```

**Responses**

| Status | Meaning |
|---|---|
| `200` | Tiers replaced |
| `409` | Brackets overlap |

Example `200` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "make": "Škoda",
  "model": "Octavia",
  "modelYear": 2022,
  "licensePlate": "01-123-AB",
  "defaultDailyPrice": 40.00,
  "published": false,
  "status": "ACTIVE",
  "priceTiers": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "minDays": 3,
      "maxDays": 6,
      "dailyPrice": 30.00
    }
  ],
  "images": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "url": "https://res.cloudinary.com/demo/image/upload/v1/cars/photo.jpg",
      "position": 0
    }
  ],
  "createdAt": "2026-07-28T11:20:31Z",
  "updatedAt": "2026-08-04T09:00:00Z"
}
```

---

### `PUT /cars/{carId}/publish`

Make the car visible in the public catalog.

**Access:** **OWNER** only

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `carId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "make": "Škoda",
  "model": "Octavia",
  "modelYear": 2022,
  "licensePlate": "01-123-AB",
  "defaultDailyPrice": 40.00,
  "published": false,
  "status": "ACTIVE",
  "priceTiers": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "minDays": 3,
      "maxDays": 6,
      "dailyPrice": 30.00
    }
  ],
  "images": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "url": "https://res.cloudinary.com/demo/image/upload/v1/cars/photo.jpg",
      "position": 0
    }
  ],
  "createdAt": "2026-07-28T11:20:31Z",
  "updatedAt": "2026-08-04T09:00:00Z"
}
```

---

### `PUT /cars/{carId}/unpublish`

Hide the car from the public catalog.

**Access:** **OWNER** only

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `carId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "make": "Škoda",
  "model": "Octavia",
  "modelYear": 2022,
  "licensePlate": "01-123-AB",
  "defaultDailyPrice": 40.00,
  "published": false,
  "status": "ACTIVE",
  "priceTiers": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "minDays": 3,
      "maxDays": 6,
      "dailyPrice": 30.00
    }
  ],
  "images": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "url": "https://res.cloudinary.com/demo/image/upload/v1/cars/photo.jpg",
      "position": 0
    }
  ],
  "createdAt": "2026-07-28T11:20:31Z",
  "updatedAt": "2026-08-04T09:00:00Z"
}
```

---

## Rentals

### `GET /rentals`

The caller's rentals, newest first, optionally filtered by status.

**Access:** **CLIENT** only

**Query parameters**

| Name | Type | Required | Notes |
|---|---|---|---|
| `status` | enum: `PENDING`, `APPROVED`, `ACTIVE`, `COMPLETED`, `REJECTED`, `CANCELLED`, `EXPIRED` | no | — |
| `page` | integer | no | 0-based. Default `0`. |
| `size` | integer | no | Default `20`, **capped at 100**. |
| `sort` | string | no | Rarely needed; most endpoints have a fixed order. |

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "status": "PENDING",
      "startAt": "2026-08-04T09:00:00Z",
      "endAt": "2026-08-07T09:00:00Z",
      "dailyPrice": 30.00,
      "totalDays": 3,
      "totalPrice": 90.00,
      "createdAt": "2026-07-28T11:20:31Z",
      "car": {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "make": "Škoda",
        "model": "Octavia",
        "modelYear": 2022
      },
      "company": {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "name": "Prishtina Rentals",
        "city": "Prishtinë",
        "address": "Rruga B 12, 10000",
        "contactEmail": "company@example.com",
        "contactPhone": "+38344123456"
      }
    }
  ],
  "page": 0,
  "size": 0,
  "totalPages": 0,
  "totalElements": 0
}
```

---

### `POST /rentals`

Request a car for a date range.

**Access:** **CLIENT** only

The price is not sent by the caller: it is computed from the car's price tiers and
snapshotted onto the rental, so later repricing never changes what was agreed.

The request starts as PENDING and waits for the owner. If the start date arrives with
no decision, a scheduled job expires it.

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `carId` | string (UUID) | yes | — |
| `startAt` | string (ISO-8601 UTC) | yes | — |
| `endAt` | string (ISO-8601 UTC) | yes | — |

```json
{
  "carId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "startAt": "2026-08-04T09:00:00Z",
  "endAt": "2026-08-07T09:00:00Z"
}
```

**Responses**

| Status | Meaning |
|---|---|
| `201` | Request created, awaiting the owner |
| `400` | The dates are not a usable range |
| `404` | No such car in the public catalog |
| `409` | The car is already booked for those dates |

Example `201` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "PENDING",
  "startAt": "2026-08-04T09:00:00Z",
  "endAt": "2026-08-07T09:00:00Z",
  "dailyPrice": 30.00,
  "totalDays": 3,
  "totalPrice": 90.00,
  "createdAt": "2026-07-28T11:20:31Z",
  "car": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "make": "Škoda",
    "model": "Octavia",
    "modelYear": 2022
  },
  "company": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Prishtina Rentals",
    "city": "Prishtinë",
    "address": "Rruga B 12, 10000",
    "contactEmail": "company@example.com",
    "contactPhone": "+38344123456"
  }
}
```

---

### `GET /rentals/{rentalId}`

One of the caller's own rentals.

**Access:** **CLIENT** only

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `rentalId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `404` | Not the caller's rental |

---

### `POST /rentals/{rentalId}/cancel`

Withdraw a request that has not started.

**Access:** **CLIENT** only

Allowed while PENDING or APPROVED, up until the pickup time.

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `rentalId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `200` | Cancelled |
| `409` | Already started, or in a status that cannot be cancelled |

Example `200` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "PENDING",
  "startAt": "2026-08-04T09:00:00Z",
  "endAt": "2026-08-07T09:00:00Z",
  "dailyPrice": 30.00,
  "totalDays": 3,
  "totalPrice": 90.00,
  "createdAt": "2026-07-28T11:20:31Z",
  "car": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "make": "Škoda",
    "model": "Octavia",
    "modelYear": 2022
  },
  "company": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Prishtina Rentals",
    "city": "Prishtinë",
    "address": "Rruga B 12, 10000",
    "contactEmail": "company@example.com",
    "contactPhone": "+38344123456"
  }
}
```

---

## Company rentals

### `GET /company/rentals`

Rentals of the current company's cars, newest first.

**Access:** **OWNER** only

**Query parameters**

| Name | Type | Required | Notes |
|---|---|---|---|
| `status` | enum: `PENDING`, `APPROVED`, `ACTIVE`, `COMPLETED`, `REJECTED`, `CANCELLED`, `EXPIRED` | no | — |
| `page` | integer | no | 0-based. Default `0`. |
| `size` | integer | no | Default `20`, **capped at 100**. |
| `sort` | string | no | Rarely needed; most endpoints have a fixed order. |

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "status": "PENDING",
      "startAt": "2026-08-04T09:00:00Z",
      "endAt": "2026-08-07T09:00:00Z",
      "dailyPrice": 30.00,
      "totalDays": 3,
      "totalPrice": 90.00,
      "createdAt": "2026-07-28T11:20:31Z",
      "car": {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "make": "Škoda",
        "model": "Octavia",
        "modelYear": 2022,
        "licensePlate": "01-123-AB"
      },
      "client": {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "firstName": "Arben",
        "lastName": "Krasniqi",
        "email": "client@example.com"
      }
    }
  ],
  "page": 0,
  "size": 0,
  "totalPages": 0,
  "totalElements": 0
}
```

---

### `GET /company/rentals/{rentalId}`

One rental of the current company.

**Access:** **OWNER** only

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `rentalId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `404` | Not this company's rental |

---

### `POST /company/rentals/{rentalId}/activate`

Record that the car was handed over.

**Access:** **OWNER** only

APPROVED → ACTIVE.

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `rentalId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "PENDING",
  "startAt": "2026-08-04T09:00:00Z",
  "endAt": "2026-08-07T09:00:00Z",
  "dailyPrice": 30.00,
  "totalDays": 3,
  "totalPrice": 90.00,
  "createdAt": "2026-07-28T11:20:31Z",
  "car": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "make": "Škoda",
    "model": "Octavia",
    "modelYear": 2022,
    "licensePlate": "01-123-AB"
  },
  "client": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "firstName": "Arben",
    "lastName": "Krasniqi",
    "email": "client@example.com"
  }
}
```

---

### `POST /company/rentals/{rentalId}/approve`

Accept a pending request and hold the car.

**Access:** **OWNER** only

PENDING → APPROVED. Any other starting status is a 409.

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `rentalId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `200` | Approved |
| `409` | Not a pending request |

Example `200` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "PENDING",
  "startAt": "2026-08-04T09:00:00Z",
  "endAt": "2026-08-07T09:00:00Z",
  "dailyPrice": 30.00,
  "totalDays": 3,
  "totalPrice": 90.00,
  "createdAt": "2026-07-28T11:20:31Z",
  "car": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "make": "Škoda",
    "model": "Octavia",
    "modelYear": 2022,
    "licensePlate": "01-123-AB"
  },
  "client": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "firstName": "Arben",
    "lastName": "Krasniqi",
    "email": "client@example.com"
  }
}
```

---

### `POST /company/rentals/{rentalId}/complete`

Record that the car came back.

**Access:** **OWNER** only

ACTIVE → COMPLETED. The car is free for new bookings again.

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `rentalId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "PENDING",
  "startAt": "2026-08-04T09:00:00Z",
  "endAt": "2026-08-07T09:00:00Z",
  "dailyPrice": 30.00,
  "totalDays": 3,
  "totalPrice": 90.00,
  "createdAt": "2026-07-28T11:20:31Z",
  "car": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "make": "Škoda",
    "model": "Octavia",
    "modelYear": 2022,
    "licensePlate": "01-123-AB"
  },
  "client": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "firstName": "Arben",
    "lastName": "Krasniqi",
    "email": "client@example.com"
  }
}
```

---

### `POST /company/rentals/{rentalId}/reject`

Decline a pending request.

**Access:** **OWNER** only

PENDING → REJECTED.

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `rentalId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "PENDING",
  "startAt": "2026-08-04T09:00:00Z",
  "endAt": "2026-08-07T09:00:00Z",
  "dailyPrice": 30.00,
  "totalDays": 3,
  "totalPrice": 90.00,
  "createdAt": "2026-07-28T11:20:31Z",
  "car": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "make": "Škoda",
    "model": "Octavia",
    "modelYear": 2022,
    "licensePlate": "01-123-AB"
  },
  "client": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "firstName": "Arben",
    "lastName": "Krasniqi",
    "email": "client@example.com"
  }
}
```

---

## Notifications

### `GET /notifications`

The caller's notifications, newest first.

**Access:** Any signed-in user

Pass `unreadOnly=true` for just the ones not yet read.

**Query parameters**

| Name | Type | Required | Notes |
|---|---|---|---|
| `unreadOnly` | boolean | no | — |
| `page` | integer | no | 0-based. Default `0`. |
| `size` | integer | no | Default `20`, **capped at 100**. |
| `sort` | string | no | Rarely needed; most endpoints have a fixed order. |

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "type": "RENTAL_REQUESTED",
      "rentalId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "message": "New rental request for your Škoda Octavia.",
      "read": false,
      "readAt": null,
      "createdAt": "2026-07-28T11:20:31Z"
    }
  ],
  "page": 0,
  "size": 0,
  "totalPages": 0,
  "totalElements": 0
}
```

---

### `POST /notifications/read-all`

Mark everything unread as read.

**Access:** Any signed-in user

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
{
  "unread": 3
}
```

---

### `GET /notifications/unread-count`

How many are unread.

**Access:** Any signed-in user

Separate from the listing because a client polls this far more often than it reads anything.

**Responses**

| Status | Meaning |
|---|---|
| `200` | OK |

Example `200` response:

```json
{
  "unread": 3
}
```

---

### `POST /notifications/{notificationId}/read`

Mark one as read.

**Access:** Any signed-in user

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `notificationId` | string (UUID) | — |

**Responses**

| Status | Meaning |
|---|---|
| `404` | Not the caller's notification |

---

## Error codes

Every error — from a controller, from the security filter chain, or from the rate limiter — uses one envelope:

```json
{
  "code": "VALIDATION_FAILED",
  "message": "One or more fields are invalid.",
  "timestamp": "2026-08-04T09:00:00Z",
  "path": "/api/v1/auth/signup",
  "fieldErrors": [
    {
      "field": "password",
      "message": "Password must be at least 10 characters..."
    }
  ]
}
```

**Branch on `code`, never on `message`.** `code` is a stable contract; `message` is localised copy that changes freely. `fieldErrors` is present only for validation failures, and never echoes the rejected value back.

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | One or more fields are invalid. |
| `MALFORMED_REQUEST` | 400 | The request body or parameters could not be read. |
| `UNSUPPORTED_IMAGE_TYPE` | 400 | Only JPEG, PNG, and WebP images are accepted. |
| `EMPTY_UPLOAD` | 400 | No file was uploaded. |
| `INVALID_RENTAL_PERIOD` | 400 | The return date must be after the pickup date. |
| `UNAUTHENTICATED` | 401 | Authentication is required. |
| `INVALID_CREDENTIALS` | 401 | Invalid email or password. |
| `ACCOUNT_NOT_VERIFIED` | 401 | This account has not been verified yet. Check your email for the verification code. |
| `ACCOUNT_DISABLED` | 401 | This account is not active. |
| `INVALID_REFRESH_TOKEN` | 401 | The refresh token is invalid, expired, or has been revoked. |
| `ACCESS_DENIED` | 403 | You are not allowed to perform this action. |
| `RESOURCE_NOT_FOUND` | 404 | The requested resource does not exist. |
| `ENDPOINT_NOT_FOUND` | 404 | No such endpoint. |
| `METHOD_NOT_ALLOWED` | 405 | That HTTP method is not supported for this endpoint. |
| `CONFLICT` | 409 | The request conflicts with the current state of the resource. |
| `INVALID_VERIFICATION_CODE` | 409 | The code is not valid. |
| `VERIFICATION_CODE_EXPIRED` | 409 | The code has expired. Request a new one. |
| `TOO_MANY_VERIFICATION_ATTEMPTS` | 409 | Too many incorrect attempts. Request a new code. |
| `COMPANY_REQUIRED` | 409 | Create your company before managing cars. |
| `COMPANY_ALREADY_EXISTS` | 409 | You already have a company. |
| `DUPLICATE_LICENSE_PLATE` | 409 | A car with that licence plate already exists in your company. |
| `OVERLAPPING_PRICE_TIERS` | 409 | Price tiers must not cover overlapping day ranges. |
| `CAR_NOT_AVAILABLE` | 409 | That car is already booked for part of those dates. |
| `INVALID_RENTAL_TRANSITION` | 409 | This rental cannot change that way from its current status. |
| `RENTAL_ALREADY_STARTED` | 409 | The pickup time has passed, so this rental can no longer be cancelled. |
| `PAYLOAD_TOO_LARGE` | 413 | The uploaded file is too large. |
| `TOO_MANY_REQUESTS` | 429 | Too many requests. Please wait a moment and try again. |
| `INTERNAL_ERROR` | 500 | Something went wrong on our side. |
| `STORAGE_UNAVAILABLE` | 502 | The image service is unavailable. Nothing was saved; please try again. |

---

## Schemas

Every object the API sends or accepts. Endpoint sections link here.

### ApiError

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | string | no | — |
| `message` | string | no | — |
| `timestamp` | string (ISO-8601 UTC) | no | — |
| `path` | string | no | — |
| `fieldErrors` | array of [`FieldError`](#fielderror) | no | — |

### CarImageResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `url` | string | no | — |
| `position` | integer | no | — |

### CarResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `make` | string | no | — |
| `model` | string | no | — |
| `modelYear` | integer | no | — |
| `licensePlate` | string | no | — |
| `defaultDailyPrice` | number | no | — |
| `published` | boolean | no | — |
| `status` | enum: `ACTIVE`, `IN_MAINTENANCE`, `RETIRED` | no | — |
| `priceTiers` | array of [`PriceTierResponse`](#pricetierresponse) | no | — |
| `images` | array of [`CarImageResponse`](#carimageresponse) | no | — |
| `createdAt` | string (ISO-8601 UTC) | no | — |
| `updatedAt` | string (ISO-8601 UTC) | no | — |

### CarSummaryResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `make` | string | no | — |
| `model` | string | no | — |
| `modelYear` | integer | no | — |
| `licensePlate` | string | no | — |
| `defaultDailyPrice` | number | no | — |
| `published` | boolean | no | — |
| `status` | enum: `ACTIVE`, `IN_MAINTENANCE`, `RETIRED` | no | — |

### CityResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `name` | string | no | — |
| `country` | string | no | — |

### CompanyRentalCarResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `make` | string | no | — |
| `model` | string | no | — |
| `modelYear` | integer | no | — |
| `licensePlate` | string | no | — |

### CompanyRentalResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `status` | enum: `PENDING`, `APPROVED`, `ACTIVE`, `COMPLETED`, `REJECTED`, `CANCELLED`, `EXPIRED` | no | — |
| `startAt` | string (ISO-8601 UTC) | no | — |
| `endAt` | string (ISO-8601 UTC) | no | — |
| `dailyPrice` | number | no | — |
| `totalDays` | integer | no | — |
| `totalPrice` | number | no | — |
| `createdAt` | string (ISO-8601 UTC) | no | — |
| `car` | [`CompanyRentalCarResponse`](#companyrentalcarresponse) | no | — |
| `client` | [`RentalClientResponse`](#rentalclientresponse) | no | — |

### CompanyResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `name` | string | no | — |
| `description` | string | no | — |
| `city` | [`CityResponse`](#cityresponse) | no | — |
| `address` | string | no | — |
| `contactEmail` | string | no | — |
| `contactPhone` | string | no | — |
| `createdAt` | string (ISO-8601 UTC) | no | — |

### CreateRentalRequest

| Field | Type | Required | Notes |
|---|---|---|---|
| `carId` | string (UUID) | yes | — |
| `startAt` | string (ISO-8601 UTC) | yes | — |
| `endAt` | string (ISO-8601 UTC) | yes | — |

### EmailRequest

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | — |

### FieldError

| Field | Type | Required | Notes |
|---|---|---|---|
| `field` | string | no | — |
| `message` | string | no | — |

### LoginRequest

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | — |
| `password` | string | yes | — |

### MessageResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | no | — |

### NotificationResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `type` | enum: `RENTAL_REQUESTED`, `RENTAL_APPROVED`, `RENTAL_REJECTED`, `RENTAL_CANCELLED`, `RENTAL_EXPIRED`, `RENTAL_PICKUP_REMINDER`, `RENTAL_RETURN_REMINDER` | no | — |
| `rentalId` | string (UUID) | no | — |
| `message` | string | no | — |
| `read` | boolean | no | — |
| `readAt` | string (ISO-8601 UTC) | no | — |
| `createdAt` | string (ISO-8601 UTC) | no | — |

### PageResponseCarSummaryResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `data` | array of [`CarSummaryResponse`](#carsummaryresponse) | no | — |
| `page` | integer | no | — |
| `size` | integer | no | — |
| `totalPages` | integer | no | — |
| `totalElements` | integer | no | — |

### PageResponseCompanyRentalResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `data` | array of [`CompanyRentalResponse`](#companyrentalresponse) | no | — |
| `page` | integer | no | — |
| `size` | integer | no | — |
| `totalPages` | integer | no | — |
| `totalElements` | integer | no | — |

### PageResponseNotificationResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `data` | array of [`NotificationResponse`](#notificationresponse) | no | — |
| `page` | integer | no | — |
| `size` | integer | no | — |
| `totalPages` | integer | no | — |
| `totalElements` | integer | no | — |

### PageResponsePublicCarSummaryResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `data` | array of [`PublicCarSummaryResponse`](#publiccarsummaryresponse) | no | — |
| `page` | integer | no | — |
| `size` | integer | no | — |
| `totalPages` | integer | no | — |
| `totalElements` | integer | no | — |

### PageResponseRentalResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `data` | array of [`RentalResponse`](#rentalresponse) | no | — |
| `page` | integer | no | — |
| `size` | integer | no | — |
| `totalPages` | integer | no | — |
| `totalElements` | integer | no | — |

### Pageable

| Field | Type | Required | Notes |
|---|---|---|---|
| `page` | integer | no | — |
| `size` | integer | no | — |
| `sort` | array of string | no | — |

### PasswordResetConfirmRequest

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | — |
| `code` | string | yes | — |
| `newPassword` | string | yes | — |

### PriceTierRequest

| Field | Type | Required | Notes |
|---|---|---|---|
| `minDays` | integer | yes | — |
| `maxDays` | integer | no | — |
| `dailyPrice` | number | yes | — |

### PriceTierResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `minDays` | integer | no | — |
| `maxDays` | integer | no | — |
| `dailyPrice` | number | no | — |

### PublicCarDetailResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `make` | string | no | — |
| `model` | string | no | — |
| `modelYear` | integer | no | — |
| `defaultDailyPrice` | number | no | — |
| `dailyPriceFrom` | number | no | — |
| `priceTiers` | array of [`PriceTierResponse`](#pricetierresponse) | no | — |
| `imageUrls` | array of string | no | — |
| `company` | [`PublicCompanyResponse`](#publiccompanyresponse) | no | — |

### PublicCarFilterRequest

| Field | Type | Required | Notes |
|---|---|---|---|
| `cityId` | string (UUID) | no | — |
| `make` | string | no | Max 80 characters. |
| `model` | string | no | Max 80 characters. |
| `minDailyPrice` | number | no | — |
| `maxDailyPrice` | number | no | — |
| `availableFrom` | string (ISO-8601 UTC) | no | — |
| `availableTo` | string (ISO-8601 UTC) | no | — |
| `sort` | enum: `PRICE_ASC`, `PRICE_DESC`, `NEWEST`, `OLDEST` | no | — |

### PublicCarSummaryResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `make` | string | no | — |
| `model` | string | no | — |
| `modelYear` | integer | no | — |
| `dailyPriceFrom` | number | no | — |
| `primaryImageUrl` | string | no | — |
| `company` | [`PublicCompanyResponse`](#publiccompanyresponse) | no | — |

### PublicCompanyResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `name` | string | no | — |
| `description` | string | no | — |
| `city` | [`CityResponse`](#cityresponse) | no | — |
| `address` | string | no | — |

### RefreshTokenRequest

| Field | Type | Required | Notes |
|---|---|---|---|
| `refreshToken` | string | yes | — |

### RentalCarResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `make` | string | no | — |
| `model` | string | no | — |
| `modelYear` | integer | no | — |

### RentalClientResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `firstName` | string | no | — |
| `lastName` | string | no | — |
| `email` | string | no | — |

### RentalCompanyResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `name` | string | no | — |
| `city` | string | no | — |
| `address` | string | no | — |
| `contactEmail` | string | no | — |
| `contactPhone` | string | no | — |

### RentalResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `status` | enum: `PENDING`, `APPROVED`, `ACTIVE`, `COMPLETED`, `REJECTED`, `CANCELLED`, `EXPIRED` | no | — |
| `startAt` | string (ISO-8601 UTC) | no | — |
| `endAt` | string (ISO-8601 UTC) | no | — |
| `dailyPrice` | number | no | — |
| `totalDays` | integer | no | — |
| `totalPrice` | number | no | — |
| `createdAt` | string (ISO-8601 UTC) | no | — |
| `car` | [`RentalCarResponse`](#rentalcarresponse) | no | — |
| `company` | [`RentalCompanyResponse`](#rentalcompanyresponse) | no | — |

### ReplacePriceTiersRequest

| Field | Type | Required | Notes |
|---|---|---|---|
| `tiers` | array of [`PriceTierRequest`](#pricetierrequest) | yes | — |

### SaveCarRequest

| Field | Type | Required | Notes |
|---|---|---|---|
| `make` | string | yes | Max 80 characters. |
| `model` | string | yes | Max 80 characters. |
| `modelYear` | integer | yes | — |
| `licensePlate` | string | yes | Max 20 characters. |
| `defaultDailyPrice` | number | yes | — |
| `status` | enum: `ACTIVE`, `IN_MAINTENANCE`, `RETIRED` | yes | — |

### SaveCompanyRequest

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Max 150 characters. |
| `description` | string | no | Max 2000 characters. |
| `cityId` | string (UUID) | yes | — |
| `address` | string | yes | Max 255 characters. |
| `contactEmail` | string | yes | — |
| `contactPhone` | string | yes | — |

### SignupRequest

| Field | Type | Required | Notes |
|---|---|---|---|
| `firstName` | string | yes | Max 100 characters. |
| `lastName` | string | yes | Max 100 characters. |
| `email` | string | yes | — |
| `password` | string | yes | — |
| `role` | enum: `CLIENT`, `OWNER` | yes | — |

### TokenResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `accessToken` | string | no | — |
| `refreshToken` | string | no | — |
| `tokenType` | string | no | — |
| `expiresInSeconds` | integer | no | — |

### UnreadCountResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `unread` | integer | no | — |

### UserResponse

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | no | — |
| `firstName` | string | no | — |
| `lastName` | string | no | — |
| `email` | string | no | — |
| `role` | enum: `CLIENT`, `OWNER`, `ADMIN` | no | — |
| `enabled` | boolean | no | — |
| `createdAt` | string (ISO-8601 UTC) | no | — |

### VerifyEmailRequest

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | — |
| `code` | string | yes | — |
