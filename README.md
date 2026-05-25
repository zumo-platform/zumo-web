# Zumo Web

Frontend for a **WhatsApp-first** ordering product for food & beverage suppliers: marketing site, distributor auth (Cognito), and workspace (WhatsApp inbox, orders, clients, settings).

Runtime: **Next.js 16**, **TypeScript**, **React 19**, **Node 24**, **Tailwind CSS 4**, **pnpm**.

## Tech stack (pinned / primary)

| Piece | Role |
|-------|------|
| **next** `16.1.1` | Framework (App Router) |
| **react** `19.2.3` / **react-dom** `19.2.3` | UI |
| **tailwindcss** `^4` | Styling |
| **Radix UI** + **class-variance-authority** | Primitives (shadcn-style kit under `components/ui/`) |
| **lucide-react** | Icons |
| **zustand** | Client UI state |
| **react-hook-form** + **@hookform/resolvers** + **zod** | Forms & validation |
| **next-themes** | Theme switching |
| **sonner** | Toasts |
| **@tanstack/react-query** | Server/async state (queries & mutations) |
| **Session cookies** + **Cognito** (via Route Handlers) | Sign-up, confirm, login, JWT proxy to API |

## Product flows

Seller roles in Postgres are **`seller_role`**: `owner` \| `admin` \| `seller`.

### Flow A — First-time supplier signup (live)

1. User visits **`/login?tab=signup`**.
2. Collects **email**, **password**, **full name**, **business name**, **phone** (country selector sets E.164 + **`custom:country`**).
3. Cognito sign-up → email confirmation → post-confirmation creates **supplier** + **owner seller** (country/timezone on supplier).
4. After login, workspace routes under **`/(platform)/(workspace)/`** (WhatsApp, orders, clients, settings).

### Flow B — Invited user (planned)

Invite → accept link → Cognito user + seller row → workspace. Backend invitations not fully wired in UI yet.

## Recent workspace features (2026-05)

- **WhatsApp** — three-column UI, draft order sheet with editable lines, lifecycle actions (convert / confirm / reject).
- **Orders** — catalog table with status filters, detail sheet, **`/orders/creation`** manual create (**delivery date required**, no past dates).
- **Clients** — table + **`/clients/[customerId]`** detail (sidebar edits, orders/products/users tabs, product picker).
- **Settings** — business profile, AI autocommit, locale; timezone loaded for all date/time display.
- **Supplier timezone** — all order/message times shown in supplier IANA timezone (from settings), not browser or US server time. Instants without `Z` suffix are parsed as UTC before formatting.

## Zustand — good fits for Zumo

- Selected conversation (which thread is open)
- Inbox filters (unread, assigned to me, …)
- Draft order editing before confirm
- Shell UI (sidebar collapsed, panels open)
- Optimistic reads (e.g. mark read immediately)

Use **TanStack Query** for server-backed data; use **Zustand** for ephemeral UI state.

## Repository structure

```
zumo-web/
├── src/
│   ├── app/
│   │   ├── (marketing)/[locale]/       # EN/ES marketing, privacy, terms
│   │   ├── (platform)/
│   │   │   ├── (auth)/                 # /login, /register → signup tab
│   │   │   └── (workspace)/            # authenticated shell
│   │   │       ├── whatsapp/
│   │   │       ├── orders/             # list, creation, [orderId]/edit (placeholder)
│   │   │       ├── clients/            # list + [customerId] detail
│   │   │       ├── settings/
│   │   │       └── layout.tsx          # loads settings → WorkspacePreferencesProvider
│   │   ├── api/
│   │   │   ├── auth/                   # signup, login, confirm, logout
│   │   │   └── backend/[...path]/      # JWT proxy to API Gateway
│   │   └── layout.tsx
│   ├── components/
│   │   ├── auth/
│   │   ├── marketing/
│   │   ├── whatsapp/
│   │   ├── workspace/
│   │   └── ui/
│   ├── lib/
│   │   ├── supplier-timezone.ts        # parseInstantIso + format in supplier TZ
│   │   ├── workspace-preferences-context.tsx
│   │   ├── dashboard-orders.ts
│   │   ├── dashboard-customers.ts
│   │   └── api.ts
│   └── content/marketing/
└── package.json
```

## Prerequisites

- **Node.js 24**
- **pnpm v10**

## Setup & installation

```bash
pnpm install
```

## Development

```bash
pnpm dev          # http://localhost:3000 — webpack (recommended default)
pnpm dev:turbo    # Turbopack
```

Run only **one** `next dev` per clone.

## Main routes

| Path | Purpose |
|------|---------|
| `/` | Redirect → `/es` |
| `/en`, `/es` | Marketing |
| `/login` | Sign in / sign up (`?tab=signup`) |
| `/whatsapp` | WhatsApp inbox + draft orders |
| `/orders` | Orders catalog (filters, detail sheet, inline confirm/convert) |
| `/orders/creation` | Manual order create (delivery date required) |
| `/clients` | Customer list |
| `/clients/[customerId]` | Customer detail (sidebar, tabs) |
| `/settings` | Business + AI settings |
| `/profile` | Seller profile |

## Build & production

```bash
pnpm build
pnpm start
```

## Environment variables

Use **`.env.local`** (`cp .env.example .env.local`).

| Variable | Role |
|----------|------|
| **`NEXT_PUBLIC_API_URL`** | HTTP API base (API Gateway) — server proxy also uses this |
| **`COGNITO_USER_POOL_CLIENT_ID`** or **`NEXT_PUBLIC_COGNITO_CLIENT_ID`** | Cognito app client (same as SST dashboard client) |
| **`AWS_REGION`** | Cognito SDK region (default `us-east-2`) |
| **`AWS_PROFILE`** | SSO profile for Cognito Route Handlers (`zumo-dev`) |

Sign in to AWS before local auth API calls:

```bash
aws sso login --profile zumo-dev
```

## Linting

```bash
pnpm lint
pnpm lint:fix
pnpm lint:ci
```

## Contributing

Early-stage repo — prefer small, reviewable changes.

### Branch strategy

- **`main`** → production
- **`develop`** → integration

Branch naming: `feat/…`, `fix/…`, `chore/…` from **`develop`**; squash-merge PRs.

### Commit messages

**Conventional Commits** (enforced via hooks): `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, etc.

Session history for cross-repo milestones: see **`zumo-backend/journal.md`**.
