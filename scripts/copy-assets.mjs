// Copies src/imgs -> dist/imgs as part of `npm run build`.
// Zero deps, cross-platform (Node >= 16.7 fs.cpSync). Skips .DS_Store.

import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('src/imgs');
const dest = resolve('dist/imgs');

if (!existsSync(src)) {
  console.log('copy-assets: no src/imgs — skipping.');
  process.exit(0);
}

cpSync(src, dest, {
  recursive: true,
  filter: (s) => !s.endsWith('.DS_Store'),
});

console.log('copy-assets: src/imgs -> dist/imgs ✓');
