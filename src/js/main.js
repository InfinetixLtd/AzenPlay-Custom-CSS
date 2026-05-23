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
 * Two binding modes
 *   1. Whole-element click  (selector has NO pseudo suffix)
 *        { selector: '.btn', url: 'https://...' }
 *      The element itself becomes clickable (cursor pointer, role=link,
 *      keyboard accessible). Click anywhere on it -> navigate.
 *
 *   2. Pseudo-element click (selector ENDS with ::after or ::before)
 *        { selector: '.foo::after', url: 'https://...' }
 *      Used when the parent already has its own hyperlink/handler and you
 *      only want the pseudo-element's visual region to trigger a different
 *      URL. A capture-phase listener on the host runs FIRST; it computes
 *      the pseudo-element's rect from getComputedStyle + the host's
 *      bounding rect and navigates ONLY if the click coordinates fall
 *      inside that rect. Clicks elsewhere on the host fall through to the
 *      host's own link. (Pseudo-elements aren't in the DOM, so this
 *      geometry-based approach is the cleanest way to target them.)
 *
 * Fields per entry
 *   selector  (required) CSS selector. May end with ::after or ::before.
 *   url       (required) Absolute URL to navigate to on click.
 *   target    (optional) '_self' (default) or '_blank' for a new tab.
 *
 * Runtime override
 *   Set window.AZENPLAY_LINKS = [...] BEFORE this script loads, and your
 *   array wins over the hardcoded DEFAULT_LINKS below. Useful for tests or
 *   per-page customisation injected via the back office.
 * ---------------------------------------------------------------------------
 */

(() => {
  'use strict';

  // ------------------------------------------------------------------
  // EDIT ME — add / remove / reorder entries freely.
  // ------------------------------------------------------------------
  const DEFAULT_LINKS = [
    // Footer regulatory logos — only the ::after image area is clickable;
    // the parent's existing hyperlink still works for non-logo clicks.
    { selector: '.app-ltr-1uzs5zs::after',     url: 'https://betrari.win/en/',                target: '_blank' },
    { selector: '.app-ltr-1uzs5zs ul::after',  url: 'https://dmbobet.com/en/',                target: '_blank' },
    { selector: '.app-ltr-1uzs5zs li::after',  url: 'https://dmbobet.com/en/g-casino/casino', target: '_blank' },

    // Whole-element examples — uncomment to use:
    // { selector: '.some-button', url: 'https://...' },
    // { selector: '#some-id',     url: 'https://...', target: '_blank' },
  ];
  // ------------------------------------------------------------------

  const PSEUDO_RE = /^(.+?)(::(?:before|after))$/;
  const bindings = new WeakMap(); // el -> Set<bindingKey>

  const getLinks = () =>
    (Array.isArray(globalThis.AZENPLAY_LINKS) && globalThis.AZENPLAY_LINKS) || DEFAULT_LINKS;

  const parseEntry = (raw) => {
    if (!raw?.selector || !raw?.url) return null;
    const m = raw.selector.match(PSEUDO_RE);
    return {
      hostSelector: m ? m[1].trim() : raw.selector,
      pseudo: m ? m[2] : null,
      url: raw.url,
      target: raw.target || '_self',
    };
  };

  const navigate = (url, target) => {
    if (target === '_blank') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  // Resolve a CSS length token against a container dimension. Returns null
  // for 'auto'/empty so callers can detect missing edges.
  const lengthFrom = (token, container) => {
    if (!token || token === 'auto' || token === 'none') return null;
    if (token.endsWith('px')) return parseFloat(token);
    if (token.endsWith('%')) return (container * parseFloat(token)) / 100;
    const n = parseFloat(token);
    return Number.isFinite(n) ? n : null;
  };

  // Approximate the visual rect of a pseudo-element using its computed
  // style + the host's bounding rect. Assumes position:absolute (typical for
  // decorative pseudo-elements). Falls back to the host rect if the pseudo
  // has no `content` or is display:none.
  const pseudoRect = (host, pseudo) => {
    const cs = window.getComputedStyle(host, pseudo);
    if (!cs || cs.content === 'none' || cs.display === 'none') return null;
    const hr = host.getBoundingClientRect();

    const w = lengthFrom(cs.width, hr.width) ?? hr.width;
    const minH = lengthFrom(cs.minHeight, hr.height) ?? 0;
    const h = Math.max(lengthFrom(cs.height, hr.height) ?? 0, minH) || hr.height;

    const left = lengthFrom(cs.left, hr.width);
    const top = lengthFrom(cs.top, hr.height);
    const right = lengthFrom(cs.right, hr.width);
    const bottom = lengthFrom(cs.bottom, hr.height);

    const x = left !== null ? hr.left + left
            : right !== null ? hr.right - right - w
            : hr.left;
    const y = top !== null ? hr.top + top
            : bottom !== null ? hr.bottom - bottom - h
            : hr.top;

    return { left: x, top: y, right: x + w, bottom: y + h };
  };

  const clickInsidePseudo = (host, pseudo, evt) => {
    const r = pseudoRect(host, pseudo);
    if (!r) return false;
    return evt.clientX >= r.left && evt.clientX <= r.right
        && evt.clientY >= r.top  && evt.clientY <= r.bottom;
  };

  const bindOne = (el, entry) => {
    let keys = bindings.get(el);
    if (!keys) { keys = new Set(); bindings.set(el, keys); }
    const key = `${entry.pseudo || ''}|${entry.url}`;
    if (keys.has(key)) return; // idempotent
    keys.add(key);

    if (entry.pseudo) {
      // Capture phase so we run BEFORE the parent's own link/handlers.
      el.addEventListener('click', (e) => {
        if (!clickInsidePseudo(el, entry.pseudo, e)) return; // let host handle
        e.preventDefault();
        e.stopImmediatePropagation();
        navigate(entry.url, entry.target);
      }, true);
      // Tag the host so debugging and tests can verify wiring.
      const attr = `data-ap-bound-${entry.pseudo.replace(/:/g, '')}`;
      el.setAttribute(attr, entry.url);
      return;
    }

    // Whole-element binding (original behaviour).
    el.setAttribute('data-ap-bound', entry.url);
    el.style.cursor = 'pointer';
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'link');

    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(entry.url, entry.target);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate(entry.url, entry.target);
      }
    });
  };

  const bindAll = () => {
    for (const raw of getLinks()) {
      const entry = parseEntry(raw);
      if (!entry) continue;
      let nodes;
      try {
        nodes = document.querySelectorAll(entry.hostSelector);
      } catch (err) {
        console?.warn?.('[azenplay] invalid selector:', raw.selector, err);
        continue;
      }
      for (const node of nodes) bindOne(node, entry);
    }
  };

  // Coalesce mutation bursts so we don't re-scan on every node change.
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
      const obs = new MutationObserver(debounce(bindAll, 100));
      obs.observe(document.body, { childList: true, subtree: true });
    }
  });
})();
