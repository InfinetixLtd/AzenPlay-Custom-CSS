/*
 * AzenPlay — Custom Override JavaScript
 * ---------------------------------------------------------------------------
 * Companion to azenplay-custom.css. Compiles to:
 *   dist/azenplay-custom.js     (readable)
 *   dist/azenplay-custom.min.js (minified — embed this in the back office)
 *
 * Embed via jsDelivr (same pattern as the CSS file):
 *   <script defer
 *     src="https://cdn.jsdelivr.net/gh/InfinetixLtd/AzenPlay-Custom-CSS@<SHA>/dist/azenplay-custom.min.js">
 *   </script>
 *
 * Purpose
 *   CSS pseudo-elements (::before / ::after) live outside the DOM and cannot
 *   receive clicks directly. This script makes the PARENT element clickable,
 *   so clicking anywhere on it (including pseudo-element text/icons) navigates
 *   to a URL of your choice. Works with SPA re-renders via a debounced
 *   MutationObserver.
 *
 * How to add a new link
 *   Append a row to the LINKS array below:
 *     { selector: '.some-class', url: 'https://...' }
 *     { selector: '#btn',        url: 'https://...', target: '_blank' }
 *   Then: npm run build && git add ... && git push.
 *
 *   Fields per entry:
 *     selector  (required) CSS selector — anything querySelectorAll accepts.
 *     url       (required) Absolute URL to navigate to on click.
 *     target    (optional) '_self' (default) or '_blank' to open a new tab.
 * ---------------------------------------------------------------------------
 */

(() => {
  'use strict';

  // ------------------------------------------------------------------
  // EDIT ME — add / remove / reorder entries freely.
  // ------------------------------------------------------------------
  const LINKS = [
    // Slogan text under the logo (the ::after "The Next Generation…").
    { selector: '.app-ltr-1r910aa', url: 'https://azenplay.com/about' },

    // Footer social icons — parent is clickable; ::before is decoration.
    { selector: '.app-ltr-1h746bz:nth-child(1)', url: 'https://www.tiktok.com/@azenplay',          target: '_blank' },
    { selector: '.app-ltr-1h746bz:nth-child(2)', url: 'https://discord.gg/your-invite',            target: '_blank' },
    { selector: '.app-ltr-1h746bz:nth-child(3)', url: 'https://www.instagram.com/azenplay',        target: '_blank' },
    { selector: '.app-ltr-1h746bz:nth-child(4)', url: 'https://www.linkedin.com/company/azenplay', target: '_blank' },
    { selector: '.app-ltr-1h746bz:nth-child(5)', url: 'https://twitter.com/azenplay',              target: '_blank' },
    { selector: '.app-ltr-1h746bz:nth-child(6)', url: 'https://www.youtube.com/@azenplay',         target: '_blank' },

    // Add more here:
    // { selector: '...', url: '...', target: '_blank' },
  ];
  // ------------------------------------------------------------------

  const BOUND_ATTR = 'data-ap-bound';

  const navigate = (url, target) => {
    if (target === '_blank') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  const bindOne = (el, url, target) => {
    if (el.getAttribute(BOUND_ATTR) === url) return; // idempotent — already wired
    el.setAttribute(BOUND_ATTR, url);
    el.style.cursor = 'pointer';
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'link');

    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(url, target);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate(url, target);
      }
    });
  };

  const bindAll = () => {
    for (const entry of LINKS) {
      if (!entry || !entry.selector || !entry.url) continue;
      const target = entry.target || '_self';
      let nodes;
      try {
        nodes = document.querySelectorAll(entry.selector);
      } catch (err) {
        console?.warn?.('[azenplay] invalid selector:', entry.selector, err);
        continue;
      }
      for (const node of nodes) {
        bindOne(node, entry.url, target);
      }
    }
  };

  // Coalesce bursts of DOM mutations so we don't re-scan on every node change.
  const debounce = (fn, ms) => {
    let t = 0;
    return () => {
      if (t) clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  };

  const ready = (fn) => {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  ready(() => {
    bindAll();
    if ('MutationObserver' in window && document.body) {
      const rebind = debounce(bindAll, 100);
      const obs = new MutationObserver(rebind);
      obs.observe(document.body, { childList: true, subtree: true });
    }
  });
})();
