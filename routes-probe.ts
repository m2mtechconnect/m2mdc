import { SURFACE_REGISTRY } from './src/data/dataset/surfaceRegistry';
const list:any[] = Array.isArray(SURFACE_REGISTRY) ? SURFACE_REGISTRY as any : Object.values(SURFACE_REGISTRY as any);
const by: Record<string, string[]> = {};
for (const e of list) (by[e.classification] ||= []).push(e.path);
console.log(JSON.stringify({total:list.length, counts:Object.fromEntries(Object.entries(by).map(([k,v])=>[k,v.length])), by},null,1));
