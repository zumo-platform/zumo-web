/**
 * Clipboard helpers. Prefer {@link copyTextWithUserGesture} inside **click** handlers:
 * `navigator.clipboard.writeText` is async and often loses the browser’s transient user
 * activation, so copy silently fails. `document.execCommand("copy")` runs synchronously.
 */

/** Synchronous copy — call directly from `onClick` (same synchronous turn as the click). */
export function copyTextWithUserGesture(text: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.width = "2em";
    ta.style.height = "2em";
    ta.style.padding = "0";
    ta.style.border = "none";
    ta.style.outline = "none";
    ta.style.boxShadow = "none";
    ta.style.background = "transparent";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Best-effort copy when there may be no user gesture (e.g. after `await`): sync path first,
 * then async Clipboard API.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (copyTextWithUserGesture(text)) return true;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
