<?php
namespace GravelTube\Activities;

/** Chunked private post meta avoids web-accessible source files and oversized DB packets. */
final class Storage {
    public static function write($id, array $data, $source, $filename) {
        $old = get_post_meta($id, '_gta_storage', true);
        $version = str_replace('-', '', wp_generate_uuid4());
        $json = wp_json_encode($data, JSON_INVALID_UTF8_SUBSTITUTE);
        if ($json === false) throw new \RuntimeException('Aktivitätsdaten konnten nicht serialisiert werden.');
        $manifest = ['version' => $version, 'filename' => $filename, 'hash' => hash('sha256', $source), 'counts' => []];
        try {
            foreach (['data' => $json, 'source' => $source] as $kind => $value) {
                $compressed = gzencode($value, 6);
                if ($compressed === false) throw new \RuntimeException('Komprimierung fehlgeschlagen.');
                $chunks = str_split(base64_encode($compressed), 256 * 1024);
                $manifest['counts'][$kind] = count($chunks);
                foreach ($chunks as $i => $chunk) {
                    if (!add_post_meta($id, '_gta_' . $version . '_' . $kind . '_' . $i, $chunk, true)) throw new \RuntimeException('Speichern der Messdaten fehlgeschlagen.');
                }
            }
            // The manifest is the commit point. Incomplete new chunks never replace existing data.
            if (!update_post_meta($id, '_gta_storage', $manifest)) throw new \RuntimeException('Speichern des Datenverzeichnisses fehlgeschlagen.');
        } catch (\Throwable $error) {
            self::clean($id, $manifest);
            throw $error;
        }
        if (is_array($old)) self::clean($id, $old);
        return $manifest;
    }

    private static function clean($id, array $manifest) {
        foreach ($manifest['counts'] ?? [] as $kind => $count) for ($i = 0; $i < $count; $i++) {
            delete_post_meta($id, '_gta_' . $manifest['version'] . '_' . $kind . '_' . $i);
        }
    }

    public static function read($id, $kind = 'data') {
        $manifest = get_post_meta($id, '_gta_storage', true);
        if (!is_array($manifest) || !isset($manifest['counts'][$kind])) throw new \RuntimeException('Keine importierten Aktivitätsdaten vorhanden.');
        $encoded = '';
        for ($i = 0; $i < $manifest['counts'][$kind]; $i++) {
            $chunk = get_post_meta($id, '_gta_' . $manifest['version'] . '_' . $kind . '_' . $i, true);
            if (!is_string($chunk) || $chunk === '') throw new \RuntimeException('Gespeicherte Aktivitätsdaten sind unvollständig.');
            $encoded .= $chunk;
        }
        $compressed = base64_decode($encoded, true);
        $decoded = $compressed !== false ? gzdecode($compressed) : false;
        if ($decoded === false) throw new \RuntimeException('Gespeicherte Aktivitätsdaten konnten nicht gelesen werden.');
        if ($kind === 'source') return $decoded;
        $data = json_decode($decoded, true);
        if (!is_array($data)) throw new \RuntimeException('Ungültiger gespeicherter Datensatz.');
        return $data;
    }
}
