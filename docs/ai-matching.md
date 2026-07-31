# AI product matching (frontend)

Canonical reference: [zumo-backend/docs/ai-matching.md](../../zumo-backend/docs/ai-matching.md).

**AI improvement timeline (backend):** [zumo-backend/docs/ai-order-intelligence.md](../../zumo-backend/docs/ai-order-intelligence.md).

## Components

| Component | File | Where used |
|-----------|------|------------|
| `MatchCoverageIndicator` | `src/components/workspace/match-coverage-indicator.tsx` | Order detail header, orders list (Ítems column), Kanban card Ítems row, WhatsApp drafts |
| `LineMatchIndicator` | same | Order detail table — **Cantidad** column (when order has `matchCoverage`) |
| `TouchlessBolt` | same | Coverage row at 100%; optional bolt on list **Canal** column when `isTouchless` + auto-commit setting |

## Display rules

**Order-level** (`matchCoverage` from API, 0–1):

| State | Display |
|-------|---------|
| 100% match | `{lineCount} ✓ 100% ⚡` |
| Partial | `{lineCount} ○ {pct}%` (colored ring) |
| No AI data | `{n} línea(s) · sin coincidencia AI` (tooltip) |

**Line-level** (only when order `matchCoverage != null`):

| Line | Display |
|------|---------|
| Matched (`productId` set) | `{quantity} ✓ 100% ⚡` |
| Unmatched | `{quantity} ○ 0%` |

## Related UI (inventory, not AI)

- **`OrderStockReservationIndicator`** — sky-blue **Inventario reservado** badge when
  `hasHeldStockReservation` (from `GET /dashboard/orders`). Independent of match coverage.
- **`OrderBackorderIndicators`** — faltantes / backorder risk pills.

WhatsApp sidebar drafts reflect backend **`draftableLines`** — partial matches appear while the bot is still clarifying.
