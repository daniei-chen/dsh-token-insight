# Install DSH Token Insight — guide for AI agents

This file is written so an agent (Claude Code, Codex, Cursor, DSH itself, …) can install the plugin
and the companion Android app **without reading the source**. Follow it in order and do not skip the
verification steps.

The product has two independent halves:

| Half | What it is | Where it goes |
| --- | --- | --- |
| **`dsh-token-insight`** (this repo) | DSH host plugin + settings-page dashboard | the machine running DSH |
| **DeepSeek-Harness-APP** (separate repo) | Android WebView shell + Relay/connection host plugin | phone + the machine running DSH |

Installing this repo does **not** install the Android app. Installing the Android app does **not**
install this dashboard. Both can coexist.

---

## 0. TL;DR

```bash
git clone https://github.com/daniei-chen/dsh-token-insight.git
cd dsh-token-insight
node scripts/install.mjs --profile desktop
# fully restart DSH (close the app, reopen it)
```

Verify:

```bash
curl "http://127.0.0.1:<DSH_PORT>/usage-stats/api?days=30"
# -> {"ok":true,"totalTokens":...}
```

Open DSH → Settings → 使用统计.

---

## 1. Prerequisites

| Item | Required value | Check |
| --- | --- | --- |
| DSH | `0.2.1-rc.2` or newer | DSH app About / `app.asar` package.json |
| DSH profile | `desktop` (default) | `~/.dsh/profiles/desktop/package.json` exists |
| DSH runtime Node | Node 24 | plugin imports `node:sqlite` |
| Git | any recent | `git --version` |

`DSH_HOME` defaults to `~/.dsh`. On Windows that is `C:\Users\<user>\.dsh`.

Do **not** delete `~/.dsh/sessions`, `~/.dsh/storages/web-billing.json`, or
`~/.dsh/storages/cost-meter/ledger.json`: they are the data sources.

---

## 2. Install the plugin

### 2.1 One-command installer (recommended)

```bash
git clone https://github.com/daniei-chen/dsh-token-insight.git
cd dsh-token-insight
node scripts/install.mjs --profile desktop
```

The script:

1. adds `"dsh-token-insight": "file:<repo>"` to the profile `dependencies`;
2. adds `dsh-token-insight` to `dsh.profile.bundles`;
3. creates `~/.dsh/profiles/desktop/node_modules/dsh-token-insight` as a junction/symlink to the repo.

It removes the old `@dsh-external/dsh-usage-stats` dependency and bundle entry if present.

Dry run:

```bash
node scripts/install.mjs --profile desktop --dry-run
```

### 2.2 DSH plugin manager (GUI)

DSH → 插件 → 添加插件 → 第三方插件 → choose the cloned repo folder (or a `npm pack` tarball) →
install → restart DSH.

### 2.3 Manual fallback

Edit `~/.dsh/profiles/desktop/package.json`:

```json
{
  "dependencies": {
    "dsh-token-insight": "file:/absolute/path/to/dsh-token-insight"
  },
  "dsh": {
    "profile": {
      "bundles": ["...", "dsh-token-insight"]
    }
  }
}
```

Create the link:

```powershell
# Windows
New-Item -ItemType Junction `
  -Path "$HOME/.dsh/profiles/desktop/node_modules/dsh-token-insight" `
  -Target "<absolute-path-to-dsh-token-insight>"
```

```bash
# macOS / Linux
ln -s "<absolute-path-to-dsh-token-insight>" \
  "$HOME/.dsh/profiles/desktop/node_modules/dsh-token-insight"
```

The package's `cordis.patch.yml` is applied automatically by the bundle layer; do not add a second
profile patch entry.

### 2.4 Restart DSH

**Required.** The host plugin is imported at process start and is not hot-reloaded. Close
DeepSeek Harness completely and reopen it.

---

## 3. Verify the plugin

Run these checks in order.

### 3.1 Package resolution

```bash
cd "$HOME/.dsh/profiles/desktop"
node -e "console.log(require.resolve('dsh-token-insight'))"
node -e "console.log(require.resolve('dsh-token-insight/client'))"
```

Expected: both paths point into the cloned `dsh-token-insight` repo.

### 3.2 API response

Find the DSH Web GUI port (the app's Web GUI URL, or the listening port of the DSH process), then:

```bash
curl "http://127.0.0.1:<port>/usage-stats/api?days=30"
```

Expected fields:

```json
{
  "ok": true,
  "totalTokens": 0,
  "peakTokens": 0,
  "longestChat": "不足 1 分钟",
  "currentStreak": 0,
  "longestStreak": 0,
  "models": []
}
```

`totalTokens > 0` when local sessions exist. `models` is the local model breakdown.

### 3.3 UI

DSH → Settings (设置) → **使用统计**:

- 5 metric cards: 累计 Token / 峰值 Token / 最长聊天时长 / 当前连续天数 / 最长连续天数
- 52-week heatmap with 每日 / 每周 / 累计
- 7/30-day trend chart
- model ring + list

The plugin manager's 已安装 list should show `dsh-token-insight`, display name「使用统计」.

### 3.4 No duplicate entries

If Settings shows both 「DSH 使用统计」 and 「使用统计」, or the plugin list shows the old
`@dsh-external/dsh-usage-stats` entry:

```bash
# inspect profile dependencies/bundles
cat "$HOME/.dsh/profiles/desktop/package.json"
```

Remove any old `@dsh-external/dsh-usage-stats` dependency and bundle entry, delete
`node_modules/@dsh-external/dsh-usage-stats`, then fully restart DSH. The duplicate comes from the
old plugin still being loaded in the running process, not from this repo.

---

## 4. Install the Android app (optional)

The app is a separate project:
[**daniei-chen/DeepSeek-Harness-APP**](https://github.com/daniei-chen/DeepSeek-Harness-APP).

Follow its authoritative AI guide:
[`docs/INSTALL_FOR_AGENTS.md`](https://github.com/daniei-chen/DeepSeek-Harness-APP/blob/main/docs/INSTALL_FOR_AGENTS.md).

Quick form:

```bash
git clone https://github.com/daniei-chen/DeepSeek-Harness-APP.git
cd DeepSeek-Harness-APP
node setup/dsh-mobile-setup.mjs install --profile desktop \
  --file-root "$HOME" --relay-port 3443 --yes

# restart DSH, then install the APK on the phone
adb install -r DeepSeek-Harness-0.9.36-personal.96.apk
```

Open the app → 设置 → 连接 → 添加设备 → enter the DSH address or scan the Relay QR
(`https://<host>:3443/relay/pair`). Then open 设置 → 使用统计. The app does not need a separate copy
of this plugin.

---

## 5. Acceptance checklist

| # | Check | Expected |
| --- | --- | --- |
| 1 | `require.resolve('dsh-token-insight')` | path exists |
| 2 | `/usage-stats/api?days=30` | HTTP 200, `ok: true` |
| 3 | Settings → 使用统计 | 5 cards + heatmap + trend + model ring |
| 4 | Plugin list | `dsh-token-insight` /「使用统计」 |
| 5 | No old `DSH 使用统计` | only one settings section |
| 6 | Heatmap hover | `日期 / N tokens · M 轮消息` |
| 7 | Model ring 7/30 switching | ring/list values change with range |

If any check fails, see the table below.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Cannot find module 'node:sqlite'` | DSH runtime Node < 22.5 | use a DSH build with Node 24 |
| `/usage-stats/api` 404 | plugin not loaded / wrong profile / wrong port | verify profile bundle, restart, find correct Web GUI port |
| Settings shows two sections | old `@dsh-external/dsh-usage-stats` still loaded | remove old dep/bundle, delete old `node_modules` entry, restart DSH |
| `totalTokens` is 0 | no local sessions or no local usage | run a DSH task; check `~/.dsh/sessions/**/*.zstd` |
| `0 轮消息` in heatmap tooltip | host process still running pre-0.4.0 code | full restart DSH |
| Ring/trend empty after switching range | data range has no usage | switch 7/30; `dayModels` only contains the selected range |
| App cannot connect | app-side host plugin / Relay not installed | follow the app repo's install guide |

---

## 7. Update / uninstall

Update:

```bash
cd dsh-token-insight
git pull
node scripts/install.mjs --profile desktop
# restart DSH
```

Uninstall:

1. Remove `dsh-token-insight` from profile `dependencies` and `dsh.profile.bundles`.
2. Delete `~/.dsh/profiles/desktop/node_modules/dsh-token-insight`.
3. Restart DSH.
4. Optional: delete `~/.dsh/dsh-usage-stats/session-cache.json`.

Do not delete `~/.dsh/sessions` or the billing/ledger files during uninstall.

---

## 8. Hard rules for AI agents

- Never delete or rewrite files under `~/.dsh/sessions`, `~/.dsh/storages`, or the user's profile
  without a backup.
- Do not commit `node_modules`, `.env`, credentials, `session-cache.json`, or real user data.
- Keep the package name, `cordis.patch.yml` entry id, client `__ModuleLoader__.load` id, and
  `lib/index.js` `name` all equal to `dsh-token-insight`.
- A full DSH restart is required after host-side changes; browser refresh alone is not enough.
- For the app half, follow the app repo's `docs/INSTALL_FOR_AGENTS.md`; do not invent APK versions
  or URLs.
