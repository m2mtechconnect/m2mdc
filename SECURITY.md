# Security Policy - M2M Agentic Studio (Aura)

## Overview

This document outlines the security practices and secret handling procedures for the M2M Agentic Studio (Aura) project.

## Secret Management

### Core Principles

1. **Never expose secrets on the client side**
   - API keys, service role tokens, and other sensitive credentials must NEVER be sent to the browser
   - All secrets are stored as Supabase environment variables and accessed only in edge functions

2. **Server-side only access**
   - Secrets are accessed via `Deno.env.get()` in Supabase Edge Functions
   - Client code uses only the public anon key for Supabase calls
   - JWT tokens are used for user authentication

3. **Strict CORS policies**
   - Edge functions use CORS headers restricting access
   - Production domains should be explicitly whitelisted
   - Development allows `*` for local testing only

### Protected Secrets

The following secrets are managed securely in Supabase:

- `LOVABLE_API_KEY` - Lovable AI Gateway access
- `OPENAI_API_KEY` - OpenAI API access (if used)
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` - Google Cloud credentials
- `AWS_SECRET_ACCESS_KEY` - AWS S3 access
- `MSFT_CLIENT_SECRET` - Microsoft OAuth
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin access
- `ARCADE_API_KEY` - Arcade MCP server access

### Secret Rotation

If a secret is compromised:

1. **Immediate invalidation**
   - Rotate the compromised key immediately via Supabase dashboard
   - Update all edge functions using the key

2. **Audit trail**
   - Review access logs to determine scope of exposure
   - Document incident in security log

3. **Prevention**
   - Scan all code for hardcoded secrets before commits
   - Use automated security scanners in CI/CD
   - Regular security audits

## Authentication & Authorization

### Row Level Security (RLS)

All database tables must have RLS policies enabled:

```sql
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agents"
  ON agents FOR SELECT
  USING (auth.uid() = owner_id);
```

### JWT Authentication

- All authenticated requests use JWT tokens
- Tokens are validated in edge functions via `supabase.auth.getUser()`
- No service role tokens are exposed to clients

### Access Control

- User permissions are managed via `user_roles` table
- RBAC context provider enforces UI-level permissions
- Backend enforces permissions via RLS and edge function checks

## API Security

### Edge Function Security Checklist

✅ **Required for all edge functions:**

- [ ] CORS headers configured
- [ ] JWT authentication for protected endpoints
- [ ] Input validation using zod schemas
- [ ] Rate limiting (where applicable)
- [ ] Error messages don't leak sensitive data
- [ ] All secrets accessed via `Deno.env.get()`
- [ ] No secrets in response bodies
- [ ] No secrets in console.log statements

### Example Secure Edge Function

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://aura.m2mtechconnect.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get secret securely
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use API key for external service
    const response = await fetch('https://api.external-service.com/endpoint', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // ... rest of request
    });

    // Return safe response (no secrets)
    return new Response(
      JSON.stringify({ success: true, data: safeData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    // Don't leak error details to client
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## Input Validation

### Client-Side Validation

```typescript
import { z } from 'zod';

const agentSchema = z.object({
  name: z.string().min(3).max(100),
  systemPrompt: z.string().min(10).max(2000),
  temperature: z.number().min(0).max(2),
});
```

### Server-Side Validation

Always validate inputs in edge functions:

```typescript
const { name, systemPrompt } = await req.json();

if (!name || name.length < 3 || name.length > 100) {
  return new Response(
    JSON.stringify({ error: 'Invalid name length' }),
    { status: 400, headers: corsHeaders }
  );
}
```

## Data Protection

### Database Encryption

- All data at rest is encrypted by Supabase
- Sensitive fields can use additional encryption if needed
- PII data should be minimized and properly secured

### Network Security

- All traffic uses HTTPS/TLS
- WebSocket connections use WSS
- No sensitive data in URL parameters

## Incident Response

### If a Security Issue is Discovered

1. **Report immediately** to security@m2mtechconnect.com
2. **Do not disclose publicly** until patch is available
3. **Document the issue** with reproduction steps
4. **Work with team** to develop and test fix
5. **Deploy fix** and rotate any compromised credentials
6. **Post-mortem** to prevent future issues

### Vulnerability Disclosure

We appreciate responsible disclosure of security vulnerabilities:

- Email: security@m2mtechconnect.com
- Allow 90 days for patching before public disclosure
- Credit will be given for valid reports

## Monitoring & Auditing

### Automated Security Scanning

- Pre-commit hooks scan for hardcoded secrets
- CI/CD pipeline runs security tests
- Dependency vulnerability scanning (npm audit, Snyk)

### Regular Audits

- Quarterly security reviews of edge functions
- Annual penetration testing
- RLS policy reviews with each schema change

### Logging

- All authentication attempts logged
- Failed authorization attempts flagged
- No sensitive data in logs (use redaction)

## Compliance

### Data Retention

- User data retained as per privacy policy
- Audit logs retained for 1 year
- Deleted data purged within 30 days

### Privacy

- GDPR compliant data handling
- User consent for data processing
- Right to data export and deletion

## Security Contacts

- **Security Team**: security@m2mtechconnect.com
- **Emergency**: Use above email with [URGENT] prefix
- **General Security Questions**: Contact via normal support channels

## Version History

- **v1.0.0** (2025-01-05): Initial security policy
- Last Updated: 2025-01-05

---

**Remember**: Security is everyone's responsibility. When in doubt, ask the security team.
