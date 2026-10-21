# AGENTS.md

## Project

`dsh-token-insight` is a local-first token usage dashboard plugin for DeepSeek Harness (DSH).
It reads local `~/.dsh` session/billing files and renders a settings-page dashboard. It does not use
the network or upload user data.

## Install

Read and follow **[docs/INSTALL_FOR_AGENTS.md](docs/INSTALL_FOR_AGENTS.md)**. Do not skip verification.

Quick path:

```bash
node scripts/install.mjs --profile desktop
# fully restart DSH
```

## Hard rules

- Do not modify or delete `~/.dsh/sessions`, `~/.dsh/storages`, or the user's profile without a
  backup.
- Keep these identifiers equal: package name `dsh-token-insight`, `cordis.patch.yml` entry id/name,
  `lib/client.js` `__ModuleLoader__.load` id, and `lib/index.js` `export const name`.
- Host-side changes require a full DSH restart; a browser refresh is not enough.
- Do not commit `node_modules`, credentials, `.env`, cache files, or real user data.
- The Android app is a separate repo: `daniei-chen/DeepSeek-Harness-APP`. Its install guide is
  authoritative for the app half.

## Validate

```bash
node --check lib/client.js
node --check lib/index.js
```

If DSH is running, verify `GET /usage-stats/api?days=30` returns `{"ok":true,...}` and the settings
page shows 使用统计.
