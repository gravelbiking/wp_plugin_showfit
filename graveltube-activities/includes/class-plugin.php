<?php
namespace GravelTube\Activities;

final class Plugin {
    private static $file;

    public static function boot($file) {
        self::$file = $file;
        add_action('init', [__CLASS__, 'register']);
        add_action('rest_api_init', [__CLASS__, 'routes']);
        add_action('admin_menu', [__CLASS__, 'menu']);
        add_action('admin_init', [__CLASS__, 'settings']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'adminAssets']);
        add_action('wp_enqueue_scripts', [__CLASS__, 'pageAssets']);
        add_action('add_meta_boxes_gta_activity', [__CLASS__, 'metaBoxes']);
        add_action('save_post_gta_activity', [__CLASS__, 'saveVisibility']);
        add_action('admin_post_gta_download', [__CLASS__, 'download']);
        add_action('wp_footer', function() {
            if (wp_style_is('gta-view', 'enqueued') && !wp_style_is('gta-view', 'done')) wp_print_styles(['gta-leaflet', 'gta-view']);
        }, 5);
    }

    public static function register() {
        register_post_type('gta_activity', ['label' => 'Aktivitäten', 'labels' => ['name' => 'Aktivitäten', 'singular_name' => 'Aktivität', 'add_new_item' => 'Aktivität anlegen'],
            'public' => false, 'publicly_queryable' => false, 'show_ui' => true, 'show_in_rest' => false,
            'menu_icon' => 'dashicons-chart-line', 'supports' => ['title', 'author'], 'map_meta_cap' => true, 'capability_type' => 'post']);
        $url = plugin_dir_url(self::$file);
        wp_register_style('gta-leaflet', $url . 'assets/vendor/leaflet/leaflet.css', [], '1.9.4');
        wp_register_style('gta-view', $url . 'assets/viewer.css', ['gta-leaflet'], GTA_VERSION);
        wp_register_script('gta-leaflet', $url . 'assets/vendor/leaflet/leaflet.js', [], '1.9.4', true);
        wp_add_inline_script('gta-leaflet', 'window.GTALeaflet=window.L.noConflict();');
        wp_register_script('gta-chart', $url . 'assets/vendor/chart.js', [], '4.6.1-gta-0.6.5', true);
        wp_add_inline_script('gta-chart', 'window.__gtaPreviousChart=window.Chart;', 'before');
        wp_add_inline_script('gta-chart', 'window.GTAChart=window.Chart;window.Chart=window.__gtaPreviousChart;delete window.__gtaPreviousChart;');
        wp_register_script('gta-view', $url . 'assets/viewer.js', ['gta-leaflet', 'gta-chart'], GTA_VERSION, true);
        wp_register_script('gta-editor', $url . 'assets/editor.js', ['wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-api-fetch'], GTA_VERSION, true);
        wp_add_inline_script('gta-editor', 'window.GTAEditorConfig=' . wp_json_encode([
            'fields' => Presentation::fields(), 'defaultFields' => self::defaultFields(), 'types' => Presentation::types(),
            'privateOutdoorDefault' => (bool) get_option('gta_private_outdoor_default', false)
        ]) . ';', 'before');
        register_block_type(dirname(self::$file), ['render_callback' => function($attr) { return self::render($attr); }]);
        add_shortcode('graveltube_activity', function($attributes) {
            $a = shortcode_atts(['id' => 0, 'map' => 'yes', 'altitude' => 'yes', 'power' => 'yes', 'heart_rate' => 'yes', 'cadence' => 'yes', 'type' => 'auto', 'fields' => '', 'device' => 'auto', 'private_map' => 'inherit'], $attributes);
            $options = ['activityId' => absint($a['id']), 'activityType' => Presentation::type($a['type'])];
            $options['privateMap'] = RoutePrivacy::mode($a['private_map']);
            if ($a['fields'] !== '') $options['fields'] = array_fill_keys(array_filter(array_map('trim', explode(',', $a['fields']))), true) + array_fill_keys(array_keys(Presentation::fields()), false);
            $options['deviceVisibility'] = Presentation::deviceMode($a['device']);
            // A shortcode field list is an explicit selection, including the recorder field.
            if ($a['fields'] !== '' && $options['deviceVisibility'] === 'auto') $options['deviceVisibility'] = !empty($options['fields']['device']) ? 'show' : 'hide';
            foreach (['map' => 'showMap', 'altitude' => 'showAltitude', 'power' => 'showPower', 'heart_rate' => 'showHeartRate', 'cadence' => 'showCadence'] as $key => $target) $options[$target] = !in_array(strtolower((string) $a[$key]), ['no', 'false', '0'], true);
            return self::render($options);
        });
    }

    public static function visibility($id) {
        return array_merge(['map' => true, 'power' => true, 'heartRate' => true, 'cadence' => true], (array) get_post_meta($id, '_gta_visibility', true));
    }

    public static function canRead($id) {
        $post = get_post($id);
        return $post && $post->post_type === 'gta_activity' &&
            (($post->post_status === 'publish' && $post->post_password === '') || current_user_can('edit_post', $id));
    }

    public static function canEdit($request) {
        $id = absint($request['id'] ?? 0);
        if ($id) return get_post_type($id) === 'gta_activity' && current_user_can('edit_post', $id) && current_user_can('upload_files');
        return current_user_can('edit_posts') && current_user_can('upload_files');
    }

    public static function routes() {
        register_rest_route('gta/v1', '/activities', [
            ['methods' => 'GET', 'permission_callback' => function() { return current_user_can('edit_posts'); }, 'callback' => [__CLASS__, 'listing']],
            ['methods' => 'POST', 'permission_callback' => [__CLASS__, 'canEdit'], 'callback' => [__CLASS__, 'import']]
        ]);
        register_rest_route('gta/v1', '/activities/(?P<id>\d+)', [
            ['methods' => 'GET', 'permission_callback' => function($request) { return self::canRead(absint($request['id'])); }, 'callback' => [__CLASS__, 'get']],
            ['methods' => 'POST', 'permission_callback' => [__CLASS__, 'canEdit'], 'callback' => [__CLASS__, 'import']]
        ]);
    }

    public static function listing($request) {
        $posts = get_posts(['post_type' => 'gta_activity', 'post_status' => ['publish', 'draft', 'private', 'pending'],
            'numberposts' => 100, 'offset' => max(0, (int) ($request['offset'] ?? 0)), 'orderby' => 'date', 'order' => 'DESC']);
        $list = [];
        foreach ($posts as $post) if (current_user_can('edit_post', $post->ID)) $list[] = ['id' => $post->ID, 'title' => $post->post_title, 'status' => $post->post_status];
        $response = rest_ensure_response($list); $response->header('Cache-Control', 'private, no-store'); return $response;
    }

    public static function get($request) {
        $id = absint($request['id']);
        try {
            $stored = Storage::read($id);
            $presentation = Presentation::detect($stored);
            $type = Presentation::type(get_post_meta($id, '_gta_activity_type', true));
            $presentation['type'] = $type === 'auto' ? $presentation['suggestedType'] : $type;
            $context = null;
            if (!empty($request['post']) && !empty($request['view'])) $context = MapView::resolve(absint($request['post']), $request['view'], $id);
            $editor = current_user_can('edit_post', $id);
            if (!$context && (!empty($request['post']) || !empty($request['view'])) && !$editor) return new \WP_Error('gta_view', 'Diese Aktivitätseinbindung ist nicht öffentlich verfügbar.', ['status' => 404]);
            if (!$context && $editor) $context = MapView::config(['activityId' => $id, 'activityType' => $request['type'] ?? 'auto', 'privateMap' => $request['private_map'] ?? 'inherit']) + ['canReveal' => true];
            $visibility = self::visibility($id);
            // Unscoped anonymous API calls never reveal GPS. Query parameters alone cannot disable privacy.
            if (!$context || empty($context['canReveal'])) $visibility['map'] = false;
            if ($context && $context['activityType'] !== 'auto') $presentation['type'] = $context['activityType'];
            $presentation['label'] = Presentation::types()[$presentation['type']];
            $private = RoutePrivacy::enabled($presentation['type'], $context['privateMap'] ?? 'inherit', (bool) get_option('gta_private_outdoor_default', false));
            $data = RoutePrivacy::redact(Activity::publicData($stored, $visibility), $private);
            $data['presentation'] = $presentation;
            $data['id'] = $id; $data['title'] = get_post_field('post_title', $id, 'raw'); $data['status'] = get_post_status($id);
            if ($editor) $data['titleSuggestion'] = ActivityTitle::suggest($stored, $stored['provenance']['filename'] ?? 'Aktivität');
            $data['services'] = ['osmEnabled' => (bool) get_option('gta_osm_enabled', false)];
            $data['startLabel'] = $data['summary']['start'] !== null ? wp_date('d.m.Y', (int) $data['summary']['start']) : null;
            $response = rest_ensure_response($data);
            $response->header('Cache-Control', 'private, no-store, max-age=0');
            $response->header('Vary', 'Cookie');
            return $response;
        } catch (\Throwable $error) {
            return new \WP_Error('gta_read', 'Die Aktivitätsdaten konnten nicht geladen werden.', ['status' => 500]);
        }
    }

    public static function import($request) {
        $id = absint($request['id'] ?? 0); $created = false; $locked = false;
        try {
            if (!function_exists('gzencode')) throw new \RuntimeException('Die PHP-Erweiterung zlib fehlt.');
            $files = $request->get_file_params(); $file = $files['source'] ?? null;
            if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) throw new \InvalidArgumentException('Keine vollständige Datei empfangen. Bitte PHP-Upload- und POST-Limit prüfen.');
            if (filesize($file['tmp_name']) > 20 * 1024 * 1024) throw new \InvalidArgumentException('Originaldatei ist größer als 20 MiB.');
            $filename = sanitize_file_name($file['name']); $format = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            if (!in_array($format, ['fit', 'gpx', 'tcx'], true)) throw new \InvalidArgumentException('Nur FIT, GPX und TCX sind erlaubt.');
            $params = $request->get_body_params(); $json = $params['activity'] ?? '';
            if (!is_string($json) || strlen($json) > 80 * 1024 * 1024) throw new \InvalidArgumentException('Messdaten fehlen oder sind größer als 80 MiB.');
            $input = json_decode($json, true, 128);
            if (!is_array($input) || ($input['format'] ?? '') !== $format) throw new \InvalidArgumentException('Messdaten und Dateiformat stimmen nicht überein.');
            $source = file_get_contents($file['tmp_name']);
            if ($source === false || $source === '') throw new \InvalidArgumentException('Leere oder unlesbare Originaldatei.');
            if ($format === 'fit' && (strlen($source) < 14 || substr($source, 8, 4) !== '.FIT')) throw new \InvalidArgumentException('Ungültiger FIT-Header.');
            if ($format !== 'fit' && preg_match('/<!\s*(DOCTYPE|ENTITY)/i', $source)) throw new \InvalidArgumentException('XML mit DTD oder Entitäten ist nicht erlaubt.');
            $data = Activity::normalise($input);
            $suggestion = ActivityTitle::suggest($data, $filename);
            $manualTitle = sanitize_text_field($params['title'] ?? '');
            if ($id) {
                $key = 'gta_import_lock_' . $id;
                $since = get_option($key, 0);
                if ($since && $since < time() - 600) delete_option($key);
                $locked = add_option($key, time(), '', false);
                if (!$locked) return new \WP_Error('gta_busy', 'Für diese Aktivität läuft bereits ein Import.', ['status' => 409]);
            } else {
                $id = wp_insert_post(['post_type' => 'gta_activity', 'post_status' => 'draft', 'post_title' => $manualTitle !== '' ? $manualTitle : $suggestion['title'], 'post_author' => get_current_user_id()], true);
                if (is_wp_error($id)) return $id;
                $created = true;
            }
            $data['provenance'] = ['sourceHash' => hash('sha256', $source), 'filename' => $filename, 'importedAt' => gmdate('c'), 'pluginVersion' => GTA_VERSION];
            Storage::write($id, $data, $source, $filename);
            $status = get_post_status($id);
            if ($status === 'auto-draft' || trim(get_post_field('post_title', $id, 'raw')) === '') {
                $updated = wp_update_post(['ID' => $id, 'post_status' => $status === 'auto-draft' ? 'draft' : $status,
                    'post_title' => $manualTitle !== '' ? $manualTitle : $suggestion['title']], true);
                if (is_wp_error($updated)) throw new \RuntimeException('Entwurf konnte nicht gespeichert werden.');
            }
            $response = new \WP_REST_Response(['id' => $id, 'title' => get_post_field('post_title', $id, 'raw'), 'titleSuggestion' => $suggestion, 'records' => count($data['records']),
                'status' => get_post_status($id), 'editUrl' => get_edit_post_link($id, 'raw'),
                'previewEndpoint' => rest_url('gta/v1/activities/' . $id), 'presentation' => Presentation::detect($data),
                'downloads' => self::downloadLinks($id)], $created ? 201 : 200);
            $response->header('Cache-Control', 'private, no-store');
            return $response;
        } catch (\Throwable $error) {
            if ($created && $id) wp_delete_post($id, true);
            return new \WP_Error('gta_import', $error instanceof \InvalidArgumentException ? $error->getMessage() : 'Speichern fehlgeschlagen. Bitte Serverprotokoll und Datenbankkapazität prüfen.', ['status' => $error instanceof \InvalidArgumentException ? 400 : 500]);
        } finally {
            if ($locked && $id) delete_option('gta_import_lock_' . $id);
        }
    }

    public static function viewAssets() {
        wp_enqueue_style('gta-view'); wp_enqueue_script('gta-view');
        // Header cookie authentication is needed to preview drafts; never cache a private response.
        if (is_user_logged_in()) wp_add_inline_script('gta-view', 'window.GTAViewNonce=' . wp_json_encode(wp_create_nonce('wp_rest')) . ';', 'before');
    }

    public static function pageAssets() {
        global $wp_query;
        foreach ((array) ($wp_query->posts ?? []) as $post) if (has_block('graveltube/activity', $post->post_content) || has_shortcode($post->post_content, 'graveltube_activity')) { self::viewAssets(); break; }
    }

    public static function render($attributes) {
        $id = absint($attributes['activityId'] ?? 0);
        if (!$id || !self::canRead($id)) return '<p class="gta-message">Diese Aktivität ist noch nicht veröffentlicht oder nicht verfügbar.</p>';
        self::viewAssets();
        $options = [];
        foreach (['showMap', 'showAltitude', 'showPower', 'showHeartRate', 'showCadence'] as $key) $options[$key] = !isset($attributes[$key]) || (bool) $attributes[$key];
        $options['activityType'] = Presentation::type($attributes['activityType'] ?? 'auto');
        $options['deviceVisibility'] = Presentation::deviceMode($attributes['deviceVisibility'] ?? 'auto');
        $options['privateMap'] = RoutePrivacy::mode($attributes['privateMap'] ?? 'inherit');
        // Legacy fields keep their selection; recorder auto visibility also depends on activity type.
        $options['fields'] = Presentation::fieldVisibility($attributes['fields'] ?? []);
        $endpoint = add_query_arg(['post' => (int) get_the_ID(), 'view' => MapView::key($attributes), 'type' => $options['activityType'], 'private_map' => $options['privateMap']], rest_url('gta/v1/activities/' . $id));
        return '<section id="' . esc_attr(wp_unique_id('gta-activity-')) . '" class="gta-activity" data-gta-endpoint="' . esc_url($endpoint) . '" data-gta-options="' . esc_attr(wp_json_encode($options)) . '" aria-label="' . esc_attr(get_the_title($id)) . '"><p class="gta-status" role="status">Aktivität wird geladen …</p><noscript>Für Karte und Trainingsdiagramme bitte JavaScript aktivieren.</noscript></section>';
    }

    public static function menu() {
        add_submenu_page('edit.php?post_type=gta_activity', 'Aktivität importieren', 'Importieren', 'upload_files', 'gta-import', [__CLASS__, 'importPage']);
        add_submenu_page('edit.php?post_type=gta_activity', 'Externe Karten', 'Externe Karten', 'manage_options', 'gta-services', [__CLASS__, 'servicesPage']);
        add_submenu_page('edit.php?post_type=gta_activity', 'Anzeigeeinstellungen', 'Anzeige', 'manage_options', 'gta-display', [__CLASS__, 'displayPage']);
    }

    public static function settings() {
        register_setting('gta_display', 'gta_default_fields', ['type' => 'object', 'default' => Presentation::fieldVisibility([]),
            'sanitize_callback' => function($value) { return Presentation::fieldVisibility($value, false); }]);
        register_setting('gta_display', 'gta_private_outdoor_default', ['type' => 'boolean', 'default' => false,
            'sanitize_callback' => function($value) { return in_array($value, [true, 1, '1'], true); }]);
        register_setting('gta_services', 'gta_osm_enabled', ['type' => 'boolean', 'default' => false,
            'sanitize_callback' => function($value) { return $value === '1' || $value === 1 || $value === true; }]);
        if (function_exists('wp_add_privacy_policy_content')) wp_add_privacy_policy_content('GravelTube Activities',
            '<p>GravelTube Activities speichert importierte Trainingsdateien und Messdaten in der WordPress-Datenbank. Veröffentlichte Aktivitäten geben die vom Betreiber ausgewählten Messwerte frei.</p>' .
            '<p>Bei aktiviertem privaten Outdoor-Kartenmodus werden GPS-Koordinaten der ersten und letzten 500 Meter sowie der Start-/Zielumgebung in der betreffenden öffentlichen Einbindung ausgeblendet. Vollständige Originaldaten bleiben im geschützten Archiv und in Backups erhalten. Eine andere Einbindung ohne diesen Modus kann die vollständige Strecke weiterhin zeigen.</p>' .
            '<p>OpenStreetMap-Karten sind standardmäßig deaktiviert. Wenn der Betreiber den Dienst aktiviert, werden Kartenkacheln erst nach einem ausdrücklichen Klick des Besuchers für die jeweilige Ansicht geladen. Dabei erhält die OpenStreetMap Foundation unter anderem IP-Adresse, Browserinformationen, den Website-Ursprung als Referrer und die angefragten Kartenausschnitte. FIT-Dateien, Leistung, Herzfrequenz und Kadenz werden nicht an den Kartendienst übertragen. Es werden dafür keine Einwilligungs-Cookies oder Einträge im Browserspeicher angelegt. Das Schließen der Karte beendet weitere Kartenanfragen dieser Ansicht; bereits übertragene Anfragen werden dadurch nicht rückgängig gemacht.</p>' .
            '<p>Weitere Informationen: <a href="https://osmfoundation.org/wiki/Privacy_Policy">Datenschutzerklärung der OpenStreetMap Foundation</a>. Dieser Textvorschlag muss an den konkreten Websitebetrieb und dessen weitere Dienste angepasst werden.</p>');
    }

    public static function defaultFields() {
        return Presentation::fieldVisibility(get_option('gta_default_fields', []));
    }

    public static function displayPage() {
        if (!current_user_can('manage_options')) return;
        $values = self::defaultFields();
        echo '<div class="wrap"><h1>Anzeigeeinstellungen</h1><p>Diese Datenfelder sind bei neu eingefügten Aktivitätsblöcken vorausgewählt. Gespeicherte Blockauswahlen bleiben erhalten. Ohne eigene Einstellung sind alle Felder aktiviert.</p><p>Bei ROUVY und Zwift wird das Device automatisch ausgeblendet. Im Block kann es ausdrücklich wieder eingeschaltet werden.</p><form method="post" action="options.php">';
        settings_fields('gta_display');
        foreach (Presentation::fields() as $key => $label) echo '<input type="hidden" name="gta_default_fields[' . esc_attr($key) . ']" value="0"><p><label><input type="checkbox" name="gta_default_fields[' . esc_attr($key) . ']" value="1" ' . checked($values[$key], true, false) . '> ' . esc_html($label) . '</label></p>';
        echo '<h2>Privater Outdoor-Kartenmodus</h2><input type="hidden" name="gta_private_outdoor_default" value="0"><p><label><input type="checkbox" name="gta_private_outdoor_default" value="1" ' . checked((bool) get_option('gta_private_outdoor_default', false), true, false) . '> Privaten Kartenmodus für Outdoor-Aktivitäten standardmäßig aktivieren</label></p><p>Blendet die ersten und letzten 500 Meter sowie GPS-Punkte im 500-Meter-Bereich um Start und Ziel aus. Die Vorgabe gilt auch für bestehende Blöcke mit „Plugin-Vorgabe“. Jeder Block kann ausdrücklich ein- oder ausgeschaltet werden. Originaldateien und Trainingswerte bleiben vollständig erhalten.</p>';
        submit_button('Anzeige speichern');
        echo '</form></div>';
    }

    public static function servicesPage() {
        if (!current_user_can('manage_options')) return;
        echo '<div class="wrap"><h1>Externe Karten</h1><p>Trainingsdiagramme und gespeicherte Messdaten funktionieren unabhängig vom Kartendienst.</p>';
        echo '<form method="post" action="options.php">';
        settings_fields('gta_services');
        echo '<input type="hidden" name="gta_osm_enabled" value="0"><p><label><input type="checkbox" name="gta_osm_enabled" value="1" ' . checked((bool) get_option('gta_osm_enabled', false), true, false) . '> OpenStreetMap-Karten für diese Website freigeben</label></p>';
        echo '<p>Auch nach dieser Freigabe wird eine Karte erst geladen, wenn der Besucher bei der betreffenden Aktivität auf „OpenStreetMap laden“ klickt. Diese Zustimmung wird nicht dauerhaft gespeichert.</p>';
        echo '<p>Anbieter: OpenStreetMap Foundation. Übertragen werden insbesondere IP-Adresse, Browserinformationen, Website-Ursprung und angefragte Kartenausschnitte. Die Originaldatei und die Sensorwerte bleiben beim Websitebetreiber.</p>';
        echo '<p><a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer">Datenschutzerklärung</a> · <a href="https://operations.osmfoundation.org/policies/tiles/" target="_blank" rel="noopener noreferrer">Nutzungsbedingungen der Kartenkacheln</a></p>';
        submit_button('Freigabe speichern');
        echo '</form><h2>Quellcode und Lizenzen</h2><p>Dieses Plugin enthält seine JavaScript-/PHP-Quellen, <code>package.json</code>, <code>package-lock.json</code>, <code>BUILD.md</code> und die Originalquellen der Laufzeitbibliotheken unter <code>source/vendor/</code>. Bei Weitergabe des vollständigen Plugin-ZIPs werden diese Dateien mitgeliefert.</p></div>';
    }

    public static function adminAssets($hook) {
        if (strpos($hook, 'gta-import') === false && !in_array($hook, ['post.php', 'post-new.php'], true)) return;
        if (strpos($hook, 'gta-import') !== false || get_post_type() === 'gta_activity') {
            wp_enqueue_script('gta-editor'); self::viewAssets();
            wp_add_inline_script('gta-editor', 'window.GTAConfig=' . wp_json_encode(['root' => rest_url('gta/v1/'), 'nonce' => wp_create_nonce('wp_rest')]) . ';', 'before');
        }
    }

    public static function importPage() {
        if (!current_user_can('edit_posts') || !current_user_can('upload_files')) return;
        echo '<div class="wrap"><h1>Aktivität importieren</h1><p>FIT, GPX oder TCX auswählen. Die Datei wird sofort eingelesen, gespeichert und unten angezeigt. Neue Aktivitäten sind zunächst Entwürfe.</p><div class="gta-import-area"><div class="gta-import" data-gta-import="0"></div><div data-gta-preview></div></div></div>';
    }

    public static function metaBoxes() {
        add_meta_box('gta-preview', 'Aktivität und Import', [__CLASS__, 'activityBox'], 'gta_activity', 'normal', 'high');
        add_meta_box('gta-public', 'Öffentliche Messwerte', [__CLASS__, 'visibilityBox'], 'gta_activity', 'side');
        add_meta_box('gta-origin', 'Aktivitätsart und Device', [__CLASS__, 'originBox'], 'gta_activity', 'side');
    }

    public static function originBox($post) {
        wp_nonce_field('gta_origin', 'gta_origin_nonce');
        $type = Presentation::type(get_post_meta($post->ID, '_gta_activity_type', true));
        echo '<p><label for="gta-activity-type">Aktivitätsart</label></p><select id="gta-activity-type" name="gta_activity_type" style="max-width:100%">';
        foreach (Presentation::types() as $key => $label) echo '<option value="' . esc_attr($key) . '" ' . selected($type, $key, false) . '>' . esc_html($label) . '</option>';
        echo '</select>';
        echo '<div data-gta-origin>';
        try {
            if (get_post_meta($post->ID, '_gta_storage', true)) {
                $suggestion = Presentation::detect(Storage::read($post->ID));
                echo '<p>Vorschlag: <strong>' . esc_html($suggestion['suggestedLabel']) . '</strong><br>' . esc_html($suggestion['reason']) . '</p><p>Device: <strong>' . esc_html($suggestion['device']) . '</strong></p>';
            }
        } catch (\Throwable $error) { echo '<p>Herkunft konnte nicht gelesen werden.</p>'; }
        echo '</div><p>Gilt als Vorgabe für diese Aktivität. Im Beitragsblock kann die Art separat geändert werden.</p>';
    }

    private static function downloadLinks($id) {
        $links = [];
        foreach (['source' => 'Originaldatei', 'data' => 'Vollständiges Datenarchiv (JSON)'] as $kind => $label) {
            $links[] = ['label' => $label, 'url' => add_query_arg(['action' => 'gta_download', 'id' => $id, 'kind' => $kind, '_wpnonce' => wp_create_nonce('gta_download_' . $id)], admin_url('admin-post.php'))];
        }
        return $links;
    }

    public static function activityBox($post) {
        echo '<p>Einbindung: <code>[graveltube_activity id="' . (int) $post->ID . '"]</code> oder mit dem Block „GravelTube Aktivität“.</p>';
        $hasData = (bool) get_post_meta($post->ID, '_gta_storage', true);
        $titleSuggestion = null;
        if ($hasData) {
            try {
                $stored = Storage::read($post->ID);
                $titleSuggestion = ActivityTitle::suggest($stored, $stored['provenance']['filename'] ?? 'Aktivität');
            } catch (\Throwable $error) { /* The preview already reports an unreadable archive. */ }
        }
        echo '<div data-gta-downloads>';
        if ($hasData) foreach (self::downloadLinks($post->ID) as $link) echo '<p><a href="' . esc_url($link['url']) . '">' . esc_html($link['label']) . ' herunterladen</a> (nur mit Bearbeitungsrecht)</p>';
        echo '</div><h3>Datei einlesen</h3><p>Nach der Dateiauswahl werden die Daten automatisch eingelesen, gespeichert und angezeigt. Eine weitere Dateiauswahl aktualisiert die Daten dieser Aktivität.</p><div class="gta-import-area"><div data-gta-title-suggestion data-gta-suggestion="' . esc_attr(wp_json_encode($titleSuggestion)) . '"></div><div class="gta-import" data-gta-import="' . (int) $post->ID . '"></div><div data-gta-preview>';
        if ($hasData) echo self::render(['activityId' => $post->ID]);
        echo '</div></div>';
    }

    public static function visibilityBox($post) {
        wp_nonce_field('gta_visibility', 'gta_visibility_nonce');
        $values = self::visibility($post->ID);
        foreach (['map' => 'GPS-Strecke', 'power' => 'Leistung', 'heartRate' => 'Herzfrequenz', 'cadence' => 'Kadenz'] as $key => $label) echo '<p><label><input type="checkbox" name="gta_public[' . esc_attr($key) . ']" value="1" ' . checked(!empty($values[$key]), true, false) . '> ' . esc_html($label) . '</label></p>';
        echo '<p>Diese Auswahl filtert auch die öffentliche Datenschnittstelle. Blockoptionen ändern nur die Darstellung. Originale und vollständige Archive bleiben geschützt.</p>';
    }

    public static function saveVisibility($id) {
        if (!wp_is_post_revision($id) && current_user_can('edit_post', $id) && isset($_POST['gta_origin_nonce']) && wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['gta_origin_nonce'])), 'gta_origin')) {
            update_post_meta($id, '_gta_activity_type', Presentation::type(wp_unslash($_POST['gta_activity_type'] ?? 'auto')));
        }
        if (wp_is_post_revision($id) || !current_user_can('edit_post', $id) || !isset($_POST['gta_visibility_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['gta_visibility_nonce'])), 'gta_visibility')) return;
        $input = isset($_POST['gta_public']) && is_array($_POST['gta_public']) ? $_POST['gta_public'] : [];
        $values = []; foreach (['map', 'power', 'heartRate', 'cadence'] as $key) $values[$key] = !empty($input[$key]);
        update_post_meta($id, '_gta_visibility', $values);
    }

    public static function download() {
        $id = absint($_GET['id'] ?? 0);
        if (get_post_type($id) !== 'gta_activity' || !current_user_can('edit_post', $id)) wp_die('Kein Zugriff.', '', ['response' => 403]);
        check_admin_referer('gta_download_' . $id);
        $kind = ($_GET['kind'] ?? '') === 'source' ? 'source' : 'data';
        try {
            $data = Storage::read($id, $kind); $manifest = get_post_meta($id, '_gta_storage', true);
            $filename = $kind === 'source' ? $manifest['filename'] : 'activity-' . $id . '.json';
            nocache_headers(); header('X-Content-Type-Options: nosniff');
            header('Content-Type: ' . ($kind === 'source' ? 'application/octet-stream' : 'application/json; charset=utf-8'));
            header('Content-Disposition: attachment; filename="' . sanitize_file_name($filename) . '"');
            echo $kind === 'source' ? $data : wp_json_encode($data, JSON_INVALID_UTF8_SUBSTITUTE);
        } catch (\Throwable $error) { wp_die('Daten konnten nicht gelesen werden.', '', ['response' => 500]); }
        exit;
    }
}
