<?php
// TEST ONLY: installed as an MU plugin in a disposable local WordPress.
add_filter('filesystem_method', function() { return 'direct'; });
add_filter('pre_http_request', function($pre, $args, $url) {
    $files = [
        'https://api.github.com/repos/gravelbiking/wp_plugin_showfit/releases/latest' => '/fixtures/release.json',
        'https://github.com/gravelbiking/wp_plugin_showfit/releases/download/v2.0.0/graveltube-activities-update.json' => '/fixtures/manifest.json',
        'https://github.com/gravelbiking/wp_plugin_showfit/releases/download/v2.0.0/graveltube-activities-2.0.0.zip' => '/fixtures/valid.zip',
    ];
    $body = null;
    if (isset($files[$url])) {
        $log = (array) get_option('gta_updater_fixture_requests', []); $log[] = $url;
        update_option('gta_updater_fixture_requests', $log, false);
        $body = file_get_contents($files[$url]);
    } elseif (strpos($url, 'https://api.wordpress.org/plugins/update-check/') === 0) {
        $body = wp_json_encode(['plugins' => new stdClass(), 'no_update' => new stdClass(), 'translations' => []]);
    } else return new WP_Error('offline_fixture', 'External request blocked by updater test.');
    if (!empty($args['stream'])) { file_put_contents($args['filename'], $body); $body = ''; }
    return ['headers' => [], 'body' => $body, 'response' => ['code' => 200, 'message' => 'Fixture'], 'cookies' => []];
}, 10, 3);
add_action('rest_api_init', function() {
    register_rest_route('gta-updater-test/v1', '/status', ['methods' => 'GET', 'permission_callback' => function() { return current_user_can('manage_options'); },
        'callback' => function() {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
            $plugin = 'graveltube-activities/graveltube-activities.php';
            return ['version' => get_plugin_data(WP_PLUGIN_DIR . '/' . $plugin, false, false)['Version'], 'constant' => GTA_VERSION,
                'active' => is_plugin_active($plugin), 'requests' => get_option('gta_updater_fixture_requests', []),
                'auto_updates' => get_site_option('auto_update_plugins', []), 'wordpress' => $GLOBALS['wp_version'], 'php' => PHP_VERSION];
        }]);
});
