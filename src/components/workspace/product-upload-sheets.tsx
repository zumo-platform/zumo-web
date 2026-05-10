"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { ArrowLeft, FileSpreadsheet, Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CreateProductForm,
  type DashboardCategoryOption,
} from "@/components/workspace/create-product-form";
import { cn } from "@/lib/utils";

type ProductUploadSheetsProps = {
  /** Renders the control that opens the upload-method sheet. */
  renderTrigger: (ctx: { open: () => void }) => ReactNode;
  /** Widen the method sheet on large screens (default from shadcn is narrow). */
  className?: string;
  /** Called after a product is successfully created so the workspace can reload data. */
  onProductsChanged?: () => void;
};

export function ProductUploadSheets({
  renderTrigger,
  className,
  onProductsChanged,
}: ProductUploadSheetsProps) {
  const [methodOpen, setMethodOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  /** Increment when the manual sheet closes so form state resets (no draft). */
  const [manualFormKey, setManualFormKey] = useState(0);
  /** Bump to refetch categories (e.g. after creating one). */
  const [categoriesReloadNonce, setCategoriesReloadNonce] = useState(0);

  const [categories, setCategories] = useState<DashboardCategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const openMethod = useCallback(() => setMethodOpen(true), []);

  const goToManual = useCallback(() => {
    setMethodOpen(false);
    setManualOpen(true);
  }, []);

  const goBackToMethods = useCallback(() => {
    setManualOpen(false);
    setMethodOpen(true);
  }, []);

  const onCsvClick = useCallback(() => {
    toast.message("La carga masiva por CSV estará disponible próximamente.");
  }, []);


  useEffect(() => {
    if (!manualOpen) return;

    let cancelled = false;
    (async () => {
      setCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const res = await fetch("/api/backend/dashboard/product-categories", {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          const msg = typeof data.error === "string" ? data.error : `Error ${String(res.status)}`;
          const friendly =
            res.status === 404
              ? "El servidor no expone categorías (404); desplegá el backend actualizado o revisá API_URL."
              : msg;
          if (!cancelled) {
            setCategoriesError(friendly);
            setCategories([]);
          }
          if (!cancelled && res.status === 404) {
            toast.error(friendly);
          }
          return;
        }
        const raw = data.categories;
        const list: DashboardCategoryOption[] = [];
        if (Array.isArray(raw)) {
          for (const item of raw) {
            if (!item || typeof item !== "object") continue;
            const o = item as Record<string, unknown>;
            const id = typeof o.categoryId === "number" ? o.categoryId : Number(o.categoryId);
            const name = typeof o.name === "string" ? o.name.trim() : "";
            if (Number.isFinite(id) && id >= 1 && name.length) {
              list.push({ categoryId: id, name });
            }
          }
        }
        if (!cancelled) {
          setCategories(list);
          if (list.length === 0) {
            setCategoriesError(null);
          }
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
          setCategoriesError("Error de red al cargar categorías.");
        }
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [manualOpen, categoriesReloadNonce]);

  const handleManualOpenChange = useCallback((open: boolean) => {
    setManualOpen(open);
    if (!open) {
      setManualFormKey((k) => k + 1);
    }
  }, []);

  return (
    <>
      {renderTrigger({ open: openMethod })}

      <Sheet open={methodOpen} onOpenChange={setMethodOpen}>
        <SheetContent
          side="right"
          className={cn(
            "flex w-full flex-col border-border sm:max-w-md",
            className,
          )}
        >
          <SheetHeader className="border-border border-b pb-4 text-left">
            <SheetTitle className="text-lg">Agregar productos</SheetTitle>
            <SheetDescription>
              Elegí cómo querés cargar tu catálogo. Podés usar una planilla o crear productos uno por uno.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-4">
            <button
              type="button"
              className={cn(
                "flex w-full flex-col items-start gap-2 rounded-lg border border-border bg-card p-4 text-left shadow-sm",
                "outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring",
              )}
              onClick={onCsvClick}
            >
              <span className="flex items-center gap-2 font-medium text-foreground text-sm">
                <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                Cargar con CSV
              </span>
              <span className="text-muted-foreground text-sm leading-snug">
                Importá varias filas desde una planilla. Ideal para catálogos grandes.
              </span>
            </button>
            <button
              type="button"
              className={cn(
                "flex w-full flex-col items-start gap-2 rounded-lg border border-border bg-card p-4 text-left shadow-sm",
                "outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring",
              )}
              onClick={goToManual}
            >
              <span className="flex items-center gap-2 font-medium text-foreground text-sm">
                <PenLine className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                Carga manual
              </span>
              <span className="text-muted-foreground text-sm leading-snug">
                Completá los datos de un producto en un formulario guiado.
              </span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={manualOpen} onOpenChange={handleManualOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-border p-0 sm:max-w-xl md:max-w-2xl"
        >
          <SheetHeader className="border-border shrink-0 space-y-3 border-b px-4 py-3 text-left sm:px-6">
            {/* Radix Dialog requires a Title on SheetContent for a11y; visible heading lives in CreateProductForm. */}
            <SheetTitle className="sr-only">Crear producto</SheetTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 h-8 w-fit gap-1 px-2 text-muted-foreground"
              onClick={goBackToMethods}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Elegir otro método
            </Button>
          </SheetHeader>

          {categoriesLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
              <Loader2 className="size-6 animate-spin" aria-hidden />
              Cargando categorías…
            </div>
          ) : (
            <div key={manualFormKey} className="flex min-h-0 flex-1 flex-col">
              <CreateProductForm
                categories={categories}
                categoriesLoadError={categoriesError}
                onCancel={() => setManualOpen(false)}
                onCategoryListChanged={(cat) => {
                  setCategories((prev) => {
                    if (prev.some((p) => p.categoryId === cat.categoryId)) return prev;
                    return [...prev, cat].sort((a, b) => a.name.localeCompare(b.name, "es"));
                  });
                }}
                onCreated={() => {
                  setManualOpen(false);
                  setMethodOpen(false);
                  onProductsChanged?.();
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
