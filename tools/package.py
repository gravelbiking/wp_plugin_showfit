#!/usr/bin/env python3
"""Create source-complete, deterministic WordPress release ZIPs and SHA-256 checksums."""
from pathlib import Path
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'graveltube-activities'
VERSION = json.loads((PLUGIN / 'block.json').read_text())['version']
OUT = ROOT / 'dist'
OUT.mkdir(exist_ok=True)
EXCLUDED = {'node_modules', '.git', '.test-output', 'dist', '__pycache__'}


def allowed(path):
    return path.is_file() and not any(part in EXCLUDED for part in path.relative_to(ROOT).parts) and path.name != '.DS_Store'


manifest = json.loads((PLUGIN / 'source/vendor/manifest.json').read_text())
assert len(manifest) == 7
expected_vendor_files = {'manifest.json'} | {
    dependency['directory'] + '/' + relative
    for dependency in manifest for relative in dependency['files']
}
actual_vendor_files = {path.relative_to(PLUGIN / 'source/vendor').as_posix()
    for path in (PLUGIN / 'source/vendor').rglob('*') if path.is_file() and path.name != '.DS_Store'}
assert actual_vendor_files == expected_vendor_files, 'Unrecorded or missing vendored source files'
expected_assets = {'editor.js', 'viewer.js', 'viewer.css', 'vendor/chart.js',
    'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.js.map', 'vendor/leaflet/leaflet.css'} | {
    'vendor/leaflet/images/' + name for name in
    ['layers.png', 'layers-2x.png', 'marker-icon.png', 'marker-icon-2x.png', 'marker-shadow.png']}
actual_assets = {path.relative_to(PLUGIN / 'assets').as_posix()
    for path in (PLUGIN / 'assets').rglob('*') if path.is_file() and path.name != '.DS_Store'}
assert actual_assets == expected_assets, 'Unrecorded or missing frontend asset files'
for dependency in manifest:
    for relative, checksum in dependency['files'].items():
        source = PLUGIN / 'source/vendor' / dependency['directory'] / relative
        assert hashlib.sha256(source.read_bytes()).hexdigest() == checksum, source
assert (PLUGIN / 'licenses/kurkle-color.txt').read_bytes() == (PLUGIN / 'source/vendor/kurkle-color/LICENSE').read_bytes()
assert 'Jukka Kurkela' in (PLUGIN / 'licenses/kurkle-color.txt').read_text()
for name in ['package.json', 'package-lock.json', 'BUILD.md', 'PRIVACY.md', 'LICENSE']:
    assert (PLUGIN / name).is_file(), name
assert json.loads((PLUGIN / 'package.json').read_text())['version'] == VERSION


def add(archive, path, name):
    info = zipfile.ZipInfo(name, date_time=(2026, 10, 31, 12, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    archive.writestr(info, path.read_bytes())


install = OUT / f'graveltube-activities-{VERSION}.zip'
source = OUT / f'graveltube-activities-{VERSION}-source.zip'
with zipfile.ZipFile(install, 'w') as archive:
    for path in sorted(PLUGIN.rglob('*')):
        if allowed(path) and 'tests' not in path.relative_to(PLUGIN).parts:
            add(archive, path, path.relative_to(ROOT).as_posix())

with zipfile.ZipFile(source, 'w') as archive:
    paths = list(PLUGIN.rglob('*')) + list((ROOT / 'tools').rglob('*'))
    paths += [ROOT / name for name in ['package.json', 'package-lock.json', '.gitignore', 'README.md', 'LICENSE']]
    for path in sorted(paths):
        if allowed(path):
            add(archive, path, 'graveltube-activities-source/' + path.relative_to(ROOT).as_posix())

checksums = []
for path in [install, source]:
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None
        assert not any('node_modules/' in name or '.test-output/' in name for name in archive.namelist())
        assert not any(name.lower().endswith('.fit') for name in archive.namelist())
        assert any(name.endswith('/source/vendor/fit-file-parser/src/fit-parser.ts') for name in archive.namelist())
        assert any(name.endswith('/BUILD.md') for name in archive.namelist())
headers = (PLUGIN / 'graveltube-activities.php').read_text()
def header(name):
    match = re.search(r'^\s*\*\s*' + re.escape(name) + r':\s*(.*?)\s*$', headers, re.MULTILINE)
    assert match, name
    return match[1]

assert header('Version') == VERSION
assert header('Update URI') == 'https://github.com/gravelbiking/wp_plugin_showfit'
tested = re.search(r'^Tested up to:\s*(\S+)', (PLUGIN / 'readme.txt').read_text(), re.MULTILINE).group(1)
update = OUT / 'graveltube-activities-update.json'
update.write_text(json.dumps({'manifest_version': 1, 'plugin': 'graveltube-activities/graveltube-activities.php',
    'version': VERSION, 'requires': header('Requires at least'), 'requires_php': header('Requires PHP'), 'tested': tested,
    'package': f'https://github.com/gravelbiking/wp_plugin_showfit/releases/download/v{VERSION}/{install.name}',
    'sha256': hashlib.sha256(install.read_bytes()).hexdigest()}, indent=2) + '\n')

for path in [install, source, update]:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    checksums.append(f'{digest}  {path.name}')
    print(f'{path.name}: {path.stat().st_size:,} bytes; sha256 {digest}')
(OUT / f'graveltube-activities-{VERSION}-SHA256SUMS.txt').write_text('\n'.join(checksums) + '\n')
