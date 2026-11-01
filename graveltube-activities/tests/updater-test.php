<?php
// Run inside disposable real WordPress. All remote responses are local fixtures.
use GravelTube\Activities\GitHubUpdater;
use GravelTube\Activities\Activity;
use GravelTube\Activities\Storage;

if (!defined('ABSPATH')) throw new RuntimeException('Run with tools/prepare-updater-test.py and WordPress Playground.');
require_once ABSPATH . 'wp-admin/includes/plugin.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
wp_set_current_user(1);
add_filter('filesystem_method', function() { return 'direct'; });
WP_Filesystem();
$plugin = 'graveltube-activities/graveltube-activities.php';
$updater = null;
foreach ($GLOBALS['wp_filter']['update_plugins_github.com']->callbacks as $group) foreach ($group as $callback) {
    if (is_array($callback['function']) && $callback['function'][0] instanceof GitHubUpdater) $updater = $callback['function'][0];
}
if (!$updater) throw new RuntimeException('Updater is not wired into WordPress.');
$mode = 'valid'; $requests = []; $checks = [];
$extra = ['plugin' => $plugin, 'type' => 'plugin', 'action' => 'update'];
$packageUrl = GitHubUpdater::REPOSITORY . '/releases/download/v2.0.0/graveltube-activities-2.0.0.zip';
$manifestUrl = GitHubUpdater::REPOSITORY . '/releases/download/v2.0.0/' . GitHubUpdater::MANIFEST;

function verify($condition, $message) {
    global $checks;
    if (!$condition) throw new RuntimeException('FAIL: ' . $message);
    $checks[] = $message; echo 'PASS ' . $message . "\n";
}
function response($body, $code = 200, $headers = []) { return ['headers' => $headers, 'body' => $body, 'response' => ['code' => $code, 'message' => 'Fixture'], 'cookies' => [], 'filename' => null]; }
function errorCode($value, $code) { return is_wp_error($value) && $value->get_error_code() === 'gta_update_' . $code; }
function scenario($value) { global $mode, $requests, $updater; $mode = $value; $requests = []; $updater->clearCache(); }

add_filter('pre_http_request', function($pre, $args, $url) use (&$mode, &$requests, $packageUrl, $manifestUrl) {
    $requests[] = ['url' => $url, 'args' => $args];
    $archiveKind = in_array($mode, ['headers', 'layout'], true) ? $mode : 'valid';
    $archive = file_get_contents('/fixtures/' . $archiveKind . '.zip');
    $manifest = ['manifest_version' => 1, 'version' => '2.0.0', 'plugin' => 'graveltube-activities/graveltube-activities.php',
        'requires' => $mode === 'wordpress' ? '99.0' : '6.3', 'requires_php' => $mode === 'php' ? '99.0' : '7.4', 'tested' => '6.8',
        'package' => $mode === 'manifest_url' ? 'https://example.invalid/plugin.zip' : $packageUrl,
        'sha256' => $mode === 'hash_format' ? 'not-a-hash' : hash('sha256', $archive)];
    if ($mode === 'manifest_version') $manifest['version'] = '2.0.1';
    if ($mode === 'manifest_identity') $manifest['plugin'] = 'other/other.php';
    if ($mode === 'missing_requires') unset($manifest['requires']);
    $json = json_encode($manifest);
    $asset = function($name, $body) { return ['name' => $name, 'size' => strlen($body), 'state' => 'uploaded', 'digest' => 'sha256:' . hash('sha256', $body), 'browser_download_url' => GitHubUpdater::REPOSITORY . '/releases/download/v2.0.0/' . $name]; };
    $release = ['tag_name' => 'v2.0.0', 'draft' => false, 'prerelease' => false, 'body' => '<img src=x onerror=alert(1)> Release notes',
        'assets' => [$asset(GitHubUpdater::MANIFEST, $json), $asset('graveltube-activities-2.0.0.zip', $archive)]];
    if ($mode === 'draft') $release['draft'] = true;
    if ($mode === 'prerelease') $release['prerelease'] = true;
    if ($mode === 'invalid_tag') $release['tag_name'] = 'v2.0.0-beta';
    if ($mode === 'older') { $release['tag_name'] = 'v1.0.0'; $release['assets'] = []; }
    if ($mode === 'same') { $release['tag_name'] = '1.0.1'; $release['assets'] = []; }
    if ($mode === 'missing_asset') array_pop($release['assets']);
    if ($mode === 'ambiguous_asset') $release['assets'][] = $release['assets'][1];
    if ($mode === 'asset_url') $release['assets'][1]['browser_download_url'] = 'https://example.invalid/plugin.zip';
    if ($mode === 'source_zip') $release['assets'][1]['name'] = 'graveltube-activities-2.0.0-source.zip';
    if ($mode === 'oversize') $release['assets'][1]['size'] = GitHubUpdater::MAX_PACKAGE + 1;
    if ($mode === 'asset_digest') $release['assets'][1]['digest'] = 'sha256:' . str_repeat('0', 64);
    if ($mode === 'no_digest') { unset($release['assets'][0]['digest']); unset($release['assets'][1]['digest']); }
    if ($url === GitHubUpdater::ENDPOINT) {
        if ($mode === 'network') return new WP_Error('http_request_failed', 'Offline');
        if ($mode === 'rate_limit') return response('Rate limited', 403);
        if ($mode === 'not_found') return response('Not found', 404);
        if ($mode === 'invalid_json') return response('{');
        if ($mode === 'api_oversize') return response(str_repeat('x', 1048577));
        return response(json_encode($release));
    }
    if ($url === $manifestUrl) {
        if ($mode === 'manifest_tampered') return response(str_replace('6.8', '6.9', $json));
        if ($mode === 'bad_redirect') return response('', 302, ['location' => 'https://example.invalid/metadata.json']);
        if ($mode === 'http_redirect') return response('', 302, ['location' => 'http://github.com/metadata.json']);
        if ($mode === 'credential_redirect') return response('', 302, ['location' => 'https://token@release-assets.githubusercontent.com/file']);
        if ($mode === 'loop') return response('', 302, ['location' => $manifestUrl]);
        return response($json);
    }
    if ($url === $packageUrl || $url === 'https://release-assets.githubusercontent.com/fixture.zip') {
        if ($mode === 'cdn' && $url === $packageUrl) return response('', 302, ['location' => 'https://release-assets.githubusercontent.com/fixture.zip']);
        if ($mode === 'tampered') $archive[100] = chr(ord($archive[100]) ^ 1);
        if (!empty($args['stream'])) { file_put_contents($args['filename'], $archive); return response(''); }
        return response($archive);
    }
    if (strpos($url, 'https://api.wordpress.org/plugins/update-check/') === 0) return response(json_encode(['plugins' => new stdClass(), 'no_update' => new stdClass(), 'translations' => []]));
    return new WP_Error('offline_fixture', 'Unexpected outbound request: ' . $url);
}, 10, 3);

scenario('valid');
$sentinel = ['other' => true];
verify($updater->update($sentinel, [], 'other/other.php', []) === $sentinel && !$requests, 'other GitHub plugins are untouched and trigger no request');
$release = $updater->release();
verify(is_array($release) && $release['version'] === '2.0.0' && $release['package'] === $packageUrl, 'stable version and the exact install asset are discovered');
verify(count($requests) === 2, 'release API and metadata are fetched once');
$updater->release();
verify(count($requests) === 2, 'successful metadata is cached');
verify(strpos($requests[0]['args']['user-agent'], 'http') === false && !isset($requests[0]['args']['headers']['Authorization']), 'requests contain neither a site URL nor a GitHub token');
verify($requests[0]['args']['redirection'] === 0 && $requests[0]['args']['sslverify'] === true, 'redirects are checked individually and TLS verification stays enabled');
$update = apply_filters('update_plugins_github.com', false, [], $plugin, []);
verify($update['requires'] === '6.3' && $update['requires_php'] === '7.4' && !isset($update['autoupdate']), 'native update metadata includes requirements without forcing auto-updates');
$info = apply_filters('plugins_api', false, 'plugin_information', (object) ['slug' => 'graveltube-activities']);
verify($info->download_link === $packageUrl && strpos($info->sections['changelog'], '<img') === false && strpos($info->sections['changelog'], '&lt;img') !== false, 'plugin details show the version with escaped untrusted release notes');
verify($updater->information($sentinel, 'query_plugins', (object) ['slug' => 'graveltube-activities']) === $sentinel, 'unrelated plugin-information queries remain untouched');
$count = count($requests);
verify($updater->download(false, 'https://example.invalid/other.zip', null, ['plugin' => 'other/other.php', 'type' => 'plugin', 'action' => 'update']) === false && count($requests) === $count, 'other plugin downloads are not intercepted');
verify($updater->download(false, $packageUrl, null, ['plugin' => $plugin, 'type' => 'translation', 'action' => 'update']) === false, 'translation downloads remain untouched');
verify($updater->download(false, '/tmp/local.zip', null, ['plugin' => $plugin, 'type' => 'plugin', 'action' => 'install']) === false, 'manual plugin installation is not hijacked');
verify(errorCode($updater->download(false, 'https://example.invalid/other.zip', null, $extra), 'package'), 'a substituted package URL is refused');

foreach (['draft' => 'release', 'prerelease' => 'release', 'invalid_tag' => 'release', 'invalid_json' => 'release',
    'network' => 'network', 'rate_limit' => 'http', 'not_found' => 'http', 'api_oversize' => 'size',
    'missing_asset' => 'asset', 'ambiguous_asset' => 'asset', 'source_zip' => 'asset', 'asset_url' => 'asset_url',
    'oversize' => 'size', 'manifest_version' => 'manifest', 'manifest_identity' => 'manifest', 'manifest_url' => 'manifest',
    'hash_format' => 'manifest', 'asset_digest' => 'manifest', 'manifest_tampered' => 'manifest_hash',
    'missing_requires' => 'requirements', 'bad_redirect' => 'host', 'http_redirect' => 'host', 'credential_redirect' => 'host', 'loop' => 'redirect'] as $case => $code) {
    scenario($case);
    verify(errorCode($updater->release(), $code), 'reject ' . $case);
    verify(!array_filter($requests, function($r) { return strpos($r['url'], 'example.invalid') !== false; }), 'no unapproved host contacted for ' . $case);
}
scenario('rate_limit'); $updater->release(); $count = count($requests); $updater->release();
verify(count($requests) === $count, 'GitHub failures are negatively cached instead of retried in a loop');
$updater->clearCache(); $updater->release();
verify(count($requests) === $count + 1, 'an explicit check clears the error cache');
scenario('older'); $older = $updater->release();
verify(is_array($older) && !$older['package'] && count($requests) === 1, 'the existing 1.0.0 release without metadata is not treated as an update or error');
scenario('no_digest');
verify(!is_wp_error($updater->release()), 'the manifest SHA-256 remains usable if GitHub omits its optional asset digest');
foreach (['wordpress', 'php'] as $case) {
    scenario($case); $updater->release(); $count = count($requests);
    verify(errorCode($updater->download(false, $packageUrl, null, $extra), 'compatibility') && count($requests) === $count, 'incompatible ' . $case . ' blocks the download');
    $info = $updater->information(false, 'plugin_information', (object) ['slug' => 'graveltube-activities']);
    verify($info->download_link === '', 'incompatible ' . $case . ' has no install link in details');
}
scenario('cdn');
$temp = $updater->download(false, $packageUrl, null, $extra);
verify(is_string($temp) && is_file($temp) && hash_file('sha256', $temp) === hash_file('sha256', '/fixtures/valid.zip'), 'legitimate GitHub CDN redirects yield a verified temporary ZIP');
wp_delete_file($temp);

// Exercise actual WordPress update transients and the core installer on a COPY.
$activity = wp_insert_post(['post_type' => 'gta_activity', 'post_status' => 'draft', 'post_title' => 'Updater storage fixture']);
$data = Activity::normalise(json_decode(file_get_contents('/fixtures/activity.json'), true));
Storage::write($activity, $data, file_get_contents('/fixtures/activity.fit'), 'fixture.fit');
update_option('gta_private_outdoor_default', true);
update_option('gta_default_fields', ['device' => false, 'start' => true]);
$storedBefore = Storage::read($activity);
$metaBefore = get_post_meta($activity);
$fileBefore = hash_file('sha256', WP_PLUGIN_DIR . '/' . $plugin);
$captured = null;
$observer = function($reply) use (&$captured) { if (is_wp_error($reply)) $captured = $reply; return $reply; };
add_filter('upgrader_pre_download', $observer, 100);
add_filter('upgrader_source_selection', $observer, 100);
foreach (['tampered', 'headers', 'layout'] as $case) {
    scenario($case);
    $captured = null;
    delete_site_transient('update_plugins'); wp_clean_plugins_cache(false); wp_update_plugins();
    $updates = get_site_transient('update_plugins');
    verify(isset($updates->response[$plugin]) && $updates->response[$plugin]->new_version === '2.0.0', 'WordPress receives a native update entry for ' . $case);
    $installer = new Plugin_Upgrader(new Automatic_Upgrader_Skin());
    $result = $installer->upgrade($plugin);
    $expectedCode = $case === 'tampered' ? 'checksum' : ($case === 'headers' ? 'headers' : 'layout');
    verify($result !== true && errorCode($captured, $expectedCode), 'core installer refuses ' . $case . ' update for the expected reason');
    verify(hash_file('sha256', WP_PLUGIN_DIR . '/' . $plugin) === $fileBefore, 'failed ' . $case . ' update leaves installed files unchanged');
    verify(get_post_meta($activity) === $metaBefore, 'failed ' . $case . ' update preserves training data');
}
scenario('tampered'); $captured = null;
delete_site_transient('update_plugins'); wp_clean_plugins_cache(false); wp_update_plugins();
$installer = new Plugin_Upgrader(new Bulk_Plugin_Upgrader_Skin());
ob_start(); $bulk = $installer->bulk_upgrade([$plugin]); ob_end_clean();
verify(is_array($bulk) && is_wp_error($bulk[$plugin]) && errorCode($captured, 'checksum'), 'native bulk update also enforces the ZIP checksum with its reduced hook context');
verify(hash_file('sha256', WP_PLUGIN_DIR . '/' . $plugin) === $fileBefore, 'failed bulk update leaves the installed plugin intact');
scenario('valid');
delete_site_transient('update_plugins'); wp_clean_plugins_cache(false); wp_update_plugins();
$updates = get_site_transient('update_plugins');
verify($updates->response[$plugin]->new_version === '2.0.0', 'core update check lists the new version');
$installer = new Plugin_Upgrader(new Automatic_Upgrader_Skin());
$result = $installer->upgrade($plugin);
verify($result === true, 'real WordPress Plugin_Upgrader installs the verified package');
$headers = get_plugin_data(WP_PLUGIN_DIR . '/' . $plugin, false, false);
verify($headers['Version'] === '2.0.0', 'the installed plugin files contain the new version');
verify(Storage::read($activity) === $storedBefore && get_post_meta($activity) === $metaBefore, 'successful upgrade preserves complete activity/archive/source metadata');
verify(get_option('gta_private_outdoor_default') === '1' || get_option('gta_private_outdoor_default') === true, 'the global privacy setting survives');
verify(get_option('gta_default_fields') === ['device' => false, 'start' => true], 'per-field defaults survive');
verify(get_site_transient(GitHubUpdater::CACHE) === false, 'successful installation clears the GitHub metadata cache');
$report = ['checks' => count($checks), 'messages' => $checks, 'installed_version' => $headers['Version'], 'php' => PHP_VERSION, 'wordpress' => $GLOBALS['wp_version']];
file_put_contents('/fixtures/report.json', json_encode($report, JSON_PRETTY_PRINT));
echo count($checks) . " updater checks passed.\n";
