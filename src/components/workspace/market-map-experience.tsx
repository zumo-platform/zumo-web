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
import { cn } from "@/lib/utils";
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
  type PinBucket,
} from "@/lib/dashboard-market";

import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "maplibre-gl/dist/maplibre-gl.css";

// San José metro default view.
const DEFAULT_CENTER: [number, number] = [-84.08, 9.93];
const DEFAULT_ZOOM = 12;
const SELECTED_BUSINESS_ZOOM = 17;
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Pin grows 25% when zoomed in or when a business is selected. */
const PIN_LARGE_SCALE = 1.25;
const LARGE_PIN_ZOOM = 15;
const PIN_SVG_WIDTH = 27;
const PIN_SVG_HEIGHT = 43;

/** Google Maps default marker red — used for prospect pins and the selected pointer. */
const GOOGLE_MAPS_RED = "#EA4335";
const GOOGLE_MAPS_RED_DARK = "#C5221F";

const BUCKET_COLOR: Record<PinBucket, string> = {
  prospect: GOOGLE_MAPS_RED,
  engaged: "#2563eb", // blue-600 — interested / assigned
  lead: "#d97706", // amber-600 — converted to CRM lead
  customer: "#16a34a", // green-600 — already a customer
};

const BUCKET_META: ReadonlyArray<{
  id: PinBucket;
  label: string;
  color: string;
}> = [
  { id: "prospect", label: "Prospecto", color: BUCKET_COLOR.prospect },
  { id: "engaged", label: "Interesado", color: BUCKET_COLOR.engaged },
  { id: "lead", label: "Lead creado", color: BUCKET_COLOR.lead },
  { id: "customer", label: "Ya es mi cliente", color: BUCKET_COLOR.customer },
];

const CATEGORY_OPTIONS: ReadonlyArray<{ value: MarketCategory | "all"; label: string }> = [
  { value: "all", label: "Todas las categorías" },
  { value: "restaurant", label: "Restaurantes" },
  { value: "cafe", label: "Cafeterías" },
  { value: "hotel", label: "Hoteles" },
  { value: "bakery", label: "Panaderías" },
  { value: "bar", label: "Bares" },
  { value: "other", label: "Otros" },
];

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

/** Google Maps–style label chip (shared by hover + selected markers). */
function createBusinessLabelElement(name: string): HTMLElement {
  const label = document.createElement("div");
  label.textContent = name;
  label.style.cssText =
    "max-width:180px;padding:4px 10px;background:#ffffff;border:1px solid #dadce0;border-radius:2px;font-family:Roboto,Arial,sans-serif;font-size:12px;font-weight:400;line-height:1.3;text-align:center;color:#3c4043;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 4px rgba(0,0,0,.2);";
  return label;
}

function pinPointerScale(zoom: number, options?: Readonly<{ forceLarge?: boolean }>): number {
  if (options?.forceLarge || zoom >= LARGE_PIN_ZOOM) return PIN_LARGE_SCALE;
  return 1;
}

function applyPointerScale(element: HTMLElement | undefined, scale: number): void {
  if (!element) return;
  element.style.transformOrigin = "bottom center";
  element.style.transform = scale === 1 ? "" : `scale(${scale})`;
}

function createGooglePinSvgElement(animate: boolean): HTMLElement {
  const pin = document.createElement("div");
  pin.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_SVG_WIDTH}" height="${PIN_SVG_HEIGHT}" viewBox="0 0 27 43" aria-hidden="true"><path fill="${GOOGLE_MAPS_RED}" d="M13.5 0C6.04 0 0 6.04 0 13.5 0 23.63 13.5 43 13.5 43S27 23.63 27 13.5C27 6.04 20.96 0 13.5 0z"/><circle fill="${GOOGLE_MAPS_RED_DARK}" cx="13.5" cy="13.5" r="5.5"/></svg>`;
  pin.style.cssText = "line-height:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3));transform-origin:bottom center;";
  if (animate && !prefersReducedMotion()) {
    pin.style.animation = "market-pin-pop 0.35s ease-out forwards";
  }
  return pin;
}

/** Google Maps–style selected marker: white label above a red teardrop pin. */
function createSelectedPinElement(name: string, scale = PIN_LARGE_SCALE): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "display:flex;flex-direction:column;align-items:center;pointer-events:none;transform-origin:bottom center;";

  const label = createBusinessLabelElement(name);
  label.style.marginBottom = "4px";

  wrap.append(label, createGooglePinSvgElement(false));
  applyPointerScale(wrap, scale);
  return wrap;
}

const HOVER_POINTER_DELAY_MS = 1000;

function ensurePinPopKeyframes(): void {
  if (typeof document === "undefined" || document.getElementById("market-map-pin-styles")) return;
  const style = document.createElement("style");
  style.id = "market-map-pin-styles";
  style.textContent =
    "@keyframes market-pin-pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}";
  document.head.appendChild(style);
}

type HoveredPin = Readonly<{ id: string; name: string; lng: number; lat: number }>;

const BUSINESS_MAP_SOURCE = "businesses";

/** Feature-state calls can throw when data was refreshed or the point is clustered. */
function setBusinessPinHidden(map: MLMap, id: string, hidden: boolean): void {
  if (!id || !map.getSource(BUSINESS_MAP_SOURCE)) return;
  try {
    // Always set (never removeFeatureState) — MapLibre's remove path can throw
    // "Cannot convert undefined or null to object" when state was already cleared.
    map.setFeatureState({ source: BUSINESS_MAP_SOURCE, id }, { hoverHidden: hidden });
  } catch {
    // No-op: feature not in the current tile set or state already cleared.
  }
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
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const hoverLabelMarkerRef = useRef<maplibregl.Marker | null>(null);
  const hoverPointerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredPinRef = useRef<HoveredPin | null>(null);
  const selectedRef = useRef<MarketBusiness | null>(null);
  const selectedPinHiddenRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [category, setCategory] = useState<MarketCategory | "all">("all");
  const [cantonInput, setCantonInput] = useState("");
  const [canton, setCanton] = useState<string | null>(null);
  const [selected, setSelected] = useState<MarketBusiness | null>(null);
  const [radiusMode, setRadiusMode] = useState(false);
  const [radiusKm, setRadiusKm] = useState(2);
  const [radiusCenter, setRadiusCenter] = useState<RadiusCenter | null>(null);
  const [bucketFilter, setBucketFilter] = useState<PinBucket | "all">("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapZoomRef = useRef(DEFAULT_ZOOM);

  const filters = useMemo(
    () => ({ category: category === "all" ? null : category, canton }),
    [category, canton],
  );

  const activeRadius = useMemo(
    () => (radiusMode && radiusCenter ? { ...radiusCenter, radiusKm } : null),
    [radiusMode, radiusCenter, radiusKm],
  );

  const focusBusinessOnMap = useCallback((business: MarketBusiness) => {
    if (business.lat == null || business.lng == null) return;
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      center: [business.lng, business.lat],
      zoom: Math.max(map.getZoom(), SELECTED_BUSINESS_ZOOM),
      duration: prefersReducedMotion() ? 0 : 500,
    });
  }, []);

  const selectBusiness = useCallback(
    (business: MarketBusiness, options?: Readonly<{ focus?: boolean }>) => {
      setSelected(business);
      if (options?.focus !== false) focusBusinessOnMap(business);
    },
    [focusBusinessOnMap],
  );

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const clearHoveredPin = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    hoverLabelMarkerRef.current?.remove();
    hoverLabelMarkerRef.current = null;
    hoverPointerMarkerRef.current?.remove();
    hoverPointerMarkerRef.current = null;

    const map = mapRef.current;
    const hovered = hoveredPinRef.current;
    if (map && hovered) {
      setBusinessPinHidden(map, hovered.id, false);
    }
    hoveredPinRef.current = null;
  }, []);

  const showHoverPointer = useCallback((pin: HoveredPin) => {
    const map = mapRef.current;
    if (!map || selectedRef.current?.id === pin.id) return;

    hoverLabelMarkerRef.current?.remove();
    hoverLabelMarkerRef.current = null;

    setBusinessPinHidden(map, pin.id, true);

    const scale = pinPointerScale(mapZoomRef.current);
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "display:flex;flex-direction:column;align-items:center;pointer-events:none;transform-origin:bottom center;";
    const label = createBusinessLabelElement(pin.name);
    label.style.marginBottom = "4px";
    wrap.append(label, createGooglePinSvgElement(true));
    applyPointerScale(wrap, scale);

    hoverPointerMarkerRef.current?.remove();
    hoverPointerMarkerRef.current = new maplibregl.Marker({ element: wrap, anchor: "bottom" })
      .setLngLat([pin.lng, pin.lat])
      .addTo(map);
  }, []);

  // ---- initialize map once ----
  useEffect(() => {
    ensurePinPopKeyframes();
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
        promoteId: "id",
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
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hoverHidden"], false],
            0,
            7,
          ],
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "hoverHidden"], false],
            0,
            1,
          ],
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
      // Selected business halo (pin pointer is a DOM Marker on top).
      map.addSource("selected-business", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "selected-business-ring",
        type: "circle",
        source: "selected-business",
        paint: {
          "circle-color": GOOGLE_MAPS_RED,
          "circle-opacity": 0.12,
          "circle-radius": 24,
          "circle-stroke-width": 2,
          "circle-stroke-color": GOOGLE_MAPS_RED,
          "circle-stroke-opacity": 0.35,
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
      mapZoomRef.current = map.getZoom();
    });

    map.on("zoom", () => {
      mapZoomRef.current = map.getZoom();
      const hoverMarker = hoverPointerMarkerRef.current;
      if (hoverMarker) {
        applyPointerScale(
          hoverMarker.getElement?.(),
          pinPointerScale(mapZoomRef.current),
        );
      }
    });

    // Debounced viewport fetch (skipped while in radius mode).
    map.on("moveend", () => {
      mapZoomRef.current = map.getZoom();
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
    // setData clears feature-state; re-hide the selected pin's circle dot.
    const selectedId = selectedRef.current?.id;
    if (selectedId) {
      setBusinessPinHidden(map, selectedId, true);
      selectedPinHiddenRef.current = selectedId;
    }
  }, [businessesQuery.data, ready]);

  // Pin pointer + halo for the selected business (not re-created on zoom).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    selectedMarkerRef.current?.remove();
    selectedMarkerRef.current = null;

    const src = map.getSource("selected-business") as GeoJSONSource | undefined;
    if (selectedPinHiddenRef.current) {
      setBusinessPinHidden(map, selectedPinHiddenRef.current, false);
      selectedPinHiddenRef.current = null;
    }

    if (!selected || selected.lat == null || selected.lng == null) {
      src?.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    setBusinessPinHidden(map, selected.id, true);
    selectedPinHiddenRef.current = selected.id;

    const coordinates: [number, number] = [selected.lng, selected.lat];

    src?.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates },
          properties: { name: selected.name },
        },
      ],
    });

    const el = createSelectedPinElement(selected.name, PIN_LARGE_SCALE);
    selectedMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat(coordinates)
      .addTo(map);

    return () => {
      selectedMarkerRef.current?.remove();
      selectedMarkerRef.current = null;
    };
  }, [selected, ready]);

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
      if (hit) selectBusiness(hit);
    };
    map.on("click", "business-pins", onPinClick);
    return () => {
      map.off("click", "business-pins", onPinClick);
    };
  }, [ready, businessesQuery.data, selectBusiness]);

  // Hover: name label immediately; after 1s animate dot → Google pointer.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const onPinEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const id = f?.properties?.id as string | undefined;
      const name = f?.properties?.name as string | undefined;
      if (!id || !name || f?.geometry.type !== "Point") return;
      if (selectedRef.current?.id === id) return;

      clearHoveredPin();

      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
      const pin: HoveredPin = { id, name, lng, lat };
      hoveredPinRef.current = pin;

      const labelEl = createBusinessLabelElement(name);
      hoverLabelMarkerRef.current = new maplibregl.Marker({
        element: labelEl,
        anchor: "bottom",
        offset: [0, -10],
      })
        .setLngLat([lng, lat])
        .addTo(map);

      hoverTimerRef.current = setTimeout(() => {
        hoverTimerRef.current = null;
        if (hoveredPinRef.current?.id !== id) return;
        showHoverPointer(pin);
      }, HOVER_POINTER_DELAY_MS);
    };

    const onPinLeave = () => {
      clearHoveredPin();
    };

    map.on("mouseenter", "business-pins", onPinEnter);
    map.on("mouseleave", "business-pins", onPinLeave);
    return () => {
      map.off("mouseenter", "business-pins", onPinEnter);
      map.off("mouseleave", "business-pins", onPinLeave);
      clearHoveredPin();
    };
  }, [ready, clearHoveredPin, showHoverPointer]);

  // Clear hover UI when a business becomes selected (selected marker takes over).
  useEffect(() => {
    if (selected) clearHoveredPin();
  }, [selected, clearHoveredPin]);

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
  const bucketCounts = useMemo(() => {
    const counts: Record<PinBucket, number> = {
      prospect: 0,
      engaged: 0,
      lead: 0,
      customer: 0,
    };
    for (const b of results) counts[pinBucket(b)] += 1;
    return counts;
  }, [results]);
  const filteredResults = useMemo(
    () =>
      bucketFilter === "all"
        ? results
        : results.filter((b) => pinBucket(b) === bucketFilter),
    [bucketFilter, results],
  );
  const isForbidden =
    businessesQuery.isError && /\(403\)/.test((businessesQuery.error as Error)?.message ?? "");
  const queryError =
    businessesQuery.isError && !isForbidden
      ? ((businessesQuery.error as Error)?.message ?? "No se pudo cargar el mapa.")
      : null;

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
        <LegendRow color={BUCKET_COLOR.lead} label="Lead creado" />
        <LegendRow color={BUCKET_COLOR.customer} label="Ya es mi cliente" />
      </div>

      {/* Results list (right rail) */}
      <aside className="flex h-full w-80 shrink-0 flex-col overflow-hidden border-l bg-background">
        <div className="shrink-0 border-b p-3">
          <h2 className="font-semibold">Negocios en vista</h2>
          <p className="text-muted-foreground text-sm">
            {radiusMode ? "Resultados dentro de la zona." : "Resultados del área visible."}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {BUCKET_META.map((bucket) => {
              const active = bucketFilter === bucket.id;
              return (
                <button
                  key={bucket.id}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                  type="button"
                  onClick={() =>
                    setBucketFilter((prev) => (prev === bucket.id ? "all" : bucket.id))
                  }
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: bucket.color }}
                    />
                    {bucket.label}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                    {bucketCounts[bucket.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
        {isForbidden ? (
          <p className="text-muted-foreground p-4 text-sm">
            Market no está disponible para tu cuenta todavía. Pedile a un administrador que
            active el módulo.
          </p>
        ) : queryError ? (
          <div className="space-y-3 p-4 text-sm">
            <p className="text-destructive">No se pudo cargar el listado.</p>
            <p className="text-muted-foreground">{queryError}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void businessesQuery.refetch()}
            >
              Reintentar
            </Button>
          </div>
        ) : businessesQuery.isLoading ? (
          <div className="space-y-3 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton className="h-14 w-full" key={i} />
            ))}
          </div>
        ) : filteredResults.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">
            {results.length === 0
              ? "No hay negocios en esta área. Mové el mapa o ajustá los filtros."
              : "Ningún negocio en esta categoría. Probá otro filtro o ampliá el mapa."}
          </p>
        ) : (
          <div className="divide-y">
            {filteredResults.map((b) => (
              <button
                className={cn(
                  "flex w-full flex-col items-start gap-1 p-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected?.id === b.id && "bg-accent ring-2 ring-primary ring-inset",
                )}
                key={b.id}
                type="button"
                onClick={() => selectBusiness(b)}
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
        </div>
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
  if (bucket === "lead")
    return <Badge className="bg-amber-600 hover:bg-amber-600">Lead</Badge>;
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

  const bucket = pinBucket(business);
  const hasLead = bucket === "lead";
  const isCustomer = bucket === "customer";

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
          <Select
            disabled={hasLead || isCustomer}
            value={sellerId}
            onValueChange={setSellerId}
          >
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
            disabled={busy || !sellerId || hasLead || isCustomer}
            size="sm"
            variant="secondary"
            onClick={() => void assign()}
          >
            Asignar a vendedor
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t p-4">
        {isCustomer ? (
          <p className="text-muted-foreground text-center text-sm">
            Este negocio ya figura como cliente en tu cuenta.
          </p>
        ) : hasLead ? (
          <p className="text-muted-foreground text-center text-sm">
            Lead creado en tu CRM. Convertilo a cliente desde Ventas cuando cierre.
          </p>
        ) : (
          <Button className="w-full" disabled={busy} onClick={() => void convert()}>
            Agregar como prospecto (crear lead)
          </Button>
        )}
        {!hasLead && !isCustomer ? (
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
        ) : null}
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
      <div className="h-full min-h-0 flex-1">
        <MarketMapInner />
      </div>
    </QueryClientProvider>
  );
}
