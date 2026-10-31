#!/usr/bin/env python3
"""Vendor pinned upstream editing/build sources from previously downloaded GitHub archives.

Usage: python3 tools/vendor_sources.py /path/to/archive-directory
The expected vendor-N.tar.gz URLs are in tools/vendor-sources.json.
No upstream scripts or repository instructions are executed.
"""
from pathlib import Path, PurePosixPath
import hashlib
import json
import shutil
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'graveltube-activities'
DEST = PLUGIN / 'source' / 'vendor'
specs = json.loads((ROOT / 'tools/vendor-sources.json').read_text())
archives = Path(sys.argv[1])
manifest = []
excluded = {'test', 'tests', 'spec', 'examples', 'docs', 'debug', '.github', '.husky', '.agent', 'node_modules', 'dist', '.git'}

for i, spec in enumerate(specs):
    folder = spec['name'].replace('@', '').replace('/', '-')
    archive = archives / f'vendor-{i}.tar.gz'
    files = {}
    if (DEST / folder).exists():
        shutil.rmtree(DEST / folder)
    with tarfile.open(archive) as source:
        for item in source.getmembers():
            if not item.isfile():
                continue
            relative = PurePosixPath(*PurePosixPath(item.name).parts[1:])
            if not relative.parts or '..' in relative.parts or any(part in excluded for part in relative.parts):
                continue
            if relative.name in {'AGENTS.md', '.DS_Store'} or relative.suffix.lower() in {'.fit', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.zip', '.gz', '.pdf'}:
                continue
            content = source.extractfile(item).read()
            target = DEST / folder / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
            files[relative.as_posix()] = hashlib.sha256(content).hexdigest()
    manifest.append({**spec, 'directory': folder,
        'archiveUrl': f'https://codeload.github.com/{spec["repository"]}/tar.gz/{spec["commit"]}',
        'archiveSha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'files': files,
        'scope': 'Preferred editing/build sources and licenses; documentation, tests, fixtures and prebuilt dist omitted.'})

lock = json.loads((ROOT / 'package-lock.json').read_text())['packages']
for name in ['buffer', 'base64-js', 'ieee754']:
    files = {}
    origin = ROOT / 'node_modules' / name
    if (DEST / name).exists():
        shutil.rmtree(DEST / name)
    for item in sorted(origin.rglob('*')):
        relative = item.relative_to(origin)
        if not item.is_file() or any(p in excluded for p in relative.parts):
            continue
        target = DEST / name / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(item, target)
        files[relative.as_posix()] = hashlib.sha256(item.read_bytes()).hexdigest()
    package = lock['node_modules/' + name]
    manifest.append({'name': name, 'version': package['version'], 'directory': name,
        'packageUrl': package['resolved'], 'packageIntegrity': package['integrity'], 'files': files,
        'scope': 'Original npm package, including preferred JavaScript sources and license.'})

(DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
for folder, target in [('kurkle-color', 'kurkle-color.txt'), ('chart.js', 'chartjs.txt'), ('leaflet', 'leaflet.txt')]:
    license_file = next(path for path in [DEST / folder / 'LICENSE', DEST / folder / 'LICENSE.md'] if path.is_file())
    shutil.copyfile(license_file, PLUGIN / 'licenses' / target)
print('Vendored sources:', ', '.join(f'{entry["name"]} {entry["version"]} ({len(entry["files"])} files)' for entry in manifest))
