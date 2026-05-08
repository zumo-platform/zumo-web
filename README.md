# Zumo Web

Frontend for a **WhatsApp-first** ordering product for food & beverage suppliers: marketing site, distributor auth, and (planned) inbox / onboarding.

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
| **next-auth** `5.0.0-beta.x` | Session/auth bridge (e.g. Cognito — wiring TBD) |

## Product flows (target)

Backend pieces for signup / invites are **not all exposed on the HTTP API yet**; these flows describe the intended UX. Seller roles in Postgres are **`seller_role`**: `owner` \| `admin` \| `seller` (use **`owner`** for the first user on a new supplier — there is no separate `super_admin` enum value).

### Flow A — First-time supplier signup

1. User visits **`/signup`** (planned; today use **`/login?tab=signup`** for the placeholder UI).
2. Collects **email**, **password**, **full name**, **supplier business name**.
3. **Cognito** user is created (Hosted UI or app-initiated sign-up — TBD).
4. Backend creates **`suppliers`** row (e.g. status **`pending_onboarding`** — align with `supplier_status` in DB).
5. Backend creates **`sellers`** row: **`role: owner`**, new **`supplier_id`**.
6. After login, user lands on **`/onboarding`** (planned): connect WhatsApp, add products, etc.

### Flow B — Invited user

1. **`/settings/team`** (planned): super-user opens **Invite user**, enters **email** + **role** (`admin` \| `seller`).
2. Backend inserts **`seller_invitations`** and sends email with magic link.
3. Invitee opens **`/accept-invite?token=…`** (planned).
4. Sets password / completes profile.
5. Backend creates **Cognito** user + **`sellers`** row (**`supplier_id`** + **`role`** from invite).
6. User lands on **`/inbox`** (workspace).

## Zustand — good fits for Zumo

- Selected conversation (which thread is open)
- Inbox filters (unread, assigned to me, …)
- Draft order editing before confirm
- Shell UI (sidebar collapsed, panels open)
- Optimistic reads (e.g. mark read immediately)
- Coordinating real-time or polled inbox updates with minimal prop drilling

Use **TanStack Query** for server-backed data (lists, detail, mutations); use **Zustand** for ephemeral UI and cross-component client state.

## Repository structure (current)

```
zumo-web/
├── src/
│   ├── app/
│   │   ├── (marketing)/[locale]/   # EN/ES marketing, privacy, terms
│   │   ├── (platform)/
│   │   │   ├── (auth)/             # /login, /register → signup tab
│   │   │   └── (workspace)/        # /inbox, /orders, /profile (placeholders)
│   │   ├── privacy/page.tsx        # → redirect /es/privacy
│   │   ├── terms/page.tsx          # → redirect /es/terms
│   │   ├── layout.tsx              # Root layout (fonts, toaster)
│   │   └── page.tsx                # / → /es
│   ├── components/
│   │   ├── auth/                   # Sign-in / sign-up tabs (UI only until API + NextAuth)
│   │   ├── marketing/
│   │   ├── typography/
│   │   └── ui/
│   ├── content/marketing/
│   ├── hooks/
│   └── lib/                        # e.g. marketing locale helpers
├── public/
└── package.json
```

### Target layout (in progress)

Not all paths exist yet; planned additions:

| Area | Purpose |
|------|---------|
| **`src/app/(platform)/layout.tsx`** | Auth gate + shared shell (sidebar) |
| **`src/app/(platform)/(workspace)/inbox/page.tsx`** | Three-column inbox (expand beyond placeholder) |
| **`src/components/inbox/`** | e.g. `conversation-list`, `thread-view`, `draft-order-panel` |
| **`src/lib/auth.ts`** | Auth.js / Cognito configuration |
| **`src/lib/api.ts`** | Typed **`fetch`** helper for **`NEXT_PUBLIC_API_URL`** |

## Prerequisites

- **Node.js 24** (or whatever you standardize on)
- **pnpm v10** (`packageManager` in `package.json`)

## Setup & installation

```bash
pnpm install
```

If pnpm aborts when recreating `node_modules` in non-interactive environments:

```bash
CI=true pnpm install
```

## Development

```bash
pnpm dev          # http://localhost:3000 — webpack (recommended default)
pnpm dev:turbo    # Turbopack (faster; can be picky with pnpm + Radix)
```

Run only **one** `next dev` per clone. If you see **Unable to acquire lock** under `.next/dev/`, stop the other process, remove `.next/dev/lock` if needed, and restart.

## Main routes

| Path | Purpose |
|------|---------|
| `/` | Redirect → `/es` |
| `/en`, `/es` | Marketing |
| `/privacy`, `/terms` | Redirect → `/es/privacy`, `/es/terms` |
| `/login` | Sign in / sign up (`?tab=signup`) |
| `/register` | Redirect → `/login?tab=signup` |
| `/inbox`, `/orders`, `/profile` | Workspace placeholders |

## Build & production

```bash
pnpm build
pnpm start
```

## Environment variables

Use **`.env.local`** at the repo root.

Examples as integrations land:

- **`NEXT_PUBLIC_API_URL`** — HTTP API base (API Gateway)
- Cognito / Auth.js variables (pool id, client id, secret, issuer — follow **`next-auth`** v5 + provider docs)

## Linting

```bash
pnpm lint
pnpm lint:fix
pnpm lint:ci
```

Import order uses **`eslint-plugin-import`** (groups + alphabetization).

## Contributing

Early-stage repo — prefer small, reviewable changes.

### Branch strategy

- **`main`** → production
- **`develop`** → integration

Branch naming: `feat/…`, `fix/…`, `chore/…` from **`develop`**; squash-merge PRs; promote **`develop`** → **`main`** for releases.

### Commit messages

**Conventional Commits** (enforced via hooks): `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, etc.
