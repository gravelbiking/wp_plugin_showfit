<?php
/** Resolve map settings from saved content, never from anonymous display parameters. GPL-2.0-or-later. */
namespace GravelTube\Activities;

final class MapView {
    public static function config(array $attributes) {
        return ['activityId' => max(0, (int) ($attributes['activityId'] ?? 0)),
            'activityType' => Presentation::type($attributes['activityType'] ?? 'auto'),
            'privateMap' => RoutePrivacy::mode($attributes['privateMap'] ?? 'inherit')];
    }

    public static function key(array $attributes) {
        return hash('sha256', json_encode(self::config($attributes)));
    }

    public static function shortcode(array $attributes) {
        return self::config(['activityId' => $attributes['id'] ?? 0, 'activityType' => $attributes['type'] ?? 'auto', 'privateMap' => $attributes['private_map'] ?? 'inherit']);
    }

    private static function collect($content, &$configs, &$seen, $depth = 0) {
        if ($depth > 10) return;
        $walk = function($blocks) use (&$walk, &$configs, &$seen, $depth) {
            foreach ($blocks as $block) {
                $attributes = (array) ($block['attrs'] ?? []);
                if (($block['blockName'] ?? '') === 'graveltube/activity') $configs[] = self::config($attributes);
                if (($block['blockName'] ?? '') === 'core/block') {
                    $id = (int) ($attributes['ref'] ?? 0);
                    if ($id && !isset($seen[$id])) {
                        $seen[$id] = true; $ref = get_post($id);
                        if ($ref && $ref->post_type === 'wp_block' && $ref->post_status === 'publish' && $ref->post_password === '') self::collect($ref->post_content, $configs, $seen, $depth + 1);
                    }
                }
                $walk($block['innerBlocks'] ?? []);
            }
        };
        $walk(parse_blocks($content));
        if (preg_match_all('/' . get_shortcode_regex(['graveltube_activity']) . '/s', $content, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                if ($match[1] === '[' && $match[6] === ']') continue;
                $attributes = shortcode_parse_atts($match[3]);
                if (is_array($attributes)) $configs[] = self::shortcode($attributes);
            }
        }
    }

    public static function resolve($postId, $key, $activityId) {
        if (!is_string($key) || !preg_match('/^[a-f0-9]{64}$/D', $key)) return null;
        $post = get_post($postId);
        if (!$post || !is_post_publicly_viewable($post) || $post->post_password !== '') return null;
        $configs = []; $seen = [];
        self::collect($post->post_content, $configs, $seen);
        foreach ($configs as $config) if ($config['activityId'] === $activityId && hash_equals(self::key($config), (string) $key)) {
            // Another author cannot declassify somebody else's private GPS by embedding its public ID.
            $config['canReveal'] = user_can((int) $post->post_author, 'edit_post', $activityId);
            return $config;
        }
        return null;
    }
}
