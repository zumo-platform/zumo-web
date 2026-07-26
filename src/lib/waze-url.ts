export type WazeCoordinates = Readonly<{ lat: number; lng: number }>;

/** Parse `ll=lat,lng` (or `q=lat,lng`) from a Waze share / deep link. */
export function parseWazeCoordinates(input: string | null | undefined): WazeCoordinates | null {
  const raw = input?.trim();
  if (!raw) return null;

  let url: URL;
  try {
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/\//, "")}`;
    url = new URL(href);
  } catch {
    return parseLatLngPair(raw);
  }

  const host = url.hostname.toLowerCase();
  if (!host.includes("waze.com")) {
    return parseLatLngPair(raw);
  }

  const ll = url.searchParams.get("ll");
  if (ll) {
    const fromLl = parseLatLngPair(ll);
    if (fromLl) return fromLl;
  }

  const q = url.searchParams.get("q");
  if (q) {
    const fromQ = parseLatLngPair(q);
    if (fromQ) return fromQ;
  }

  return null;
}

function parseLatLngPair(value: string): WazeCoordinates | null {
  const decoded = decodeURIComponent(value.trim());
  const match = decoded.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Normalize user input into a clickable Waze navigation URL. */
export function normalizeWazeUrl(input: string | null | undefined): string | null {
  const raw = input?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.includes("waze.com")) return `https://${raw.replace(/^\/\//, "")}`;

  const coords = parseWazeCoordinates(raw);
  if (coords) {
    return `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`;
  }

  return raw;
}
