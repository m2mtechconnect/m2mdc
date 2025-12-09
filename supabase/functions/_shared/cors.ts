// Shared CORS configuration for all edge functions
// PRODUCTION: Update allowed origins to your production domain(s)

const ALLOWED_ORIGINS = [
  'https://aura.m2mtechconnect.com',
  'https://8d04f045-04d1-4f95-943c-5f6924d89094.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

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
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
