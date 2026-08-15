# Needt — MAIL (read-only unified inbox), FINAL Codex prompt — 2026-07-18

Задача Б (realtime worker) задеплоена, почтовый синк ложится в тот же BullMQ-воркер.
Скопируй блок «CODEX PROMPT» целиком в новую сессию Codex. Ниже — сверка с кодом и ручные заметки.

---

## Сверено с текущим кодом (чтобы Codex попал в существующие паттерны)

- **Шифрование секретов уже есть:** `encryptSecret` / `decryptSecret` из `@/services/ai/encryption`
  (AES-256-GCM, env `AI_ENCRYPTION_KEY`, fallback `NEXTAUTH_SECRET`). IMAP-пароли шифруем ИМИ, не новым кодом.
- **Очередь/воркер (из Задачи Б) уже есть:** `src/lib/queue/{connection,queues,types,enqueue}.ts` (фабрики
  `getXQueue()`, `QUEUE_NAMES`, `defaultJobOptions` с backoff), воркер `src/worker/index.ts`. Почтовый синк —
  новая очередь `mail-sync` по этому же паттерну; тот же worker-сервис в Coolify подхватит её после деплоя.
- **OAuth/токены:** `@/lib/token-manager` централизованно рефрешит Google/Outlook — переиспользуем, скоупы почты
  добавляем инкрементальным consent.
- **Local-first референс:** модели `CalendarFeed`/`CalendarEvent`, доступ через `@/lib/calendar-db` — почту делаем по этому же принципу.
- **Навигация:** пункт «Mail» добавить в `src/components/navigation/AppNav.tsx` и в командную палитру `src/lib/commands/groups/navigation.ts`.
- **Deps, которых НЕТ** (Codex ставит): `imapflow`, `postal-mime`, и санитайзер HTML (`isomorphic-dompurify`). Ставить с `--legacy-peer-deps`.
- Новых env НЕ требуется (Gmail/Graph — существующий OAuth; IMAP-креды пер-аккаунт в БД).

---

## CODEX PROMPT

```
Implement "Mail" v1 — a read-only unified inbox in the left sidebar of this Next.js 15 / React 19 app,
following the app's local-first pattern (external data synced into our DB; the UI reads ONLY local data;
same philosophy as CalendarFeed/CalendarEvent). Branch from the current `main` (it already contains the
realtime worker pipeline — Задача Б — that this feature builds on). Read CLAUDE.md first and follow all
conventions.

CONVENTIONS (strict): singleton `prisma` from @/lib/prisma; Prisma *types* from @prisma/client; dates via
@/lib/date-utils; `logger` from @/lib/logger with a per-file LOG_SOURCE; route handlers use
`params: Promise<...>` (await params); house UI format from design-refs/ui-conventions.md and shared
@/components/ui/* primitives. Keep changes scoped; do not touch the scheduling engine. Update CHANGELOG.md
under [unreleased].

REUSE EXISTING CODE (do NOT reinvent):
- Encrypt/decrypt IMAP credentials with `encryptSecret` / `decryptSecret` from @/services/ai/encryption
  (AES-256-GCM, env AI_ENCRYPTION_KEY). Do not add a new encryption utility or env var.
- OAuth token refresh for Gmail/Outlook goes through @/lib/token-manager (add mail scopes via incremental
  consent — do NOT fork the auth flow or bump NextAuth).
- The sync engine runs in the EXISTING BullMQ worker. Add a `mail-sync` queue by extending
  src/lib/queue/{types.ts (QUEUE_NAMES + MailSyncJobData), queues.ts (getMailSyncQueue), enqueue.ts
  (enqueueMailSync)} using the SAME factory + defaultJobOptions pattern already there, and register a
  Worker for it in src/worker/index.ts next to the calendar-sync worker. jobId dedup per account
  (e.g. `mail-sync-${accountId}`).

PROVIDERS (three connection types):
1. Gmail via Gmail API — existing Google OAuth infra + token-manager; add `gmail.readonly` as a separate
   incremental scope (do not force re-consent for calendar users).
2. Outlook/Microsoft via Graph — existing Azure infra; add `Mail.Read` scope.
3. Generic IMAP: host/port/TLS + username + app password, using `imapflow`; MIME parsing via `postal-mime`.
   Credentials encrypted at rest with encryptSecret (see above).

DATA MODEL (Prisma, new migration; follow existing model style, add FKs + indexes):
- MailAccount: id, userId (FK), provider (gmail|outlook|imap), address, encryptedCredentials/connectionRef,
  status (active|error|disconnected), lastSyncAt, createdAt, updatedAt.
- MailMessage: id, accountId (FK), externalId, threadId, fromName, fromAddress, toAddresses Json, subject,
  snippet, date, isRead, isArchived, labels Json, bodyHtml (fetched lazily/on open, nullable). Unique
  (accountId, externalId). Index (accountId, date). Retention: sync last 90 days, cap per account (//todo setting).

SYNC ENGINE (in the BullMQ worker, NOT the web process):
- Initial backfill job + incremental job: Gmail historyId; Graph delta links; IMAP UID ranges + IDLE where
  the server supports it. Store the per-account sync cursor.
- A repeatable fallback job every 5 min per active account (BullMQ repeatable), until push/webhooks land later.
- On error: set MailAccount.status = "error", surface in UI, log via logger+LOG_SOURCE (NEVER log bodies/credentials).

UI (house format, reuse @/components/ui/*):
- Sidebar item "Mail" with an unread badge, under the existing Workspace/Focus items — add to
  src/components/navigation/AppNav.tsx AND register it in src/lib/commands/groups/navigation.ts (command palette).
- Mail page: left = account/folder list (All inboxes + per account); center = message list (sender, subject,
  snippet, time, unread dot); right/panel = message view (sanitized HTML via isomorphic-dompurify; remote images
  BLOCKED by default with a "Load images" button; body fetched server-side on open).
- Actions v1: mark read/unread; archive (synced back for Gmail/Graph, local-only flag for IMAP v1);
  "Create task from email" — creates a Task (reuse existing task-creation service) with title = subject,
  description linking back to the message, then opens the existing task panel prefilled.
- Neutral "not configured" and empty states (same pattern as calendar providers) — no red error banners for
  missing server config.

SECURITY: never log message bodies or credentials; sanitize all HTML; fetch bodies over the server only;
IMAP creds encrypted at rest.

OUT OF SCOPE (do not build): sending/replying, full-text body search, label management, push notifications
(Gmail push / Graph subscriptions will reuse the existing calendar-webhook pipeline in a later phase — leave a
//todo where the webhook hook would go).

ACCEPTANCE (run and make green): `npm run lint` (0 warnings), `npm run type-check`, `npm run test:unit`,
`npm run build`, `npm run build:worker`, and `docker build -t needt-test .` all succeed. Prisma migration
applies on a clean DB. Unit tests for the MIME/message mapping with fixture messages (Gmail JSON, Graph JSON,
raw MIME for IMAP). One coherent PR from a `feat/mail` branch off current main; CHANGELOG.md updated.
```

---

## Ручное (после мержа MAIL)

- **Google Cloud Console:** добавить scope `https://www.googleapis.com/auth/gmail.readonly` на OAuth consent
  screen (+ прогнать инкрементальный consent). Для прода — OAuth verification (для test users на бете хватит).
- **Azure:** добавить Graph permission `Mail.Read` (delegated) + admin consent если требуется.
- **Проверка на своём ящике** + одном стороннем (GMX/Yahoo) через IMAP app-password.
- Env НЕ добавляются. Деплой как обычно: `docker build` локально → push → Coolify redeploy **web И worker**
  (воркер нужно передеплоить, чтобы он получил новый `mail-sync` обработчик).

## Заметка по последовательности
- MAIL ветвится от текущего main (в нём есть Б) — в отличие от стухших feat/timer|board|mobile.
- После MAIL воркер-сервис в Coolify обязательно **Redeploy** (иначе он крутит старый бандл без mail-sync).
