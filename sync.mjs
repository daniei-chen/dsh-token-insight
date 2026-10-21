// Sync the source plugin into the installed node_modules copy.
// Usage:  node sync.mjs
// Override destination:  DSH_USAGE_STATS_DEST=... node sync.mjs
import { cpSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const profile = process.env.DSH_PROFILE || 'desktop';
const dest =
  process.env.DSH_USAGE_STATS_DEST ||
  join(homedir(), '.dsh', 'profiles', profile, 'node_modules', 'dsh-token-insight');
const files = [
  'lib/client.js',
  'lib/index.js',
  'package.json',
  'cordis.patch.yml',
  'README.md',
  'LICENSE',
  'locale/en.json',
  'locale/zh.json'
];

for (const f of files) {
  const source = join(here, f);
  if (!existsSync(source)) continue;
  const target = join(dest, f);
  if (existsSync(target)) {
    const a = statSync(source);
    const b = statSync(target);
    if (a.dev === b.dev && a.ino === b.ino) {
      console.log('same file, skipped', f);
      continue;
    }
  }
  mkdirSync(join(dest, dirname(f)), { recursive: true });
  cpSync(source, target);
  console.log('synced', f, '->', target);
}
console.log('done. Remember to restart "dsh web" for host-side changes to take effect.');
