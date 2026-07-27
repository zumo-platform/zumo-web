# Market Admin (frontend)

Internal ZUMO backoffice for curating the **global** HORECA directory. Suppliers use the
separate **Market business** map at `/market`; this doc covers the staff-only admin UI.

**Canonical backend reference (API, OSM import, merge rules):**
[zumo-backend/docs/market-admin.md](https://github.com/zumo-platform/zumo-backend/blob/main/docs/market-admin.md)

## Routes

| Path | Who | Permission | Purpose |
|------|-----|------------|---------|
| **`/admin/market`** | ZUMO staff | `market.admin` | Global directory table — edit, publish, archive, merge |
| `/market` | Suppliers | `market.access` | Supplier prospecting map (not documented here) |

The admin page is **not** linked from the supplier sidebar. Access is direct URL + permission
check only.

## App structure

```
src/app/(platform)/(admin)/admin/market/page.tsx   → /admin/market
src/components/admin/
  market-admin-table.tsx      # filters, pagination, row actions
  market-admin-edit-sheet.tsx # create / edit business + map preview
  market-admin-merge-dialog.tsx
  market-admin-map-preview.tsx
src/lib/admin-market.ts       # proxy client → /api/backend/admin/market/*
```

Layout guard: `(admin)` route group + server permission helper (`market.admin`).

## UI capabilities

- **List** global businesses with filters: status, cantón, category, source, search
- **Edit sheet** — name, category, status, lat/lng, address, province/canton/distrito, phone,
  website; inline map preview when coordinates are set
- **Publish / archive** — moves businesses between `draft` → `published` → `archived`
- **Merge** — pick survivor + duplicate; duplicate is archived and supplier prospects repoint
- **New business** — manual `zumo_admin` source row

## API proxy

Browser calls go through **`/api/backend/admin/market/*`** (JWT proxy). See backend doc for
route table and handler path (`packages/functions/src/api/admin/market.ts`).

## Related

- Supplier map UX: `src/components/workspace/market-map-experience.tsx` at `/market`
- Permissions: `src/lib/roles.ts` (`market.admin`, `market.access`)
