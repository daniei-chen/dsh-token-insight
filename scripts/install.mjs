#!/usr/bin/env node
/**
 * Install dsh-token-insight into a DSH profile without pnpm.
 *
 * Usage:
 *   node scripts/install.mjs --profile desktop
 *   node scripts/install.mjs --profile desktop --dry-run
 *
 * The script edits the profile package.json, adds the bundle, and creates a
 * junction/symlink in the profile's node_modules. It does not touch user data.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
let profile = process.env.DSH_PROFILE || 'desktop';
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--profile' && args[i + 1]) profile = args[++i];
  else if (arg.startsWith('--profile=')) profile = arg.slice('--profile='.length);
  else if (arg === '--dry-run') dryRun = true;
  else if (arg === '--help' || arg === '-h') {
    console.log('Usage: node scripts/install.mjs --profile desktop [--dry-run]');
    process.exit(0);
  }
}

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dshHome = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
const profileDir = path.join(dshHome, 'profiles', profile);
const packagePath = path.join(profileDir, 'package.json');
const target = path.join(profileDir, 'node_modules', 'dsh-token-insight');
const oldScopeDir = path.join(profileDir, 'node_modules', '@dsh-external', 'dsh-usage-stats');
const packageName = 'dsh-token-insight';

function fail(message) {
  console.error(`[dsh-token-insight] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(packagePath)) {
  fail(`profile not found: ${packagePath}. Use --profile <name> or set DSH_HOME.`);
}

const manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
manifest.dependencies = manifest.dependencies || {};
manifest.dsh = manifest.dsh || {};
manifest.dsh.profile = manifest.dsh.profile || {};
manifest.dsh.profile.bundles = manifest.dsh.profile.bundles || [];

// Clean the old package identity from earlier local builds.
delete manifest.dependencies['@dsh-external/dsh-usage-stats'];
manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter(
  (name) => name !== '@dsh-external/dsh-usage-stats'
);

manifest.dependencies[packageName] = 'file:' + repo.replace(/\\/g, '/');
if (!manifest.dsh.profile.bundles.includes(packageName)) {
  manifest.dsh.profile.bundles.push(packageName);
}

console.log(`[dsh-token-insight] profile: ${profileDir}`);
console.log(`[dsh-token-insight] repo:    ${repo}`);
console.log(`[dsh-token-insight] target:  ${target}`);

if (dryRun) {
  console.log('[dsh-token-insight] dry-run: no files written');
  process.exit(0);
}

const backupPath = `${packagePath}.bak-dsh-token-insight-${Date.now()}`;
fs.copyFileSync(packagePath, backupPath);
fs.writeFileSync(packagePath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`[dsh-token-insight] updated ${packagePath} (backup: ${backupPath})`);

fs.mkdirSync(path.dirname(target), { recursive: true });

if (fs.existsSync(target)) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) {
    const current = fs.realpathSync(target);
    if (current === fs.realpathSync(repo)) {
      console.log('[dsh-token-insight] link already points to this repo');
    } else {
      fs.unlinkSync(target);
      fs.symlinkSync(repo, target, process.platform === 'win32' ? 'junction' : 'dir');
      console.log('[dsh-token-insight] replaced existing link');
    }
  } else {
    const installed = path.join(target, 'package.json');
    let name;
    try {
      name = JSON.parse(fs.readFileSync(installed, 'utf8')).name;
    } catch {
      fail(`${target} exists but is not a dsh-token-insight package; remove it manually.`);
    }
    if (name !== packageName) {
      fail(`${target} contains ${name}, not ${packageName}; remove it manually.`);
    }
    console.log('[dsh-token-insight] existing package directory kept');
  }
} else {
  fs.symlinkSync(repo, target, process.platform === 'win32' ? 'junction' : 'dir');
  console.log('[dsh-token-insight] created node_modules link');
}

if (fs.existsSync(oldScopeDir)) {
  const stat = fs.lstatSync(oldScopeDir);
  if (stat.isSymbolicLink()) {
    fs.unlinkSync(oldScopeDir);
    console.log('[dsh-token-insight] removed old @dsh-external/dsh-usage-stats link');
  } else {
    console.log(
      '[dsh-token-insight] note: old @dsh-external/dsh-usage-stats directory still exists; ' +
        'remove it manually if DSH still lists the old plugin.'
    );
  }
}

console.log('');
console.log('[dsh-token-insight] installed.');
console.log('Next: fully restart DSH (close the app and reopen it), then open Settings -> 使用统计.');
console.log('Verify: curl "http://127.0.0.1:<DSH_PORT>/usage-stats/api?days=30"');
