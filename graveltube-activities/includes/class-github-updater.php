<?php
namespace GravelTube\Activities;

/** Native WordPress updates from this plugin's public GitHub releases. GPL-2.0-or-later. */
final class GitHubUpdater {
    const REPOSITORY = 'https://github.com/gravelbiking/wp_plugin_showfit';
    const ENDPOINT = 'https://api.github.com/repos/gravelbiking/wp_plugin_showfit/releases/latest';
    const MANIFEST = 'graveltube-activities-update.json';
    const SLUG = 'graveltube-activities';
    const MAIN_FILE = 'graveltube-activities.php';
    const CACHE = 'gta_github_update_v1';
    const MAX_PACKAGE = 31457280; // 30 MiB compressed.

    private $file;
    private $plugin;
    private $version;
    private $pending;

    public function __construct($file, $version) {
        $this->file = $file;
        $this->plugin = plugin_basename($file);
        $this->version = $version;
    }

    public function boot() {
        add_filter('update_plugins_github.com', [$this, 'update'], 10, 4);
        add_filter('plugins_api', [$this, 'information'], 10, 3);
        add_filter('upgrader_pre_download', [$this, 'download'], 50, 4);
        add_filter('upgrader_source_selection', [$this, 'source'], 50, 4);
        add_action('upgrader_process_complete', [$this, 'completed'], 10, 2);
        add_filter('plugin_action_links_' . $this->plugin, [$this, 'links']);
        add_action('admin_post_gta_check_updates', [$this, 'checkNow']);
        add_action('admin_notices', [$this, 'notice']);
    }

    public function clearCache() { delete_site_transient(self::CACHE); }

    /** Only our plugin is handled, even if other plugins also use github.com. */
    public function update($update, $pluginData, $pluginFile, $locales) {
        if ($pluginFile !== $this->plugin) return $update;
        $release = $this->release();
        if (is_wp_error($release)) return $update;
        return ['id' => self::REPOSITORY, 'slug' => self::SLUG, 'version' => $release['version'],
            'url' => $release['url'], 'package' => $release['package'], 'requires' => $release['requires'],
            'requires_php' => $release['requires_php'], 'tested' => $release['tested']];
        // No autoupdate override: the administrator's WordPress setting applies.
    }

    public function information($result, $action, $args) {
        if ($action !== 'plugin_information' || ($args->slug ?? '') !== self::SLUG) return $result;
        $release = $this->release();
        if (is_wp_error($release)) return $result;
        $compatible = !is_wp_error($this->requirements($release));
        return (object) ['name' => 'GravelTube Activities', 'slug' => self::SLUG, 'version' => $release['version'],
            'author' => 'Pascal Kurschildgen', 'homepage' => self::REPOSITORY,
            'requires' => $release['requires'], 'requires_php' => $release['requires_php'], 'tested' => $release['tested'],
            'download_link' => $compatible ? $release['package'] : '',
            'sections' => ['description' => '<p>Tourenkarten und Trainingsdiagramme mit vollständiger FIT-, GPX- und TCX-Speicherung.</p>',
                'changelog' => '<pre>' . esc_html($release['notes']) . '</pre>']];
    }

    /** Cache errors briefly too; failed GitHub requests must not break WordPress. */
    public function release() {
        $cached = get_site_transient(self::CACHE);
        if (is_array($cached) && array_key_exists('result', $cached)) return $cached['result'];
        $result = $this->fetchRelease();
        set_site_transient(self::CACHE, ['result' => $result], is_wp_error($result) ? 900 : 43200);
        return $result;
    }

    private function fetchRelease() {
        $response = $this->request(self::ENDPOINT, 1048576);
        if (is_wp_error($response)) return $response;
        $release = json_decode(wp_remote_retrieve_body($response), true);
        if (!is_array($release) || ($release['draft'] ?? null) !== false || ($release['prerelease'] ?? null) !== false ||
            !is_string($release['tag_name'] ?? null) || strlen($release['tag_name']) > 40 ||
            !preg_match('/^v?((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))$/D', $release['tag_name'], $match)) {
            return $this->error('release', 'GitHub liefert kein gültiges stabiles Release.');
        }
        $version = $match[1];
        $prefix = self::REPOSITORY . '/releases/download/' . $release['tag_name'] . '/';
        $result = ['version' => $version, 'url' => self::REPOSITORY . '/releases/tag/' . $release['tag_name'],
            'notes' => is_string($release['body'] ?? null) ? substr($release['body'], 0, 100000) : '',
            'package' => '', 'sha256' => '', 'size' => 0, 'requires' => '', 'requires_php' => '', 'tested' => ''];
        // Older releases predate the updater manifest. They can still supply details,
        // but are never downloaded or offered as a downgrade.
        if (!version_compare($version, $this->version, '>')) {
            $headers = get_file_data($this->file, ['requires' => 'Requires at least', 'requires_php' => 'Requires PHP']);
            return array_merge($result, $headers);
        }
        $assets = $release['assets'] ?? null;
        if (!is_array($assets)) return $this->error('assets', 'Dem GitHub-Release fehlen die Update-Dateien.');
        $filename = self::SLUG . '-' . $version . '.zip';
        $manifest = $this->asset($assets, self::MANIFEST, $prefix);
        $package = $this->asset($assets, $filename, $prefix);
        if (is_wp_error($manifest)) return $manifest;
        if (is_wp_error($package)) return $package;
        if ($manifest['size'] > 16384 || $package['size'] > self::MAX_PACKAGE) return $this->error('size', 'Die Update-Dateien überschreiten die erlaubte Größe.');
        $response = $this->request($manifest['browser_download_url'], 16384);
        if (is_wp_error($response)) return $response;
        $body = wp_remote_retrieve_body($response);
        if (strlen($body) !== $manifest['size'] || !$this->assetDigest($manifest, hash('sha256', $body))) return $this->error('manifest_hash', 'Die Update-Datei stimmt nicht mit ihrem GitHub-Prüfwert überein.');
        $data = json_decode($body, true);
        if (!is_array($data) || ($data['manifest_version'] ?? null) !== 1 || ($data['version'] ?? '') !== $version ||
            ($data['plugin'] ?? '') !== self::SLUG . '/' . self::MAIN_FILE || ($data['package'] ?? '') !== $package['browser_download_url'] ||
            !is_string($data['sha256'] ?? null) || !preg_match('/^[a-f0-9]{64}$/D', $data['sha256']) ||
            !$this->assetDigest($package, $data['sha256'])) return $this->error('manifest', 'Die Update-Metadaten sind ungültig oder passen nicht zum Release.');
        foreach (['requires', 'requires_php', 'tested'] as $key) {
            if (!is_string($data[$key] ?? null) || !preg_match('/^[0-9]+\.[0-9]+(?:\.[0-9]+)?$/D', $data[$key])) return $this->error('requirements', 'Die Kompatibilitätsangaben des Updates fehlen oder sind ungültig.');
            $result[$key] = $data[$key];
        }
        return array_merge($result, ['package' => $data['package'], 'sha256' => $data['sha256'], 'size' => $package['size']]);
    }

    private function asset($assets, $name, $prefix) {
        $matches = array_values(array_filter($assets, function($asset) use ($name) { return is_array($asset) && ($asset['name'] ?? '') === $name; }));
        if (count($matches) !== 1) return $this->error('asset', 'Dem Release fehlt eine eindeutige Update-Datei: ' . $name);
        $asset = $matches[0];
        if (($asset['state'] ?? '') !== 'uploaded' || !is_int($asset['size'] ?? null) || $asset['size'] < 1 ||
            ($asset['browser_download_url'] ?? '') !== $prefix . $name) return $this->error('asset_url', 'Die Update-Datei gehört nicht zum erwarteten GitHub-Release.');
        return $asset;
    }

    private function assetDigest($asset, $hash) {
        return empty($asset['digest']) || (is_string($asset['digest']) && hash_equals('sha256:' . $hash, $asset['digest']));
    }

    private function requirements($release) {
        global $wp_version;
        if (version_compare($wp_version, $release['requires'], '<') || version_compare(PHP_VERSION, $release['requires_php'], '<')) {
            return $this->error('compatibility', 'Dieses Update benötigt mindestens WordPress ' . $release['requires'] . ' und PHP ' . $release['requires_php'] . '.');
        }
        return true;
    }

    private function ours($extra, $upgrader) {
        return is_array($extra) && ($extra['plugin'] ?? '') === $this->plugin &&
            ($extra['action'] ?? 'update') === 'update' && ($extra['type'] ?? 'plugin') === 'plugin' &&
            ((isset($extra['action'], $extra['type'])) || $upgrader instanceof \Plugin_Upgrader);
    }

    /** Verify the exact release asset before WordPress is allowed to unpack it. */
    public function download($reply, $package, $upgrader, $extra) {
        if (!$this->ours($extra, $upgrader) || is_wp_error($reply)) return $reply;
        $this->pending = null;
        $release = $this->release();
        if (is_wp_error($release)) return $release;
        if (!$release['package'] || $package !== $release['package'] || !version_compare($release['version'], $this->version, '>')) return $this->error('package', 'Das angeforderte Paket ist kein gültiges neueres GitHub-Update dieses Plugins.');
        $compatible = $this->requirements($release);
        if (is_wp_error($compatible)) return $compatible;
        $owned = $reply === false;
        $file = $owned ? wp_tempnam(self::SLUG . '.zip') : $reply;
        if (!is_string($file) || !is_file($file)) return $this->error('temporary', 'Die temporäre Update-Datei konnte nicht angelegt werden.');
        if ($owned) {
            $response = $this->request($package, self::MAX_PACKAGE, $file);
            if (is_wp_error($response)) { wp_delete_file($file); return $response; }
        }
        clearstatcache(true, $file);
        if (filesize($file) !== $release['size'] || !hash_equals($release['sha256'], (string) hash_file('sha256', $file))) {
            if ($owned) wp_delete_file($file);
            return $this->error('checksum', 'Die SHA-256-Prüfsumme des Plugin-Updates stimmt nicht. Das Update wurde abgebrochen.');
        }
        $this->pending = $release;
        return $file;
    }

    /** Validate identity/headers before the existing plugin directory is replaced. */
    public function source($source, $remoteSource, $upgrader, $extra) {
        if (!$this->ours($extra, $upgrader) || is_wp_error($source)) return $source;
        global $wp_filesystem;
        if (!$this->pending || basename(untrailingslashit($source)) !== self::SLUG) return $this->error('layout', 'Das Update enthält nicht den erwarteten Plugin-Ordner.');
        $main = trailingslashit($source) . self::MAIN_FILE;
        if (!$wp_filesystem->is_file($main) || $wp_filesystem->size($main) > 1048576) return $this->error('layout', 'Die Hauptdatei des Plugin-Updates fehlt oder ist ungültig.');
        $contents = $wp_filesystem->get_contents($main);
        if (!is_string($contents)) return $this->error('headers', 'Die Plugin-Kopfdaten des Updates konnten nicht gelesen werden.');
        $temporary = wp_tempnam('gta-update-headers');
        if (!$temporary) return $this->error('headers', 'Die Plugin-Kopfdaten des Updates konnten nicht gelesen werden.');
        $written = file_put_contents($temporary, substr($contents, 0, 8192));
        $headers = $written === false ? [] : get_file_data($temporary, ['version' => 'Version', 'requires' => 'Requires at least', 'requires_php' => 'Requires PHP', 'uri' => 'Update URI']);
        wp_delete_file($temporary);
        if (($headers['version'] ?? '') !== $this->pending['version'] || ($headers['uri'] ?? '') !== self::REPOSITORY ||
            ($headers['requires'] ?? '') !== $this->pending['requires'] || ($headers['requires_php'] ?? '') !== $this->pending['requires_php']) return $this->error('headers', 'Plugin-Version, Updatequelle oder Systemanforderungen passen nicht zu den Update-Metadaten.');
        return $source;
    }

    private function allowedUrl($url) {
        $parts = wp_parse_url($url);
        if (!is_array($parts) || ($parts['scheme'] ?? '') !== 'https' || isset($parts['user']) || isset($parts['pass']) || isset($parts['fragment']) || (isset($parts['port']) && $parts['port'] !== 443)) return false;
        $host = strtolower($parts['host'] ?? '');
        if ($host === 'api.github.com') return $url === self::ENDPOINT;
        if ($host === 'github.com') return strpos($url, self::REPOSITORY . '/releases/download/') === 0;
        return in_array($host, ['release-assets.githubusercontent.com', 'objects.githubusercontent.com', 'github-releases.githubusercontent.com'], true);
    }

    private function request($url, $limit, $file = null) {
        for ($redirects = 0; $redirects <= 5; $redirects++) {
            if (!$this->allowedUrl($url)) return $this->error('host', 'Die Update-Anfrage würde GitHub oder HTTPS verlassen.');
            $args = ['timeout' => $file ? 60 : 10, 'redirection' => 0, 'sslverify' => true,
                'limit_response_size' => $limit + 1, 'user-agent' => 'GravelTube-Activities-Updater/' . $this->version,
                'headers' => ['Accept' => strpos($url, 'https://api.github.com/') === 0 ? 'application/vnd.github+json' : 'application/octet-stream', 'X-GitHub-Api-Version' => '2026-03-10']];
            if ($file) { $args['stream'] = true; $args['filename'] = $file; }
            $response = wp_safe_remote_get($url, $args);
            if (is_wp_error($response)) return $this->error('network', 'GitHub konnte für die Updateprüfung nicht erreicht werden.');
            $status = wp_remote_retrieve_response_code($response);
            if (in_array($status, [301, 302, 303, 307, 308], true)) {
                $url = wp_remote_retrieve_header($response, 'location');
                if (!is_string($url)) return $this->error('redirect', 'GitHub lieferte eine ungültige Weiterleitung.');
                continue;
            }
            if ($status !== 200) return $this->error('http', 'GitHub antwortet bei der Updateprüfung mit HTTP ' . (int) $status . '.');
            if ($file) clearstatcache(true, $file);
            $size = $file ? filesize($file) : strlen(wp_remote_retrieve_body($response));
            if ($size > $limit) return $this->error('size', 'Die Update-Antwort überschreitet die erlaubte Größe.');
            return $response;
        }
        return $this->error('redirect', 'GitHub lieferte zu viele Weiterleitungen.');
    }

    private function error($code, $message) { return new \WP_Error('gta_update_' . $code, $message); }

    public function completed($upgrader, $extra) {
        if (($extra['type'] ?? '') === 'plugin' && ($extra['action'] ?? '') === 'update' &&
            (($extra['plugin'] ?? '') === $this->plugin || in_array($this->plugin, (array) ($extra['plugins'] ?? []), true))) $this->clearCache();
    }

    public function links($links) {
        if (current_user_can('update_plugins')) $links[] = '<a href="' . esc_url(wp_nonce_url(admin_url('admin-post.php?action=gta_check_updates'), 'gta_check_updates')) . '">GitHub-Update prüfen</a>';
        return $links;
    }

    public function checkNow() {
        if (!current_user_can('update_plugins')) wp_die('Keine Berechtigung.', '', ['response' => 403]);
        check_admin_referer('gta_check_updates');
        $this->clearCache();
        delete_site_transient('update_plugins');
        wp_clean_plugins_cache(false);
        wp_update_plugins();
        $release = $this->release();
        $message = is_wp_error($release) ? $release->get_error_message() :
            (version_compare($release['version'], $this->version, '>') ? 'GitHub-Version ' . $release['version'] . ' ist verfügbar.' : 'Keine neuere stabile GitHub-Version verfügbar.');
        if (!is_wp_error($release) && is_wp_error($this->requirements($release))) $message = $this->requirements($release)->get_error_message();
        set_transient('gta_update_notice_' . get_current_user_id(), $message, 60);
        wp_safe_redirect(admin_url('plugins.php'));
        exit;
    }

    public function notice() {
        if (!current_user_can('update_plugins')) return;
        $key = 'gta_update_notice_' . get_current_user_id();
        $message = get_transient($key);
        if (is_string($message) && $message !== '') {
            delete_transient($key);
            echo '<div class="notice notice-info is-dismissible"><p>' . esc_html($message) . '</p></div>';
        }
    }
}
