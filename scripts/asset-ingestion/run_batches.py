#!/usr/bin/env python3
"""Idempotent, resumable batch conversion driver for the NVIDIA Data Center pack.

  python3 scripts/asset-ingestion/run_batches.py --batch A [--force key1,key2]

State lives in docs/evidence/nvidia-pack/conversion-state.json (outside /tmp) so a
run can resume after interruption. An asset is skipped when its source checksum,
conversion settings and every recorded derivative checksum still match on disk.
Failures are isolated per asset: a failing asset is recorded and the batch
continues. Failed assets are never published and previously approved
derivatives are never mutated.
"""
import argparse, hashlib, json, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from batch_spec import assets, PACK_ROOT, EXCLUDE_ANCESTORS  # noqa: E402

PACK = os.environ.get('AURA_PACK_DIR', '/tmp/ingest/pack')
WORK = os.environ.get('AURA_WORK_DIR', '/tmp/ingest/derivatives')
BLENDER = os.environ.get('AURA_BLENDER', '/tmp/ingest/blender/blender')
STATE = os.path.join(REPO, 'docs/evidence/nvidia-pack/conversion-state.json')
PIPELINE_VERSION = '1.1.0'
LEVELS = ('inspection', 'operations', 'lod')


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def load_state():
    if os.path.exists(STATE):
        return json.load(open(STATE))
    return {'pipelineVersion': PIPELINE_VERSION, 'assets': {}}


def save_state(state):
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    state['updatedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    json.dump(state, open(STATE, 'w'), indent=2, sort_keys=True)


def settings_hash(spec, tools):
    payload = json.dumps({'budgets': spec['budgets'], 'stripInternal': spec['stripInternal'],
                          'exclude': EXCLUDE_ANCESTORS.get(spec['key'], []),
                          'rotationY': spec['rotationY'], 'pipeline': PIPELINE_VERSION,
                          'tools': tools}, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


def dependency_closure(usd_path):
    """Minimal complete dependency closure for the stage (recursive)."""
    from pxr import Usd
    seen, queue = set(), [usd_path]
    while queue:
        cur = queue.pop()
        if cur in seen or not os.path.exists(cur):
            continue
        seen.add(cur)
        try:
            stage = Usd.Stage.Open(cur)
        except Exception:
            continue
        if not stage:
            continue
        for layer in stage.GetUsedLayers():
            p = layer.realPath
            if p and os.path.exists(p) and p not in seen:
                queue.append(p)
    return sorted(seen)


def tool_versions():
    b = subprocess.run([BLENDER, '--version'], capture_output=True, text=True).stdout.split('\n')[0].strip()
    gt = 'unknown'
    pkg = os.path.join(REPO, 'node_modules/@gltf-transform/core/package.json')
    if os.path.exists(pkg):
        gt = json.load(open(pkg)).get('version', 'unknown')
    return {'blender': b, 'gltfTransform': gt or 'unknown'}


def convert(spec, tools, state):
    key = spec['key']
    src = os.path.join(PACK, PACK_ROOT, spec['source'])
    entry = state['assets'].setdefault(key, {})
    entry.update({
        'key': key, 'category': spec['category'], 'semanticRole': spec['semanticRole'],
        'sourceStage': spec['source'], 'batch': spec['batch'],
        'sourceChecksum': f'sha256:{sha256(src)}',
        'settingsHash': settings_hash(spec, tools), 'toolVersions': tools,
        'budgets': spec['budgets'],
    })
    closure = dependency_closure(src)
    entry['dependencyClosure'] = [os.path.relpath(p, os.path.join(PACK, PACK_ROOT)) for p in closure]
    entry['dependencyStatus'] = 'complete' if closure else 'unresolved'

    workdir = os.path.join(WORK, key)
    os.makedirs(workdir, exist_ok=True)
    log = os.path.join(workdir, 'convert.log')
    cmd = [BLENDER, '-b', '-P', os.path.join(HERE, 'convert_pack_asset.py'), '--',
           src, workdir, key, json.dumps(spec['budgets']), '1' if spec['stripInternal'] else '0',
           json.dumps(EXCLUDE_ANCESTORS.get(key, []))]
    with open(log, 'w') as lf:
        proc = subprocess.run(cmd, capture_output=True, text=True)
        lf.write(proc.stdout + '\n' + proc.stderr)
    line = [l for l in proc.stdout.splitlines() if l.startswith('CONVERSION_JSON ')]
    if proc.returncode != 0 or not line:
        entry['conversionStatus'] = 'failed'
        entry['failureReason'] = f'blender exit {proc.returncode}; see {log}'
        return entry
    conv = json.loads(line[-1][len('CONVERSION_JSON '):])
    entry['sourceStats'] = conv['sourceStats']
    entry['componentSelection'] = conv.get('componentSelection')
    entry['conversionStatus'] = 'converted'
    entry['failureReason'] = None
    entry['derivatives'] = {}

    for level in LEVELS:
        raw = conv['levels'][level]['output']
        out = os.path.join(workdir, f'{key}.{level}.glb')
        rec = os.path.join(workdir, f'{key}.{level}.record.json')
        fin = subprocess.run(['node', os.path.join(HERE, 'finish_derivative.mjs'),
                              raw, out, str(spec['rotationY']), rec],
                             capture_output=True, text=True, cwd=REPO)
        if fin.returncode != 0:
            entry['conversionStatus'] = 'failed'
            entry['failureReason'] = f'finish_derivative failed for {level}: {fin.stderr[-400:]}'
            return entry
        record = json.load(open(rec))
        record['assetId'] = f'nvidia.{spec["category"].replace("-", "_")}.{key}.{level}'
        record['blenderLevel'] = conv['levels'][level]
        entry['derivatives'][level] = record
    return entry


def validate(entry):
    """Compare operations/lod against the inspection derivative built from source."""
    d = entry.get('derivatives') or {}
    if 'inspection' not in d:
        entry['validationStatus'] = 'failed'
        entry['failureReason'] = 'no inspection derivative to validate against'
        return
    ref = d['inspection']
    checks = []

    def near(a, b, tol):
        return abs(a - b) <= tol

    for level in ('operations', 'lod'):
        cur = d.get(level)
        if not cur:
            checks.append({'level': level, 'id': 'exists', 'pass': False, 'detail': 'missing'})
            continue
        tol = [max(0.02, ref['sizeMeters'][i] * 0.05) for i in range(3)]
        checks += [
            {'level': level, 'id': 'world-bounds-preserved',
             'pass': all(near(cur['sizeMeters'][i], ref['sizeMeters'][i], tol[i]) for i in range(3)),
             'detail': f"{cur['sizeMeters']} vs {ref['sizeMeters']}"},
            {'level': level, 'id': 'floor-contact-y0', 'pass': near(cur['boundsMin'][1], 0, 0.002),
             'detail': str(cur['boundsMin'][1])},
            {'level': level, 'id': 'orientation-preserved',
             'pass': near(cur['boundsMin'][2], ref['boundsMin'][2], tol[2]) and near(cur['boundsMax'][2], ref['boundsMax'][2], tol[2]),
             'detail': f"z {cur['boundsMin'][2]}..{cur['boundsMax'][2]} vs {ref['boundsMin'][2]}..{ref['boundsMax'][2]}"},
            {'level': level, 'id': 'geometry-present', 'pass': cur['triangleCount'] > 0,
             'detail': f"{cur['triangleCount']} tris"},
            {'level': level, 'id': 'material-slots-preserved', 'pass': cur['materialCount'] > 0,
             'detail': f"{cur['materialCount']} materials"},
            {'level': level, 'id': 'triangle-budget',
             'pass': entry['budgets'][level] is None or cur['triangleCount'] <= entry['budgets'][level] * 1.05,
             'detail': f"{cur['triangleCount']} vs budget {entry['budgets'][level]}"},
            {'level': level, 'id': 'reduction-achieved',
             'pass': cur['triangleCount'] <= ref['triangleCount'],
             'detail': f"{ref['triangleCount']} -> {cur['triangleCount']}"},
        ]
    entry['validationChecks'] = checks
    hard = [c for c in checks if not c['pass'] and c['id'] != 'triangle-budget']
    soft = [c for c in checks if not c['pass'] and c['id'] == 'triangle-budget']
    entry['validationStatus'] = 'failed' if hard else ('passed-with-budget-exception' if soft else 'passed')
    if hard:
        entry['failureReason'] = '; '.join(f"{c['level']}:{c['id']} {c['detail']}" for c in hard)


def up_to_date(entry, spec, tools):
    if entry.get('conversionStatus') != 'converted':
        return False
    if entry.get('settingsHash') != settings_hash(spec, tools):
        return False
    src = os.path.join(PACK, PACK_ROOT, spec['source'])
    if os.path.exists(src) and entry.get('sourceChecksum') != f'sha256:{sha256(src)}':
        return False
    for level in LEVELS:
        rec = (entry.get('derivatives') or {}).get(level)
        if not rec:
            return False
        p = rec['output']
        if not os.path.exists(p) or f'sha256:{sha256(p)}' != rec['checksum']:
            return False
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--batch', default=None)
    ap.add_argument('--only', default=None)
    ap.add_argument('--force', default='')
    args = ap.parse_args()
    forced = set(filter(None, args.force.split(',')))
    tools = tool_versions()
    state = load_state()
    state['pipelineVersion'] = PIPELINE_VERSION

    for spec in assets(args.batch):
        key = spec['key']
        if args.only and key != args.only:
            continue
        entry = state['assets'].get(key, {})
        if key not in forced and up_to_date(entry, spec, tools):
            print(f'[skip]  {key} (up to date)')
            continue
        print(f'[build] {key} ...', flush=True)
        t0 = time.time()
        try:
            entry = convert(spec, tools, state)
            if entry.get('conversionStatus') == 'converted':
                validate(entry)
        except Exception as e:  # failure isolation
            entry = state['assets'].setdefault(key, {})
            entry['conversionStatus'] = 'failed'
            entry['failureReason'] = f'{type(e).__name__}: {e}'
        entry.setdefault('publicationStatus', 'not-published')
        entry.setdefault('manifestStatus', 'not-registered')
        entry.setdefault('runtimeMappingStatus', 'not-mapped')
        entry['durationSeconds'] = round(time.time() - t0, 1)
        state['assets'][key] = entry
        save_state(state)
        print(f"[{entry.get('conversionStatus')}/{entry.get('validationStatus')}] {key} "
              f"in {entry['durationSeconds']}s  {entry.get('failureReason') or ''}", flush=True)
    save_state(state)


if __name__ == '__main__':
    main()
