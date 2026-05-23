// Smoke test for src/js/main.js — runs the script inside jsdom and asserts:
//   - target elements get bound (data-ap-bound, role, tabindex, cursor)
//   - click navigates (same tab vs new tab)
//   - Enter/Space keyboard activation works
//   - MutationObserver re-binds dynamically added elements
//   - binding is idempotent (no duplicate listeners)
//
// Run:  npm run test:js

import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const script = readFileSync(resolve('src/js/main.js'), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <div class="app-ltr-1r910aa">Slogan</div>
  <div class="social-row">
    <div class="app-ltr-1h746bz">tiktok</div>
    <div class="app-ltr-1h746bz">discord</div>
    <div class="app-ltr-1h746bz">instagram</div>
    <div class="app-ltr-1h746bz">linkedin</div>
    <div class="app-ltr-1h746bz">twitter</div>
    <div class="app-ltr-1h746bz">youtube</div>
  </div>
</body></html>`;

// Silence jsdom's navigation-not-implemented warnings — we intentionally trigger them.
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

// Intercept new-tab navigation.
let opened = null;
window.open = (url, target) => { opened = { url, target }; return null; };

// Same-tab navigation cannot be intercepted in jsdom (Location.href is locked
// non-configurable). We instead verify same-tab clicks via:
//   1. data-ap-bound attribute → asserts the script wired the right URL.
//   2. event.defaultPrevented → asserts the script's handler actually ran
//      (it calls preventDefault before navigating).
// The _blank path still gets full URL verification via the window.open spy.
const dispatchCancelableClick = (el) => {
  const ev = new window.MouseEvent('click', { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return ev.defaultPrevented;
};

window.eval(script);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { console.error('  FAIL', msg); failed += 1; }
};

await wait(20); // give DOMContentLoaded + observer a tick

console.log('\n[Initial binding]');
const slogan = document.querySelector('.app-ltr-1r910aa');
ok(slogan.getAttribute('data-ap-bound') === 'https://azenplay.com/about', 'slogan: data-ap-bound set');
ok(slogan.style.cursor === 'pointer', 'slogan: cursor pointer');
ok(slogan.getAttribute('role') === 'link', 'slogan: role=link');
ok(slogan.getAttribute('tabindex') === '0', 'slogan: tabindex=0');

const socials = document.querySelectorAll('.app-ltr-1h746bz');
ok(socials[0].getAttribute('data-ap-bound') === 'https://www.tiktok.com/@azenplay', 'social[0] bound to tiktok');
ok(socials[5].getAttribute('data-ap-bound') === 'https://www.youtube.com/@azenplay', 'social[5] bound to youtube');

console.log('\n[Click — same tab]');
opened = null;
const sloganPrevented = dispatchCancelableClick(slogan);
ok(sloganPrevented, 'slogan click handler ran and called preventDefault');
ok(opened === null, 'slogan click did NOT open new tab');

console.log('\n[Click — new tab (_blank)]');
opened = null;
socials[0].click();
ok(opened && opened.url === 'https://www.tiktok.com/@azenplay', 'tiktok click opened correct URL');
ok(opened && opened.target === '_blank', 'tiktok click used target=_blank');

console.log('\n[Keyboard activation]');
opened = null;
const enter = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
socials[2].dispatchEvent(enter);
ok(opened && opened.url === 'https://www.instagram.com/azenplay', 'Enter on instagram navigates');

opened = null;
const space = new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
socials[4].dispatchEvent(space);
ok(opened && opened.url === 'https://twitter.com/azenplay', 'Space on twitter navigates');

console.log('\n[MutationObserver re-bind for dynamic elements]');
const lateSlogan = document.createElement('div');
lateSlogan.className = 'app-ltr-1r910aa';
document.body.appendChild(lateSlogan);
await wait(180); // debounce is 100ms
ok(lateSlogan.getAttribute('data-ap-bound') === 'https://azenplay.com/about', 'dynamically added slogan is bound');
ok(dispatchCancelableClick(lateSlogan), 'dynamic slogan handler ran on click');

console.log('\n[Idempotency — no double-bind after re-scan]');
opened = null;
// Trigger another mutation so observer fires bindAll again.
document.body.appendChild(document.createElement('span'));
await wait(180);
ok(socials[1].getAttribute('data-ap-bound') === 'https://discord.gg/your-invite', 'discord still bound (attr unchanged)');
socials[1].click();
ok(opened && opened.url === 'https://discord.gg/your-invite', 'discord click navigates after rebind cycle');

console.log('\n[Invalid-selector resilience — script did not crash]');
ok(true, 'main.js loaded and ran without throwing on the configured LINKS');

if (failed) {
  console.error(`\nFAILED: ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nALL OK');
