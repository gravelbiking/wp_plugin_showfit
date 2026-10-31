<?php
/** Display preferences and recorder metadata; raw FIT identifiers stay private. GPL-2.0-or-later. */
namespace GravelTube\Activities;

final class Presentation {
    public static function fields() {
        return ['activityType' => 'Aktivitätsart', 'device' => 'Device', 'start' => 'Start',
            'distance' => 'Distanz', 'elapsedTime' => 'Gesamtdauer inkl. Pausen', 'timerTime' => 'Timerzeit',
            'movingTime' => 'Bewegungszeit (geschätzt)', 'ascent' => 'Aufstieg', 'descent' => 'Abstieg',
            'avgPower' => 'Ø Leistung', 'avgHeartRate' => 'Ø Herzfrequenz', 'avgCadence' => 'Ø Kadenz',
            'workKj' => 'Erfasste mechanische Arbeit'];
    }

    public static function fieldVisibility($input, $fallback = true) {
        $input = is_array($input) ? $input : [];
        $result = [];
        foreach (self::fields() as $key => $label) $result[$key] = array_key_exists($key, $input) ? in_array($input[$key], [true, 1, '1'], true) : $fallback;
        return $result;
    }

    public static function types() {
        return ['auto' => 'Automatisch (Vorschlag übernehmen)', 'rouvy' => 'ROUVY', 'zwift' => 'Zwift',
            'outdoor' => 'Outdoor', 'indoor' => 'Indoor / andere App', 'unknown' => 'Nicht zugeordnet'];
    }

    public static function type($value) {
        return is_string($value) && isset(self::types()[$value]) ? $value : 'auto';
    }

    public static function deviceMode($value) {
        return in_array($value, ['auto', 'show', 'hide'], true) ? $value : 'auto';
    }

    private static function text($value) {
        return is_string($value) ? trim(preg_replace('/[\x00-\x1F\x7F]/u', '', strip_tags($value))) : '';
    }

    private static function manufacturer($value) {
        $known = [1 => 'garmin', 32 => 'wahoo_fitness', 144 => 'zwift', 260 => 'zwift', 284 => 'virtualtraining'];
        return is_numeric($value) ? ($known[(int) $value] ?? '') : strtolower(self::text($value));
    }

    public static function detect(array $data) {
        $decoded = is_array($data['decoded'] ?? null) ? $data['decoded'] : [];
        $fileIds = $decoded['file_ids'] ?? (isset($decoded['file_id']) ? [$decoded['file_id']] : []);
        $file = [];
        foreach (is_array($fileIds) ? $fileIds : [] as $row) {
            if (is_array($row) && (!isset($row['type']) || in_array($row['type'], ['activity', 4], true))) { $file = $row; break; }
        }
        $creator = [];
        foreach (is_array($decoded['device_infos'] ?? null) ? $decoded['device_infos'] : [] as $row) {
            // Only the creator is the recorder. A paired KICKR/TICKR is not the recording device.
            if (is_array($row) && in_array($row['device_index'] ?? null, ['creator', 0], true)) { $creator = $row; break; }
        }
        $maker = self::manufacturer($file['manufacturer'] ?? ($creator['manufacturer'] ?? ''));
        $creatorMaker = self::manufacturer($creator['manufacturer'] ?? '');
        if ($maker !== '' && $creatorMaker !== '' && $maker !== $creatorMaker) $creator = [];
        $name = self::text($creator['product_name'] ?? '') ?: self::text($file['product_name'] ?? '');
        $product = $creator['garmin_product'] ?? ($creator['product'] ?? ($file['garmin_product'] ?? ($file['product'] ?? null)));
        // Product IDs/names from the bundled FIT profile; ACE also verified against an actual FIT.
        if (!$name && $maker === 'garmin') {
            $models = [4062 => 'Edge 840', 'edge840' => 'Edge 840', 4061 => 'Edge 540', 'edge540' => 'Edge 540'];
            $name = $models[is_int($product) || is_string($product) ? $product : ''] ?? '';
            if (!$name && is_string($product)) $name = trim(str_replace('_', ' ', preg_replace('/([a-z])([0-9])/', '$1 $2', $product)));
        }
        if (!$name && $maker === 'wahoo_fitness' && $product === 57) $name = 'ELEMNT ACE';
        $identity = strtolower($maker . ' ' . $name);
        if (preg_match('/rouvy|virtualtraining/', $identity)) {
            $type = 'rouvy'; $reason = 'Der Dateiersteller nennt ROUVY / VirtualTraining.';
        } elseif (preg_match('/zwift/', $identity)) {
            $type = 'zwift'; $reason = 'Der Dateiersteller nennt Zwift.';
        } else {
            $indoor = false;
            $hasGps = false;
            foreach ($data['records'] ?? [] as $record) if (isset($record['latitude'], $record['longitude'])) { $hasGps = true; break; }
            foreach (array_merge((array) ($data['sessions'] ?? []), (array) ($decoded['sessions'] ?? [])) as $session) {
                if (!is_array($session)) continue;
                $sub = $session['subSport'] ?? ($session['sub_sport'] ?? '');
                if (in_array($sub, [6, 58, 'indoor_cycling', 'virtual_activity', 'indoor_running', 'treadmill', 'spin'], true)) $indoor = true;
            }
            if ($indoor) { $type = 'indoor'; $reason = 'Die Session ist als Indoor- oder virtuelle Aktivität gekennzeichnet.'; }
            elseif (in_array($maker, ['garmin', 'wahoo_fitness'], true)) { $type = 'outdoor'; $reason = 'Garmin-/Wahoo-Aufzeichnung ohne Indoor-Kennzeichnung; bitte vor Veröffentlichung prüfen.'; }
            elseif ($hasGps) { $type = 'outdoor'; $reason = 'GPS-Strecke vorhanden, kein bekannter App-Ersteller; bitte prüfen.'; }
            else { $type = 'unknown'; $reason = 'Keine eindeutige Herkunft in der Datei gefunden.'; }
        }
        $brands = ['garmin' => 'Garmin', 'wahoo_fitness' => 'Wahoo'];
        if (isset($brands[$maker])) {
            $brand = $brands[$maker];
            $device = $name ? (stripos($name, $brand) === 0 ? $name : $brand . ' ' . $name) : $brand . ' (Modell unbekannt)';
        } else $device = $name ?: (in_array($type, ['rouvy', 'zwift'], true) ? self::types()[$type] : 'Nicht angegeben');
        return ['suggestedType' => $type, 'suggestedLabel' => self::types()[$type], 'reason' => $reason, 'device' => $device];
    }
}
