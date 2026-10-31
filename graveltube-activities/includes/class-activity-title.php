<?php
/** Editable title proposals from explicit FIT activity/workout metadata. GPL-2.0-or-later. */
namespace GravelTube\Activities;

final class ActivityTitle {
    private static function name($value) {
        if (is_array($value)) {
            foreach ($value as $part) { $name = self::name($part); if ($name !== '') return $name; }
            return '';
        }
        if (!is_string($value)) return '';
        return sanitize_text_field(preg_replace('/[\x00-\x1F\x7F]/u', ' ', $value));
    }

    private static function find(array $message, array $fields) {
        foreach ($fields as $field) { $name = self::name($message[$field] ?? null); if ($name !== '') return $name; }
        return '';
    }

    private static function rows($messages) {
        if (!is_array($messages) || !$messages) return [];
        return array_keys($messages) === range(0, count($messages) - 1) ? array_filter($messages, 'is_array') : [$messages];
    }

    public static function suggest(array $data, $filename) {
        $decoded = is_array($data['decoded'] ?? null) ? $data['decoded'] : [];
        if (($data['format'] ?? '') === 'fit') {
            $activityFields = ['activity_name', 'activity_title', 'session_name', 'title', 'name'];
            $name = self::find($decoded, ['activity_name', 'activity_title']);
            foreach (['activity', 'activities', 'sessions'] as $kind) {
                foreach (self::rows($decoded[$kind] ?? null) as $message) {
                    if ($name === '') $name = self::find($message, $activityFields);
                }
            }
            if ($name !== '') return ['title' => $name, 'source' => 'fit_activity', 'label' => 'Aktivitätsname aus FIT'];
            foreach (['workout', 'workouts'] as $kind) {
                foreach (self::rows($decoded[$kind] ?? null) as $message) {
                    $name = self::find($message, ['wkt_name', 'workout_name', 'name', 'title']);
                    if ($name !== '') return ['title' => $name, 'source' => 'fit_workout', 'label' => 'Workout-Name aus FIT'];
                }
            }
        }
        return ['title' => sanitize_text_field(pathinfo($filename, PATHINFO_FILENAME)) ?: 'Aktivität', 'source' => 'filename', 'label' => 'Dateiname'];
    }
}
