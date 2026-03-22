/** Base path from Vite (e.g. `/` or `/riceops`) without trailing slash */
export function getAppBasePath(): string {
  return (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
}

/** Full URL to the Packaging Vendors page (e.g. open in a new tab from the packaging form). */
export function getPackagingVendorsNewWindowUrl(): string {
  const base = getAppBasePath();
  return `${window.location.origin}${base}/production/packaging-vendors`;
}

/** Path (same origin) to Transporters directory; optional `create=1` opens the create modal. */
export function getDirectoryTransportersPagePath(options?: { create?: boolean }): string {
  const base = getAppBasePath();
  const path = `${base}/directory/transporters`;
  return options?.create ? `${path}?create=1` : path;
}

/** Path (same origin) to Vehicles directory; optional `create=1` opens the create modal. */
export function getDirectoryVehiclesPagePath(options?: { create?: boolean }): string {
  const base = getAppBasePath();
  const path = `${base}/directory/vehicles`;
  return options?.create ? `${path}?create=1` : path;
}
