/**
 * Deterministic ingestion of the official NVIDIA DSX blueprint reference data.
 *
 * Fetches the pinned repository files server-side, verifies SHA-256 checksums,
 * and emits `src/data/dsxReference/records.generated.ts`.
 *
 * The raw NVIDIA files are NEVER committed: the licence decision restricts
 * redistribution of source material. Only normalized metadata is emitted.
 *
 * Usage: node scripts/dsx-reference/ingest.mjs [--out <dir>]
 */
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';

export const SOURCE_REPOSITORY =
  'https://github.com/NVIDIA-Omniverse-blueprints/omniverse-dsx-blueprint-for-ai-factories';
export const SOURCE_COMMIT = 'd940314d0593bbba1bae51e40ae7f9fd48358e18';
export const SOURCE_COMMITTED_AT = '2026-05-07T18:20:46Z';

export const SOURCE_FILES = {
  'web/src/data/options.ts':
    '3c51421116da7c366dfc9e34ed29de03cbbdae5da50b3b6381ab24777c3bac80',
  'web/src/data/kpis.ts':
    'c40c7f91e7ba8a3ff27121667d8372822601c6161e4f8c7971c1c81bbb342adc',
  'web/src/data/configs.ts':
    'ee4ae99c177874631131628a6773079349e176a2ecca041cddeace3cb86001e9',
  'ARCHITECTURE.md':
    '98075cd4c26000d5413fc3921be8eeffbd9e12e6edffc7ca4238e6ed36d6435f',
  PRODUCT_TERMS_OMNIVERSE:
    '4d63bd7409fec811c3a426bdc5070bb2240dba1cd54d389947418a9c49c1b666',
};

const RAW = (p) =>
  `https://raw.githubusercontent.com/NVIDIA-Omniverse-blueprints/omniverse-dsx-blueprint-for-ai-factories/${SOURCE_COMMIT}/${p}`;

async function fetchPinned(path) {
  const res = await fetch(RAW(path));
  if (!res.ok) throw new Error(`fetch failed ${path}: ${res.status}`);
  const text = await res.text();
  const sha = createHash('sha256').update(text).digest('hex');
  if (sha !== SOURCE_FILES[path]) {
    throw new Error(`checksum mismatch for ${path}: expected ${SOURCE_FILES[path]}, got ${sha}`);
  }
  return text;
}

/** Extracts the six `ConfigRecord` literals from configs.ts without evaluating it. */
export function parseConfigs(src) {
  const out = [];
  const re = /config:\s*"([^"]+)",\s*location:\s*"([^"]+)",\s*computePlatform:\s*"([^"]+)",\s*powerGen:\s*"([^"]+)",\s*kpis:\s*\[([\s\S]*?)\],\s*specSets/g;
  let m;
  while ((m = re.exec(src))) {
    const [, config, location, computePlatform, powerGen, kpiBlock] = m;
    const kpis = [];
    const kre = /\{\s*name:\s*"([^"]*)",\s*description:\s*"([^"]*)",\s*value:\s*([0-9.eE+-]+),\s*unit:\s*"([^"]*)",\s*score:\s*(\d+)/g;
    let k;
    while ((k = kre.exec(kpiBlock))) {
      kpis.push({ name: k[1], description: k[2], value: Number(k[3]), unit: k[4], score: Number(k[5]) });
    }
    out.push({ config, location, computePlatform, powerGen, kpis });
  }
  return out;
}

/** Extracts the simulation option tree from options.ts. */
export function parseSimulationOptions(src) {
  const zones = {};
  const ops = {};
  for (const cat of ['thermal', 'electrical']) {
    const block = src.match(new RegExp(`"${cat}":\\s*\\{([\\s\\S]*?)\\n        \\}`));
    if (!block) continue;
    const z = block[1].match(/zones:\s*\[([^\]]*)\]/);
    const o = block[1].match(/operations:\s*\[([^\]]*)\]/);
    const strings = (s) => (s ? [...s[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]) : []);
    zones[cat] = strings(z);
    ops[cat] = strings(o);
  }
  return { zones, operations: ops };
}

/** Extracts the per-site specification blocks from kpis.ts. */
export function parseSiteSpecs(src) {
  const sites = {};
  const re = /title:\s*"(Sweden|New Mexico|Virginia)",\s*specs:\s*\[([\s\S]*?)\n        \]/g;
  let m;
  while ((m = re.exec(src))) {
    const specs = [...m[2].matchAll(/\{\s*name:\s*"([^"]*)",\s*description:\s*"([^"]*)"\s*\}/g)].map(
      (s) => ({ name: s[1], description: s[2] }),
    );
    if (!sites[m[1]]) sites[m[1]] = specs;
  }
  return sites;
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const KPI_KEY = {
  'Token Efficiency': 'token_efficiency',
  'Power Usage Effectiveness (PUE)': 'pue',
  'Water Usage Effectiveness (WUE)': 'wue',
  'Carbon Usage Effectiveness (CUE)': 'cue',
  'Total Energy Use by Asset': 'total_energy_use',
  'Cost by Subcategory': 'cost_by_subcategory',
};

export function buildRecords({ configs, siteSpecs, simOptions, retrievedAt }) {
  const records = [];
  const base = (file) => ({
    dataset_id: 'nvidia-dsx-blueprint',
    dataset_version: '1.0.0-repo@d940314',
    publisher: 'NVIDIA Corporation',
    source_url: `${SOURCE_REPOSITORY}/blob/${SOURCE_COMMIT}/${file}`,
    source_repository: SOURCE_REPOSITORY,
    source_commit: SOURCE_COMMIT,
    source_file: file,
    source_checksum: SOURCE_FILES[file],
    retrieved_at: retrievedAt,
    licence_status: 'APPROVED_AUTHENTICATED_DEMO',
    is_reference: true,
    is_measured: false,
    is_simulated: false,
    is_operational: false,
    validation_status: 'PARSED_CHECKSUM_VERIFIED',
  });

  for (const c of configs) {
    for (const k of c.kpis) {
      const key = KPI_KEY[k.name];
      if (!key) continue;
      records.push({
        ...base('web/src/data/configs.ts'),
        record_id: `kpi:${slug(c.config)}:${key}`,
        data_class: 'REFERENCE_KPI_VALUE',
        operational_status: 'REFERENCE_ONLY',
        source_record_path: `CONFIGS["${c.config}"].kpis["${k.name}"]`,
        configuration_id: slug(c.config),
        site: c.location,
        compute_platform: c.computePlatform,
        power_generation: c.powerGen,
        metric_key: key,
        metric_label: k.name,
        formula: k.description || null,
        original_value: k.value,
        normalized_value: k.value,
        unit: k.unit,
        transformation_record: 'verbatim; no unit conversion applied',
      });
    }
    records.push({
      ...base('web/src/data/configs.ts'),
      record_id: `config:${slug(c.config)}`,
      data_class: 'REFERENCE_CONFIGURATION',
      operational_status: 'REFERENCE_ONLY',
      source_record_path: `CONFIGS["${c.config}"]`,
      configuration_id: slug(c.config),
      site: c.location,
      compute_platform: c.computePlatform,
      power_generation: c.powerGen,
      metric_key: null,
      metric_label: c.config,
      formula: null,
      original_value: null,
      normalized_value: null,
      unit: null,
      transformation_record: 'configuration identity mapped verbatim',
    });
  }

  for (const [site, specs] of Object.entries(siteSpecs)) {
    for (const s of specs) {
      records.push({
        ...base('web/src/data/kpis.ts'),
        record_id: `site-spec:${slug(site)}:${slug(s.name)}`,
        data_class: 'REFERENCE_SPECIFICATION',
        operational_status: 'REFERENCE_ONLY',
        source_record_path: `SITE_DATA["${site}"].specs["${s.name}"]`,
        configuration_id: null,
        site,
        compute_platform: null,
        power_generation: null,
        metric_key: slug(s.name),
        metric_label: s.name,
        formula: null,
        original_value: s.description,
        normalized_value: s.description,
        unit: null,
        transformation_record: 'verbatim specification text',
      });
    }
  }

  for (const cat of Object.keys(simOptions.zones)) {
    records.push({
      ...base('web/src/data/options.ts'),
      record_id: `scenario:${cat}`,
      data_class: 'REFERENCE_SCENARIO',
      operational_status: 'REFERENCE_ONLY',
      source_record_path: `SIMULATION_OPTIONS["${cat}"]`,
      configuration_id: null,
      site: null,
      compute_platform: null,
      power_generation: null,
      metric_key: cat,
      metric_label: `${cat[0].toUpperCase()}${cat.slice(1)} scenario definition`,
      formula: null,
      original_value: JSON.stringify({ zones: simOptions.zones[cat], operations: simOptions.operations[cat] }),
      normalized_value: JSON.stringify({ zones: simOptions.zones[cat], operations: simOptions.operations[cat] }),
      unit: null,
      transformation_record: 'zone and operation lists mapped verbatim',
    });
  }

  return records.sort((a, b) => a.record_id.localeCompare(b.record_id));
}

function emit(records, retrievedAt) {
  return `/**
 * GENERATED FILE - do not edit by hand.
 *
 * Produced by \`node scripts/dsx-reference/ingest.mjs\` from the pinned NVIDIA
 * DSX blueprint repository commit ${SOURCE_COMMIT}.
 * Every record carries full provenance. No value in this file is measured,
 * live, or operational.
 */
import type { ReferenceRecord } from './types';

export const DSX_SOURCE_COMMIT = '${SOURCE_COMMIT}';
export const DSX_DATASET_VERSION = '1.0.0-repo@d940314';
export const DSX_RETRIEVED_AT = '${retrievedAt}';

export const DSX_REFERENCE_RECORDS: readonly ReferenceRecord[] = ${JSON.stringify(records, null, 2)} as const;
`;
}

async function main() {
  const retrievedAt = new Date().toISOString();
  const [optionsSrc, kpisSrc, configsSrc] = await Promise.all([
    fetchPinned('web/src/data/options.ts'),
    fetchPinned('web/src/data/kpis.ts'),
    fetchPinned('web/src/data/configs.ts'),
  ]);
  await fetchPinned('ARCHITECTURE.md');
  await fetchPinned('PRODUCT_TERMS_OMNIVERSE');

  const records = buildRecords({
    configs: parseConfigs(configsSrc),
    siteSpecs: parseSiteSpecs(kpisSrc),
    simOptions: parseSimulationOptions(optionsSrc),
    retrievedAt,
  });

  mkdirSync('src/data/dsxReference', { recursive: true });
  writeFileSync('src/data/dsxReference/records.generated.ts', emit(records, retrievedAt));

  mkdirSync('docs/dsx-reference-data/cutover', { recursive: true });
  writeFileSync(
    'docs/dsx-reference-data/cutover/source-checksums.json',
    JSON.stringify(
      {
        source_repository: SOURCE_REPOSITORY,
        source_commit: SOURCE_COMMIT,
        source_committed_at: SOURCE_COMMITTED_AT,
        retrieved_at: retrievedAt,
        algorithm: 'sha256',
        files: SOURCE_FILES,
        ngc_dataset: {
          resource: 'nvidia/omniverse/dsx_dataset',
          version: '2.1',
          status: 'NOT_RETRIEVED',
          reason: 'NGC API returned HTTP 401; no NGC credentials are present in this environment.',
        },
      },
      null,
      2,
    ) + '\n',
  );

  console.log(`emitted ${records.length} normalized reference records`);
}

if (process.argv[1] && process.argv[1].endsWith('ingest.mjs')) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
