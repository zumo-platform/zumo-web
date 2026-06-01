/** Browser proxy calls for Customer Hub labels + tasks. */

import type { CustomerLabelRow } from "@/lib/customer-hub";

export type CustomerTaskDetail = Readonly<{
  taskId: string;
  title: string;
  notes: string;
  status: "open" | "done" | "dismissed";
  dueAt: string | null;
  createdAt: string;
}>;

function hubBase(customerId: number): string {
  return `/api/backend/dashboard/customers/${encodeURIComponent(String(customerId))}`;
}

function parseTaskRow(value: unknown): CustomerTaskDetail | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const taskId = typeof o.taskId === "string" ? o.taskId.trim() : "";
  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (!taskId || !title) return null;
  const notes = typeof o.notes === "string" ? o.notes : "";
  const status =
    o.status === "open" || o.status === "done" || o.status === "dismissed" ? o.status : "open";
  const dueAt =
    o.dueAt === null || o.dueAt === undefined
      ? null
      : typeof o.dueAt === "string" && o.dueAt.trim()
        ? o.dueAt.trim()
        : null;
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : "";
  return { taskId, title, notes, status, dueAt, createdAt };
}

export async function fetchCustomerTasksViaProxy(
  customerId: number,
  opts: { includeClosed?: boolean } = {},
): Promise<CustomerTaskDetail[]> {
  const qs = opts.includeClosed ? "?includeClosed=true" : "";
  const res = await fetch(`${hubBase(customerId)}/tasks${qs}`, {
    credentials: "include",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return [];
  const raw = body.data;
  if (!Array.isArray(raw)) return [];
  const rows: CustomerTaskDetail[] = [];
  for (const item of raw) {
    const row = parseTaskRow(item);
    if (row) rows.push(row);
  }
  return rows;
}

export async function createCustomerTaskViaProxy(
  customerId: number,
  input: Readonly<{ title: string; dueAt?: string | null; notes?: string }>,
): Promise<string | null> {
  const res = await fetch(`${hubBase(customerId)}/tasks`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return null;
  return typeof body.taskId === "string" ? body.taskId : null;
}

export async function completeCustomerTaskViaProxy(
  customerId: number,
  taskId: string,
): Promise<boolean> {
  const res = await fetch(
    `${hubBase(customerId)}/tasks/${encodeURIComponent(taskId)}/complete`,
    { method: "POST", credentials: "include" },
  );
  return res.ok;
}

export async function dismissCustomerTaskViaProxy(
  customerId: number,
  taskId: string,
): Promise<boolean> {
  const res = await fetch(
    `${hubBase(customerId)}/tasks/${encodeURIComponent(taskId)}/dismiss`,
    { method: "POST", credentials: "include" },
  );
  return res.ok;
}

export async function deleteCustomerTaskViaProxy(
  customerId: number,
  taskId: string,
): Promise<boolean> {
  const res = await fetch(`${hubBase(customerId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.ok;
}

function hubErrorMessage(body: Record<string, unknown>, status: number): string {
  if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
  if (typeof body.error === "string" && body.error.trim()) {
    switch (body.error) {
      case "label_required":
        return "La etiqueta no puede estar vac\u00eda.";
      case "Invalid customerId":
      case "bad_request":
        return "Cliente no v\u00e1lido.";
      case "label_create_failed":
        return "No se pudo guardar la etiqueta. Verific\u00e1 que la migraci\u00f3n del Customer Hub est\u00e9 aplicada.";
      case "Unauthorized: no supplier":
        return "Sesión expirada. Volvé a iniciar sesión.";
      default:
        return body.error;
    }
  }
  return `Error del servidor (${status}).`;
}

export async function addCustomerLabelViaProxy(
  customerId: number,
  label: string,
  color?: string | null,
): Promise<CustomerLabelRow> {
  const res = await fetch(`${hubBase(customerId)}/labels`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, color: color ?? null }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(hubErrorMessage(body, res.status));
  }
  const labelId = typeof body.labelId === "string" ? body.labelId.trim() : "";
  const savedLabel = typeof body.label === "string" ? body.label.trim() : label.trim();
  if (!labelId || !savedLabel) {
    throw new Error("Respuesta inv\u00e1lida del servidor.");
  }
  const savedColor =
    body.color === null || body.color === undefined
      ? null
      : typeof body.color === "string" && body.color.trim()
        ? body.color.trim()
        : null;
  return { labelId, label: savedLabel, color: savedColor };
}

export async function removeCustomerLabelViaProxy(
  customerId: number,
  labelId: string,
): Promise<boolean> {
  const res = await fetch(
    `${hubBase(customerId)}/labels/${encodeURIComponent(labelId)}`,
    { method: "DELETE", credentials: "include" },
  );
  return res.ok;
}
