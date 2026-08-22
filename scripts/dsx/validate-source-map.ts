#!/usr/bin/env bun
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseDsxSourceMap, summarizeDsxSourceMap } from '../../src/dsx/sourceMap';

const input = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!input) {
  console.error('Usage: bun scripts/dsx/validate-source-map.ts <source-map.json>');
  process.exit(2);
}

const parsed = parseDsxSourceMap(JSON.parse(fs.readFileSync(input, 'utf8')));
const summary = summarizeDsxSourceMap(parsed);
console.log('DSX SOURCE MAP VALID');
console.log(`total=${summary.total}`);
console.log(`verified=${summary.verified}`);
console.log(`candidate=${summary.candidate}`);
console.log(`unresolved=${summary.unresolved}`);
console.log(`rackVerified=${summary.rackVerified}/${summary.rackRequired}`);
console.log(`productionRightsEstablished=${summary.productionRightsEstablished}`);
console.log(`redistributionRightsEstablished=${summary.redistributionRightsEstablished}`);
