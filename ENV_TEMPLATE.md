# Environment Template

Use this as the reference for `.env.local` in development or `.env` in Docker/production. Do not commit real secrets.

## Required With Safe Local Defaults

```bash
DATABASE_URL="postgresql://fluid:fluid@localhost:5432/fluid_calendar"
DIRECT_URL="postgresql://fluid:fluid@localhost:5432/fluid_calendar"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-random-32-plus-character-secret"
CRON_SECRET="replace-with-random-cron-secret"
REDIS_URL="redis://localhost:6379"
WEBHOOK_BASE_URL="http://localhost:3000"
```

Notes:

- For Docker Compose app containers, use `postgresql://fluid:fluid@db:5432/fluid_calendar`.
- For Vercel + Neon, use the pooled Neon URL for `DATABASE_URL` and the direct non-pooled Neon URL for `DIRECT_URL`.
- `NEXTAUTH_URL` must match the exact URL opened in the browser because OAuth redirects are derived from it.
- `NEXTAUTH_SECRET` has a local fallback in code, but it should always be set explicitly.
- `CRON_SECRET` protects Vercel Cron endpoints and must be supplied as the `x-cron-secret` header when testing manually.
- `REDIS_URL` is shared by the web process and the separate BullMQ worker. In Docker/Coolify, point both services at the same Redis instance.
- `WEBHOOK_BASE_URL` is the public HTTPS origin providers call for calendar change notifications. It defaults to `NEXTAUTH_URL`; set it explicitly when the public webhook origin differs.

## Human-Supplied Calendar OAuth

```bash
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID="common"
```

Google is needed for Google Calendar and Google Tasks. Azure AD is needed for Outlook Calendar and Microsoft task sync. These can also be configured from the in-app System Settings where supported.

## Apple / iCloud Calendar

No env vars are required for Apple Calendar in the current baseline. Use the CalDAV connection form with:

- Server URL: `https://caldav.icloud.com`
- Username: Apple ID email address
- Password: Apple app-specific password supplied by the human

## Email

```bash
RESEND_API_KEY=""
RESEND_FROM_EMAIL=""
```

Resend is optional for local development unless testing password reset or email notification flows.

## AI Configuration

These are not used by the Phase 0 app yet, but are reserved for the planner AI layer:

```bash
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
AI_CUSTOM_URL=""
AI_ENCRYPTION_KEY=""
NEEDT_AI_API_KEY=""
NEEDT_AI_MODEL="deepseek-chat"
NEEDT_AI_BASE_URL="https://api.deepseek.com/v1"
NEEDT_AI_MONTHLY_ACTION_CAP="300"
NEEDT_AI_LIFETIME_ACTION_CAP="3000"
```

`NEEDT_AI_API_KEY` enables the hosted OpenAI-compatible fallback (DeepSeek by default). `NEEDT_AI_MODEL`, `NEEDT_AI_BASE_URL`, `NEEDT_AI_MONTHLY_ACTION_CAP`, and `NEEDT_AI_LIFETIME_ACTION_CAP` configure the deployment-wide model and per-plan allowances. Users can instead supply their own provider key in Settings for unlimited usage. Keys entered in Settings are encrypted at rest with `AI_ENCRYPTION_KEY` (or `NEXTAUTH_SECRET` when it is omitted).

### Custom AI OAuth (optional)

Set these only when the Custom AI service supports OAuth 2.0 authorization-code flow with PKCE:

```bash
AI_CUSTOM_OAUTH_AUTHORIZATION_URL="https://ai.example.com/oauth/authorize"
AI_CUSTOM_OAUTH_TOKEN_URL="https://ai.example.com/oauth/token"
AI_CUSTOM_OAUTH_CLIENT_ID=""
AI_CUSTOM_OAUTH_CLIENT_SECRET=""
AI_CUSTOM_OAUTH_SCOPES="planner.read planner.write offline_access"
```

- `AI_CUSTOM_URL` is the planner's Custom AI API endpoint and is automatically prefilled in Settings for every user.
- `AI_CUSTOM_OAUTH_CLIENT_SECRET` and `AI_CUSTOM_OAUTH_SCOPES` are optional; the client secret should be omitted for public PKCE clients.
- Register `${NEXTAUTH_URL}/api/ai/oauth/custom/callback` as the exact OAuth redirect URI.
- Once these values are configured, a user selects Custom and clicks **Connect** in Settings—no OAuth URLs or client credentials need to be entered by the user.
- OpenAI and Anthropic direct API access uses API keys, not account OAuth tokens. Settings links users to the relevant key page before they paste and connect their key.

## Web Push

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:you@example.com"
```

Web push is optional and disabled by default in Settings. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` lets the browser create a push subscription; the private key is for a future server-side push sender.
