/**
 * Mirrors `DASHBOARD_PRODUCT_ERROR_NUMBER` in zumo-backend so the UI can show
 * `errorNo` even when an older API omits the field (still sends `code`).
 * Keep in sync with `packages/core/src/product/dashboard-product-error-codes.ts`.
 */
export const DPROD_ERROR_NO_BY_CODE: Readonly<Record<string, number>> = {
  DPROD_VAL_NAME_REQUIRED: 91001,
  DPROD_VAL_SKU_REQUIRED: 91002,
  DPROD_VAL_UNIT_REQUIRED: 91003,
  DPROD_VAL_BRAND_REQUIRED: 91004,
  DPROD_VAL_CATEGORY_ID: 91005,
  DPROD_VAL_IN_BUNDLES: 91006,
  DPROD_VAL_ITEMS_PER_BUNDLE: 91007,
  DPROD_VAL_ALWAYS_WITH_INVENTORY: 91008,
  DPROD_VAL_INVENTORY_QTY: 91009,
  DPROD_VAL_MANAGE_MIN_STOCK: 91010,
  DPROD_VAL_MIN_STOCK_QTY: 91011,
  DPROD_VAL_PRICE: 91012,
  DPROD_VAL_COST: 91013,
  DPROD_VAL_IMAGE_DATA_URL: 91014,
  DPROD_CAT_NOT_OWNED: 91101,
  DPROD_CAT_FK_VIOLATION: 91102,
  DPROD_SKU_DUPLICATE: 91103,
  DPROD_INSERT_NO_ROW: 91104,
  DPROD_ID_ALLOCATION_FAILED: 91105,
  DPROD_SERIALIZE_FAILED: 91106,
  DPROD_DB_INSERT_FAILED: 91107,
  DPROD_DB_SCHEMA_MISMATCH: 91111,
  DPROD_DB_DATA_API_ROW_LIMIT: 91110,
  DPROD_DB_CATEGORY_LOOKUP_FAILED: 91108,
  DPROD_DB_CONSTRAINT: 91109,
  DPROD_PATCH_VALIDATION: 91201,
  DPROD_PROD_NOT_FOUND: 91202,
  DPROD_DB_UPDATE_FAILED: 91203,
  DPROD_SYS_UNHANDLED: 91999,
};

export function resolveDashboardProductErrorNo(
  code: string | null,
  rawErrorNo: unknown,
): number | null {
  if (typeof rawErrorNo === "number" && Number.isFinite(rawErrorNo)) {
    return Math.trunc(rawErrorNo);
  }
  if (typeof rawErrorNo === "string" && /^\d+$/.test(rawErrorNo.trim())) {
    return Number.parseInt(rawErrorNo.trim(), 10);
  }
  if (code && code in DPROD_ERROR_NO_BY_CODE) {
    return DPROD_ERROR_NO_BY_CODE[code]!;
  }
  return null;
}
