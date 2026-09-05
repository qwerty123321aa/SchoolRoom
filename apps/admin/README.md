# SchoolRoom Admin

Private catalog management interface for SchoolRoom owners. The application is intentionally limited to project metadata: orders, payments, private files, clients, and finance belong to later modules.

## Local start

Run the API on port `4100`, then start this workspace:

```bash
pnpm dev:admin
```

Open `http://localhost:5174`. Requests to `/api` are proxied to the local API.

For local development outside Telegram, set `VITE_DEV_ADMIN_TELEGRAM_USER_ID` in the root `.env` and enable the matching development authentication mode in the API. In Telegram, the application sends `Telegram.WebApp.initData` as `Authorization: tma <initData>`. The development header is used only when signed Telegram data is absent.

## Implemented scope

- project search and status filters;
- creation and editing;
- publication and featured flags;
- read-only purchase count;
- archive confirmation;
- loading, empty, error, and save states;
- responsive mobile and desktop layouts.

The API remains the source of truth for validation, authorization, publication state, prices, and purchase counts.
