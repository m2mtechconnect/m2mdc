# Shared AI Client Configuration

## Overview

This project uses **Lovable Cloud managed Gemini 3.x** as the default AI provider. No external API keys or credentials are required for basic operation.

## Default Configuration

- **Provider**: Lovable Cloud (via `LOVABLE_API_KEY`)
- **Primary Model**: `google/gemini-3-pro-preview` (all Co-Pilot interactions)
- **Fallback Model**: `google/gemini-3.0-pro` (if preview unavailable)
- **Image Generation**: `google/gemini-3-pro-image-preview`

## How to Switch to External Google Cloud Credentials

If you want to use your own Google Cloud / Vertex AI setup:

1. **Set Environment Variable**:
   ```
   USE_EXTERNAL_GOOGLE=true
   ```

2. **Configure Google Secrets** (via Update Secrets panel):
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - `GOOGLE_PROJECT_ID`
   - `GOOGLE_LOCATION` (optional, defaults to northamerica-northeast1)
   - `GEMINI_MODEL` (optional, defaults to gemini-1.5-pro)
   - `VERTEX_DATA_STORE_ID` (optional, for Vertex Search)

3. **Restart Functions**: Changes take effect immediately for new function invocations

## Files Using AI

### Primary AI Integration Files:
- `_shared/ai-client.ts` - Centralized AI configuration and helper functions
- `ai-config/index.ts` - Returns current AI configuration status
- `health-ai/index.ts` - AI health check endpoint
- `health/index.ts` - Overall system health including AI
- `copilot-health/index.ts` - Copilot-specific health check

### Functions Making AI Calls:
- `query-answer/index.ts` - Uses Gemini for query answering
- `grounded-summary/index.ts` - Uses Gemini Pro for content summarization
- `url-capture/index.ts` - Includes Gemini health check endpoint

## Optional Integrations

The following integrations are **optional** and the app works without them:

- **Microsoft OAuth** (`rag-oauth-microsoft/`) - Requires `MSFT_CLIENT_ID`, `MSFT_CLIENT_SECRET`
- **AWS S3** - Requires `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- **Arcade** - Requires `ARCADE_API_KEY`
- **Vertex Search** - Requires `VERTEX_DATA_STORE_ID` and external Google credentials

## Defensive Error Handling

All AI functions include defensive checks:
- ✅ Silent fallback to Lovable managed if external credentials missing
- ✅ Clear console warnings (not errors) when optional features unavailable
- ✅ Graceful degradation - app continues to function
- ✅ User-friendly error messages

## Architecture Notes

The AI client uses a **strategy pattern**:

1. Check if `USE_EXTERNAL_GOOGLE=true` and external credentials exist
2. If yes → Use external Google Cloud APIs
3. If no → Use Lovable Cloud managed Gemini (default)

This allows seamless switching without code changes.
