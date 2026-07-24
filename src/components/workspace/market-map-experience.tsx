"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { CircleOff, PencilRuler, X } from "lucide-react";
import maplibregl, { type GeoJSONSource, type Map as MLMap } from "maplibre-gl";

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSellerOptionsViaProxy, type InboxSellerOption } from "@/lib/dashboard-inbox";
import {
  convertProspect,
  fetchBusinessesInBbox,
  fetchBusinessesInRadius,
  fetchMyCustomerPins,
  pinBucket,
  setProspect,
  type Bbox,
  type MarketBusiness,
  type MarketCategory,
} from "@/lib/dashboard-market";

import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "maplibre-gl/dist/maplibre-gl.css";

// San José metro default view.
const DEFAULT_CENTER: [number, number] = [-84.08, 9.93];
const DEFAULT_ZOOM = 12;
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const CATEGORY_OPTIONS: ReadonlyArray<{ value: MarketCategory | "all"; label: string }> = [
  { value: "all", label: "Todas las categorías" },
  { value: "restaurant", label: "Restaurantes" },
  { value: "cafe", label: "Cafeterías" },
  { value: "hotel", label: "Hoteles" },
  { value: "bakery", label: "Panaderías" },
  { value: "bar", label: "Bares" },
  { value: "other", label: "Otros" },
];

const BUCKET_COLOR: Record<string, string> = {
  prospect: "#6b7280", // gray-500 — not yet worked
  engaged: "#2563eb", // blue-600 — interested / assigned
  customer: "#16a34a", // green-600 — already a customer
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function toFeatureCollection(items: MarketBusiness[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: items
      .filter((b) => b.lat != null && b.lng != null)
      .map((b) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [b.lng as number, b.lat as number] },
        properties: {
          id: b.id,
          name: b.name,
          bucket: pinBucket(b),
          color: BUCKET_COLOR[pinBucket(b)],
        },
      })),
  };
}

function boundsToBbox(map: MLMap): Bbox {
  const b = map.getBounds();
  return {
    minLat: b.getSouth(),
    maxLat: b.getNorth(),
    minLng: b.getWest(),
    maxLng: b.getEast(),
  };
}

/** Build a circle polygon (approx) for the radius overlay, centered on [lng,lat]. */
function circlePolygon(
  center: [number, number],
  radiusKm: number,
  steps = 64,
): GeoJSON.FeatureCollection {
  const [lng, lat] = center;
  const coords: [number, number][] = [];
  const latR = radiusKm / 110.574;
  const lngR = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180) || 1);
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([lng + lngR * Math.cos(theta), lat + latR * Math.sin(theta)]);
  }
  return {
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} },
    ],
  };
}

// MapLibre compatibility for mapbox-gl-draw control CSS class names.
const DRAW_CLASSES = (MapboxDraw as unknown as {
  constants: { classes: Record<string, string> };
}).constants.classes;
DRAW_CLASSES.CANVAS = "maplibregl-canvas";
DRAW_CLASSES.CONTROL_BASE = "maplibregl-ctrl";
DRAW_CLASSES.CONTROL_PREFIX = "maplibregl-ctrl-";
DRAW_CLASSES.CONTROL_GROUP = "maplibregl-ctrl-group";

/**
 * Point-only draw styles for MapLibre. The default theme includes `gl-draw-lines`
 * with a data-driven `line-dasharray` that MapLibre 5 rejects; we only need
 * draw_point for the radius center marker anyway.
 */
const MAPLIBRE_DRAW_STYLES = [
  {
    id: "gl-draw-point-outer",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "feature"]],
    paint: {
      "circle-radius": ["case", ["==", ["get", "active"], "true"], 7, 5],
      "circle-color": "#ffffff",
    },
  },
  {
    id: "gl-draw-point-inner",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "feature"]],
    paint: {
      "circle-radius": ["case", ["==", ["get", "active"], "true"], 5, 3],
      "circle-color": ["case", ["==", ["get", "active"], "true"], "#fbb03b", "#2563eb"],
    },
  },
] as const;

type RadiusCenter = Readonly<{ lat: number; lng: number }>;

function MarketMapInner() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [ready, setReady] = useState(false);
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [category, setCategory] = useState<MarketCategory | "all">("all");
  const [cantonInput, setCantonInput] = useState("");
  const [canton, setCanton] = useState<string | null>(null);
  const [selected, setSelected] = useState<MarketBusiness | null>(null);
  const [radiusMode, setRadiusMode] = useState(false);
  const [radiusKm, setRadiusKm] = useState(2);
  const [radiusCenter, setRadiusCenter] = useState<RadiusCenter | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filters = useMemo(
    () => ({ category: category === "all" ? null : category, canton }),
    [category, canton],
  );

  const activeRadius = useMemo(
    () => (radiusMode && radiusCenter ? { ...radiusCenter, radiusKm } : null),
    [radiusMode, radiusCenter, radiusKm],
  );

  // ---- initialize map once ----
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({ trackUserLocation: false }),
      "top-right",
    );

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: MAPLIBRE_DRAW_STYLES as unknown as object[],
    });
    map.addControl(draw as unknown as maplibregl.IControl);
    drawRef.current = draw;

    map.on("load", () => {
      map.addSource("businesses", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "businesses",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#111827",
          "circle-opacity": 0.85,
          "circle-radius": ["step", ["get", "point_count"], 16, 25, 22, 100, 30],
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "businesses",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "business-pins",
        type: "circle",
        source: "businesses",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      // Radius overlay (below pins).
      map.addSource("radius-circle", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius-circle",
        paint: { "fill-color": "#2563eb", "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: "radius-outline",
        type: "line",
        source: "radius-circle",
        paint: { "line-color": "#2563eb", "line-width": 2, "line-dasharray": [2, 1] },
      });
      // Customer overlay (green, no clustering — it's the supplier's own).
      map.addSource("my-customers", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "my-customer-pins",
        type: "circle",
        source: "my-customers",
        paint: {
          "circle-color": BUCKET_COLOR.customer,
          "circle-radius": 6,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.on("click", "clusters", (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        const clusterId = f?.properties?.cluster_id;
        const src = map.getSource("businesses") as GeoJSONSource;
        if (clusterId != null && src.getClusterExpansionZoom) {
          void src.getClusterExpansionZoom(clusterId).then((z) => {
            map.easeTo({
              center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: z,
              duration: prefersReducedMotion() ? 0 : 500,
            });
          });
        }
      });
      const pointer = (on: boolean) => () => {
        map.getCanvas().style.cursor = on ? "pointer" : "";
      };
      map.on("mouseenter", "clusters", pointer(true));
      map.on("mouseleave", "clusters", pointer(false));
      map.on("mouseenter", "business-pins", pointer(true));
      map.on("mouseleave", "business-pins", pointer(false));

      setReady(true);
      setBbox(boundsToBbox(map));
    });

    // Debounced viewport fetch (skipped while in radius mode).
    map.on("moveend", () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setBbox(boundsToBbox(map)), 300);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, []);

  // ---- businesses query (viewport OR radius + filters) ----
  const businessesQuery = useQuery({
    queryKey: ["market-businesses", { activeRadius, bbox, filters }],
    queryFn: () =>
      activeRadius
        ? fetchBusinessesInRadius(activeRadius, filters)
        : fetchBusinessesInBbox(bbox as Bbox, filters),
    enabled: ready && (activeRadius != null || bbox != null),
    staleTime: 30_000,
  });

  // Push businesses into the map source without recreating the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !businessesQuery.data) return;
    const src = map.getSource("businesses") as GeoJSONSource | undefined;
    src?.setData(toFeatureCollection(businessesQuery.data));
  }, [businessesQuery.data, ready]);

  // ---- customer overlay (private, display-only) ----
  const customersQuery = useQuery({
    queryKey: ["market-my-customers"],
    queryFn: fetchMyCustomerPins,
    enabled: ready,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("my-customers") as GeoJSONSource | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: (customersQuery.data ?? []).map((c) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [c.lng, c.lat] },
        properties: { id: c.id, name: c.name },
      })),
    });
  }, [customersQuery.data, ready]);

  // Open the detail sheet when a pin is clicked.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const onPinClick = (e: maplibregl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      const hit = businessesQuery.data?.find((b) => b.id === id) ?? null;
      if (hit) setSelected(hit);
    };
    map.on("click", "business-pins", onPinClick);
    return () => {
      map.off("click", "business-pins", onPinClick);
    };
  }, [ready, businessesQuery.data]);

  // Radius draw: place a center point, then render the circle overlay.
  useEffect(() => {
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!map || !draw || !ready) return;
    const onCreate = (e: { features: GeoJSON.Feature[] }) => {
      const f = e.features[0];
      if (!f || f.geometry.type !== "Point") return;
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
      setRadiusCenter({ lat, lng });
      draw.deleteAll();
      draw.changeMode("simple_select");
    };
    map.on("draw.create", onCreate as unknown as (e: object) => void);
    return () => {
      map.off("draw.create", onCreate as unknown as (e: object) => void);
    };
  }, [ready]);

  // Keep the circle overlay in sync with center/radius.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("radius-circle") as GeoJSONSource | undefined;
    if (!src) return;
    if (radiusCenter) {
      src.setData(circlePolygon([radiusCenter.lng, radiusCenter.lat], radiusKm));
    } else {
      src.setData({ type: "FeatureCollection", features: [] });
    }
  }, [radiusCenter, radiusKm, ready]);

  const applyCanton = useCallback(() => {
    setCanton(cantonInput.trim() ? cantonInput.trim() : null);
  }, [cantonInput]);

  const toggleRadiusMode = useCallback(() => {
    const draw = drawRef.current;
    const map = mapRef.current;
    setRadiusMode((prev) => {
      const next = !prev;
      if (next) {
        draw?.changeMode("draw_point");
        if (map) map.getCanvas().style.cursor = "crosshair";
      } else {
        draw?.deleteAll();
        draw?.changeMode("simple_select");
        setRadiusCenter(null);
        if (map) map.getCanvas().style.cursor = "";
      }
      return next;
    });
  }, []);

  const results = businessesQuery.data ?? [];
  const isForbidden =
    businessesQuery.isError && /\(403\)/.test((businessesQuery.error as Error)?.message ?? "");

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* Map */}
      <div aria-label="Mapa de negocios" className="h-full flex-1" ref={mapContainer} />

      {/* Filter bar (floating, quiet chrome) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap gap-2 p-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur">
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as MarketCategory | "all")}
          >
            <SelectTrigger className="h-9 w-[190px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            aria-label="Filtrar por cantón"
            className="h-9 w-[180px]"
            placeholder="Cantón (p. ej. Tibás)"
            value={cantonInput}
            onChange={(e) => setCantonInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyCanton()}
          />
          <Button className="h-9" variant="secondary" onClick={applyCanton}>
            Filtrar
          </Button>
          <div className="flex items-center gap-1.5">
            <Button
              aria-pressed={radiusMode}
              className="h-9 gap-1.5"
              variant={radiusMode ? "default" : "outline"}
              onClick={toggleRadiusMode}
            >
              {radiusMode ? (
                <CircleOff aria-hidden className="size-4" />
              ) : (
                <PencilRuler aria-hidden className="size-4" />
              )}
              {radiusMode ? "Salir de zona" : "Dibujar zona"}
            </Button>
            {radiusMode ? (
              <div className="flex items-center gap-1">
                <Input
                  aria-label="Radio en kilómetros"
                  className="h-9 w-16"
                  max={20}
                  min={0.5}
                  step={0.5}
                  type="number"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Math.max(0.5, Number(e.target.value) || 0.5))}
                />
                <span className="text-muted-foreground text-xs">km</span>
              </div>
            ) : null}
          </div>
          {businessesQuery.isFetching ? (
            <span className="text-muted-foreground text-sm">Cargando…</span>
          ) : (
            <span className="text-muted-foreground text-sm">{results.length} negocios</span>
          )}
        </div>
      </div>

      {radiusMode && !radiusCenter ? (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center">
          <div className="pointer-events-auto rounded-full border bg-background/95 px-3 py-1.5 text-sm shadow-sm backdrop-blur">
            Tocá el mapa para fijar el centro de la zona
          </div>
        </div>
      ) : null}

      {/* Legend (bottom-left, quiet) */}
      <div className="absolute bottom-3 left-3 z-10 rounded-lg border bg-background/95 p-3 text-sm shadow-sm backdrop-blur">
        <p className="mb-1 font-medium">Leyenda</p>
        <LegendRow color={BUCKET_COLOR.prospect} label="Prospecto" />
        <LegendRow color={BUCKET_COLOR.engaged} label="Interesado / asignado" />
        <LegendRow color={BUCKET_COLOR.customer} label="Ya es mi cliente" />
      </div>

      {/* Results list (right rail) */}
      <aside className="hidden h-full w-80 shrink-0 overflow-y-auto border-l bg-background md:block">
        <div className="border-b p-3">
          <h2 className="font-semibold">Negocios en vista</h2>
          <p className="text-muted-foreground text-sm">
            {radiusMode ? "Resultados dentro de la zona." : "Resultados del área visible."}
          </p>
        </div>
        {isForbidden ? (
          <p className="text-muted-foreground p-4 text-sm">
            Market no está disponible para tu cuenta todavía.
          </p>
        ) : businessesQuery.isLoading ? (
          <div className="space-y-3 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton className="h-14 w-full" key={i} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">
            No hay negocios en esta área. Mové el mapa o ajustá los filtros.
          </p>
        ) : (
          <div className="divide-y">
            {results.map((b) => (
              <button
                className="flex w-full flex-col items-start gap-1 p-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={b.id}
                type="button"
                onClick={() => {
                  setSelected(b);
                  if (b.lat != null && b.lng != null) {
                    mapRef.current?.easeTo({
                      center: [b.lng, b.lat],
                      zoom: 15,
                      duration: prefersReducedMotion() ? 0 : 500,
                    });
                  }
                }}
              >
                <span className="font-medium">{b.name}</span>
                <span className="text-muted-foreground text-xs">
                  {b.canton ?? "—"} · {b.category}
                </span>
                <BucketBadge business={b} />
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Detail sheet */}
      <Sheet open={selected != null} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md" side="right">
          {selected && (
            <BusinessDetail
              business={selected}
              onDone={() => {
                setSelected(null);
                void businessesQuery.refetch();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LegendRow({ color, label }: Readonly<{ color: string; label: string }>) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}

function BucketBadge({ business }: Readonly<{ business: MarketBusiness }>) {
  const bucket = pinBucket(business);
  if (bucket === "customer")
    return <Badge className="bg-green-600 hover:bg-green-600">Cliente</Badge>;
  if (bucket === "engaged")
    return <Badge className="bg-blue-600 hover:bg-blue-600">En proceso</Badge>;
  return <Badge variant="secondary">Prospecto</Badge>;
}

function BusinessDetail({
  business,
  onDone,
}: Readonly<{ business: MarketBusiness; onDone: () => void }>) {
  const [busy, setBusy] = useState(false);
  const [sellerId, setSellerId] = useState<string>("");

  const sellersQuery = useQuery({
    queryKey: ["market-sellers"],
    queryFn: fetchSellerOptionsViaProxy,
    staleTime: 5 * 60_000,
  });
  const sellers: InboxSellerOption[] = sellersQuery.data ?? [];

  async function mark(state: "interested" | "hidden") {
    setBusy(true);
    try {
      await setProspect({ marketBusinessId: business.id, state });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  async function assign() {
    if (!sellerId) return;
    setBusy(true);
    try {
      await setProspect({
        marketBusinessId: business.id,
        state: "assigned",
        assignedSellerId: Number(sellerId),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  async function convert() {
    setBusy(true);
    try {
      await convertProspect({
        marketBusinessId: business.id,
        assignedSellerId: sellerId ? Number(sellerId) : null,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>{business.name}</SheetTitle>
        <SheetDescription>
          {[business.category, business.canton, business.provincia]
            .filter(Boolean)
            .join(" · ")}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
        {business.address && (
          <p>
            <span className="text-muted-foreground">Dirección: </span>
            {business.address}
          </p>
        )}
        {business.phone && (
          <p>
            <span className="text-muted-foreground">Teléfono: </span>
            {business.phone}
          </p>
        )}
        {business.website && (
          <p className="truncate">
            <span className="text-muted-foreground">Web: </span>
            <a
              className="underline"
              href={business.website}
              rel="noreferrer"
              target="_blank"
            >
              {business.website}
            </a>
          </p>
        )}
        <div className="pt-2">
          <BucketBadge business={business} />
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-muted-foreground text-xs" htmlFor="market-assign-seller">
            Asignar vendedor
          </label>
          <Select value={sellerId} onValueChange={setSellerId}>
            <SelectTrigger className="h-9" id="market-assign-seller">
              <SelectValue placeholder="Elegí un vendedor" />
            </SelectTrigger>
            <SelectContent>
              {sellers.map((s) => (
                <SelectItem key={s.sellerId} value={String(s.sellerId)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full gap-1.5"
            disabled={busy || !sellerId}
            size="sm"
            variant="secondary"
            onClick={() => void assign()}
          >
            Asignar a vendedor
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t p-4">
        <Button className="w-full" disabled={busy} onClick={() => void convert()}>
          Agregar como prospecto (crear lead)
        </Button>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={busy}
            variant="secondary"
            onClick={() => void mark("interested")}
          >
            Marcar interesado
          </Button>
          <Button
            className="flex-1 gap-1.5"
            disabled={busy}
            variant="ghost"
            onClick={() => void mark("hidden")}
          >
            <X aria-hidden className="size-4" />
            Ocultar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MarketMapExperience() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <MarketMapInner />
    </QueryClientProvider>
  );
}
