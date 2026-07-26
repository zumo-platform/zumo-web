"use client";

import { useEffect, useRef, useState } from "react";

import maplibregl, { type Map as MLMap, type Marker } from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Tiny non-interactive preview of a single pin. Client-only (WebGL). */
export function MarketAdminMapPreview({
  lat,
  lng,
  markerColor = "#2563eb",
}: Readonly<{ lat: number; lng: number; markerColor?: string }>) {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [initial] = useState(() => ({ lat, lng }));

  useEffect(() => {
    if (mapRef.current || !container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center: [initial.lng, initial.lat],
      zoom: 15,
      interactive: false,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    markerRef.current = new maplibregl.Marker({ color: markerColor })
      .setLngLat([initial.lng, initial.lat])
      .addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [initial]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLngLat([lng, lat]);
    map.jumpTo({ center: [lng, lat] });
  }, [lat, lng]);

  return (
    <div
      aria-label="Vista previa de la ubicación"
      className="h-40 w-full overflow-hidden rounded-md border"
      ref={container}
    />
  );
}
