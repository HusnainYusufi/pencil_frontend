# pencil_frontend

The Pencil web app: where a company's staff do their accounting. Arabic first (RTL), English one click away, light and dark themes.

Companion repos:
- `pencil_backend`: the NestJS API and the deployment stack (`deploy/`).
- `pencil_admin`: the platform console where Pencil staff onboard companies and toggle plan features.

## What's in it

| Area | Screens |
| --- | --- |
| Access | Sign in, self-service signup (company plus trial), choose or switch company, sign out |
| Accounting | Dashboard, chart of accounts (tree, create, deactivate), account statement, journal entries (list, new, draft → post, reverse, delete draft) |
| Reports | Trial balance (opening, movement and closing, rolled up the account tree) |
| Settings | Fiscal periods (close and reopen months, open the next year) |

### Feature-gated navigation

Navigation and pages are driven by `GET /me`:
- **Plan entitlements.** Pencil staff toggle these per plan or per company in `pencil_admin`.
- **Role permissions.**

A feature that is switched off disappears from the navigation. Its URLs land on a "Not in your plan" page. The API enforces the same rules again on every call. Because `/me` is read on every request, a toggle takes effect on the user's next navigation.

## Security model

- **BFF.** The browser never sees API tokens. They live in an AES-256-GCM sealed, `httpOnly`, `SameSite=Strict`, `__Host-` cookie. All API calls are server-to-server, from Server Components and Server Actions.
- **Proxy (`src/proxy.ts`).** Runs on every request and handles:
  - per-request nonce CSP, `frame-ancestors 'none'`, HSTS and `no-store`
  - the session gate
  - the idle timeout (`SESSION_IDLE_MINUTES`) and absolute expiry
  - silent rotation of refresh tokens
  - the company gate
- **Server Actions** re-check the session, the feature and the permission (`requireAccess`). They validate input before calling the API, and they send idempotency keys when creating or posting entries.
- **Money** is a decimal string end to end. Totals use BigInt minor units (`src/lib/money.ts`), never floats.

## i18n

- **Locale.** Comes from the `pencil_locale` cookie; Arabic is the default. `<html lang dir>` is server-rendered, so there is no flash.
- **Dictionaries.** `src/i18n/dictionaries/{en,ar}.ts`. The `Dictionary` type forces Arabic to provide every English key.
- **API errors.** Localized by their stable error `code`.
- **Layout.** Uses logical CSS properties (`ps-`, `ms-`, `text-start`, `border-s`).
- **Figures.** Amounts, codes and dates use the `.num` class, which isolates them as LTR so signs and `JV-2026-000001` never reorder inside Arabic text. Digits are Latin in both locales.
- **Fonts.** IBM Plex Sans with IBM Plex Sans Arabic, and Instrument Serif with Noto Naskh Arabic. Each pair is stacked so mixed-script lines just work.

## Develop

```bash
npm install                 # also installs the git hooks (secret scanning)
cp .env.example .env.local  # then set SESSION_SECRET
npm run dev                 # http://localhost:3000 (API on :4100)
```

Checks: `npx tsc --noEmit` and `npm run lint`.

## Deploy

The `Dockerfile` builds a standalone, non-root image with no secrets baked in. Runtime configuration is injected by the deployment in `pencil_backend/deploy`.

Never commit `.env*` files. The pre-commit hook and the CI gitleaks scan block secrets.
