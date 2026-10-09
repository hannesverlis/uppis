import type { Role } from "@/backend/types";

const ROLE_LABELS: Record<Role, string> = {
  client_elder: "Abisaaja",
  client_relative: "Lähedane",
  client_guardian: "Esindaja",
  helper_volunteer: "Vabatahtlik",
  helper_relative: "Lähedane täitja",
  helper_pro: "Sotsiaalvalve",
  helper_coordinator: "Koordinaator",
  admin_system: "Süsteemi admin",
  admin_kov: "KOV sotsiaaltöötaja",
};

export function roleLabel(role: string): string {
  return role in ROLE_LABELS ? ROLE_LABELS[role as Role] : role;
}

export function roleList(roles: string[]): string {
  return roles.map(roleLabel).join(", ");
}
