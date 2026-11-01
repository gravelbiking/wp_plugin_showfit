<?php
/** Complete, versioned activity model. New fork implementation, 2026-10-31. */
namespace GravelTube\Activities;

final class Activity {
    const SCHEMA = 1;
    const MAX_RECORDS = 300000;
    const MAX_GAP = 30; // Never infer sensor coverage or movement across a recording gap >30s.

    private static function numeric($value, $min = null, $max = null) {
        if ($value === null) return null;
        if ((!is_int($value) && !is_float($value)) || !is_finite((float) $value) ||
            ($min !== null && $value < $min) || ($max !== null && $value > $max)) {
            throw new \InvalidArgumentException('Ungültiger numerischer Messwert.');
        }
        return $value + 0;
    }

    private static function pick(array $row, array $fields) {
        $out = [];
        foreach ($fields as $name => $bounds) {
            $out[$name] = self::numeric($row[$name] ?? null, $bounds[0], $bounds[1]);
        }
        return $out;
    }

    public static function distance(array $a, array $b) {
        $lat = deg2rad($b['latitude'] - $a['latitude']);
        $lon = deg2rad($b['longitude'] - $a['longitude']);
        $h = sin($lat / 2) ** 2 + cos(deg2rad($a['latitude'])) * cos(deg2rad($b['latitude'])) * sin($lon / 2) ** 2;
        return 6371000 * 2 * atan2(sqrt($h), sqrt(max(0, 1 - $h)));
    }

    public static function normalise(array $input) {
        if (!in_array($input['format'] ?? '', ['fit', 'gpx', 'tcx'], true) || !isset($input['records']) || !is_array($input['records']) || count($input['records']) > self::MAX_RECORDS) {
            throw new \InvalidArgumentException('Dateiformat oder Anzahl der Messpunkte ungültig (maximal 300.000).');
        }
        $data = ['schema' => self::SCHEMA, 'format' => $input['format'], 'records' => [], 'sessions' => [], 'laps' => [], 'events' => [], 'decoded' => $input['decoded'] ?? null];
        foreach (['sessions', 'laps'] as $kind) {
            if (!is_array($input[$kind] ?? []) || count($input[$kind] ?? []) > 10000) throw new \InvalidArgumentException('Ungültige Session-/Rundendaten.');
            foreach ($input[$kind] ?? [] as $row) {
                if (!is_array($row)) throw new \InvalidArgumentException('Ungültige Session/Runde.');
                $entry = self::pick($row, ['start' => [0, 7258118400], 'end' => [0, 7258118400],
                    'elapsedTime' => [0, null], 'timerTime' => [0, null], 'distance' => [0, null]]);
                if ($kind === 'sessions') {
                    $entry += self::pick($row, ['ascent' => [0, null], 'descent' => [0, null]]);
                    $entry['sport'] = substr(is_string($row['sport'] ?? null) ? $row['sport'] : '', 0, 100);
                    $entry['subSport'] = substr(is_string($row['subSport'] ?? null) ? $row['subSport'] : '', 0, 100);
                } else {
                    $entry += self::pick($row, ['avgPower' => [0, null], 'avgHeartRate' => [0, null], 'avgCadence' => [0, null],
                        'latitude' => [-90, 90], 'longitude' => [-180, 180]]);
                }
                $data[$kind][] = $entry;
            }
        }
        if (!is_array($input['events'] ?? []) || count($input['events'] ?? []) > self::MAX_RECORDS) throw new \InvalidArgumentException('Ungültige Timerereignisse.');
        foreach ($input['events'] ?? [] as $event) {
            if (!is_array($event)) throw new \InvalidArgumentException('Ungültiges Timerereignis.');
            $timestamp = self::numeric($event['timestamp'] ?? null, 0, 7258118400);
            $type = $event['type'] ?? '';
            if ($timestamp !== null && in_array($type, ['start', 'stop', 'stopAll', 'stopDisable', 'stopDisableAll'], true)) $data['events'][] = ['timestamp' => $timestamp, 'type' => $type];
        }
        usort($data['events'], function($a, $b) { return $a['timestamp'] <=> $b['timestamp']; });
        $running = 0; $previous = null; $previousDeviceDistance = null; $deviceOffset = 0; $ascent = 0; $descent = 0;
        $starts = []; $ends = []; $hasAltitude = false;
        foreach ($data['sessions'] as $s) {
            if ($s['start'] !== null) $starts[] = $s['start'];
            if ($s['end'] !== null) $ends[] = $s['end'];
        }
        foreach ($input['records'] as $i => $row) {
            if (!is_array($row)) throw new \InvalidArgumentException('Ungültiger Messpunkt.');
            $r = self::pick($row, ['timestamp' => [0, 7258118400], 'distance' => [0, null],
                'latitude' => [-90, 90], 'longitude' => [-180, 180], 'altitude' => [null, null],
                'speed' => [0, null], 'power' => [0, null], 'heartRate' => [0, null], 'cadence' => [0, null]]);
            $r['segment'] = self::numeric($row['segment'] ?? 0, 0, self::MAX_RECORDS);
            if ((int) $r['segment'] !== $r['segment'] && (float) (int) $r['segment'] !== $r['segment']) throw new \InvalidArgumentException('Ungültiger Segmentindex.');
            $r['segment'] = (int) $r['segment'];
            if ($r['latitude'] === null || $r['longitude'] === null) { $r['latitude'] = null; $r['longitude'] = null; }
            $r['deviceDistance'] = $r['distance'];
            $same = $previous !== null && $previous['segment'] === $r['segment'];
            if ($r['distance'] !== null) {
                if ($previousDeviceDistance !== null && $r['distance'] < $previousDeviceDistance) $deviceOffset = $running;
                $running = max($running, $deviceOffset + $r['distance']);
                $previousDeviceDistance = $r['distance'];
            } elseif ($same && $r['latitude'] !== null && $previous['latitude'] !== null) {
                $running += self::distance($previous, $r);
            }
            $r['distance'] = $running;
            if ($r['altitude'] !== null) {
                $hasAltitude = true;
                if ($same && $previous['altitude'] !== null) {
                    $delta = $r['altitude'] - $previous['altitude'];
                    if ($delta > 0) $ascent += $delta; else $descent -= $delta;
                }
            }
            if ($r['timestamp'] !== null) { $starts[] = $r['timestamp']; $ends[] = $r['timestamp']; }
            $r['index'] = count($data['records']);
            $data['records'][] = $r;
            $previous = $r;
        }
        if (!$data['records'] && !$data['sessions']) throw new \InvalidArgumentException('Die Datei enthält keine Aktivitätsdaten.');
        $start = $starts ? min($starts) : null; $end = $ends ? max($ends) : null;
        $sums = []; $weights = []; $maxima = []; $present = [];
        $moving = 0; $movingKnown = false; $recordedTime = 0; $eventIndex = 0; $active = true;
        foreach ($data['records'] as $i => &$r) {
            $r['elapsed'] = $start !== null && $r['timestamp'] !== null ? max(0, $r['timestamp'] - $start) : null;
            foreach (['power', 'heartRate', 'cadence', 'speed', 'altitude'] as $key) {
                if ($r[$key] !== null) { $present[$key] = true; $maxima[$key] = isset($maxima[$key]) ? max($maxima[$key], $r[$key]) : $r[$key]; }
            }
            if (!$i) continue;
            $p = $data['records'][$i - 1];
            $dt = $r['timestamp'] !== null && $p['timestamp'] !== null ? $r['timestamp'] - $p['timestamp'] : 0;
            // Consume all timer transitions even across excluded intervals.
            while (isset($data['events'][$eventIndex]) && $data['events'][$eventIndex]['timestamp'] <= ($p['timestamp'] ?? -1)) {
                $active = $data['events'][$eventIndex++]['type'] === 'start';
            }
            $seconds = 0; $cursor = $p['timestamp']; $state = $active; $scan = $eventIndex;
            while ($dt > 0 && isset($data['events'][$scan]) && $data['events'][$scan]['timestamp'] < $r['timestamp']) {
                $event = $data['events'][$scan++];
                if ($state) $seconds += max(0, $event['timestamp'] - $cursor);
                $cursor = $event['timestamp']; $state = $event['type'] === 'start';
            }
            if ($dt > 0 && $state) $seconds += $r['timestamp'] - $cursor;
            if ($dt <= 0 || $dt > self::MAX_GAP || $p['segment'] !== $r['segment']) continue;
            $recordedTime += $seconds;
            $delta = $r['distance'] - $p['distance'];
            if ($delta > 0 || $p['speed'] !== null || $p['deviceDistance'] !== null || $r['deviceDistance'] !== null || ($p['latitude'] !== null && $r['latitude'] !== null)) {
                $movingKnown = true;
                if ($delta > 0 || ($p['speed'] !== null && $p['speed'] > 0.5)) $moving += $seconds;
            }
            foreach (['power', 'heartRate', 'cadence', 'speed'] as $key) {
                if ($p[$key] !== null && $seconds > 0) {
                    $sums[$key] = ($sums[$key] ?? 0) + $p[$key] * $seconds;
                    $weights[$key] = ($weights[$key] ?? 0) + $seconds;
                }
            }
        }
        unset($r);
        $sessionTotal = function($key) use ($data) {
            if (!$data['sessions']) return null;
            $sum = 0;
            foreach ($data['sessions'] as $s) { if ($s[$key] === null) return null; $sum += $s[$key]; }
            return $sum;
        };
        $averages = []; foreach ($weights as $key => $weight) $averages[$key] = $sums[$key] / $weight;
        // FIT record timestamps may end a second before the actual end and lack subsecond precision.
        // Device session durations are authoritative; span all sessions to retain transitions/pauses.
        $deviceElapsed = null;
        if (count($data['sessions']) === 1) {
            $deviceElapsed = $data['sessions'][0]['elapsedTime'];
        } elseif (count($data['sessions']) > 1) {
            $sessionStarts = []; $sessionEnds = [];
            foreach ($data['sessions'] as $session) {
                if ($session['start'] === null || $session['elapsedTime'] === null) { $sessionStarts = []; break; }
                $sessionStarts[] = $session['start'];
                $sessionEnds[] = $session['start'] + $session['elapsedTime'];
            }
            if ($sessionStarts) $deviceElapsed = max($sessionEnds) - min($sessionStarts);
        }
        $data['summary'] = ['start' => $start, 'elapsedTime' => $deviceElapsed ?? ($start !== null && $end !== null ? $end - $start : $sessionTotal('elapsedTime')),
            'elapsedTimeSource' => $deviceElapsed !== null ? 'device' : 'records',
            'timerTime' => $sessionTotal('timerTime') ?? ($recordedTime > 0 ? $recordedTime : null),
            'timerTimeSource' => $sessionTotal('timerTime') !== null ? 'device' : 'records',
            'movingTime' => $movingKnown ? $moving : null, 'distance' => $sessionTotal('distance') ?? ($data['records'] ? $running : null),
            'ascent' => $sessionTotal('ascent') ?? ($hasAltitude ? $ascent : null), 'descent' => $sessionTotal('descent') ?? ($hasAltitude ? $descent : null),
            'averages' => $averages, 'maxima' => $maxima, 'coverageSeconds' => $weights,
            'workKj' => isset($sums['power']) ? $sums['power'] / 1000 : null,
            'channels' => array_keys($present), 'recordCount' => count($data['records'])];
        return $data;
    }

    /** Calculate lap movement from original intervals, including for previously stored archives. */
    public static function lapMovingTimes(array $data) {
        $result = array_fill(0, count($data['laps']), null);
        $origin = $data['summary']['start'] ?? null;
        if ($origin === null) return $result;
        $queries = [];
        foreach ($data['laps'] as $lap) if (isset($lap['start'], $lap['end']) && $lap['end'] > $lap['start']) {
            $queries[] = $lap['start'] - $origin; $queries[] = $lap['end'] - $origin;
        }
        if (!$queries) return $result;
        sort($queries, SORT_NUMERIC); $queries = array_values(array_unique($queries, SORT_REGULAR)); $n = count($queries);
        $lower = function($time) use ($queries, $n) {
            $lo = 0; $hi = $n;
            while ($lo < $hi) { $mid = (int) floor(($lo + $hi) / 2); if ($queries[$mid] < $time) $lo = $mid + 1; else $hi = $mid; }
            return $lo;
        };
        $moveSlope = $moveOffset = $knownSlope = $knownOffset = array_fill(0, $n + 1, 0.0);
        // Integrate intervals at only the requested lap boundaries. Range updates avoid
        // scanning all records for each lap, including overlapping laps (O(records log laps)).
        $add = function(&$slope, &$offset, $from, $to) use ($origin, $lower) {
            if ($to <= $from) return;
            $a = $from - $origin; $b = $to - $origin; $i = $lower($a); $j = $lower($b);
            $slope[$i]++; $slope[$j]--; $offset[$i] -= $a; $offset[$j] += $b;
        };
        $events = $data['events'] ?? []; $eventIndex = 0; $active = true;
        foreach ($data['records'] as $i => $r) {
            if (!$i) continue;
            $p = $data['records'][$i - 1];
            while (isset($events[$eventIndex]) && $events[$eventIndex]['timestamp'] <= ($p['timestamp'] ?? -1)) $active = $events[$eventIndex++]['type'] === 'start';
            if (!isset($p['timestamp'], $r['timestamp']) || $r['timestamp'] <= $p['timestamp'] || $r['timestamp'] - $p['timestamp'] > self::MAX_GAP || $p['segment'] !== $r['segment']) continue;
            $delta = $r['distance'] - $p['distance'];
            $known = $delta > 0 || $p['speed'] !== null || isset($p['deviceDistance']) || isset($r['deviceDistance']) || isset($p['latitude'], $r['latitude']);
            if (!$known) continue;
            $add($knownSlope, $knownOffset, $p['timestamp'], $r['timestamp']);
            if ($delta <= 0 && ($p['speed'] === null || $p['speed'] <= 0.5)) continue;
            $cursor = $p['timestamp']; $state = $active; $scan = $eventIndex;
            while (isset($events[$scan]) && $events[$scan]['timestamp'] < $r['timestamp']) {
                $event = $events[$scan++];
                if ($state) $add($moveSlope, $moveOffset, $cursor, $event['timestamp']);
                $cursor = $event['timestamp']; $state = $event['type'] === 'start';
            }
            if ($state) $add($moveSlope, $moveOffset, $cursor, $r['timestamp']);
        }
        $moving = []; $coverage = []; $ms = 0; $mo = 0; $ks = 0; $ko = 0;
        foreach ($queries as $i => $time) {
            $ms += $moveSlope[$i]; $mo += $moveOffset[$i]; $ks += $knownSlope[$i]; $ko += $knownOffset[$i];
            $moving[$i] = $ms * $time + $mo; $coverage[$i] = $ks * $time + $ko;
        }
        foreach ($data['laps'] as $i => $lap) if (isset($lap['start'], $lap['end']) && $lap['end'] > $lap['start']) {
            $a = $lower($lap['start'] - $origin); $b = $lower($lap['end'] - $origin);
            if ($coverage[$b] - $coverage[$a] > 0) $result[$i] = round(max(0, $moving[$b] - $moving[$a]), 6);
        }
        return $result;
    }

    /** Public pause ranges contain elapsed seconds only; original timer messages stay private. */
    public static function pauses(array $data) {
        $start = $data['summary']['start'] ?? null;
        if ($start === null) return [];
        $end = $start + ($data['summary']['elapsedTime'] ?? 0);
        foreach ($data['records'] as $record) if ($record['timestamp'] !== null) $end = max($end, $record['timestamp']);
        $events = $data['events'] ?? [];
        usort($events, function($a, $b) { return $a['timestamp'] <=> $b['timestamp']; });
        $from = null; $pauses = [];
        foreach ($events as $event) {
            $time = $event['timestamp'];
            if ($time > $end) break;
            if ($event['type'] === 'start') {
                if ($from !== null && $time > $from) $pauses[] = ['start' => $from - $start, 'end' => $time - $start];
                $from = null;
            } elseif ($from === null) $from = max($start, $time);
        }
        if ($from !== null && $end > $from) $pauses[] = ['start' => $from - $start, 'end' => $end - $start];
        return $pauses;
    }

    /** Export only the declared public fields. Never expose decoded messages or original bytes. */
    public static function publicData(array $data, array $visibility) {
        $lapMoving = self::lapMovingTimes($data);
        foreach ($data['laps'] as $i => &$lap) $lap['movingTime'] = $lapMoving[$i];
        unset($lap);
        $data['pauses'] = self::pauses($data);
        $data['gearing'] = !array_key_exists('gearing', $visibility) || !empty($visibility['gearing']) ? Gearing::analyse($data) : ['available' => false, 'timeline' => [], 'bins' => [], 'summary' => null];
        unset($data['decoded'], $data['events'], $data['provenance']);
        $hidden = [];
        foreach (['power', 'heartRate', 'cadence'] as $key) if (empty($visibility[$key])) $hidden[] = $key;
        if (empty($visibility['map'])) $hidden = array_merge($hidden, ['latitude', 'longitude']);
        foreach ($data['records'] as &$record) {
            foreach ($hidden as $key) $record[$key] = null;
            unset($record['deviceDistance']);
        }
        unset($record);
        foreach ($data['laps'] as &$lap) {
            foreach (['power' => 'avgPower', 'heartRate' => 'avgHeartRate', 'cadence' => 'avgCadence'] as $channel => $key) if (in_array($channel, $hidden, true)) $lap[$key] = null;
            if (empty($visibility['map'])) { $lap['latitude'] = null; $lap['longitude'] = null; }
        }
        unset($lap);
        foreach (['averages', 'maxima', 'coverageSeconds'] as $section) foreach ($hidden as $key) unset($data['summary'][$section][$key]);
        if (in_array('power', $hidden, true)) $data['summary']['workKj'] = null;
        $data['summary']['channels'] = array_values(array_diff($data['summary']['channels'], $hidden));
        return $data;
    }
}
