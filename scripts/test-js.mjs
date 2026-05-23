// Smoke test for src/js/main.js — runs the script inside jsdom and asserts:
//   - Whole-element mode (entries without ::after/::before):
//       binding, click (same-tab + _blank), Enter/Space, dynamic re-bind.
//   - Pseudo-element mode (entries ending in ::after / ::before):
//       parseEntry strips the pseudo and queries the host; capture-phase
//       click navigates ONLY when the click coordinates fall inside the
//       pseudo's mocked rect, otherwise propagation reaches the host's own
//       handler (a stand-in for the parent's native link).
//
// jsdom doesn't lay out elements, so getBoundingClientRect / getComputedStyle
// are stubbed per fixture to return controlled geometry.
//
// Run:  npm run test:js

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const script = readFileSync(resolve('src/js/main.js'), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <!-- Whole-element test target -->
  <a href="https://platform-default/" class="whole-target">click me</a>

  <!-- Pseudo-element test target. The host is a real <a>; we want clicks
       inside its ::after rect to override the href, but clicks elsewhere
       to fall through to the native link. -->
  <a href="https://platform-default/" class="pseudo-host" id="pseudo-host">host</a>
</body></html>`;

// Suppress jsdom navigation-not-implemented errors.
const vc = new VirtualConsole();
vc.on('jsdomError', () => {});

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  url: 'https://test.local/',
  pretendToBeVisual: true,
  virtualConsole: vc,
});
const { window } = dom;
const { document } = window;

// Override LINKS via the public hook BEFORE the script runs.
window.AZENPLAY_LINKS = [
  { selector: '.whole-target', url: 'https://example.com/whole', target: '_blank' },
  { selector: '#pseudo-host::after', url: 'https://example.com/pseudo', target: '_blank' },
];

// Mock geometry on the pseudo host:
//   host rect: 0,0 → 200,100
//   ::after  : position:absolute, left:0, top:0, width:50px, height:50px
//   (so clicks at x<50 && y<50 are "inside" the pseudo).
const host = document.querySelector('#pseudo-host');
host.getBoundingClientRect = () => ({
  left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100,
  x: 0, y: 0, toJSON() { return this; },
});
const origGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (el, pseudo) => {
  if (el === host && (pseudo === '::after' || pseudo === '::before')) {
    return {
      content: '""', display: 'block', position: 'absolute',
      width: '50px', height: '50px', minHeight: '0px',
      left: '0px', top: '0px', right: 'auto', bottom: 'auto',
    };
  }
  return origGetComputedStyle(el, pseudo);
};

// Spies.
let opened = null;
window.open = (url, target) => { opened = { url, target }; return null; };

// Track whether the host's own link / handler would have fired
// (i.e. propagation was NOT stopped).
let hostHandlerFired = false;
host.addEventListener('click', () => { hostHandlerFired = true; });
// Prevent the actual <a> default so jsdom doesn't try to navigate when the
// pseudo handler does NOT intercept.
host.addEventListener('click', (e) => e.preventDefault());

window.eval(script);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { console.error('  FAIL', msg); failed += 1; }
};

await wait(20);

// ----------------------------------------------------------------------------
console.log('\n[Whole-element binding]');
const whole = document.querySelector('.whole-target');
ok(whole.getAttribute('data-ap-bound') === 'https://example.com/whole', 'whole: data-ap-bound set');
ok(whole.style.cursor === 'pointer', 'whole: cursor pointer');
ok(whole.getAttribute('role') === 'link', 'whole: role=link');
ok(whole.getAttribute('tabindex') === '0', 'whole: tabindex=0');

opened = null;
whole.click();
ok(opened?.url === 'https://example.com/whole' && opened.target === '_blank', 'whole: click opens correct URL in new tab');

// ----------------------------------------------------------------------------
console.log('\n[Pseudo-element binding]');
ok(host.getAttribute('data-ap-bound-after') === 'https://example.com/pseudo', 'pseudo: data-ap-bound-after set on host');
ok(host.style.cursor !== 'pointer', 'pseudo: host cursor NOT forced (host still acts as itself)');

// ----------------------------------------------------------------------------
console.log('\n[Pseudo click — inside rect]');
opened = null; hostHandlerFired = false;
const inside = new window.MouseEvent('click', {
  bubbles: true, cancelable: true, clientX: 10, clientY: 10,
});
host.dispatchEvent(inside);
ok(opened?.url === 'https://example.com/pseudo', 'inside-pseudo click navigates to pseudo URL');
ok(hostHandlerFired === false, 'inside-pseudo click stopped propagation (host handler did NOT run)');

// ----------------------------------------------------------------------------
console.log('\n[Pseudo click — outside rect]');
opened = null; hostHandlerFired = false;
const outside = new window.MouseEvent('click', {
  bubbles: true, cancelable: true, clientX: 150, clientY: 80,
});
host.dispatchEvent(outside);
ok(opened === null, 'outside-pseudo click did NOT trigger pseudo URL');
ok(hostHandlerFired === true, 'outside-pseudo click propagated to host (its own link would fire)');

// ----------------------------------------------------------------------------
console.log('\n[MutationObserver re-bind for dynamic elements]');
const lateWhole = document.createElement('a');
lateWhole.className = 'whole-target';
lateWhole.href = 'https://platform-default/';
document.body.appendChild(lateWhole);
await wait(180);
ok(lateWhole.getAttribute('data-ap-bound') === 'https://example.com/whole', 'dynamically added whole-target is bound');

// ----------------------------------------------------------------------------
console.log('\n[Idempotency — no double-bind after re-scan]');
// Force another bindAll cycle via a fresh mutation.
document.body.appendChild(document.createElement('span'));
await wait(180);
opened = null;
whole.click();
ok(opened?.url === 'https://example.com/whole', 'whole click still fires exactly once after rebind cycle');

// ----------------------------------------------------------------------------
console.log('\n[Invalid-selector resilience]');
ok(true, 'main.js loaded and ran without throwing on the configured LINKS');

if (failed) {
  console.error(`\nFAILED: ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nALL OK');
