# AzenPlay — Custom Override CSS

A SCSS-based theming environment for the [AzenPlay](https://azenplay.com) iGaming
platform. You author tokens and component overrides in SCSS, compile to a single
CSS file with one command, and embed that file in the back office (via GitHub raw
URL or a CDN) to override the platform's stock styles.

## Quick start

```bash
npm install      # one-time
npm run build    # compile src/ -> dist/ (expanded + minified, autoprefixed)
npm run dev      # watch mode: recompile on every save
```

Output:

| File | Purpose |
| --- | --- |
| `dist/azenplay-custom.css` | Readable build (debugging) |
| `dist/azenplay-custom.min.css` | Minified build (production embed) |

> `dist/` is committed on purpose — GitHub raw / jsDelivr serve the file straight
> from the repo. Run `npm run build` and commit the result before embedding.

## Embedding in the back office

Build, commit, and push. Then use one of these URLs as the override stylesheet:

**jsDelivr CDN (recommended — cached, fast, global):**
```
https://cdn.jsdelivr.net/gh/InfinetixLtd/AzenPlay-Custom-CSS@main/dist/azenplay-custom.min.css
```
Pin a release for stability and bust the cache on update by tagging, e.g.
`@v1.0.0` instead of `@main`.

**GitHub raw (uncached, fine for testing):**
```
https://raw.githubusercontent.com/InfinetixLtd/AzenPlay-Custom-CSS/main/dist/azenplay-custom.min.css
```

> **The URL must start with `https://`.** azenplay.com is served over HTTPS, and
> browsers treat stylesheets and scripts as *blockable* mixed content: an
> `http://` URL is blocked outright, and the browser will **not** follow
> jsDelivr's http→https redirect. The console shows:
>
> ```
> Mixed Content: The page at 'https://azenplay.com/...' was loaded over HTTPS,
> but requested an insecure stylesheet 'http://cdn.jsdelivr.net/...'.
> This request has been blocked; the content must be served over HTTPS.
> ```
>
> The file is fine when this happens — only the scheme in the back-office field
> is wrong. Fix the `http://` → `https://` and the override loads. The same
> applies to the companion `azenplay-custom.min.js` embed.

### Troubleshooting

| Symptom | Cause |
| --- | --- |
| `Mixed Content … has been blocked` | Embed URL uses `http://`. Change it to `https://`. |
| Overrides load but nothing changes | Platform CSS is more specific — see *Mapping to the platform's real selectors*. |
| Stale CSS after a push | jsDelivr caches `@main` aggressively. Pin the commit SHA or a tag instead. |

## Project structure (SCSS 7-1, modern `@use`/`@forward`)

```
src/
├─ abstracts/        # no CSS output — the design system
│  ├─ _variables.scss      # build-time tokens (colours, spacing, type, …)
│  ├─ _css-variables.scss  # emits :root --ap-* custom properties (runtime)
│  ├─ _functions.scss      # spacer(), fs(), fw(), z(), rem()
│  ├─ _mixins.scss         # up()/down() media queries, focus-ring, etc.
│  └─ _index.scss
├─ base/             # reset, typography, global element overrides
├─ layout/           # header, sidebar, footer, grid / page shell
├─ components/       # buttons, cards, forms, navigation, modals
├─ themes/           # data-theme="dark" / "light" runtime overrides
├─ overrides/        # YOUR file — override the platform's real classes/ids
│  └─ _platform.scss # loaded last; wins the cascade. Start here for tweaks.
└─ main.scss         # entry point — controls layer/cascade order
```

## How theming works (two layers)

1. **Build-time tokens** live in `abstracts/_variables.scss`. Change a brand
   colour there and the whole sheet follows on the next `npm run build`.
2. **Runtime tokens** are emitted as `--ap-*` CSS custom properties on `:root`.
   Components read them via `var(--ap-color-primary)` etc., so you (or the back
   office) can retheme live — even without recompiling — by overriding a handful
   of variables.

### Switching themes at runtime

Add an attribute or class to `<html>` or `<body>`:

```html
<body data-theme="light">   <!-- or class="theme-dark" -->
```

Define new themes in `src/themes/` by overriding `--ap-*` under your selector.

## Customising a component

Each component declares its own local variables, so it can be retuned in
isolation. Example — make all primary buttons gold and pill-shaped:

```scss
// src/components/_buttons.scss
.btn {
  --btn-bg: var(--ap-color-accent);
  --btn-radius: var(--ap-radius-pill);
}
```

## Mapping to the platform's real selectors

The component selectors (`.btn`, `.card`, `.azp-*`, …) are sensible defaults.
Inspect the live AzenPlay DOM and replace/add the platform's actual class names
in the relevant partial. If the platform's CSS is more specific than yours and
your rules don't take effect, either:

- scope everything under the app root by setting `$root-scope` (see the note in
  `src/main.scss`), or
- raise specificity locally / use `!important` sparingly for stubborn rules.

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Clean, compile expanded + minified, autoprefix |
| `npm run dev` / `npm run watch` | Recompile on save |
| `npm run compile` | Expanded CSS only |
| `npm run compile:min` | Minified CSS only |
| `npm run clean` | Remove `dist/` |
```
