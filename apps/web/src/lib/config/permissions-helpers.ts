import type { Permission } from "$lib/config/permissions";

const ROLE_PRESETS: Record<string, Record<Permission, boolean>> = {
  owner: {
    view_sales: true,
    create_sales: true,
    manage_inventory: true,
    manage_team: true,
    manage_settings: true,
  },
  manager: {
    view_sales: true,
    create_sales: true,
    manage_inventory: true,
    manage_team: false,
    manage_settings: false,
  },
  cashier: {
    view_sales: false,
    create_sales: true,
    manage_inventory: false,
    manage_team: false,
    manage_settings: false,
  },
};

export function getEffectivePermissions(
  role: string,
  overrides: Record<string, boolean> = {},
): Record<Permission, boolean> {
  const base = ROLE_PRESETS[role] || ROLE_PRESETS.cashier;
  return { ...base, ...overrides } as Record<Permission, boolean>;
}

export function can(
  perms: Record<Permission, boolean>,
  req: Permission,
): boolean {
  return perms[req] === true;
}
