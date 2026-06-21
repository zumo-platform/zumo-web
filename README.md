# Zumo Web

Frontend for a **WhatsApp-first** ordering product for food & beverage suppliers: marketing site, distributor auth (Cognito), and workspace (WhatsApp inbox, orders, clients, settings).

Runtime: **Next.js 16**, **TypeScript**, **React 19**, **Node 24**, **Tailwind CSS 4**, **pnpm**.

**Full product capability list:** [`docs/CAPABILITIES.md`](https://github.com/zumo-platform/zumo-backend/blob/main/docs/CAPABILITIES.md) (inventory, warehousing, delivery, customer hub, WhatsApp AI, team permissions, and more).

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
| **@dnd-kit/core** | Drag-and-drop on `/orders` Flow view (`?view=board`) |
| **@tanstack/react-table** | Paginated catalog tables (Inventario, Pedidos, Clientes) |
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

## Recent workspace features (2026-06)

- **Inbox / WhatsApp** — 3-column triage board at `/inbox` (Pedidos / No son pedidos / Errores); all draft orders appear in Pedidos; reclamos / AI failures appear in Errores with detail sheet + resolve action; conversation filter bar on WhatsApp; enriched list; open/close tracking.
- **Orders** — **Lista / Flujo** toggle on `/orders` (`?view=list|board`, `?q=` search, `?status=` multi-select with OR/AND); estado dropdown pill next to delivery date (replaces status chip row); drag-to-move between flow columns; unified search + delivery date filter; detail sheet; **`/orders/creation`** manual create (**delivery date required**); list view pagination footer (20/50/100 rows).
- **Profile** — **`/settings/profile`**: edit name/phone, change Cognito password.
- **Order flow settings** — **`/settings/order-flow`**: rename system statuses, reorder columns, add custom statuses (owner/admin).
- **Clients** — table + **`/clients/[customerId]`** detail (sidebar edits, orders/products/users tabs, product picker); pagination footer (10/30/50/100 rows).
- **Inventory** — full-width catalog table synced with dashboard products API; pagination footer (20/50/100 rows).
- **Matches** — alias CRUD at `/matches`.
- **Settings** — business profile, AI autocommit, locale; timezone loaded for all date/time display.
- **Layout** — full-width list/table pages via **`src/lib/workspace-layout.ts`**: shared padding, **`workspaceTableScrollClassName`** (vertical scroll below page header), **`workspaceTableCardClassName`** (horizontal scroll on wide tables), extra bottom padding so content is not flush with the viewport.
- **Supplier timezone** — all order/message times shown in supplier IANA timezone (from settings), not browser or US server time. Instants without `Z` suffix are parsed as UTC before formatting.

## Recent workspace features (2026-05)

- **WhatsApp** — three-column UI, draft order sheet with editable lines, lifecycle actions (convert / confirm / reject).

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
│   │   │       ├── orders/             # list + Flow board, creation, [orderId]/edit
│   │   │       ├── clients/            # list + [customerId] detail
│   │   │       ├── matches/            # alias governance
│   │   │       ├── settings/           # business, AI, order-flow, profile
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
│   │   ├── order-status-flow.ts      # supplier flow + status labels for board/filters
│   │   ├── workspace-layout.ts       # full-width padding + table scroll tokens
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
| `/inbox` | WhatsApp triage board — Pedidos drafts, No son pedidos, Errores reclamos with resolve sheet |
| `/whatsapp` | WhatsApp inbox + draft orders |
| `/orders` | Orders catalog — **Lista** table or **Flujo** board (`?view=`, `?q=`, `?status=`), detail sheet |
| `/orders/creation` | Manual order create (delivery date required) |
| `/matches` | Product alias governance (Matches tab) |
| `/clients` | Customer list |
| `/clients/[customerId]` | Customer detail (sidebar, tabs) |
| `/settings` | Business + AI settings |
| `/settings/order-flow` | Order status flow (rename, reorder, custom statuses) |
| `/settings/profile` | Seller profile (name, phone, password) |

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
