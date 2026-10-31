<?php
require __DIR__ . '/../includes/class-activity.php';
require __DIR__ . '/../includes/class-storage.php';
require __DIR__ . '/../includes/class-presentation.php';
use GravelTube\Activities\Activity;
use GravelTube\Activities\Storage;
use GravelTube\Activities\Presentation;

$count = 0;
function check($condition, $message) {
    global $count;
    if (!$condition) throw new RuntimeException('FAIL: ' . $message);
    $count++; echo 'PASS ' . $message . "\n";
}
function near($a, $b) { return abs($a - $b) < 0.000001; }
function fixture($name) { return json_decode(file_get_contents(__DIR__ . '/../../.test-output/' . $name . '.json'), true); }
function point($t, $power, $distance = null, $segment = 0) {
    return ['timestamp' => $t, 'power' => $power, 'distance' => $distance, 'segment' => $segment];
}
function activity($records, $extra = []) { return Activity::normalise(array_merge(['format' => 'fit', 'records' => $records], $extra)); }

// Fail on warnings too, including API misuse on newer PHP versions.
set_error_handler(function($severity, $message, $file, $line) { throw new ErrorException($message, 0, $severity, $file, $line); });
$outdoor = Activity::normalise(fixture('outdoor'));
function recorder($file, $devices = [], $sessions = [], $records = []) {
    return Presentation::detect(['decoded' => ['file_ids' => [$file], 'device_infos' => $devices], 'sessions' => $sessions, 'records' => $records]);
}
$rouvy = recorder(['manufacturer' => 'virtualtraining', 'product_name' => 'Rouvy'], [['manufacturer' => 'wahoo_fitness', 'product_name' => 'KICKR', 'device_index' => 1]]);
check($rouvy['suggestedType'] === 'rouvy' && $rouvy['device'] === 'Rouvy', 'ROUVY creator takes priority over paired Wahoo sensors');
$zwift = recorder(['manufacturer' => 260], [['manufacturer' => 'zwift', 'device_index' => 'creator', 'product_name' => 'Zwift']]);
check($zwift['suggestedType'] === 'zwift' && $zwift['device'] === 'Zwift', 'Zwift is detected from a numeric or decoded manufacturer');
$ace = recorder(['manufacturer' => 'wahoo_fitness', 'product' => 57], [['manufacturer' => 'wahoo_fitness', 'device_index' => 'creator', 'product_name' => 'ELEMNT ACE', 'serial_number' => 'private']]);
check($ace['suggestedType'] === 'outdoor' && $ace['device'] === 'Wahoo ELEMNT ACE' && strpos(json_encode($ace), 'private') === false, 'creator device name is displayed without exposing serial numbers');
$edge = recorder(['manufacturer' => 'garmin', 'product' => 'edge840']);
check($edge['device'] === 'Garmin Edge 840' && $edge['suggestedType'] === 'outdoor', 'Garmin Edge 840 product enum is readable');
$edge = recorder(['manufacturer' => 1, 'product' => 4062], [], [['subSport' => 'indoor_cycling']], [['latitude' => 50, 'longitude' => 7]]);
check($edge['device'] === 'Garmin Edge 840' && $edge['suggestedType'] === 'indoor', 'explicit indoor session wins over Garmin and GPS heuristics');
$unknown = recorder([], [['manufacturer' => 'wahoo_fitness', 'product_name' => 'TICKR', 'device_index' => 1]]);
check($unknown['device'] === 'Nicht angegeben' && $unknown['suggestedType'] === 'unknown', 'a paired sensor never becomes the recorder or an outdoor suggestion');
check(recorder([], [], [], [['latitude' => 50, 'longitude' => 7]])['suggestedType'] === 'outdoor', 'GPS-only files get a reviewable outdoor suggestion');
check(count(array_filter(Presentation::fieldVisibility([]))) === 13, 'all thirteen summary fields are enabled by default');
$fields = Presentation::fieldVisibility(['device' => false, 'avgPower' => '0', 'start' => '1', 'unknown' => true]);
check(!$fields['device'] && !$fields['avgPower'] && $fields['start'] && !isset($fields['unknown']), 'display field whitelist accepts explicit choices and rejects unknown keys');
check(count(array_filter(Presentation::fieldVisibility([], false))) === 0, 'global settings can disable every field');
check(Presentation::type('zwift') === 'zwift' && Presentation::type('<script>') === 'auto', 'activity type overrides are restricted to known values');
check(count($outdoor['records']) === 8 && count($outdoor['sessions']) === 2, 'full JS/PHP round-trip preserves multiple FIT sessions');
check(near($outdoor['summary']['movingTime'], 6), 'FIT moving time stays seconds, not milliseconds');
check(near($outdoor['summary']['timerTime'], 6) && near($outdoor['summary']['elapsedTime'], 17), 'timer and elapsed duration remain distinct');
$precise = activity([point(100, 100), point(110, 100)], ['sessions' => [['start' => 100, 'end' => 110, 'elapsedTime' => 11.42]]]);
check(near($precise['summary']['elapsedTime'], 11.42) && $precise['summary']['elapsedTimeSource'] === 'device', 'precise FIT duration survives missing final/subsecond record timestamps');
$precise = activity([point(100, 100), point(110, 100), point(120, 100, null, 1)], ['sessions' => [['start' => 100, 'end' => 110, 'elapsedTime' => 10.5], ['start' => 120, 'end' => 130, 'elapsedTime' => 10.75]]]);
check(near($precise['summary']['elapsedTime'], 30.75), 'precise multisession span includes time between sessions');
check(near($outdoor['records'][7]['distance'], 60), 'distance resets between sessions remain cumulative');
check(isset($outdoor['decoded']['raw_messages']), 'complete raw FIT messages are retained');
$indoor = Activity::normalise(fixture('indoor'));
check($indoor['records'][0]['latitude'] === null && in_array('power', $indoor['summary']['channels'], true), 'indoor FIT keeps power without GPS');
$gpx = Activity::normalise(fixture('gpx'));
check(count($gpx['records']) === 5 && $gpx['summary']['elapsedTime'] === null, 'GPX without timestamps retains every point');
check($gpx['summary']['distance'] > 200 && $gpx['summary']['distance'] < 250, 'GPX does not add distance between separate tracks');
$tcx = Activity::normalise(fixture('tcx'));
check(count($tcx['laps']) === 2 && near($tcx['summary']['timerTime'], 3), 'TCX retains laps and timer duration without speed');

$data = activity([point(100, 100, 0), point(102, 200, 10), point(110, null, 50), point(112, 0, 50), point(114, 100, 60)]);
check(near($data['summary']['averages']['power'], (100 * 2 + 200 * 8) / 12), 'means are time-weighted, real zeros count, missing samples do not');
check(near($data['summary']['coverageSeconds']['power'], 12), 'sensor coverage excludes missing values');
check(near($data['summary']['workKj'], 1.8), 'mechanical work integrates watts over seconds');
$data = activity([point(100, 100), point(200, 200), point(201, 200)]);
check(near($data['summary']['coverageSeconds']['power'], 1), 'long recording gaps do not inflate averages or work');
$data = activity([point(100, 100), point(110, 100)], ['events' => [['timestamp' => 102, 'type' => 'stop'], ['timestamp' => 108, 'type' => 'start']]]);
check(near($data['summary']['coverageSeconds']['power'], 4), 'timer transitions inside an interval exclude paused seconds');
$data = activity([point(100, 100, 0), point(100, 200, 0), point(101, 300, 10)]);
check(count($data['records']) === 3 && near($data['summary']['averages']['power'], 200), 'duplicate timestamps are preserved without double-weighting');
$data = activity([point(100, 100), point(101, 100, null, 1)]);
check(!isset($data['summary']['averages']['power']), 'no inferred interval bridges segment boundaries');
$data = activity([point(100, null, 0), point(101, null), point(102, null, 20)]);
check(near($data['records'][2]['distance'], 20), 'missing device-distance sample does not double-count cumulative distance');

$public = Activity::publicData($outdoor + ['provenance' => ['filename' => 'private.fit']], ['map' => false, 'power' => false, 'heartRate' => false, 'cadence' => true]);
check(!isset($public['decoded'], $public['provenance']) && $public['records'][0]['latitude'] === null && $public['records'][0]['power'] === null && $public['records'][0]['heartRate'] === null, 'public export strips archives, source details and disabled channels');
check(!isset($public['summary']['averages']['power']) && $public['summary']['workKj'] === null && $public['laps'][0]['avgHeartRate'] === null, 'hidden sensor values also disappear from summaries and laps');
foreach ([['latitude' => 91], ['power' => -1], ['timestamp' => 'yesterday'], ['segment' => 1.5]] as $invalid) {
    $failed = false; try { activity([$invalid]); } catch (InvalidArgumentException $e) { $failed = true; }
    check($failed, 'reject malformed field ' . key($invalid));
}

// In-memory WordPress meta API exercises compression, chunking and rollback semantics.
$meta = []; $failAt = null;
function get_post_meta($id, $key, $single = true) { global $meta; return $meta[$id][$key] ?? ''; }
function add_post_meta($id, $key, $value, $unique = false) { global $meta, $failAt; if ($failAt !== null && --$failAt <= 0) return false; $meta[$id][$key] = $value; return true; }
function update_post_meta($id, $key, $value) { global $meta; $meta[$id][$key] = $value; return true; }
function delete_post_meta($id, $key) { global $meta; unset($meta[$id][$key]); }
function wp_generate_uuid4() { return bin2hex(random_bytes(16)); }
function wp_json_encode($value, $flags = 0) { return json_encode($value, $flags); }
$source = random_bytes(400000);
Storage::write(10, $outdoor, $source, 'source.fit');
check(Storage::read(10, 'source') === $source && count(Storage::read(10)['records']) === 8, 'chunked archive restores original bytes and all records exactly');
$old = get_post_meta(10, '_gta_storage'); $failAt = 2;
try { Storage::write(10, $indoor, random_bytes(400000), 'new.fit'); } catch (RuntimeException $e) {}
$failAt = null;
check(get_post_meta(10, '_gta_storage') === $old && Storage::read(10, 'source') === $source, 'failed replacement preserves the previously committed archive');
Storage::write(10, $indoor, 'new source', 'indoor.fit');
check(Storage::read(10, 'source') === 'new source' && count($meta[10]) === 3, 'successful replacement removes old chunks and updates all views');

file_put_contents(__DIR__ . '/../../.test-output/viewer-data.json', json_encode(Activity::publicData($outdoor, ['map' => true, 'power' => true, 'heartRate' => true, 'cadence' => true]) + ['id' => 10, 'title' => 'Testrunde', 'status' => 'publish']));
echo "\n$count PHP checks passed.\n";
