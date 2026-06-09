export function isPublicRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/driver/fuel-entry" ||
    pathname.startsWith("/api/vehicles/public") ||
    pathname.startsWith("/api/fuel-entries/public")
  );
}
