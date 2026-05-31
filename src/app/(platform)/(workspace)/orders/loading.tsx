import { Loader2 } from "lucide-react";

export default function OrdersLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b bg-background px-3 py-5 md:px-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-3 w-64 max-w-full animate-pulse rounded bg-muted/80" />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 aria-hidden className="size-5 animate-spin" />
        Cargando pedidos…
      </div>
    </div>
  );
}
