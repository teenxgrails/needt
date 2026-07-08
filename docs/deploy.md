# Deploy Mina to Vercel + Neon

Mina is prepared for a single-user serverless deployment on Vercel with Neon Postgres. The teenx VPS is not used.

## 1. Create Neon

1. Create a Neon project.
2. Copy the pooled connection string into `DATABASE_URL`.
3. Copy the direct connection string into `DIRECT_URL`.
4. Keep both values in Vercel Project -> Settings -> Environment Variables.

`DATABASE_URL` is used by the app at runtime. `DIRECT_URL` is used by Prisma migrations.

## 2. Create Vercel Project

1. Import the GitHub repository in Vercel.
2. Set Framework Preset to Next.js.
3. Set Build Command to:

```bash
pnpm vercel-build
```

4. Set Install Command to:

```bash
pnpm install --frozen-lockfile
```

## 3. Environment Variables

Required:

```bash
DATABASE_URL="postgresql://...-pooler..."
DIRECT_URL="postgresql://..."
NEXTAUTH_URL="https://app.minacalendar.com"
NEXT_PUBLIC_APP_URL="https://app.minacalendar.com"
NEXT_PUBLIC_SITE_URL="https://app.minacalendar.com"
NEXTAUTH_SECRET="random-32-plus-character-secret"
CRON_SECRET="random-cron-secret"
NEXT_PUBLIC_ENABLE_SAAS_FEATURES=false
```

Calendar OAuth:

```bash
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID="common"
```

Optional AI and push:

```bash
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
AI_CUSTOM_URL=""
AI_ENCRYPTION_KEY=""
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:you@example.com"
```

Apple/iCloud CalDAV credentials are entered in the app at runtime and never stored in env.

## 4. Domain

1. Add `app.minacalendar.com` or `minacalendar.com` in Vercel Project -> Domains after the domain is owned.
2. Point DNS to Vercel as instructed.
3. Vercel provisions HTTPS automatically.

If the domain is not owned yet, keep the generated `*.vercel.app` URL and update `NEXTAUTH_URL`,
`NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_SITE_URL` to that URL.

## 5. OAuth Redirect URIs

Register exact production redirect URIs:

Google:

```text
https://app.minacalendar.com/api/auth/callback/google
https://app.minacalendar.com/api/calendar/google/auth
```

Microsoft/Azure:

```text
https://app.minacalendar.com/api/auth/callback/azure-ad
https://app.minacalendar.com/api/calendar/outlook/auth
```

Keep local redirect URIs for development if needed.

## 6. Cron

`vercel.json` schedules:

- `/api/cron/sync-calendars` every 15 minutes.
- `/api/cron/reschedule` every 30 minutes.

Manual test:

```bash
curl -H "x-cron-secret: $CRON_SECRET" https://app.minacalendar.com/api/cron/reschedule
curl -H "x-cron-secret: $CRON_SECRET" https://app.minacalendar.com/api/cron/sync-calendars
```

The calendar cron syncs CalDAV directly in this build. Google/Outlook sync remains route-driven until their OAuth refresh flow is factored into reusable cron-safe services.

## 7. Health Check

```bash
curl https://app.minacalendar.com/api/health
```

Expected result:

```json
{ "ok": true, "db": "ok", "buildSha": "..." }
```

## 8. Notes

- The app remains single-user in product behavior, but tables keep `userId` seams so future SaaS conversion does not require a database rewrite.
- Prisma is configured with `directUrl`.
- `@prisma/adapter-neon` and `@neondatabase/serverless` are installed. Runtime uses the Neon driver adapter automatically when `DATABASE_URL` is a Neon pooled URL containing `neon.tech` and `-pooler.`; local Postgres keeps the standard Prisma client path.
- Deploy is triggered by pushing to `main` or by `vercel --prod`.
