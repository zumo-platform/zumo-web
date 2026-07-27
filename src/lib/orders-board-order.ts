import { arrayMove } from "@dnd-kit/sortable";

import {
  WORKSPACE_CACHE_KEYS,
  WORKSPACE_CACHE_TTL_MS,
  readSessionCache,
  writeSessionCache,
} from "@/lib/workspace-session-cache";

export type ColumnOrderMap = Readonly<Record<string, readonly string[]>>;

export function ordersBoardOrderCacheKey(): string {
  return `${WORKSPACE_CACHE_KEYS.orders}:board-order`;
}

export function readPersistedColumnOrder(): ColumnOrderMap | null {
  return readSessionCache<ColumnOrderMap>(ordersBoardOrderCacheKey());
}

export function persistColumnOrder(order: ColumnOrderMap): void {
  writeSessionCache(ordersBoardOrderCacheKey(), order, WORKSPACE_CACHE_TTL_MS.orders);
}

export function buildInitialColumnOrder(
  columnKeys: readonly string[],
  ordersByStatus: ReadonlyMap<string, readonly { orderId: string }[]>,
  saved: ColumnOrderMap | null,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const key of columnKeys) {
    const currentIds = (ordersByStatus.get(key) ?? []).map((o) => o.orderId);
    const savedIds = saved?.[key] ?? [];
    const known = savedIds.filter((id) => currentIds.includes(id));
    const appended = currentIds.filter((id) => !known.includes(id));
    result[key] = [...known, ...appended];
  }
  return result;
}

/** Keep manual order within columns; append newly arrived orders to the bottom. */
export function reconcileColumnOrder(
  prev: ColumnOrderMap,
  columnKeys: readonly string[],
  orderIdsByColumn: ReadonlyMap<string, readonly string[]>,
): Record<string, string[]> {
  const next: Record<string, string[]> = {};
  for (const key of columnKeys) {
    const idsInCol = new Set(orderIdsByColumn.get(key) ?? []);
    const prevIds = (prev[key] ?? []).filter((id) => idsInCol.has(id));
    const missing = [...idsInCol].filter((id) => !prevIds.includes(id));
    next[key] = [...prevIds, ...missing];
  }
  return next;
}

export function sortOrdersByColumnOrder<T extends { orderId: string }>(
  orders: readonly T[],
  orderIds: readonly string[],
): T[] {
  const byId = new Map(orders.map((o) => [o.orderId, o]));
  return orderIds.map((id) => byId.get(id)).filter((o): o is T => o != null);
}

export function moveOrderToColumnBottom(
  prev: ColumnOrderMap,
  orderId: string,
  fromKey: string,
  toKey: string,
): Record<string, string[]> {
  const next: Record<string, string[]> = {};
  for (const [key, ids] of Object.entries(prev)) {
    next[key] = [...ids];
  }
  if (next[fromKey]) {
    next[fromKey] = next[fromKey].filter((id) => id !== orderId);
  }
  const target = (next[toKey] ?? []).filter((id) => id !== orderId);
  next[toKey] = [...target, orderId];
  return next;
}

export function reorderWithinColumn(
  prev: ColumnOrderMap,
  columnKey: string,
  activeId: string,
  overId: string,
): Record<string, string[]> | null {
  const ids = [...(prev[columnKey] ?? [])];
  const oldIndex = ids.indexOf(activeId);
  const newIndex = ids.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return null;
  const next: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(prev)) {
    next[key] = [...value];
  }
  next[columnKey] = arrayMove(ids, oldIndex, newIndex);
  return next;
}

export function resolveDropColumnKey(
  overId: string,
  overStatusKey: string | undefined,
  columnKeys: ReadonlySet<string>,
  columnOrder: ColumnOrderMap,
): string | null {
  if (columnKeys.has(overId)) return overId;
  if (overStatusKey && columnKeys.has(overStatusKey)) return overStatusKey;
  for (const [key, ids] of Object.entries(columnOrder)) {
    if (ids.includes(overId)) return key;
  }
  return null;
}
