import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { isAuraOwnedOrigin, routeIsAllowed } from './config.ts';

denoTest('accepts only AURA-owned HTTPS public origins', () => {
  assertEquals(isAuraOwnedOrigin('https://gateway.auradc.m2mtechconnect.com'), true);
  assertEquals(isAuraOwnedOrigin('https://m2mtechconnect.com'), true);
  assertEquals(isAuraOwnedOrigin('http://gateway.auradc.m2mtechconnect.com'), false);
  assertEquals(isAuraOwnedOrigin('https://connector-gateway.lovable.dev'), false);
});

denoTest('fails closed for unapproved connector routes', () => {
  assertEquals(routeIsAllowed('google_search_console', 'GET', '/webmasters/v3/sites'), true);
  assertEquals(routeIsAllowed('google_search_console', 'POST', '/webmasters/v3/searchanalytics/query'), true);
  assertEquals(routeIsAllowed('google_search_console', 'DELETE', '/webmasters/v3/sites'), false);
  assertEquals(routeIsAllowed('google_search_console', 'GET', '/../admin'), false);
  assertEquals(routeIsAllowed('unknown', 'GET', '/webmasters/v3/sites'), false);
});

function denoTest(name: string, fn: () => void) {
  Deno.test(name, fn);
}
