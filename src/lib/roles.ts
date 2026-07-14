/** Canonical dashboard roles (mirrors backend `SellerRole`). */
export const ROLES = ["owner", "operator", "seller", "marketing"] as const;
export type Role = (typeof ROLES)[number];

export const ASSIGNABLE_ROLES = ["operator", "seller", "marketing"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const PERMISSION_KEYS = [
  "users.invite",
  "users.edit_role",
  "users.set_operator",
  "users.remove",
  "conversations.view_all",
  "conversations.view_own",
  "customers.view_all",
  "customers.assign_seller",
  "customers.delete",
  "customers.edit_own",
  "orders.create",
  "orders.view_all",
  "orders.edit_own",
  "orders.confirm_own",
  "orders.delete_own",
  "orders.delete",
  "tasks.manage_own",
  "cart.manage_own",
  "proposals.create_own",
  "pricing.edit_own",
  "pricing.override_band",
  "marketing.access",
  "marketing.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

const ALL_PERMISSIONS = new Set<PermissionKey>(PERMISSION_KEYS);

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, ReadonlySet<PermissionKey>> = {
  owner: ALL_PERMISSIONS,
  operator: new Set([
    "users.invite",
    "users.edit_role",
    "users.set_operator",
    "users.remove",
    "conversations.view_all",
    "customers.assign_seller",
    "customers.view_all",
    "orders.create",
    "customers.delete",
    "orders.delete",
    "marketing.manage",
    "marketing.access",
  ]),
  seller: new Set([
    "conversations.view_own",
    "orders.view_all",
    "orders.edit_own",
    "orders.confirm_own",
    "orders.delete_own",
    "tasks.manage_own",
    "cart.manage_own",
    "customers.edit_own",
    "proposals.create_own",
    "pricing.edit_own",
    "pricing.override_band",
  ]),
  marketing: new Set(["marketing.manage", "marketing.access"]),
};

export function normalizeRole(raw: string | null | undefined): Role | null {
  const r = (raw ?? "").trim().toLowerCase();
  if (r === "admin") return "operator";
  if (r === "sales") return "seller";
  if (ROLES.includes(r as Role)) return r as Role;
  return null;
}

export function roleLabel(role: string): string {
  switch (normalizeRole(role)) {
    case "owner":
      return "Propietario";
    case "operator":
      return "Operador";
    case "seller":
      return "Vendedor";
    case "marketing":
      return "Marketing";
    default:
      return role.replaceAll("_", " ");
  }
}

export function teamStateLabel(state: "pending" | "registered"): string {
  return state === "pending" ? "Pendiente de registro" : "Registrado";
}

export function resolveEffectivePermissions(input: {
  role: string;
  roleOverrides?: Readonly<Record<string, boolean>>;
  userOverrides?: Readonly<Record<string, boolean>>;
}): Set<PermissionKey> {
  const role = normalizeRole(input.role);
  if (role === "owner") return new Set(ALL_PERMISSIONS);

  const base = role ? DEFAULT_ROLE_PERMISSIONS[role] : new Set<PermissionKey>();
  const effective = new Set<PermissionKey>(base);

  if (input.roleOverrides) {
    for (const [key, granted] of Object.entries(input.roleOverrides)) {
      if (!PERMISSION_KEYS.includes(key as PermissionKey)) continue;
      if (granted) effective.add(key as PermissionKey);
      else effective.delete(key as PermissionKey);
    }
  }

  if (input.userOverrides) {
    for (const [key, granted] of Object.entries(input.userOverrides)) {
      if (!PERMISSION_KEYS.includes(key as PermissionKey)) continue;
      if (granted) effective.add(key as PermissionKey);
      else effective.delete(key as PermissionKey);
    }
  }

  return effective;
}

export function permissionsFromRole(role: string): Set<PermissionKey> {
  return resolveEffectivePermissions({ role });
}

export function can(
  permissions: ReadonlySet<string> | readonly string[],
  key: PermissionKey,
): boolean {
  const set = permissions instanceof Set ? permissions : new Set(permissions);
  return set.has(key);
}

export function canWithRole(
  role: string,
  permissions: ReadonlySet<string> | readonly string[],
  key: PermissionKey,
): boolean {
  if (normalizeRole(role) === "owner") return true;
  return can(permissions, key);
}

/** Owner/operator may mutate warehouses and stock (until inventory.* permission keys ship). */
export function canMutateInventory(role: string): boolean {
  const r = normalizeRole(role);
  return r === "owner" || r === "operator";
}

/** §2.4 — actor may change target role only when allowed. */
export function canEditTargetRole(actorRole: string, targetRole: string): boolean {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (!actor || !target) return false;
  if (target === "owner") return false;
  if (actor === "owner") return true;
  if (actor === "operator") return target === "seller" || target === "marketing";
  return false;
}

export function isAssignableRole(role: string): role is AssignableRole {
  return ASSIGNABLE_ROLES.includes(role as AssignableRole);
}

export const PERMISSION_GROUPS: ReadonlyArray<{
  label: string;
  keys: readonly PermissionKey[];
}> = [
  {
    label: "Usuarios",
    keys: ["users.invite", "users.edit_role", "users.set_operator", "users.remove"],
  },
  {
    label: "Conversaciones",
    keys: ["conversations.view_all", "conversations.view_own"],
  },
  {
    label: "Clientes",
    keys: [
      "customers.view_all",
      "customers.assign_seller",
      "customers.delete",
      "customers.edit_own",
    ],
  },
  {
    label: "Pedidos",
    keys: [
      "orders.create",
      "orders.view_all",
      "orders.edit_own",
      "orders.confirm_own",
      "orders.delete_own",
      "orders.delete",
    ],
  },
  {
    label: "Tareas y propuestas",
    keys: [
      "tasks.manage_own",
      "cart.manage_own",
      "proposals.create_own",
      "pricing.edit_own",
      "pricing.override_band",
    ],
  },
  {
    label: "Marketing",
    keys: ["marketing.access", "marketing.manage"],
  },
];

export function permissionLabel(key: PermissionKey): string {
  switch (key) {
    case "users.invite":
      return "Invitar usuarios";
    case "users.edit_role":
      return "Editar roles";
    case "users.set_operator":
      return "Asignar rol operador";
    case "users.remove":
      return "Eliminar usuarios";
    case "conversations.view_all":
      return "Ver todas las conversaciones";
    case "conversations.view_own":
      return "Ver conversaciones propias";
    case "customers.view_all":
      return "Ver todos los clientes";
    case "customers.assign_seller":
      return "Asignar vendedores a clientes";
    case "customers.delete":
      return "Eliminar clientes";
    case "customers.edit_own":
      return "Editar clientes propios";
    case "orders.create":
      return "Crear pedidos";
    case "orders.view_all":
      return "Ver todos los pedidos";
    case "orders.edit_own":
      return "Editar pedidos propios";
    case "orders.confirm_own":
      return "Confirmar pedidos propios";
    case "orders.delete_own":
      return "Eliminar pedidos propios";
    case "orders.delete":
      return "Eliminar cualquier pedido";
    case "tasks.manage_own":
      return "Gestionar tareas propias";
    case "cart.manage_own":
      return "Gestionar carrito propio";
    case "proposals.create_own":
      return "Crear propuestas propias";
    case "pricing.edit_own":
      return "Editar precios propios";
    case "pricing.override_band":
      return "Anular banda de precio en pedidos";
    case "marketing.access":
      return "Acceder a marketing";
    case "marketing.manage":
      return "Gestionar marketing";
    default:
      return key;
  }
}
