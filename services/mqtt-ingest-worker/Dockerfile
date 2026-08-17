# AURA MQTT ingestion worker.
# Deploys to Brev, AWS ECS/Fargate or any container host. Supabase Edge
# Functions are deliberately NOT used: they cannot hold a long-lived broker
# subscription, so the control plane stays on edge functions and only the
# subscriber runs here.
FROM node:22-alpine AS base
WORKDIR /app

COPY services/mqtt-ingest-worker/package.json ./services/mqtt-ingest-worker/package.json
RUN cd services/mqtt-ingest-worker && npm install --omit=dev --no-audit --no-fund \
  && npm install --no-save tsx typescript

# The worker imports the shared, pure runtime modules so the browser, the
# tests and the worker cannot diverge on validation rules.
COPY src/runtime ./src/runtime
COPY src/connections/mappingValidation.ts ./src/connections/mappingValidation.ts
COPY src/dsx/contract.ts ./src/dsx/contract.ts
COPY supabase/functions/_shared/dsx-contract.ts ./supabase/functions/_shared/dsx-contract.ts
COPY services/mqtt-ingest-worker ./services/mqtt-ingest-worker

ENV NODE_ENV=production
USER node
WORKDIR /app/services/mqtt-ingest-worker

# Secrets are provided at runtime by the platform; none are baked into the image.
CMD ["npx", "tsx", "src/index.ts"]