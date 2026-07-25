"use client";

import { useEffect, useState } from "react";

import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  archiveAdminBusiness,
  listAdminBusinesses,
  publishAdminBusiness,
  type AdminBusiness,
  type AdminListParams,
  type MarketBusinessSource,
  type MarketBusinessStatus,
} from "@/lib/admin-market";
import type { MarketCategory } from "@/lib/dashboard-market";

import { MarketAdminEditSheet } from "./market-admin-edit-sheet";
import { MarketAdminMergeDialog } from "./market-admin-merge-dialog";

const PAGE = 50;

const STATUS_LABEL: Record<MarketBusinessStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};
const STATUS_VARIANT: Record<MarketBusinessStatus, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};
const SOURCE_LABEL: Record<MarketBusinessSource, string> = {
  osm: "OSM",
  zumo_admin: "Zumo",
  google: "Google",
  csv: "CSV",
};
const CATEGORY_OPTIONS: ReadonlyArray<{ value: MarketCategory; label: string }> = [
  { value: "restaurant", label: "Restaurantes" },
  { value: "cafe", label: "Cafeterías" },
  { value: "hotel", label: "Hoteles" },
  { value: "bakery", label: "Panaderías" },
  { value: "bar", label: "Bares" },
  { value: "other", label: "Otros" },
];

/** Debounce free-text filters so typing doesn't fire a request per keystroke. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function MarketAdminTableInner() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<MarketBusinessStatus | "">("");
  const [source, setSource] = useState<MarketBusinessSource | "">("");
  const [category, setCategory] = useState<MarketCategory | "">("");
  const [canton, setCanton] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editId, setEditId] = useState<string | "new" | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);

  const debouncedCanton = useDebounced(canton, 300);
  const debouncedSearch = useDebounced(search, 300);

  const params: AdminListParams = {
    status: status || undefined,
    source: source || undefined,
    category: category || undefined,
    canton: debouncedCanton.trim() || undefined,
    search: debouncedSearch.trim() || undefined,
    limit: PAGE,
    offset: page * PAGE,
  };

  const query = useQuery({
    queryKey: ["admin-market", params],
    queryFn: () => listAdminBusinesses(params),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["admin-market"] });
  }

  async function onPublish(b: AdminBusiness) {
    try {
      await publishAdminBusiness(b.id);
      toast.success(`"${b.name}" publicado`);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onArchive(b: AdminBusiness) {
    try {
      await archiveAdminBusiness(b.id);
      toast.success(`"${b.name}" archivado`);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("ID copiado");
    } catch {
      toast.error("No se pudo copiar el ID");
    }
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="bg-background flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <Input
          aria-label="Buscar por nombre"
          className="h-9 w-56"
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
        />
        <Select
          value={status || "all"}
          onValueChange={(v) => {
            setPage(0);
            setStatus(v === "all" ? "" : (v as MarketBusinessStatus));
          }}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {(Object.keys(STATUS_LABEL) as MarketBusinessStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={source || "all"}
          onValueChange={(v) => {
            setPage(0);
            setSource(v === "all" ? "" : (v as MarketBusinessSource));
          }}
        >
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Origen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los orígenes</SelectItem>
            {(Object.keys(SOURCE_LABEL) as MarketBusinessSource[]).map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={category || "all"}
          onValueChange={(v) => {
            setPage(0);
            setCategory(v === "all" ? "" : (v as MarketCategory));
          }}
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORY_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          aria-label="Filtrar por cantón"
          className="h-9 w-36"
          placeholder="Cantón"
          value={canton}
          onChange={(e) => {
            setPage(0);
            setCanton(e.target.value);
          }}
        />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setMergeOpen(true)}>
            Fusionar duplicados
          </Button>
          <Button onClick={() => setEditId("new")}>Nuevo negocio</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-background rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Cantón</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Conf.</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isError ? (
              <TableRow>
                <TableCell className="py-8 text-center" colSpan={7}>
                  <p className="text-destructive text-sm font-medium">
                    No se pudo cargar el listado.
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {(query.error as Error).message}
                  </p>
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    onClick={() => void query.refetch()}
                  >
                    Reintentar
                  </Button>
                </TableCell>
              </TableRow>
            ) : query.isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground py-8 text-center" colSpan={7}>
                  No hay negocios con estos filtros.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="font-medium">{b.name}</div>
                    <button
                      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mt-0.5 flex items-center gap-1 rounded font-mono text-xs focus-visible:ring-2 focus-visible:outline-none"
                      title="Copiar ID"
                      type="button"
                      onClick={() => void copyId(b.id)}
                    >
                      <Copy aria-hidden className="size-3" />
                      {b.id}
                    </button>
                  </TableCell>
                  <TableCell>{b.category}</TableCell>
                  <TableCell>{b.canton ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[b.status]}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{SOURCE_LABEL[b.source] ?? b.source}</Badge>
                  </TableCell>
                  <TableCell>
                    {b.confidence != null
                      ? `${Math.round(Number(b.confidence) * 100)}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditId(b.id)}>
                        Editar
                      </Button>
                      {b.status !== "published" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void onPublish(b)}
                        >
                          Publicar
                        </Button>
                      )}
                      {b.status !== "archived" && (
                        <Button size="sm" variant="ghost" onClick={() => void onArchive(b)}>
                          Archivar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total} negocios · página {page + 1} de {pages}
          {query.isFetching ? " · actualizando…" : ""}
        </span>
        <div className="flex gap-2">
          <Button
            disabled={page === 0}
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </Button>
          <Button
            disabled={page + 1 >= pages}
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>

      {editId && (
        <MarketAdminEditSheet
          businessId={editId}
          onClose={() => setEditId(null)}
          onSaved={() => {
            setEditId(null);
            refresh();
          }}
        />
      )}
      <MarketAdminMergeDialog
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        onMerged={() => {
          setMergeOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

export function MarketAdminTable() {
  // The app has no global QueryClientProvider; scope one to this tool.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <MarketAdminTableInner />
    </QueryClientProvider>
  );
}
