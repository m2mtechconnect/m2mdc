import { SURFACE_MATRIX } from './src/data/dataset/surfaceRegistry';
const by: Record<string, string[]> = {};
for (const e of SURFACE_MATRIX) (by[e.classification] ||= []).push(e.path);
console.log(JSON.stringify({total:SURFACE_MATRIX.length, counts:Object.fromEntries(Object.entries(by).map(([k,v])=>[k,v.length])), by},null,1));
