import { supabase } from '@/integrations/supabase/client';

/**
 * Validate JWT token has required claims
 */
function validateJWT(token: string): { valid: boolean; userId?: string; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid JWT format' };
    }
    
    const payload = JSON.parse(atob(parts[1]));
    const userId = payload.sub;
    
    if (!userId) {
      console.error('[auth:validate] JWT missing sub claim:', payload);
      return { valid: false, error: 'Missing sub claim - token issued for wrong domain' };
    }
    
    // Check expiration
    const exp = payload.exp;
    if (exp && Date.now() >= exp * 1000) {
      return { valid: false, error: 'Token expired' };
    }
    
    console.info('[auth:validate] JWT valid', { userId, exp: new Date(exp * 1000).toISOString() });
    return { valid: true, userId };
  } catch (e) {
    console.error('[auth:validate] JWT decode failed:', e);
    return { valid: false, error: 'Invalid token format' };
  }
}

/**
 * Get active session, waiting for auth state to settle after redirect
 * Critical for PKCE flow on custom domains
 */
export async function getActiveSession() {
  // First try: check if session already exists
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('[auth:bootstrap] Session error:', error);
    return null;
  }
  
  if (session?.access_token) {
    // Validate the JWT before returning
    const validation = validateJWT(session.access_token);
    if (validation.valid) {
      console.info('[auth:bootstrap] Session found and validated', { userId: validation.userId });
      return session;
    } else {
      console.error('[auth:bootstrap] Invalid session token:', validation.error);
      // Sign out invalid session
      await supabase.auth.signOut();
      return null;
    }
  }

  // Fallback: wait briefly for onAuthStateChange if sign-in just happened
  console.info('[auth:bootstrap] Waiting for auth state change...');
  const ready = await new Promise<any>((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('[auth:bootstrap] Timeout waiting for session');
      resolve(null);
    }, 1500);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        const validation = validateJWT(session.access_token);
        if (validation.valid) {
          console.info('[auth:bootstrap] Session received and validated via auth state change');
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve(session);
        } else {
          console.error('[auth:bootstrap] Invalid session from auth state:', validation.error);
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve(null);
        }
      }
    });
  });

  return ready;
}

/**
 * Require a valid session or redirect to auth page
 * Use this before any Edge Function calls to guarantee a token
 */
export async function requireSession() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    const validation = validateJWT(session.access_token);
    if (validation.valid) {
      console.info('[auth:require] Valid session found', { userId: validation.userId });
      return session;
    }
  }

  // If we just returned from PKCE, wait briefly
  console.info('[auth:require] No immediate session, waiting for PKCE callback...');
  const awaited = await new Promise<any>((resolve) => {
    const timeout = setTimeout(() => resolve(null), 1200);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        const validation = validateJWT(session.access_token);
        if (validation.valid) {
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve(session);
        }
      }
    });
  });
  
  if (awaited) {
    console.info('[auth:require] Session acquired via PKCE');
    return awaited;
  }

  // No session -> redirect to auth
  console.error('[auth:require] NO_SESSION - redirecting to auth page');
  const redirectUrl = encodeURIComponent(window.location.href);
  window.location.href = `/auth?redirect=${redirectUrl}`;
  throw new Error('NO_SESSION_REDIRECT');
}
