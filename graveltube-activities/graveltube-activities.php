<?php
/**
 * Plugin Name: GravelTube Activities
 * Description: FIT-, GPX- und TCX-Aktivitäten mit vollständigen Messdaten, Tourenkarte und Trainingsdiagrammen.
 * Version: 0.4.2
 * Requires at least: 6.3
 * Requires PHP: 7.4
 * Author: Pascal Kurschildgen; based on Show Fit File by Stuart Tevendale
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Update URI: https://graveltu.be/plugins/graveltube-activities/
 * Text Domain: graveltube-activities
 *
 * Derived from Show Fit File 1.2.7. New storage, import and display implementation, 2026-10-31.
 */
namespace GravelTube\Activities;
if (!defined('ABSPATH')) exit;

define('GTA_VERSION', '0.4.2');
require_once __DIR__ . '/includes/class-activity.php';
require_once __DIR__ . '/includes/class-storage.php';
require_once __DIR__ . '/includes/class-presentation.php';
require_once __DIR__ . '/includes/class-activity-title.php';
require_once __DIR__ . '/includes/class-route-privacy.php';
require_once __DIR__ . '/includes/class-map-view.php';
require_once __DIR__ . '/includes/class-plugin.php';
Plugin::boot(__FILE__);
