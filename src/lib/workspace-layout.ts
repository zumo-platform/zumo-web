/**
 * Shared layout tokens for full-width workspace list/table pages.
 */
export const workspacePageHeaderClassName = "px-3 py-5 md:px-4";

export const workspaceContentOuterClassName = "px-3 pt-4 pb-8 md:px-4 md:pt-5 md:pb-10";

export const workspaceContentInnerClassName = "flex w-full min-w-0 flex-col max-w-none";

/** Vertical scroll region below a fixed page header (table pages). */
export const workspaceTableScrollClassName =
  "min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain";

/** Table card: horizontal scroll on narrow viewports; footers stay visible vertically. */
export const workspaceTableCardClassName =
  "overflow-x-auto rounded-lg border bg-card shadow-sm";
