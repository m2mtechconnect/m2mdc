#!/usr/bin/env python3
"""Preview-host delivery evidence for every runtime-eligible derivative.

localhost is never acceptable as runtime evidence: the dev server does not
serve /__l5e/. This checks the production-equivalent AURA host.
"""
import json, subprocess, hashlib, sys, os, time

HOST = os.environ.get('AURA_ASSET_HOST', 'https://m2mdc.lovable.app')
OUT = 'docs/evidence/nvidia-pack/preview-delivery.json'


def probe(url):
    t0 = time.time()
    p = subprocess.run(['curl', '-sL', '-D', '-', '-o', '/tmp/_asset.bin', '--max-time', '180',
                        '-H', 'Origin: ' + HOST, url], capture_output=True, text=True)
    ms = round((time.time() - t0) * 1000)
    headers = p.stdout
    body = open('/tmp/_asset.bin', 'rb').read() if os.path.exists('/tmp/_asset.bin') else b''
    status = None
    ctype = clen = cors = None
    for line in headers.splitlines():
        if line.startswith('HTTP/'):
            status = int(line.split()[1])
        low = line.lower()
        if low.startswith('content-type:'):
            ctype = line.split(':', 1)[1].strip()
        if low.startswith('content-length:'):
            clen = int(line.split(':', 1)[1].strip())
        if low.startswith('access-control-allow-origin:'):
            cors = line.split(':', 1)[1].strip()
    return {
        'status': status, 'contentType': ctype, 'contentLength': clen,
        'downloadedBytes': len(body), 'sha256': 'sha256:' + hashlib.sha256(body).hexdigest() if body else None,
        'corsAllowOrigin': cors, 'transferMs': ms,
    }


def main():
    manifest = json.load(open('assets/manifest.json'))
    results = []
    for a in manifest['assets']:
        if not a.get('glbUrl') or a.get('runtimeEligible') is not True:
            continue
        r = probe(HOST + a['glbUrl'])
        r.update({
            'assetId': a['assetId'], 'role': a.get('semanticRole'), 'quality': a.get('qualityLevel'),
            'url': HOST + a['glbUrl'], 'expectedChecksum': a['checksum'],
            'checksumMatches': r['sha256'] == a['checksum'],
            'runtimePreferred': a.get('runtimePreferred'), 'preferredFor': a.get('preferredFor'),
        })
        r['ok'] = r['status'] == 200 and r['checksumMatches']
        results.append(r)
        print(f"{r['assetId']:58s} {r['status']} {str(r['contentType'])[:24]:24s} "
              f"{r['downloadedBytes']:>9} checksum={'match' if r['checksumMatches'] else 'MISMATCH'}", flush=True)

    json.dump({'host': HOST, 'checkedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
               'results': results}, open(OUT, 'w'), indent=2)
    ok = sum(1 for r in results if r['ok'])
    roles = sorted({r['role'] for r in results if r['ok'] and r['role']})
    print(f"delivered-ok={ok}/{len(results)} roles-with-delivery={len(roles)} {roles}")
    return 0 if ok == len(results) else 1


if __name__ == '__main__':
    sys.exit(main())
