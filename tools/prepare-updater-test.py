#!/usr/bin/env python3
"""Prepare disposable update packages and an isolated Playground blueprint. Never publishes."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

root = Path(__file__).resolve().parents[1]
out = root / '.test-output/updater'
fixtures = out / 'fixtures'
fixtures.mkdir(parents=True, exist_ok=True)
plugin = root / 'graveltube-activities'
baseline = out / 'original'
shutil.copytree(plugin, baseline, dirs_exist_ok=True, ignore=shutil.ignore_patterns('node_modules', '.DS_Store'))
for source, target in [('outdoor.json', 'activity.json'), ('outdoor.fit', 'activity.fit')]:
    shutil.copyfile(root / '.test-output' / source, fixtures / target)

for kind in ['valid', 'headers', 'layout']:
    package = fixtures / (kind + '.zip')
    with zipfile.ZipFile(package, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(baseline.rglob('*')):
            if not path.is_file() or 'tests' in path.relative_to(baseline).parts:
                continue
            relative = path.relative_to(baseline).as_posix()
            data = path.read_bytes()
            if relative in ['graveltube-activities.php', 'package.json', 'package-lock.json', 'block.json']:
                data = data.replace(json.loads((plugin / 'package.json').read_text())['version'].encode(), b'2.0.0')
            if kind == 'headers' and relative == 'graveltube-activities.php':
                data = data.replace(b'Version: 2.0.0', b'Version: 2.0.7')
            folder = 'other-plugin' if kind == 'layout' else 'graveltube-activities'
            archive.writestr(folder + '/' + relative, data)
    print(kind, package.stat().st_size, hashlib.sha256(package.read_bytes()).hexdigest())

blueprint = {'steps': [
    {'step': 'runPHP', 'code': "<?php require_once '/wordpress/wp-load.php'; require_once '/wordpress/wp-admin/includes/plugin.php'; require_once '/wordpress/wp-admin/includes/file.php'; add_filter('filesystem_method', function(){return 'direct';}); WP_Filesystem(); $destination=WP_PLUGIN_DIR.'/graveltube-activities'; if(!is_dir($destination)) mkdir($destination); $result=copy_dir('/candidate',$destination); if(is_wp_error($result)) throw new Exception($result->get_error_message()); $result=activate_plugin('graveltube-activities/graveltube-activities.php'); if(is_wp_error($result)) throw new Exception($result->get_error_message());"},
    {'step': 'runPHP', 'code': "<?php require_once '/wordpress/wp-load.php'; require '/fixtures/updater-test.php';"}
]}
archive = (fixtures / 'valid.zip').read_bytes()
package_url = 'https://github.com/gravelbiking/wp_plugin_showfit/releases/download/v2.0.0/graveltube-activities-2.0.0.zip'
manifest = {'manifest_version': 1, 'version': '2.0.0', 'plugin': 'graveltube-activities/graveltube-activities.php',
    'requires': '6.3', 'requires_php': '7.4', 'tested': '6.8', 'package': package_url, 'sha256': hashlib.sha256(archive).hexdigest()}
manifest_bytes = json.dumps(manifest).encode()
(fixtures / 'manifest.json').write_bytes(manifest_bytes)
def asset(name, data):
    return {'name': name, 'size': len(data), 'state': 'uploaded', 'digest': 'sha256:' + hashlib.sha256(data).hexdigest(),
            'browser_download_url': package_url.rsplit('/', 1)[0] + '/' + name}
(fixtures / 'release.json').write_text(json.dumps({'tag_name': 'v2.0.0', 'draft': False, 'prerelease': False,
    'body': '<img src=x onerror=alert(1)> Local update fixture',
    'assets': [asset('graveltube-activities-update.json', manifest_bytes), asset('graveltube-activities-2.0.0.zip', archive)]}))
shutil.copyfile(plugin / 'tests/updater-ui-fixtures.php', fixtures / 'updater-ui-fixtures.php')
ui_setup = blueprint['steps'][0]['code'] + " if(!is_dir(WPMU_PLUGIN_DIR)) mkdir(WPMU_PLUGIN_DIR); copy('/fixtures/updater-ui-fixtures.php',WPMU_PLUGIN_DIR.'/gta-updater-fixture.php'); $id=wp_create_user('updater-editor','fixture-password','editor@example.invalid'); if(!is_wp_error($id)) (new WP_User($id))->set_role('editor');"
ui_blueprint = {'steps': [{'step': 'runPHP', 'code': ui_setup}]}
(out / 'ui-blueprint.json').write_text(json.dumps(ui_blueprint, indent=2))
shutil.copyfile(plugin / 'tests/updater-test.php', fixtures / 'updater-test.php')
(out / 'blueprint.json').write_text(json.dumps(blueprint, indent=2))
print('Fixtures and blueprint:', out)
