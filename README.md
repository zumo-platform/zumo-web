# Zumo Web

Frontend application for a WhatsApp-based supplier ordering system.

Built with **Next.js 16**, **TypeScript**, **React 19**, **Node 24**, **Tailwind CSS** and **pnpm**.

## Repository structure 🗂️

```
zumo-web/
├── src/
│   ├── app/              # Next.js app router (pages and layouts)
│   │   ├── (marketing)/  # Marketing pages
│   │   └── (platform)/   # Platform pages
│   │       ├── (auth)/   # Authentication routes
│   │       └── (dashboard)/ # Dashboard routes
│   ├── components/       # React components
│   │   ├── ui/          # UI component library (shadcn/ui)
│   │   └── typography/  # Typography components
│   ├── context/         # App state
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utility functions and helpers
├── public/              # Static assets
└── package.json         # Dependencies and scripts
```

- **`src/app/`** - Next.js app router structure with route groups for organization
- **`src/components/ui/`** - Reusable UI components built with Radix UI and Tailwind CSS
- **`src/components/typography/`** - Typography components
- **`src/hooks/`** - Custom React hooks for shared logic
- **`src/lib/`** - Utility functions and shared helpers

## Prerequisites ✅

- **Node 24**
- **pnpm v10**

## Setup & installation 🚀

```bash
pnpm install
```

### Development

```bash
pnpm dev              # Start Next.js development server (port 3000)
```

### Build

```bash
pnpm build            # Build the application for production
pnpm start            # Start the production server
```

## Environment variables 🔐

For local development, create a `.env.local` file in the root directory. Next.js automatically loads environment variables from `.env.local` files.

Required environment variables (example):

- `NEXT_PUBLIC_API_URL` - Backend API URL
- Other environment variables as needed for your backend integration

## Linting ✨

```bash
pnpm lint             # Run ESLint
pnpm lint:fix         # Run ESLint and fix auto-fixable issues
pnpm lint:ci          # Run ESLint in CI mode (max warnings: 0)
```

Import order is enforced via `eslint-plugin-import` with automatic grouping and alphabetization.

## Testing 🧪

```bash
pnpm test             # Run tests once
pnpm test:watch       # Run tests in watch mode
```

## Contributing 🤝

This project is early-stage and evolving, so clarity and discipline matter more than volume.

### Branch strategy 🌿

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

### Commit messages 🧾

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
