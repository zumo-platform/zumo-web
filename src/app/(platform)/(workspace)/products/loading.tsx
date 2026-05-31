import { Loader2 } from "lucide-react";

export default function ProductsLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b bg-background px-3 py-5 md:px-4">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-3 w-72 max-w-full animate-pulse rounded bg-muted/80" />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-2 px-3 py-4 text-muted-foreground text-sm md:px-4">
        <Loader2 aria-hidden className="size-5 animate-spin" />
        Cargando inventario…
      </div>
    </div>
  );
}
