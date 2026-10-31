import test from 'node:test';
import assert from 'node:assert/strict';
import { Color } from '@kurkle/color';
import { color, getHoverColor } from 'chart.js/helpers';

test('Chart.js uses the overridden Color class and preserves chart channel colors', () => {
  for (const value of ['#658a4b', '#a14bc4', '#d95850', '#d18c24']) {
    const parsed = color(value);
    assert.ok(parsed instanceof Color, 'Chart.js must use the current shared color dependency');
    assert.equal(parsed.valid, true);
    assert.equal(parsed.hexString().toLowerCase(), value);
    assert.match(getHoverColor(value), /^#[0-9a-f]{3,8}$/i);
    assert.equal(parsed.hexString().toLowerCase(), value, 'hover calculation must not mutate the base color');
  }
});

test('Chart.js color helpers handle alpha and native canvas styles with the new dependency', () => {
  const parsed = color('rgba(161, 75, 196, 0.5)');
  assert.equal(parsed.valid, true);
  assert.deepEqual({ r: parsed.rgb.r, g: parsed.rgb.g, b: parsed.rgb.b }, { r: 161, g: 75, b: 196 });
  assert.ok(Math.abs(parsed.rgb.a - 0.5) < 0.01);
  for (const type of ['CanvasGradient', 'CanvasPattern']) {
    const style = { toString: () => `[object ${type}]` };
    assert.equal(color(style), style);
    assert.equal(getHoverColor(style), style);
  }
});
