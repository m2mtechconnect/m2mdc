import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { deploymentOffering } from '../../src/deployment/deploymentProfiles';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
const exists = (relativePath: string) => fs.existsSync(path.resolve(process.cwd(), relativePath));

const readme = read('deploy/private/README.md');
const dockerfile = read('deploy/private/Dockerfile.web');
const dockerignore = read('.dockerignore');
const nginx = read('deploy/private/nginx.conf');
const chart = read('deploy/private/helm/aura-web/Chart.yaml');
const values = read('deploy/private/helm/aura-web/values.yaml');
const deployment = read('deploy/private/helm/aura-web/templates/deployment.yaml');
const service = read('deploy/private/helm/aura-web/templates/service.yaml');
const ingress = read('deploy/private/helm/aura-web/templates/ingress.yaml');

const chartSources = [chart, values, deployment, service, ingress].join('\n');

describe('AURA Private packaging scaffold', () => {
  it('states the release claim boundary explicitly', () => {
    expect(readme).toContain('STATUS: SCAFFOLD - NOT RELEASE-QUALIFIED');
    expect(readme).toContain('AURA web shell only');
    expect(readme).toContain('does **not** provide or qualify');
    expect(readme).toContain('private Supabase/Postgres/Auth/Storage/Realtime runtime');
    expect(readme).toContain('Golden User Journey');
    expect(deploymentOffering('private_cloud').capabilityStatus).toBe('PLANNED');
    expect(deploymentOffering('sovereign_air_gapped').capabilityStatus).toBe('PLANNED');
  });

  it('builds the web shell reproducibly without privileged runtime secrets', () => {
    expect(dockerfile).toContain('COPY package.json bun.lock ./');
    expect(dockerfile).toContain('bun install --frozen-lockfile');
    expect(dockerfile).toContain('bun run build');
    expect(dockerfile).toContain('nginxinc/nginx-unprivileged');
    expect(dockerfile).toContain('USER 101');
    expect(dockerfile).toContain('ARG VITE_SUPABASE_URL');
    expect(dockerfile).toContain('ARG VITE_SUPABASE_PUBLISHABLE_KEY');
    expect(dockerfile).toContain('ARG VITE_SUPABASE_PROJECT_ID');
    for (const forbidden of ['SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', 'POSTGRES_PASSWORD', 'OPENAI_API_KEY']) {
      expect(dockerfile).not.toContain(forbidden);
      expect(values).not.toContain(forbidden);
    }
  });

  it('keeps local environment and credential material out of the Docker context', () => {
    expect(dockerignore).toContain('.env');
    expect(dockerignore).toContain('.env.*');
    expect(dockerignore).toContain('*.pem');
    expect(dockerignore).toContain('*.key');
    expect(dockerignore).toContain('credentials*');
    expect(dockerignore).toContain('secrets*');
  });

  it('provides SPA routing, health endpoints and hardened response headers', () => {
    expect(nginx).toContain('location = /healthz');
    expect(nginx).toContain('location = /readyz');
    expect(nginx).toContain('try_files $uri $uri/ /index.html');
    expect(nginx).toContain('X-Content-Type-Options "nosniff"');
    expect(nginx).toContain('X-Frame-Options "SAMEORIGIN"');
    expect(nginx).toContain('Permissions-Policy');
    expect(nginx).toContain('microphone=(self)');
    expect(nginx).toContain('Content-Security-Policy');
    expect(nginx).toContain("frame-ancestors 'self'");
    expect(nginx).toContain("object-src 'none'");
    expect(nginx).toContain('upgrade-insecure-requests');
    expect(dockerfile).toContain('http://127.0.0.1:8080/healthz');
    expect(readme).toContain('Neither endpoint proves that authentication');
  });

  it('deploys only the static web component through Helm', () => {
    expect(chart).toContain('scaffold-not-release-qualified');
    expect(chart).toContain('web-shell-only');
    expect(deployment).toContain('kind: Deployment');
    expect(deployment).toContain('name: aura-web');
    expect(deployment).toContain('automountServiceAccountToken: false');
    expect(deployment).toContain('readinessProbe:');
    expect(deployment).toContain('livenessProbe:');
    expect(values).toContain('readOnlyRootFilesystem: true');
    expect(values).toContain('allowPrivilegeEscalation: false');
    expect(values).toContain('runAsNonRoot: true');
    expect(deployment).toContain('image.repository is required');
    expect(deployment).toContain('image.tag is required');
    expect(service).toContain('kind: Service');
    expect(ingress).toContain('kind: Ingress');

    for (const forbiddenKind of ['kind: StatefulSet', 'kind: Secret', 'kind: Job', 'kind: CronJob']) {
      expect(chartSources).not.toContain(forbiddenKind);
    }
    expect(exists('deploy/private/helm/aura-web/templates/database.yaml')).toBe(false);
    expect(exists('deploy/private/helm/aura-web/templates/supabase.yaml')).toBe(false);
  });

  it('does not accept backend credentials as Helm values', () => {
    expect(values).not.toMatch(/supabaseService/i);
    expect(values).not.toMatch(/databasePassword/i);
    expect(values).not.toMatch(/apiSecret/i);
    expect(values).not.toMatch(/serviceRole/i);
    expect(values).toContain('compiled into the image at build time');
  });
});
