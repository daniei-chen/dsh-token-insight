# DSH Token Insight

Local-first token usage dashboard for **DeepSeek Harness (DSH)**. It shows real token consumption in
`设置 → 使用统计`: lifetime/peak tokens, streaks, a 52-week heatmap, daily trends and model breakdown.
All data comes from the local `~/.dsh` directory — no cloud, no telemetry.

> **给 AI / For AI agents:** read **[docs/INSTALL_FOR_AGENTS.md](docs/INSTALL_FOR_AGENTS.md)** first.
> It contains exact commands, file paths, acceptance checks and troubleshooting for both the plugin
> and the Android app.

![使用统计](docs/screenshot.png)

## 功能

- **5 个总览指标**：累计 Token、峰值 Token、最长聊天时长、当前连续天数、最长连续天数
- **Token 活动热力图**：最近 52 周，每日 / 每周 / 累计三种模式
- **每日 Token 趋势**：7 / 30 天平滑曲线，按模型分色，悬停显示日期、总量和模型明细
- **模型用量**：环形图 + 明细列表，跟随 7 / 30 天范围
- **纯本地、只读、无遥测**：不上传会话内容，不需要账号或 API key

## 环境要求

| 项目 | 要求 |
| --- | --- |
| DSH | `0.2.1-rc.2` 或更新版本 |
| Profile | `desktop`（默认） |
| DSH runtime Node | Node 24（插件使用内置 `node:sqlite`；旧 Node 不支持） |
| 手机 App | 可选，见下方「手机 App」 |

## 安装

### 方式 A：一键安装（推荐，AI / 命令行）

```bash
git clone https://github.com/daniei-chen/dsh-token-insight.git
cd dsh-token-insight
node scripts/install.mjs --profile desktop
```

脚本会做三件事：

1. 把 `dsh-token-insight` 写入 `~/.dsh/profiles/desktop/package.json` 的 `dependencies`
2. 把 `dsh-token-insight` 加入 `dsh.profile.bundles`
3. 在 `~/.dsh/profiles/desktop/node_modules/dsh-token-insight` 建立指向本仓库的链接

**然后完整重启 DSH**（关闭应用再打开；host 插件只在进程启动时加载）。

### 方式 B：DSH 插件管理器

打开 DSH → **插件** → **添加插件** → **第三方插件** → 选择本仓库目录或 `npm pack` 生成的
`dsh-token-insight-0.4.0.tgz` → 安装 → 重启 DSH。

### 方式 C：手动安装（没有脚本时）

编辑 `~/.dsh/profiles/desktop/package.json`：

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

然后在 `~/.dsh/profiles/desktop/node_modules` 下建立链接：

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

重启 DSH。插件的 `cordis.patch.yml` 会在 bundle 加载时自动生效，不需要再改 profile patch。

## 手机 App

手机端是独立的 Android 项目：[**DeepSeek-Harness-APP**](https://github.com/daniei-chen/DeepSeek-Harness-APP)。
它和本插件是两回事：

| 组件 | 装在哪 | 作用 |
| --- | --- | --- |
| `dsh-token-insight`（本仓库） | 运行 DSH 的电脑 | 在 DSH 设置页提供「使用统计」 |
| DeepSeek-Harness-APP | 手机 + DSH host | Android WebView 壳、连接、通知、文件、Relay |

**本插件不需要装到手机上**。手机 App 只是显示 DSH Web UI；插件装在 DSH host 后，手机端打开
`设置 → 使用统计` 即可看到同一份数据。

App 的完整安装步骤（host 插件 + APK + Relay 配对）见 app 仓库的
[**docs/INSTALL_FOR_AGENTS.md**](https://github.com/daniei-chen/DeepSeek-Harness-APP/blob/main/docs/INSTALL_FOR_AGENTS.md)。

简版：

```bash
git clone https://github.com/daniei-chen/DeepSeek-Harness-APP.git
cd DeepSeek-Harness-APP
node setup/dsh-mobile-setup.mjs install --profile desktop \
  --file-root "$HOME" --relay-port 3443 --yes
# 重启 DSH

adb install -r DeepSeek-Harness-0.9.36-personal.96.apk
```

然后打开 App → `设置 → 连接 → 添加设备`，输入 DSH 地址或扫描 Relay 配对二维码
（`https://<host>:3443/relay/pair`）。APK 版本会更新，以 app 仓库最新 Release 为准。

## 验证安装

1. **插件列表**：DSH → 插件 → 已安装，应出现 `dsh-token-insight`（显示名「使用统计」）。
2. **设置页**：DSH → 设置 → 使用统计，应看到 5 个指标卡、热力图、趋势图和模型环形图。
3. **API**（把 `<port>` 换成 DSH Web GUI 端口）：

```bash
curl "http://127.0.0.1:<port>/usage-stats/api?days=30"
```

应返回 `"ok": true`，并包含 `totalTokens`、`peakTokens`、`longestChat`、`models` 等字段。

4. **模块解析**：

```bash
cd "$HOME/.dsh/profiles/desktop"
node -e "console.log(require.resolve('dsh-token-insight/client'))"
```

应指向本仓库的 `lib/client.js`。

## 数据来源与隐私

- `~/.dsh/sessions/**/session.v4.jsonl.zstd`：当前版本会话记录（主要来源）
- `~/.dsh/storages/web-billing.json`：旧版本日汇总（按天去重补全）
- `~/.dsh/storages/cost-meter/ledger.json`：cost-meter 日汇总（按天去重补全）

扫描结果按会话文件 mtime/size 增量缓存到 `~/.dsh/dsh-usage-stats/session-cache.json`。
插件只读这些本地文件，不发起网络请求，不上传任何内容。

## 数据口径

- 累计 Token：所有 `assistant/message` 的 `usage.totalTokens`；旧消息缺 `totalTokens` 时用
  `inputTokens + cacheReadTokens + outputTokens` 补算
- 峰值 Token：单日最大 Token 消耗
- 最长聊天时长：单个 turn（`turn/start` → `turn/end`）的最大时间跨度
- 连续天数：按有 Token 消耗的自然日计算
- 热力图：最近 52 周，周日起始；每日 / 每周 / 累计

## 更新

```bash
cd dsh-token-insight
git pull
node scripts/install.mjs --profile desktop
# 重启 DSH
```

## 卸载

1. 从 `~/.dsh/profiles/desktop/package.json` 删除 `dsh-token-insight`（dependencies 和
   `dsh.profile.bundles` 都要删）
2. 删除 `~/.dsh/profiles/desktop/node_modules/dsh-token-insight`
3. 重启 DSH
4. 可选：删除缓存 `~/.dsh/dsh-usage-stats/session-cache.json`

## 常见问题

| 现象 | 原因 / 处理 |
| --- | --- |
| 设置里同时出现「DSH 使用统计」和「使用统计」 | 旧包 `@dsh-external/dsh-usage-stats` 仍在运行中的 DSH 进程里。确认 profile 只剩 `dsh-token-insight`，完整重启 DSH。 |
| 插件列表里还有旧的「DSH 使用统计」 | 同上，旧插件实例缓存；重启 DSH。必要时删除旧 `node_modules/@dsh-external/dsh-usage-stats`。 |
| 热力图显示 `0 轮消息` | host 侧还没加载 0.4.0 的 `heatList.calls`；完整重启 DSH。 |
| `/usage-stats/api` 404 | 插件没加载、profile 不对，或端口不是 DSH Web GUI 端口。 |
| 报错 `Cannot find module 'node:sqlite'` | DSH runtime Node 低于 22.5；升级到使用 Node 24 的 DSH。 |
| 没有数据 | 确认 `~/.dsh/sessions` 存在且有 `.zstd` 文件；先在 DSH 里跑几个任务。 |

## 开发

```bash
node scripts/install.mjs --profile desktop   # 安装/更新到 profile
node sync.mjs                                  # 同步到已安装副本
npm pack                                       # 重新打包
```

源码在 `lib/`，构建产物直接提交；修改后需要重启 DSH 让 host 侧生效。

## API

`GET /usage-stats/api?days=7|30` 返回统计 JSON。

## License

MIT
