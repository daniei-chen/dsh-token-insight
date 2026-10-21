# DSH Token Insight

DeepSeek Harness（DSH 0.2.x）的本地使用统计插件。安装后在「设置 → 使用统计」中查看真实 Token 消耗；数据只来自本机，不上传、不联网。

## 功能

- 顶部 5 个指标：累计 Token、峰值 Token、最长聊天时长、当前连续天数、最长连续天数
- Token 活动热力图：最近 52 周，每日 / 每周 / 累计三种模式
- 每日 Token 趋势：7 / 30 天平滑曲线，按模型分色，悬停显示模型明细
- 模型用量：环形图 + 明细列表，跟随 7 / 30 天范围
- 纯本地、只读、无遥测

## 数据来源

- `~/.dsh/sessions/**/session.v4.jsonl.zstd`：当前版本会话记录
- `~/.dsh/storages/web-billing.json`：旧版本日汇总（按天去重补全）
- `~/.dsh/storages/cost-meter/ledger.json`：cost-meter 日汇总（按天去重补全）

## 数据口径

- 累计 Token：所有 `assistant/message` 的 `usage.totalTokens`；旧消息缺 `totalTokens` 时用 input + cacheRead + output 补算
- 峰值 Token：单日最大 Token 消耗
- 最长聊天时长：单个 turn（`turn/start` → `turn/end`）的最大时间跨度
- 连续天数：按有 Token 消耗的自然日计算
- 热力图：最近 52 周，周日起始；每日 / 每周 / 累计

## 安装

```bash
npm pack
dsh plugin --profile desktop add dsh-token-insight-0.4.0.tgz
```

## 开发

源码在 `lib/`，改完后执行：

```bash
node sync.mjs          # 同步到已安装副本
# 或
npm pack               # 重新打包安装
```

## API

`GET /usage-stats/api?days=7|30` 返回统计 JSON；扫描结果按会话文件 mtime/size 增量缓存到 `~/.dsh/dsh-usage-stats/session-cache.json`。

## 截图

![使用统计](docs/screenshot.png)

## License

MIT
