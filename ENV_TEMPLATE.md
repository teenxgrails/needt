# Environment Template

Use this as the reference for `.env.local` in development or `.env` in Docker/production. Do not commit real secrets.

## Required With Safe Local Defaults

```bash
DATABASE_URL="postgresql://fluid:fluid@localhost:5432/fluid_calendar"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-random-32-plus-character-secret"
NEXT_PUBLIC_ENABLE_SAAS_FEATURES=false
```

Notes:

- For Docker Compose app containers, use `postgresql://fluid:fluid@db:5432/fluid_calendar`.
- `NEXTAUTH_URL` must match the exact URL opened in the browser because OAuth redirects are derived from it.
- `NEXTAUTH_SECRET` has a local fallback in code, but it should always be set explicitly.

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

## Future AI Configuration

These are not used by the Phase 0 app yet, but are reserved for the planner AI layer:

```bash
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
AI_CUSTOM_URL=""
AI_ENCRYPTION_KEY=""
```

The human must supply provider API keys or a custom endpoint when the AI assistant feature is enabled in a later phase.
