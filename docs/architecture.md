# SchoolRoom architecture

## Current scope

The first vertical slice establishes the workspace and implements the ready-project catalog. Telegram init data is verified on the API, administrator catalog actions use a Telegram ID allowlist, and project ownership is represented by a private entitlement read model. The slice deliberately does not simulate payments, order completion, or file delivery.

## Boundaries

```text
Telegram Mini App (apps/web)
        |
        | HTTPS JSON API
        v
Backend API (apps/api)
        |
        | repository interfaces
        v
PostgreSQL
```

The client never owns prices, publication status, access rights, or purchase state. Shared contracts describe the transport format, while business rules remain in the API. Database access is isolated behind repository interfaces so tests can exercise the catalog without starting PostgreSQL.

## Modules

- `catalog` owns published-project discovery, search, subject categories, project details, popular ordering, and pagination.
- `favorites` stores server-side user-to-project relations and is exposed through the catalog module for this slice.
- `auth` verifies signed Telegram init data, enforces freshness, and upserts the stable Telegram identity. Development identity is opt-in and cannot run in production.
- `admin` owns protected project CRUD, optimistic concurrency, archival, and catalog audit records.
- `access` exposes a private ownership read model without contaminating cacheable public catalog responses.
- future modules (`orders`, `payments`, `files`, `notifications`) must use the same route-service-repository separation.

## Data decisions

- Money is stored in integer minor units and returned with an ISO currency code.
- Ready projects intentionally have no school-class field.
- Popular ordering prioritizes real `purchase_count`; manual editorial selection is represented by `featured` and never changes the counter.
- Unpublished projects never appear in public catalog queries.
- Favorites are unique per user and project.
- Projects are archived rather than physically deleted and admin updates use a version check.
- Entitlements are unique per user and project; no public endpoint can grant one.

## Production gates

Before public release, configure production Telegram/admin secrets, managed PostgreSQL, private object storage, rate limiting, observability, backups, and the payment scheme validated against current official Telegram rules. Payment confirmation must grant an entitlement and increment `purchase_count` atomically and idempotently.
