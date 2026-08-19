// Shared CORS configuration for all edge functions
// PRODUCTION: Update allowed origins to your production domain(s)

const ALLOWED_ORIGINS = [
  'https://auradc.m2mtechconnect.com',
  'https://aura.m2mtechconnect.com',
  'https://m2mdc.lovable.app',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
];

// Preview and sandbox hosts are generated per build, so they are matched by
// pattern instead of being enumerated.
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
  /^https:\/\/[a-z0-9-]+\.sandbox\.lovable\.dev$/i,
];

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) ||
    ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  // In development, allow all origins
  if (Deno.env.get('ENVIRONMENT') === 'development') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };
  }

  // In production, only allow whitelisted origins
  const allowedOrigin = origin && isAllowedOrigin(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function handleCorsPreflightRequest(req: Request): Response {
  const origin = req.headers.get('origin');
  return new Response(null, { 
    status: 204,
    headers: getCorsHeaders(origin) 
  });
}
