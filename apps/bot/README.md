# SchoolRoom Telegram Bot

Standalone opt-in TypeScript process using the Telegram Bot API over HTTPS.
No database access and no catalog writes.

- `/start`: opens the existing Mini App through an inline `web_app` button.
- `/id`: returns the sender's Telegram ID in a private chat.
- Long polling for development; authenticated webhook for hosted environments.
- Disabled by default. `pnpm dev` continues to start the existing API and frontends.
- Explicit configuration commands for status, menu, webhook registration and deletion.

See [Telegram setup and verification](../../docs/telegram.md) for environment variables,
commands, initData authentication and deployment limits.
