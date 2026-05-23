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
 *   to a URL of your choice. Works with SPA-style re-renders via a
 *   MutationObserver.
 *
 * How to use
 *   1. Add `selector: 'https://target'` entries to the LINKS object below.
 *   2. To open in a new tab, prefix with `_blank|` — e.g. `_blank|https://...`.
 *   3. Build + commit + push (same workflow as the CSS).
 * ---------------------------------------------------------------------------
 */

(function () {
  'use strict';

  // ------------------------------------------------------------------
  // EDIT ME — selector -> URL mapping
  // ------------------------------------------------------------------
  var LINKS = {
    // Slogan text under the logo (the ::after "The Next Generation…").
    // '.app-ltr-1r910aa': 'https://azenplay.com/about',

    // Footer social icons (parent is the clickable target; ::before is decoration).
    // '.app-ltr-1h746bz:nth-child(1)': '_blank|https://www.tiktok.com/@azenplay',
    // '.app-ltr-1h746bz:nth-child(2)': '_blank|https://discord.gg/your-invite',
    // '.app-ltr-1h746bz:nth-child(3)': '_blank|https://www.instagram.com/azenplay',
    // '.app-ltr-1h746bz:nth-child(4)': '_blank|https://www.linkedin.com/company/azenplay',
    // '.app-ltr-1h746bz:nth-child(5)': '_blank|https://twitter.com/azenplay',
    // '.app-ltr-1h746bz:nth-child(6)': '_blank|https://www.youtube.com/@azenplay',
  };
  // ------------------------------------------------------------------

  var BOUND_ATTR = 'data-ap-bound';

  function parseTarget(value) {
    var idx = value.indexOf('|');
    if (idx === -1) return { url: value, target: '_self' };
    return { url: value.slice(idx + 1), target: value.slice(0, idx) };
  }

  function navigate(url, target) {
    if (target === '_blank') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }

  function bindOne(el, url, target) {
    if (el.getAttribute(BOUND_ATTR) === url) return; // idempotent
    el.setAttribute(BOUND_ATTR, url);
    el.style.cursor = 'pointer';
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'link');

    el.addEventListener('click', function (e) {
      e.preventDefault();
      navigate(url, target);
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate(url, target);
      }
    });
  }

  function bindAll() {
    Object.keys(LINKS).forEach(function (selector) {
      var spec = parseTarget(LINKS[selector]);
      var nodes = document.querySelectorAll(selector);
      for (var i = 0; i < nodes.length; i++) {
        bindOne(nodes[i], spec.url, spec.target);
      }
    });
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    bindAll();
    // SPA-friendly: re-bind whenever the DOM changes.
    if ('MutationObserver' in window && document.body) {
      var obs = new MutationObserver(bindAll);
      obs.observe(document.body, { childList: true, subtree: true });
    }
  });
})();
