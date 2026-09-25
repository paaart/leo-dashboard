/*
  The app roles stored in profiles.role. Kept in a dependency-free module so
  client components can import the type without pulling in next/server.

  - user:   the default; sees the calculators and the Vehicle Tracker.
  - admin:  everything, including the admin-only modules.
  - branch: branch staff who only report packaging-material stock for the
            branches they are assigned to (Inventory Management).
*/
export const APP_ROLES = ["user", "admin", "branch"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  user: "User",
  admin: "Admin",
  branch: "Branch staff",
};

export function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === "string" && (APP_ROLES as readonly string[]).includes(value)
  );
}
