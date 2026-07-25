# Market Admin (frontend)

Canonical reference: [zumo-backend/docs/market-admin.md](../../zumo-backend/docs/market-admin.md).

The admin backoffice lives in the `(admin)` route group at `/admin/market`, gated by the
`market.admin` permission. It lists the global HORECA directory (including `draft`/`archived`),
and lets Zumo staff edit, publish, archive, and merge businesses. Supplier users never see it.
