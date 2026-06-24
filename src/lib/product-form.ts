import { z } from "zod";

import {
  DASHBOARD_PRODUCT_UNLIMITED_STOCK,
  type DashboardProductRow,
} from "@/lib/dashboard-products";
import type { TrackBatchesMode } from "@/lib/lot-nomenclature";
import type { DashboardProductDetailProduct } from "@/lib/product-detail";

export const UNIT_OPTIONS = [
  "Paquete",
  "kg",
  "unidad",
  "caja",
  "bolsa",
  "litro",
  "ml",
] as const;

export const ACCEPT_IMAGE = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 614_400;

export type DashboardCategoryOption = Readonly<{ categoryId: number; name: string }>;

const catSourceSchema = z.enum(["existing", "new"]);
const yn = z.enum(["yes", "no"]);
const trackBatchesMode = z.enum(["inherit", "on", "off"]);

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "Nombre obligatorio."),
    sku: z.string().trim().min(1, "SKU obligatorio."),
    unit: z.string().min(1, "Unidad obligatoria."),
    presentation: z.string().optional(),
    categorySource: catSourceSchema,
    categoryId: z.string(),
    newCategoryName: z.string(),
    brand: z.string().trim().min(1, "Marca obligatoria."),
    inBundles: yn,
    itemsPerBundle: z.string().optional(),
    imageDataUrl: z.string().nullable().optional(),
    alwaysWithInventory: yn,
    inventoryQuantity: z.string().optional(),
    manageMinimumStock: yn,
    minimumStockQuantity: z.string().optional(),
    price: z.string().trim().min(1, "Precio obligatorio."),
    cost: z.string().trim().min(1, "Costo obligatorio."),
    availableForCustomers: z.boolean(),
    trackStock: yn,
    trackBatchesMode,
    expiryWarningDays: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.categorySource === "existing") {
      const id = Number.parseInt(data.categoryId.trim(), 10);
      if (!Number.isFinite(id) || id < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Elegí una categoría.",
          path: ["categoryId"],
        });
      }
    } else {
      const n = data.newCategoryName.trim();
      if (!n.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nombre de categoría obligatorio.",
          path: ["newCategoryName"],
        });
      }
    }

    const priceNum = Number(data.price.trim().replace(",", "."));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Precio inválido.", path: ["price"] });
    }
    const costNum = Number(data.cost.trim().replace(",", "."));
    if (!Number.isFinite(costNum) || costNum < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Costo inválido.", path: ["cost"] });
    }

    if (data.inBundles === "yes") {
      const n = Number.parseInt(data.itemsPerBundle?.trim() ?? "", 10);
      if (!Number.isFinite(n) || n < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cantidad por fardo obligatoria (entero ≥ 1).",
          path: ["itemsPerBundle"],
        });
      }
    }

    if (data.alwaysWithInventory === "no") {
      const q = Number.parseInt(data.inventoryQuantity?.trim() ?? "", 10);
      if (!Number.isFinite(q) || q < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cantidad de inventario obligatoria (entero positivo).",
          path: ["inventoryQuantity"],
        });
      }
    }

    if (data.manageMinimumStock === "yes") {
      const m = Number.parseInt(data.minimumStockQuantity?.trim() ?? "", 10);
      if (!Number.isFinite(m) || m < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cantidad mínima obligatoria (entero ≥ 0).",
          path: ["minimumStockQuantity"],
        });
      }
    }
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const emptyProductFormValues: ProductFormValues = {
  name: "",
  sku: "",
  unit: "Paquete",
  presentation: "",
  categorySource: "existing",
  categoryId: "",
  newCategoryName: "",
  brand: "",
  inBundles: "no",
  itemsPerBundle: "",
  imageDataUrl: null,
  alwaysWithInventory: "yes",
  inventoryQuantity: "",
  manageMinimumStock: "no",
  minimumStockQuantity: "",
  price: "",
  cost: "",
  availableForCustomers: true,
  trackStock: "no",
  trackBatchesMode: "inherit",
  expiryWarningDays: "",
  notes: "",
};

export function productDetailToFormValues(
  product: DashboardProductDetailProduct,
): ProductFormValues {
  const unlimited = product.stockQuantity === DASHBOARD_PRODUCT_UNLIMITED_STOCK;
  return {
    name: product.name,
    sku: product.sku ?? "",
    unit: product.unit,
    presentation: product.presentation ?? "",
    categorySource: "existing",
    categoryId: product.categoryId != null ? String(product.categoryId) : "",
    newCategoryName: "",
    brand: product.brand ?? "",
    inBundles: product.inBundles ? "yes" : "no",
    itemsPerBundle: product.itemsPerBundle ?? "",
    imageDataUrl: product.imageUrl,
    alwaysWithInventory: unlimited ? "yes" : "no",
    inventoryQuantity: unlimited ? "" : product.stockQuantity,
    manageMinimumStock: product.manageMinimumStock ? "yes" : "no",
    minimumStockQuantity: product.minimumStockQuantity ?? "",
    price: product.price ?? "",
    cost: product.cost ?? "",
    availableForCustomers: product.status === "active",
    trackStock: product.trackStock ? "yes" : "no",
    trackBatchesMode: product.trackBatchesMode,
    expiryWarningDays:
      product.expiryWarningDays != null ? String(product.expiryWarningDays) : "",
    notes: product.notes ?? "",
  };
}

export function buildProductPayload(
  values: ProductFormValues,
  categoryIdNum: number,
  mode: "create" | "edit",
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: values.name.trim(),
    sku: values.sku.trim(),
    unit: values.unit.trim(),
    categoryId: categoryIdNum,
    brand: values.brand.trim(),
    inBundles: values.inBundles === "yes",
    manageMinimumStock: values.manageMinimumStock === "yes",
    price: Number(values.price.trim().replace(",", ".")),
    cost: Number(values.cost.trim().replace(",", ".")),
    availableForCustomers: values.availableForCustomers,
  };

  const presTrim = values.presentation?.trim() ?? "";
  if (presTrim.length) payload.presentation = presTrim;

  if (values.imageDataUrl) payload.imageDataUrl = values.imageDataUrl;

  if (values.inBundles === "yes") {
    payload.itemsPerBundle = Number.parseInt(values.itemsPerBundle?.trim() ?? "", 10);
  }

  if (mode === "create") {
    payload.alwaysWithInventory = values.alwaysWithInventory === "yes";
    if (values.alwaysWithInventory === "no") {
      payload.inventoryQuantity = Number.parseInt(values.inventoryQuantity?.trim() ?? "", 10);
    }
  } else {
    payload.trackStock = values.trackStock === "yes";
    const expiryRaw = values.expiryWarningDays?.trim() ?? "";
    payload.expiryWarningDays = expiryRaw.length ? Number.parseInt(expiryRaw, 10) : null;
    const notesRaw = values.notes?.trim() ?? "";
    payload.notes = notesRaw.length ? notesRaw : null;
  }

  if (values.manageMinimumStock === "yes") {
    payload.minimumStockQuantity = Number.parseInt(values.minimumStockQuantity?.trim() ?? "", 10);
  }

  return payload;
}

export function resolveEffectiveTrackBatchesMode(
  mode: TrackBatchesMode,
  globalDefault: boolean,
): boolean {
  if (mode === "on") return true;
  if (mode === "off") return false;
  return globalDefault;
}

export function validateDataUrlLocally(url: string | null): boolean {
  if (!url) return false;
  const allowed = [
    "data:image/jpeg;base64,",
    "data:image/jpg;base64,",
    "data:image/png;base64,",
    "data:image/webp;base64,",
  ];
  return allowed.some((p) => url.startsWith(p));
}

/** Map catalog list row to partial form defaults (create modal). */
export function catalogRowToPartialDefaults(row: DashboardProductRow): Partial<ProductFormValues> {
  return {
    name: row.name,
    sku: row.sku ?? "",
    unit: row.unit,
  };
}
