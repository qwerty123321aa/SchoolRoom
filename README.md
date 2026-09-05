# SchoolRoom

SchoolRoom is a Telegram-first service for ready-made school projects and custom project orders. This repository starts with the platform foundation and the catalog vertical slice from the approved specification.

## Workspace

- `apps/web` — mobile-first Telegram Mini App client.
- `apps/api` — standalone Fastify API with modular business logic.
- `apps/admin` — private project catalog management interface.
- `apps/bot` — reserved Telegram bot boundary for the notifications stage.
- `packages/contracts` — shared request and response schemas.
- `docs` — architecture and operating notes.

## Local start

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Install dependencies with `pnpm install`.
4. Apply the database schema with `pnpm db:migrate`.
5. Add development catalog records with `pnpm db:seed`.
6. Start the API, Mini App, admin interface, and shared-contract watcher with `pnpm dev`.

The Mini App is available at `http://localhost:5173`, the administrator catalog at `http://localhost:5174`, and the API health check at `http://localhost:4100/health`.

## Quality checks

Run `pnpm typecheck`, `pnpm test`, and `pnpm build` before opening a pull request.

## Security baseline

Development identity headers are accepted only when `DEV_AUTH_ENABLED=true` and are rejected by the production environment schema. Production requests use server-verified `Telegram.WebApp.initData`; administrator routes additionally require the Telegram ID to be present in `ADMIN_TELEGRAM_IDS`. Payments, private file delivery, and bot notifications remain separate milestones and must be completed before a public release.
