#!/usr/bin/env python3
"""Phase 3/4: checksum + safe ZIP inspection for the NVIDIA Data Center pack."""
import hashlib, json, sys, zipfile, os

MAX_FILES = 200000
MAX_TOTAL = 60 * 1024**3

def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(8 << 20), b''):
            h.update(chunk)
    return h.hexdigest()

def unsafe(name):
    if name.startswith('/') or name.startswith('\\'): return 'absolute-path'
    if os.path.splitdrive(name)[0]: return 'drive-path'
    parts = name.replace('\\', '/').split('/')
    if '..' in parts: return 'path-traversal'
    return None

def main(zip_path, out):
    rec = {'archive': zip_path, 'bytes': os.path.getsize(zip_path)}
    rec['sha256'] = sha256(zip_path)
    with zipfile.ZipFile(zip_path) as z:
        infos = z.infolist()
        rec['fileCount'] = len(infos)
        rec['uncompressedBytes'] = sum(i.file_size for i in infos)
        rec['violations'] = [{'name': i.filename, 'reason': r}
                             for i in infos if (r := unsafe(i.filename))]
        exts = {}
        for i in infos:
            e = os.path.splitext(i.filename)[1].lower()
            exts[e] = exts.get(e, 0) + 1
        rec['extensions'] = dict(sorted(exts.items(), key=lambda kv: -kv[1]))
    rec['limitsOk'] = (rec['fileCount'] <= MAX_FILES and rec['uncompressedBytes'] <= MAX_TOTAL
                       and not rec['violations'])
    with open(out, 'w') as f:
        json.dump(rec, f, indent=2)
    print(json.dumps({k: v for k, v in rec.items() if k != 'extensions'}, indent=2)[:2000])
    print('top extensions:', list(rec['extensions'].items())[:15])

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
