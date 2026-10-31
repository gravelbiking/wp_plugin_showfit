<?php
/** Server-side location redaction. GPL-2.0-or-later. */
namespace GravelTube\Activities;

final class RoutePrivacy {
    const METERS = 500;
    const NOTICE = 'Der genaue Start und das Ziel sind aus Sicherheitsgründen hier ausgeblendet.';

    public static function mode($value) {
        return in_array($value, ['inherit', 'on', 'off'], true) ? $value : 'inherit';
    }

    public static function enabled($type, $mode, $default) {
        return $type === 'outdoor' && (self::mode($mode) === 'on' || (self::mode($mode) === 'inherit' && $default));
    }

    /** Keep every training sample; clear only its coordinates and all lap coordinates. */
    public static function redact(array $data, $enabled) {
        $data['mapPrivacy'] = ['enabled' => (bool) $enabled, 'applied' => false, 'meters' => self::METERS];
        if (!$enabled) return $data;
        foreach ($data['laps'] as &$lap) { $lap['latitude'] = null; $lap['longitude'] = null; }
        unset($lap);
        $offsets = []; $first = null; $last = null; $previous = null; $total = 0;
        foreach ($data['records'] as $i => $record) {
            if (!isset($record['latitude'], $record['longitude'])) {
                if (isset($record['latitude']) || isset($record['longitude'])) {
                    $data['records'][$i]['latitude'] = null; $data['records'][$i]['longitude'] = null;
                }
                $previous = null; continue;
            }
            if ($previous !== null && ($record['segment'] ?? 0) === ($previous['segment'] ?? 0) &&
                (!isset($record['elapsed'], $previous['elapsed']) || ($record['elapsed'] - $previous['elapsed'] >= 0 && $record['elapsed'] - $previous['elapsed'] <= Activity::MAX_GAP))) {
                $total += Activity::distance($previous, $record);
            }
            $offsets[$i] = $total;
            if ($first === null) $first = $record;
            $last = $record; $previous = $record;
        }
        if ($first === null) return $data;
        $data['mapPrivacy']['applied'] = true;
        foreach ($offsets as $i => $offset) {
            // Distance along the recorded route, plus endpoint zones to protect repeated passes on loops.
            if ($offset < self::METERS || $total - $offset < self::METERS ||
                Activity::distance($first, $data['records'][$i]) < self::METERS || Activity::distance($last, $data['records'][$i]) < self::METERS) {
                $data['records'][$i]['latitude'] = null; $data['records'][$i]['longitude'] = null;
            }
        }
        return $data;
    }
}
