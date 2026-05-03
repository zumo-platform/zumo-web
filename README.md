# Zumo Web

Frontend application for a WhatsApp-based supplier ordering system.

Built with **Next.js 16**, **TypeScript**, **React 19**, **Node 24**, **Tailwind CSS**, and **pnpm**.

## Repository structure

```
zumo-web/
├── src/
│   ├── app/
│   │   ├── (marketing)/[locale]/   # Localized marketing (en, es): home, privacy, terms
│   │   ├── (platform)/
│   │   │   ├── (auth)/              # login, register (redirects to signup tab)
│   │   │   └── (workspace)/         # inbox, orders, profile (app shell)
│   │   ├── layout.tsx               # Root layout (fonts, toaster)
│   │   └── page.tsx                 # Redirects `/` → `/en`
│   ├── components/
│   │   ├── auth/                    # Sign-in / sign-up UI (tabs; auth not wired yet)
│   │   ├── marketing/               # Shell, header, footer, hero, legal views
│   │   ├── typography/
│   │   └── ui/                      # shadcn/Radix primitives
│   ├── content/marketing/           # Copy and legal text per locale
│   ├── hooks/
│   └── lib/                         # Helpers (e.g. marketing locale helpers)
├── public/
└── package.json
```

- **`(marketing)/[locale]`** — Static locale segments (`en`, `es`) with shared layout and translated strings.
- **`(platform)/(auth)`** — Distributor auth entry points; forms are UI-only until backend integration.
- **`components/ui/`** — Radix-based UI kit styled with Tailwind.

## Prerequisites

- **Node.js 24** (or the version pinned by your environment)
- **pnpm v10** (`packageManager` in `package.json`)

## Setup & installation

```bash
pnpm install
```

If pnpm aborts when recreating `node_modules` in non-interactive environments (e.g. some CI or tooling), use:

```bash
CI=true pnpm install
```

## Development

```bash
pnpm dev          # Next.js dev server on http://localhost:3000 (webpack)
pnpm dev:turbo    # Same, using Turbopack (faster; may be fussier with pnpm hoisting)
```

Only run **one** `next dev` at a time for this project. If you see _Unable to acquire lock_ under `.next/dev/`, stop the other process (Ctrl+C), remove `.next/dev/lock` if needed, and start again.

## Main routes

| Path | Purpose |
|------|---------|
| `/` | Redirects to `/en` |
| `/en`, `/es` | Marketing home |
| `/en/privacy`, `/es/privacy`, etc. | Legal |
| `/login` | Sign in / sign up tabs (`?tab=signup` opens sign up) |
| `/register` | Redirects to `/login?tab=signup` |
| `/inbox`, `/orders`, `/profile` | Workspace placeholders |

Privacy/terms shortcuts: `/privacy` and `/terms` redirect to the English locale routes (see `next.config.ts`).

## Build & production

```bash
pnpm build        # Production build
pnpm start        # Serve the production build (default port 3000)
```

## Environment variables

Create `.env.local` in the project root for local overrides. Next.js loads it automatically.

Examples you may add as the backend is integrated:

- `NEXT_PUBLIC_API_URL` — Backend API base URL

## Linting

```bash
pnpm lint         # ESLint
pnpm lint:fix     # ESLint with autofix
pnpm lint:ci      # ESLint, zero warnings allowed (CI-friendly)
```

Import order is enforced via `eslint-plugin-import` (grouping and alphabetization).

## Contributing

This project is early-stage and evolving, so clarity and discipline matter more than volume.

### Branch strategy

We follow a simple, environment-aligned branching model:

- **`main`** → production
- **`develop`** → integration / development

Work happens in short-lived branches created from `develop`:

- `feat/<short-description>` → new features
- `fix/<short-description>` → bug fixes
- `chore/<short-description>` → tooling, refactors, maintenance

**Flow:**

1. Create a branch from `develop`
2. Open a PR back into `develop`
3. PRs are **squash-merged**
4. Releases are promoted from `develop` → `main`

Rebasing feature branches before opening a PR is encouraged to keep history clean.

### Commit messages

This repo enforces **Conventional Commits** via commit hooks.

Use this format:

```
Common types:
- `feat:` → new functionality
- `fix:` → bug fix
- `chore:` → tooling, config, cleanup
- `refactor:` → code changes without behavior change
- `test:` → tests only
```

Examples:

- feat: add login page component
- fix: handle form validation errors
- chore: update eslint rules
