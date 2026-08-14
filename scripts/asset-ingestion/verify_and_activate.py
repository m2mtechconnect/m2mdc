#!/usr/bin/env python3
"""Verify published derivatives by re-download, then activate manifest entries.

Durability rule: an entry only becomes runtime eligible after the published
bytes have been re-downloaded from the serving host and their SHA-256 matches
the locally recorded checksum.
"""
import json, subprocess, hashlib, time, os, sys

STATE = 'docs/evidence/nvidia-pack/conversion-state.json'
MANIFEST = 'assets/manifest.json'
HOST = os.environ.get('AURA_ASSET_HOST', 'https://m2mdc.lovable.app')
LICENCE = ("NVIDIA Data Center OpenUSD Assets Pack (omniverse-content-production "
           "/Assets/DigitalTwin), used under the pack's NVIDIA licence terms")

ROLE_LABEL = {
    'rack-core-reference': 'Rack core (reference)', 'liquid-cooled-rack': 'Liquid-cooled rack',
    'server-1u': '1U server', 'server-2u': '2U server', 'network-switch': 'Network switch',
    'rack-pdu': 'Rack PDU', 'liquid-cooling-equipment': 'Liquid-cooling equipment',
    'cable-tray': 'Cable tray', 'blanking-panel': 'Blanking panel',
}


def remote_sha(url):
    out = subprocess.run(['curl', '-sL', '--max-time', '180', HOST + url],
                         capture_output=True)
    if out.returncode != 0 or not out.stdout:
        return None, 0
    return 'sha256:' + hashlib.sha256(out.stdout).hexdigest(), len(out.stdout)


def main():
    state = json.load(open(STATE))
    verified = 0
    for key, e in sorted(state['assets'].items()):
        for level, pub in (e.get('publication') or {}).items():
            got, size = remote_sha(pub['url'])
            pub.pop('verifyError', None)
            pub['remoteChecksum'] = got
            pub['remoteBytes'] = size
            pub['durableStatus'] = 'verified' if got == pub['checksum'] else 'checksum-mismatch' if got else 'unreachable'
            pub['verifiedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            verified += pub['durableStatus'] == 'verified'
            print(f"{key:20s} {level:11s} {pub['durableStatus']}", flush=True)

    manifest = json.load(open(MANIFEST))
    by_id = {a['assetId']: a for a in manifest['assets']}
    active = 0
    for key, e in sorted(state['assets'].items()):
        blocked = e.get('validationStatus') not in ('passed', 'passed-with-budget-exception')
        variants = {}
        for level in ('operations', 'lod'):
            rec = (e.get('derivatives') or {}).get(level)
            if rec:
                variants[level] = rec['assetId']
        for level in ('operations', 'lod'):
            rec = (e.get('derivatives') or {}).get(level)
            if not rec:
                continue
            pub = (e.get('publication') or {}).get(level) or {}
            ok = (not blocked) and pub.get('durableStatus') == 'verified'
            bmin, bmax = rec['boundsMin'], rec['boundsMax']
            entry = {
                'assetId': rec['assetId'],
                'displayName': f"{ROLE_LABEL.get(e['semanticRole'], e['semanticRole'])} - {key} ({level} derivative)",
                'manufacturer': 'NVIDIA',
                'model': e['sourceStage'].rsplit('/', 1)[-1].replace('.usd', ''),
                'sourceUrl': 'Assets/DigitalTwin/' + e['sourceStage'],
                'licence': LICENCE,
                'sourceFormat': 'OpenUSD (usd)',
                'usdVersion': 'OpenUSD 26.08 (usd-core)',
                'glbVersion': state.get('pipelineVersion'),
                'glbUrl': pub.get('url') if ok else None,
                'dimensionsMeters': {
                    'x': round(bmax[0] - bmin[0], 4),
                    'y': round(bmax[1] - bmin[1], 4),
                    'z': round(bmax[2] - bmin[2], 4),
                },
                'triangleCount': rec.get('triangleCount'),
                'textureMemoryMb': 0,
                'lods': [v for k2, v in variants.items() if k2 != level],
                'lastValidatedAt': rec.get('generatedAt') if ok else None,
                'checksum': rec['checksum'],
                'approvalStatus': 'approved' if not blocked else 'pending-review',
                'runtimeEligible': ok,
                'semanticRole': e['semanticRole'],
                'qualityLevel': level,
                'qualityVariants': variants,
                'instanceable': True,
                'drawCallBudget': rec.get('drawCallEstimate'),
                'notes': (f"AURA-authored derivative of the NVIDIA source stage. "
                          f"{rec.get('meshCount')} mesh(es), {rec.get('materialCount')} material(s), "
                          f"draw-call estimate {rec.get('drawCallEstimate')}. "
                          f"Materials are AURA-authored PBR approximations: MDL shading does not survive glTF conversion."),
                'gpuValidation': {'status': 'awaiting-hardware-run', 'lastPassedRunId': None},
            }
            if blocked:
                entry['blocker'] = e.get('failureReason') or 'Validation failed; not runtime eligible.'
            elif not ok:
                entry['blocker'] = f"Durable publication {pub.get('durableStatus', 'missing')}; not runtime eligible."
            by_id[entry['assetId']] = entry
            active += ok

    manifest['assets'] = list(by_id.values())
    manifest['manifestVersion'] = manifest.get('manifestVersion', 3) + 1
    manifest['generatedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    json.dump(manifest, open(MANIFEST, 'w'), indent=2)
    json.dump(state, open(STATE, 'w'), indent=2, sort_keys=True)
    print(f"durable-verified={verified} runtime-active={active} manifest-entries={len(manifest['assets'])}")


if __name__ == '__main__':
    sys.exit(main())
