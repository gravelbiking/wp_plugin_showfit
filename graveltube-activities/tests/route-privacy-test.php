<?php
require __DIR__ . '/../includes/class-activity.php';
require __DIR__ . '/../includes/class-route-privacy.php';
use GravelTube\Activities\Activity;
use GravelTube\Activities\RoutePrivacy;
set_error_handler(function($severity, $message, $file, $line) { throw new ErrorException($message, 0, $severity, $file, $line); });
$checks = 0;
function check($ok, $message) { global $checks; if (!$ok) throw new RuntimeException($message); $checks++; echo 'PASS ' . $message . "\n"; }
function route($meters) {
    $records = [];
    foreach ($meters as $i => $m) $records[] = ['latitude' => $m / 6371000 * 180 / M_PI, 'longitude' => 0, 'timestamp' => 100 + $i, 'elapsed' => $i, 'segment' => 0, 'power' => 200, 'heartRate' => 145, 'cadence' => 85];
    return ['records' => $records, 'laps' => [['latitude' => 0, 'longitude' => 0, 'avgPower' => 200]], 'summary' => ['distance' => 2500, 'workKj' => 800]];
}
function visible($data) { return array_keys(array_filter($data['records'], function($r) { return isset($r['latitude'], $r['longitude']); })); }
$data = route(range(0, 2525, 101)); $copy = $data;
$private = RoutePrivacy::redact($data, true);
check(visible($private) === range(5, 20), '500m at each end are excluded; first/last visible samples are 505m from the endpoints');
check($data === $copy && count($private['records']) === count($data['records']) && $private['summary'] === $data['summary'], 'original, complete training records and summary remain unchanged');
check($private['records'][0]['power'] === 200 && $private['records'][25]['heartRate'] === 145 && $private['laps'][0]['avgPower'] === 200, 'sensor samples remain complete even in hidden GPS areas');
check($private['laps'][0]['latitude'] === null && $private['laps'][0]['longitude'] === null, 'lap markers cannot leak protected coordinates');
check(visible(RoutePrivacy::redact(route(range(0, 900, 100)), true)) === [], 'routes shorter than 1000m have no public GPS');
$loop = route([0, 300, 600, 1000, 600, 300, 0, -300, -600, -1000, -600, -300, 0]);
$redacted = RoutePrivacy::redact($loop, true);
check(visible($redacted) === [2, 3, 4, 8, 9, 10], 'later passes through the start/finish area also remain hidden on loops');
$gap = route([0, 100, 2000, 2100, 2200, 2300]); $gap['records'][2]['segment'] = 1;
for ($i=3;$i<6;$i++) $gap['records'][$i]['segment'] = 1;
check(visible(RoutePrivacy::redact($gap, true)) === [], 'a segment gap does not count as travelled GPS distance');
$gap = route([0, 100, 2000, 2100, 2200, 2300]);
for ($i=2;$i<6;$i++) $gap['records'][$i]['elapsed'] += 60;
check(visible(RoutePrivacy::redact($gap, true)) === [], 'long recording gaps do not count as travelled GPS distance');
$none = route([]); $none = RoutePrivacy::redact($none, true);
check($none['laps'][0]['latitude'] === null && !$none['mapPrivacy']['applied'], 'no-record files cannot leak GPS via laps');
$partial = route(range(0, 2500, 100)); $partial['records'][0]['latitude'] = null; $partial['records'][25]['longitude'] = null;
$partial = RoutePrivacy::redact($partial, true);
check($partial['records'][0]['longitude'] === null && $partial['records'][25]['latitude'] === null, 'partial GPS fixes cannot leak one endpoint coordinate');
$off = RoutePrivacy::redact($data, false); unset($off['mapPrivacy']);
check($off === $data, 'disabled mode preserves the complete public route');
check(RoutePrivacy::enabled('outdoor', 'inherit', true) && !RoutePrivacy::enabled('outdoor', 'inherit', false) && RoutePrivacy::enabled('outdoor', 'on', false) && !RoutePrivacy::enabled('outdoor', 'off', true), 'per-view overrides and global default have the required precedence');
check(!RoutePrivacy::enabled('rouvy', 'on', true) && !RoutePrivacy::enabled('zwift', 'on', true) && !RoutePrivacy::enabled('indoor', 'on', true), 'ROUVY, Zwift and indoor maps stay unchanged');
echo "$checks route privacy checks passed.\n";
