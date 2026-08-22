export interface GatewayRoute {
  connectorId: string;
  method: 'GET' | 'POST';
  path: string;
}

const ROUTES: GatewayRoute[] = [
  { connectorId: 'google_search_console', method: 'GET', path: '/webmasters/v3/sites' },
  { connectorId: 'google_search_console', method: 'POST', path: '/webmasters/v3/searchanalytics/query' },
];

export function normalizedPath(value: string): string | null {
  if (!value.startsWith('/') || value.includes('..') || value.includes('\\')) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.includes('..') || decoded.includes('\\')) return null;
    return new URL(`https://aura.invalid${value}`).pathname;
  } catch {
    return null;
  }
}

export function routeIsAllowed(connectorId: string, method: string, path: string): boolean {
  const normalized = normalizedPath(path);
  if (!normalized) return false;
  return ROUTES.some((route) =>
    route.connectorId === connectorId &&
    route.method === method.toUpperCase() &&
    route.path === normalized
  );
}

export function allowedConnectorIds(): string[] {
  return [...new Set(ROUTES.map((route) => route.connectorId))];
}
