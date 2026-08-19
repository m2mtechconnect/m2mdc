import { describe, expect, it } from 'vitest';
import {
  createCorsJsonResponse,
  handleCorsPreflightRequest,
} from '../../supabase/functions/_shared/cors';

const options = {
  environment: 'production',
  configuredOrigins: 'https://console.example.com',
};

function request(origin?: string, method = 'POST'): Request {
  return new Request('https://edge.example.test/function', {
    method,
    headers: origin ? { Origin: origin } : undefined,
  });
}

function expectAllowed(response: Response, status: number): void {
  expect(response.status).toBe(status);
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://console.example.com');
  expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  expect(response.headers.get('Vary')).toBe('Origin');
}

describe('shared CORS response factory', () => {
  it.each([
    ['authentication error', 401],
    ['validation error', 400],
    ['successful response', 200],
    ['unexpected error', 500],
  ])('applies the allowed-origin policy to %s', (_label, status) => {
    const response = createCorsJsonResponse(
      request('https://console.example.com'),
      { status },
      status,
      options,
    );
    expectAllowed(response, status);
  });

  it.each([
    'https://evil.example.com',
    'https://console.example.com.evil.test',
    'https://console.example.com/',
    'https://user@console.example.com',
  ])('never reflects denied or malformed origin %s', (origin) => {
    const response = createCorsJsonResponse(request(origin), { ok: false }, 403, options);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('does not grant CORS to an originless non-browser request', () => {
    const response = createCorsJsonResponse(request(), { ok: true }, 200, options);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('fails closed for an originless preflight request', () => {
    const response = handleCorsPreflightRequest(request(undefined, 'OPTIONS'), options);
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('returns scoped headers for an allowed preflight request', () => {
    const response = handleCorsPreflightRequest(
      request('https://console.example.com', 'OPTIONS'),
      options,
    );
    expectAllowed(response, 204);
  });

  it('allows localhost only in explicit development mode', () => {
    const localRequest = request('http://localhost:5173', 'OPTIONS');
    const production = handleCorsPreflightRequest(localRequest, options);
    const development = handleCorsPreflightRequest(localRequest, {
      ...options,
      environment: 'development',
    });
    expect(production.status).toBe(403);
    expect(production.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(development.status).toBe(204);
    expect(development.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });
});
