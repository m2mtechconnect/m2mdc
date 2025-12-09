# Edge Functions REST API Guide

## Overview

All Supabase Edge Functions in this project follow a standardized REST API pattern with:

- **Consistent request/response envelopes** - All responses use `ApiResponse<T>` wrapper
- **Strong input validation** - Zod schemas validate all inputs
- **Correlation IDs** - Every request gets a unique UUID for tracing
- **Standardized error handling** - Consistent error codes and messages
- **Auth boundaries** - Clear separation of public/user/admin endpoints
- **External API client** - Shared REST client for outbound calls
- **Comprehensive logging** - Structured logs with correlation IDs

## Architecture

### Shared Utilities (`supabase/functions/_shared/`)

#### `types.ts`
Defines standard response envelopes and error codes:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  correlationId: string;
}

const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  TIMEOUT: "TIMEOUT",
}
```

#### `handler.ts`
Wraps edge function logic with standard patterns:

```typescript
createHandler({
  name: "my-function",
  authLevel: "user", // or "public" or "admin"
  inputSchema: MyInputSchema,
  handler: async (input, context) => {
    // Your business logic here
    return result;
  }
})
```

Features:
- Auto-generates correlation IDs
- Handles CORS preflight
- Validates auth based on level
- Validates input with Zod
- Wraps responses in ApiResponse
- Catches and formats errors
- Logs request lifecycle

#### `auth.ts`
Handles authentication and authorization:

```typescript
// Get auth context based on level
const authContext = await getAuthContext(req, "user");
// Returns: { userId, user, supabase }

// Check user roles
const hasRole = await checkRole(supabase, userId, "admin");
```

#### `rest-client.ts`
Typed REST client for external APIs:

```typescript
const result = await callExternalApi({
  name: "external-api",
  url: "https://api.example.com/endpoint",
  responseSchema: z.object({...}),
  timeoutMs: 15000,
  correlationId: context.correlationId,
});
```

Features:
- Automatic timeouts
- Response validation with Zod
- Structured error handling
- Performance logging

## Writing New Edge Functions

### 1. Define Your Schema

```typescript
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const InputSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});
```

### 2. Create Your Handler

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHandler } from "../_shared/handler.ts";

serve(createHandler({
  name: "my-endpoint",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { name, email, age } = input;
    const { supabase, userId, log, correlationId } = context;

    log("Processing request", { name });

    // Your business logic
    const { data, error } = await supabase
      .from('users')
      .insert({ name, email, age, owner_id: userId })
      .select()
      .single();

    if (error) {
      throw {
        code: 'DATABASE_ERROR',
        message: error.message,
        status: 500,
      };
    }

    log("Request completed", { userId: data.id });

    return { user: data };
  }
}));
```

### 3. Add Documentation Header

```typescript
/**
 * /v1/my-endpoint
 * 
 * PURPOSE: Brief description of what this endpoint does
 * AUTH: user (or public/admin)
 * 
 * REQUEST:
 * - name: string (required)
 * - email: string (required, valid email)
 * - age: number (optional, positive integer)
 * 
 * RESPONSE:
 * - user: Created user object
 */
```

## Auth Levels

### `public`
- No authentication required
- Use for: website scanning, public data, health checks
- Supabase client created with anon key

### `user`
- Requires valid JWT token in Authorization header
- Use for: user-specific operations, data access
- `userId` available in context
- RLS policies enforced

### `admin`
- Uses service role key
- Use for: internal operations, system management
- **Never** expose to client directly
- Bypasses RLS policies

## Error Handling

### Throwing Errors

```typescript
// Validation error
throw {
  code: 'VALIDATION_ERROR',
  message: 'Invalid email format',
  status: 400,
};

// Not found
throw {
  code: ErrorCodes.NOT_FOUND,
  message: 'Resource not found',
  status: 404,
};

// External API error
throw {
  code: ErrorCodes.EXTERNAL_API_ERROR,
  message: 'Third-party service unavailable',
  status: 502,
};
```

### Error Response Format

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "issues": [...]
    }
  },
  "correlationId": "uuid-here"
}
```

## Calling External APIs

### Basic Usage

```typescript
import { callExternalApi } from "../_shared/rest-client.ts";

const ResponseSchema = z.object({
  status: z.string(),
  data: z.array(z.unknown()),
});

const result = await callExternalApi({
  name: "fetch-data",
  url: "https://api.example.com/data",
  options: {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: "test" }),
  },
  responseSchema: ResponseSchema,
  timeoutMs: 10000,
  correlationId: context.correlationId,
});
```

### Benefits

- ✅ Automatic timeouts prevent hanging requests
- ✅ Response validation catches API changes early
- ✅ Structured logging with correlation IDs
- ✅ Type-safe responses
- ✅ Consistent error handling

## Frontend Integration

### Making Requests

```typescript
const response = await supabase.functions.invoke('my-endpoint', {
  body: { name: "John", email: "john@example.com" }
});

// Check response structure
if (response.data?.success) {
  const user = response.data.data;
  console.log("Success:", user);
} else {
  const error = response.data?.error;
  console.error("Error:", error?.message, error?.correlationId);
}
```

### Error Handling

```typescript
try {
  const response = await supabase.functions.invoke('my-endpoint', {
    body: input
  });

  if (!response.data?.success) {
    throw new Error(
      response.data?.error?.message || 'Request failed'
    );
  }

  return response.data.data;
} catch (error) {
  console.error('API Error:', error);
  toast.error(error.message);
}
```

## Logging Best Practices

### Use Context Logger

```typescript
handler: async (input, context) => {
  const { log } = context;

  // Start of operation
  log("Starting process", { userId: input.userId });

  // Progress updates
  log("Data fetched", { recordCount: data.length });

  // Completion
  log("Process complete", { duration: elapsed });
}
```

### Log Structure

All logs automatically include:
- Function name
- Correlation ID
- Timestamp
- Custom data you provide

Example log output:
```
[my-endpoint:7c116c36] Starting process { userId: "abc123" }
```

## Refactored Functions

### Core Agent Functions
- ✅ `agent-create` - Create new agents
- ✅ `agent-run` - Execute agent with messages
- ✅ `agent-execute` - Execute agent conversation
- ✅ `agent-stream` - Execute agent with streaming response
- ✅ `agent-draft-from-reco` - Create draft from recommendation
- ✅ `agent-export` - Export agent conversation data (JSON/CSV/PDF)
- ✅ `agent-plan-chat` - Preview chat with planned agent
- ✅ `agents-list` - List user's agents with filtering
- ✅ `agents-deploy` - Deploy or update agent to production
- ✅ `agents-rollback` - Rollback/archive agent version
- ✅ `agent-suggestions` - Agent configuration suggestions

### Builder Functions
- ✅ `builder-generate-summary` - Generate business summary for AI system
- ✅ `builder-infer-goal` - Infer department, outcome, and success metric
- ✅ `builder-test` - Test agent configuration with sample prompt

### System Management
- ✅ `systems-create` - Create AI systems
- ✅ `systems-update` - Update system config
- ✅ `systems-delete` - Delete system with cascading cleanup
- ✅ `ai-systems-unified` - Unified system listing
- ✅ `ai-systems` - List AI systems/agents with filtering (admin)

### AI & Recommendations
- ✅ `recommendations-generate` - Generate AI recommendations with RAG
- ✅ `copilot-chat` - AI Co-Pilot with knowledge grounding

### Knowledge & Content
- ✅ `knowledge-upload` - Upload files to knowledge base
- ✅ `website-scan` - Scan and extract website content

### Analytics
- ✅ `analytics-overview` - KPIs and trend analysis
- ✅ `analytics-export` - Export analytics data to CSV or JSON
- ✅ `analytics-systems` - Get system performance analytics

### Catalog & Templates
- ✅ `catalog-templates-industry` - List industry-specific agent templates
- ✅ `catalog-templates-m2m` - List machine-to-machine agent templates
- ✅ `integrations-list` - List integrations (admin)
- ✅ `templates-list` - List agent templates

### Operations
- ✅ `ops-overview` - Operations overview metrics with health data
- ✅ `ops-systems` - List systems with health metrics and alerts
- ✅ `ops-heartbeat` - Record system heartbeat for monitoring

### Search & Discovery
- ✅ `search` - Unified search with intent classification and routing

### Utilities
- ✅ `health` - Service health check for AI and integration providers
- ✅ `health-check` - Health check endpoint for monitoring
- ✅ `runs-recent` - Get recent agent runs for user

## Migration Checklist

When refactoring an edge function:

1. ✅ Add header documentation (PURPOSE, AUTH, REQUEST, RESPONSE)
2. ✅ Define Zod input schema
3. ✅ Wrap with `createHandler`
4. ✅ Set appropriate `authLevel`
5. ✅ Use `context.log` instead of `console.log`
6. ✅ Use structured error throwing
7. ✅ Replace external `fetch` with `callExternalApi` where appropriate
8. ✅ Return plain objects (wrapper handles envelope)
9. ✅ Remove manual CORS handling
10. ✅ Remove manual auth checks

## Testing

### Local Testing

```bash
# Start local Supabase
supabase start

# Test specific function
curl -X POST http://localhost:54321/functions/v1/my-endpoint \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"test","email":"test@example.com"}'
```

### Check Logs

```bash
# View function logs
supabase functions logs my-endpoint

# Follow logs in real-time
supabase functions logs my-endpoint --tail
```

## Performance Monitoring

All functions automatically log:
- Request start time
- Duration (ms)
- Success/failure status
- Correlation ID for tracing

Use correlation IDs to trace requests across logs and external API calls.

## Security Considerations

1. **Never expose service role key** to client
2. **Always validate input** with Zod schemas
3. **Use appropriate auth level** for each endpoint
4. **Sanitize error messages** before returning to client
5. **Rate limit** sensitive operations
6. **Log security events** with correlation IDs

## Future Improvements

- [ ] Add rate limiting middleware
- [ ] Implement response caching layer
- [ ] Add request/response compression
- [ ] Create automated tests for all functions
- [ ] Add OpenAPI/Swagger documentation generation
- [ ] Implement circuit breaker for external APIs
- [ ] Add distributed tracing integration
