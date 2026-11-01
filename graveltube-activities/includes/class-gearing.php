<?php
/** Electronic shifting, derived from the privately retained FIT event archive. GPL-2.0-or-later. */
namespace GravelTube\Activities;

final class Gearing {
    private static function gear($value) {
        return (is_int($value) || is_float($value)) && is_finite((float) $value) &&
            floor($value) === (float) $value && $value > 0 && $value < 255 ? (int) $value : null;
    }

    private static function timestamp($value) {
        if (is_string($value)) $value = strtotime($value);
        return (is_int($value) || is_float($value)) && is_finite((float) $value) && $value >= 0 && $value <= 7258118400 ? $value : null;
    }

    public static function analyse(array $data) {
        $empty = ['available' => false, 'timeline' => [], 'bins' => [], 'summary' => null];
        $source = $data['decoded']['events'] ?? [];
        $start = $data['summary']['start'] ?? null;
        if (!is_array($source) || $start === null) return $empty;
        if (count($source) > Activity::MAX_RECORDS) throw new \InvalidArgumentException('Zu viele FIT-Ereignisse.');
        $records = array_values(array_filter($data['records'], function($r) { return isset($r['timestamp']); }));
        usort($records, function($a, $b) { return $a['timestamp'] <=> $b['timestamp']; });
        $end = max($start, $start + ($data['summary']['elapsedTime'] ?? 0), $records ? end($records)['timestamp'] : $start);
        $events = [];
        foreach ($source as $order => $event) {
            if (!is_array($event) || !in_array($event['event'] ?? null, ['front_gear_change', 'rear_gear_change', 'frontGearChange', 'rearGearChange', 42, 43], true)) continue;
            $time = self::timestamp($event['timestamp'] ?? null);
            if ($time === null || $time < $start || $time > $end) continue;
            $packed = $event['data'] ?? null;
            $packed = is_int($packed) && $packed >= 0 && $packed <= 4294967295 ? $packed : null;
            $state = [];
            // FIT gear_change_data: rear position, rear teeth, front position, front teeth (8 bits each).
            foreach (['rear_gear_num' => 0, 'rear_gear' => 8, 'front_gear_num' => 16, 'front_gear' => 24] as $key => $bits) {
                $state[$key] = self::gear($event[$key] ?? ($packed !== null ? (($packed >> $bits) & 255) : null));
            }
            if (!array_filter($state, function($v) { return $v !== null; })) continue;
            $events[] = ['timestamp' => $time, 'order' => $order, 'state' => $state];
        }
        if (!$events) return $empty;
        usort($events, function($a, $b) { return ($a['timestamp'] <=> $b['timestamp']) ?: ($a['order'] <=> $b['order']); });
        $sessions = $data['sessions'] ?? [];
        usort($sessions, function($a, $b) { return ($a['start'] ?? 0) <=> ($b['start'] ?? 0); });
        $locate = function($time) use ($records, $start) {
            $result = ['timestamp' => $time, 'elapsed' => $time - $start, 'distance' => null, 'index' => 0];
            if (!$records) return $result;
            $lo = 0; $hi = count($records) - 1;
            while ($lo < $hi) { $mid = (int) ceil(($lo + $hi) / 2); if ($records[$mid]['timestamp'] <= $time) $lo = $mid; else $hi = $mid - 1; }
            $a = $records[$lo]; $b = $records[$lo + 1] ?? null;
            $result['index'] = $a['index'];
            if ($a['timestamp'] === $time) $result['distance'] = $a['distance'];
            elseif ($b && $time > $a['timestamp'] && $b['timestamp'] - $a['timestamp'] <= Activity::MAX_GAP && $a['segment'] === $b['segment']) {
                $result['distance'] = $a['distance'] + ($b['distance'] - $a['distance']) * ($time - $a['timestamp']) / ($b['timestamp'] - $a['timestamp']);
            } elseif ($time >= $a['timestamp'] && $time - $a['timestamp'] <= 1) $result['distance'] = $a['distance'];
            return $result;
        };
        $state = ['front_gear_num' => null, 'front_gear' => null, 'rear_gear_num' => null, 'rear_gear' => null];
        $timeline = []; $bins = []; $front = 0; $rear = 0; $previousSession = null;
        $windowSeconds = max(60, (int) ceil(($end - $start) / (60 * 2000)) * 60);
        foreach ($events as $event) {
            $time = $event['timestamp']; $session = -1;
            // Binary search avoids scanning every session for every event in long multisport archives.
            $lo = 0; $hi = count($sessions) - 1;
            while ($lo <= $hi) { $mid = (int) floor(($lo + $hi) / 2); if (($sessions[$mid]['start'] ?? PHP_INT_MAX) <= $time) { $session = $mid; $lo = $mid + 1; } else $hi = $mid - 1; }
            if ($session >= 0 && isset($sessions[$session]['end']) && $time > $sessions[$session]['end']) $session = -1;
            if ($previousSession !== null && $previousSession !== $session) {
                $lastState = end($timeline);
                $sessionEnd = $sessions[$previousSession]['end'] ?? $lastState['timestamp'];
                if ($sessionEnd > $lastState['timestamp'] && $sessionEnd < $time) $timeline[] = $locate($sessionEnd) + array_intersect_key($lastState, array_flip(['rearGear', 'frontGear', 'gearRatio', 'frontTeeth', 'rearTeeth']));
                $timeline[] = $locate($time) + ['rearGear' => null, 'frontGear' => null, 'gearRatio' => null, 'frontTeeth' => null, 'rearTeeth' => null];
                $state = array_fill_keys(array_keys($state), null);
            }
            $previousSession = $session;
            $changes = ['front' => 0, 'rear' => 0];
            foreach (['front', 'rear'] as $part) {
                $position = $part . '_gear_num'; $teeth = $part . '_gear';
                $newPosition = $event['state'][$position]; $newTeeth = $event['state'][$teeth];
                if ($newPosition === null && $newTeeth === null) continue;
                if ($newPosition !== null && $state[$position] !== null) $changed = $newPosition !== $state[$position];
                else $changed = $newTeeth !== null && $state[$teeth] !== null && $newTeeth !== $state[$teeth];
                if ($changed) $changes[$part]++;
                // An unavailable tooth count after a real position change must never leave an old ratio behind.
                $state[$position] = $newPosition;
                $state[$teeth] = $newTeeth;
            }
            $front += $changes['front']; $rear += $changes['rear'];
            $bucket = (int) floor(($time - $start) / $windowSeconds);
            if (!isset($bins[$bucket])) $bins[$bucket] = ['frontShifts' => 0, 'rearShifts' => 0];
            $bins[$bucket]['frontShifts'] += $changes['front']; $bins[$bucket]['rearShifts'] += $changes['rear'];
            $timeline[] = $locate($time) + ['rearGear' => $state['rear_gear_num'], 'frontGear' => $state['front_gear_num'],
                'frontTeeth' => $state['front_gear'], 'rearTeeth' => $state['rear_gear'],
                'gearRatio' => $state['front_gear'] !== null && $state['rear_gear'] !== null ? $state['front_gear'] / $state['rear_gear'] : null];
        }
        $last = end($timeline);
        $stateEnd = $previousSession >= 0 && isset($sessions[$previousSession]['end']) ? min($end, $sessions[$previousSession]['end']) : $end;
        if ($stateEnd > $last['timestamp']) $timeline[] = $locate($stateEnd) + array_intersect_key($last, array_flip(['rearGear', 'frontGear', 'gearRatio', 'frontTeeth', 'rearTeeth']));
        $windows = []; $lastBucket = (int) floor(($end - $start) / $windowSeconds);
        // Usually 60 seconds; bound display bins for unusually long/malformed activity durations.
        // The shorter final window is never extrapolated to a full interval.
        for ($i = 0; $i <= $lastBucket; $i++) {
            $from = $start + $i * $windowSeconds; $to = min($end, $from + $windowSeconds);
            if ($to <= $from && !isset($bins[$i])) continue;
            $counts = $bins[$i] ?? ['frontShifts' => 0, 'rearShifts' => 0];
            $windows[] = $locate(($from + $to) / 2) + $counts + ['shiftFrequency' => $counts['frontShifts'] + $counts['rearShifts'], 'from' => $from - $start, 'to' => $to - $start];
        }
        $positions = []; $teeth = [];
        foreach ($events as $event) {
            if ($event['state']['front_gear_num'] !== null) $positions[$event['state']['front_gear_num']] = true;
            if ($event['state']['front_gear'] !== null) $teeth[$event['state']['front_gear']] = true;
        }
        // Activity files describe used gears, not necessarily the complete drivetrain.
        // A single observed front position is a display suggestion, never proof of hardware configuration.
        $singleChainring = $positions || $teeth ? count($positions) <= 1 && max(array_merge([1], array_keys($positions))) === 1 && count($teeth) <= 1 && $front === 0 : null;
        return ['available' => true, 'timeline' => $timeline, 'bins' => $windows, 'windowSeconds' => $windowSeconds, 'singleChainring' => $singleChainring,
            'summary' => ['shiftCount' => $front + $rear, 'frontShifts' => $front, 'rearShifts' => $rear,
                'shiftsPerMinute' => $end > $start ? ($front + $rear) * 60 / ($end - $start) : null,
                'eventCount' => count($events), 'durationSeconds' => $end - $start]];
    }
}
