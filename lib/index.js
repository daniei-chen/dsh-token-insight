import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { zstdDecompressSync } from 'node:zlib';

const require = createRequire(import.meta.url);
let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  DatabaseSync = undefined;
}

export const name = 'dsh-token-insight';
export const inject = ['webServer'];

const HOME = homedir();
const DSH_HOME = process.env.DSH_HOME || join(HOME, '.dsh');
const SESSION_ROOT = join(DSH_HOME, 'sessions');
const CACHE_DIR = join(DSH_HOME, 'dsh-usage-stats');
const CACHE_PATH = join(CACHE_DIR, 'session-cache.json');
const CACHE_DB_PATH = join(CACHE_DIR, 'session-cache.sqlite');
const BILLING_PATH = join(DSH_HOME, 'storages', 'web-billing.json');
const LEDGER_PATH = join(DSH_HOME, 'storages', 'cost-meter', 'ledger.json');
const ROUTE = '/usage-stats/api';
const HEAT_DAYS = 371;
const HOST_VERSION = '0.5.6';
const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Total tokens for one message/day/model row. `totalTokens` wins when present. */
function totalOf(row) {
  if (!row) return 0;
  return (
    num(row.totalTokens) ||
    num(row.inputTokens) +
      num(row.cacheReadTokens) +
      num(row.outputTokens) +
      num(row.reasoningTokens) +
      num(row.cacheCreationTokens)
  );
}

function fmtDuration(ms) {
  if (!ms || ms < 60000) return '不足 1 分钟';
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  if (days > 0) return days + ' 天 ' + hours + ' 小时 ' + minutes + ' 分';
  if (hours > 0) return hours + ' 小时 ' + minutes + ' 分';
  return minutes + ' 分钟';
}

/**
 * DSH 0.2.x 的会话文件是「多帧 zstd」：一个 session 头帧 + 每批事件一帧，
 * 直接 zstdDecompressSync(整个文件) 只会解出第一帧（session 头）。
 * 这里按 zstd magic 切帧，逐帧解压后拼成完整 JSONL。
 */
function decodeSessionFile(file) {
  const buf = readFileSync(file);
  const offsets = [];
  let at = 0;
  while ((at = buf.indexOf(ZSTD_MAGIC, at)) !== -1) {
    offsets.push(at);
    at += 4;
  }
  if (offsets.length === 0) {
    try {
      return zstdDecompressSync(buf).toString('utf8');
    } catch {
      return '';
    }
  }
  const parts = [];
  for (let i = 0; i < offsets.length; i++) {
    const start = offsets[i];
    const end = i + 1 < offsets.length ? offsets[i + 1] : buf.length;
    try {
      parts.push(zstdDecompressSync(buf.subarray(start, end)));
    } catch {
      // A frame can be partially flushed while the session is still writing.
    }
  }
  return Buffer.concat(parts).toString('utf8');
}

/**
 * 一个会话文件 → 参与统计的最小数据集。
 * usage 来自 assistant/message 的 data.usage；模型来自 message.source.model。
 * spanMs 按 turn/start → turn/end 计算，避免把「隔天继续的同一会话」算成连续聊天几十天。
 */
function parseSessionFile(file) {
  const text = decodeSessionFile(file);
  let sessionId = basename(dirname(file));
  let title = '';
  const messages = [];
  const turnStarts = new Map();
  let spanMs = 0;
  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === 'session' && typeof event.id === 'string') sessionId = event.id;
    if (event.type === 'session/title' && event.data && typeof event.data.title === 'string') {
      const nextTitle = event.data.title.trim();
      if (nextTitle) title = nextTitle;
    }
    if (typeof event.time !== 'number') continue;
    if (event.time < minTime) minTime = event.time;
    if (event.time > maxTime) maxTime = event.time;

    if (event.type === 'turn/start' && event.data && Number.isFinite(event.data.turn)) {
      turnStarts.set(event.data.turn, event.time);
      continue;
    }
    if (event.type === 'turn/end' && event.data && Number.isFinite(event.data.turn)) {
      const start = turnStarts.get(event.data.turn);
      if (Number.isFinite(start) && event.time > start) {
        spanMs = Math.max(spanMs, event.time - start);
      }
      continue;
    }
    if (event.type !== 'assistant/message') continue;

    const usage = event.data && event.data.usage;
    if (!usage) continue;
    const inputTokens = num(usage.inputTokens);
    const cacheReadTokens = num(usage.cacheReadTokens);
    const outputTokens = num(usage.outputTokens);
    const reasoningTokens = num(usage.reasoningTokens);
    const cacheCreationTokens = num(usage.cacheCreationTokens);
    const totalTokens =
      num(usage.totalTokens) ||
      inputTokens + cacheReadTokens + outputTokens + reasoningTokens + cacheCreationTokens;
    if (totalTokens <= 0) continue;
    const model =
      (event.data.message && event.data.message.source && event.data.message.source.model) || 'unknown';
    messages.push({
      time: event.time,
      model,
      inputTokens,
      cacheReadTokens,
      outputTokens,
      reasoningTokens,
      cacheCreationTokens,
      totalTokens
    });
  }

  if (spanMs <= 0 && messages.length > 0 && Number.isFinite(minTime)) {
    spanMs = maxTime - minTime;
  }
  return { sessionId, title, messages, spanMs };
}

function listSessionFiles() {
  const files = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.zstd')) files.push(path);
    }
  };
  walk(SESSION_ROOT);
  return files;
}

let fileCache = null;
let cacheDb = null;
let cacheDbTried = false;

function getCacheDb() {
  if (cacheDbTried) return cacheDb;
  cacheDbTried = true;
  if (DatabaseSync === undefined) return null;
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    cacheDb = new DatabaseSync(CACHE_DB_PATH);
    cacheDb.exec(
      'CREATE TABLE IF NOT EXISTS session_files (' +
        'path TEXT PRIMARY KEY, mtime_ms REAL NOT NULL, size INTEGER NOT NULL, data TEXT NOT NULL)'
    );
  } catch {
    cacheDb = null;
  }
  return cacheDb;
}

function readFileCache() {
  if (fileCache !== null) return fileCache;
  const db = getCacheDb();
  if (db) {
    try {
      const rows = db.prepare('select path, mtime_ms, size, data from session_files').all();
      if (rows.length > 0) {
        const files = {};
        for (const row of rows) {
          files[row.path] = {
            mtimeMs: Number(row.mtime_ms),
            size: Number(row.size),
            data: JSON.parse(row.data)
          };
        }
        fileCache = { version: 2, files };
        return fileCache;
      }
    } catch {
      // Corrupt cache: migrate or rebuild below.
    }
  }
  try {
    const parsed = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
    fileCache = parsed && parsed.files ? parsed : { version: 1, files: {} };
  } catch {
    fileCache = { version: 1, files: {} };
  }
  if (db && Object.keys(fileCache.files).length > 0) writeFileCache(fileCache.files);
  return fileCache;
}

function writeFileCache(files) {
  const db = getCacheDb();
  if (db) {
    try {
      const insert = db.prepare(
        'insert or replace into session_files (path, mtime_ms, size, data) values (?, ?, ?, ?)'
      );
      db.exec('BEGIN');
      try {
        db.exec('delete from session_files');
        for (const [path, entry] of Object.entries(files)) {
          insert.run(path, entry.mtimeMs, entry.size, JSON.stringify(entry.data));
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      return;
    } catch {
      // Fall through to the JSON cache.
    }
  }
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify({ version: 2, files }));
  } catch {
    // Read-only home or a transient file lock: keep the in-memory cache.
  }
}

function addMessage(target, message) {
  const key = toKey(new Date(message.time));
  const tokens = totalOf(message);
  const day =
    target.byDay[key] ||
    (target.byDay[key] = {
      inputTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cacheCreationTokens: 0,
      totalTokens: 0,
      calls: 0
    });
  day.inputTokens += num(message.inputTokens);
  day.cacheReadTokens += num(message.cacheReadTokens);
  day.outputTokens += num(message.outputTokens);
  day.reasoningTokens += num(message.reasoningTokens);
  day.cacheCreationTokens += num(message.cacheCreationTokens);
  day.totalTokens += tokens;
  day.calls += 1;

  const model =
    target.byModel[message.model] ||
    (target.byModel[message.model] = {
      inputTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cacheCreationTokens: 0,
      totalTokens: 0
    });
  model.inputTokens += num(message.inputTokens);
  model.cacheReadTokens += num(message.cacheReadTokens);
  model.outputTokens += num(message.outputTokens);
  model.reasoningTokens += num(message.reasoningTokens);
  model.cacheCreationTokens += num(message.cacheCreationTokens);
  model.totalTokens += tokens;
}

/**
 * 增量扫描：只有 mtime/size 变化的会话文件才重新解压解析。
 * 首次扫描 290 个会话约 7~8 秒；之后通常只重扫当前正在写入的会话。
 */
function loadSessionData() {
  const files = listSessionFiles();
  const cache = readFileCache();
  const next = {};
  const merged = { byDay: {}, byModel: {}, sessions: {}, dailyModels: {} };
  let changed = false;

  for (const file of files) {
    let stat;
    try {
      stat = statSync(file);
    } catch {
      continue;
    }
    const old = cache.files[file];
    let entry;
    if (old && old.mtimeMs === stat.mtimeMs && old.size === stat.size && old.data && typeof old.data.title === 'string') {
      entry = old;
    } else {
      entry = { mtimeMs: stat.mtimeMs, size: stat.size, data: parseSessionFile(file) };
      changed = true;
    }
    next[file] = entry;
    const parsed = entry.data;
    const session =
      merged.sessions[parsed.sessionId] ||
      (merged.sessions[parsed.sessionId] = { messages: [], spanMs: 0, title: '' });
    if (parsed.title && !session.title) session.title = parsed.title;
    session.messages.push(...parsed.messages);
    if (parsed.spanMs > session.spanMs) session.spanMs = parsed.spanMs;
    for (const message of parsed.messages) {
      addMessage(merged, message);
      if (message.model) {
        const key = toKey(new Date(message.time));
        if (!merged.dailyModels[key]) merged.dailyModels[key] = {};
        merged.dailyModels[key][message.model] =
          (merged.dailyModels[key][message.model] || 0) + totalOf(message);
      }
    }
  }

  if (!changed && Object.keys(cache.files).length !== Object.keys(next).length) changed = true;
  if (changed) {
    fileCache = { version: 1, files: next };
    writeFileCache(next);
  }
  return merged;
}

function loadLegacyBilling() {
  try {
    const data = JSON.parse(readFileSync(BILLING_PATH, 'utf8'));
    return { byDay: data.byDay || {}, byModel: data.byModel || {}, sessions: data.sessions || {} };
  } catch {
    return { byDay: {}, byModel: {}, sessions: {} };
  }
}

/**
 * 本地历史补全：sessions 是最细的会话记录；web-billing.json 和
 * cost-meter/ledger.json 里有旧版本 DSH 的日汇总。按「同一天取最大值」
 * 合并，避免重复相加，同时补上 sessions 没覆盖到的日期。
 */
function mergeLocalExtras(data) {
  const extra = {};
  let billingDays = 0;
  let ledgerDays = 0;
  let billingCost = 0;
  let ledgerCost = 0;
  try {
    const billing = JSON.parse(readFileSync(BILLING_PATH, 'utf8'));
    if (billing.totals) billingCost = num(billing.totals.cost);
    for (const [day, row] of Object.entries(billing.byDay || {})) {
      const t = totalOf(row);
      if (t > 0) billingDays++;
      if (t > (extra[day] || 0)) extra[day] = t;
    }
  } catch {
    // No legacy billing file.
  }
  try {
    const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
    for (const [day, row] of Object.entries(ledger.days || {})) {
      const t = num(row.input) + num(row.output) + num(row.cacheRead) + num(row.cacheWrite) + num(row.reasoning);
      if (t > 0) ledgerDays++;
      ledgerCost += num(row.cost);
      if (t > (extra[day] || 0)) extra[day] = t;
    }
  } catch {
    // No cost-meter ledger.
  }
  const byDay = data.byDay || {};
  for (const [day, tokens] of Object.entries(extra)) {
    const row = byDay[day];
    const current = totalOf(row);
    if (tokens > current) {
      if (!row) byDay[day] = { inputTokens: 0, cacheReadTokens: 0, outputTokens: 0, totalTokens: 0, calls: 1 };
      byDay[day].outputTokens = num(byDay[day].outputTokens) + (tokens - current);
      byDay[day].totalTokens = current + (tokens - current);
      if (!byDay[day].calls) byDay[day].calls = 1;
    }
  }
  data.sources = {
    sessions: Object.keys(data.sessions || {}).length,
    billing: billingDays,
    ledger: ledgerDays
  };
  const cost = billingCost || ledgerCost;
  if (cost > 0) {
    data.cost = {
      amount: cost,
      currency: 'CNY',
      partial: true,
      source: billingCost > 0 ? 'billing' : 'ledger'
    };
  }
  return data;
}

function loadData() {
  // DeepSeek Harness 本地数据：sessions + 旧版 billing / cost-meter 日汇总。
  // 不再读 ZCode 的 agent 数据库，避免把另一个应用的用量当成 DSH 的。
  if (existsSync(SESSION_ROOT)) {
    try {
      const data = loadSessionData();
      if (Object.keys(data.sessions).length > 0) return mergeLocalExtras(data);
    } catch {
      // Fall through to the legacy billing file.
    }
  }
  return loadLegacyBilling();
}

function computeStats(data, days) {
  const byDay = data.byDay || {};
  const byModel = data.byModel || {};
  const sessions = data.sessions || {};
  const byDayKeys = Object.keys(byDay).sort();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = [];
  const dateSet = new Set();
  const startDate = new Date(today);
  if (days > 0) {
    startDate.setDate(today.getDate() - (days - 1));
  } else if (byDayKeys.length > 0) {
    startDate.setTime(new Date(byDayKeys[0] + 'T00:00:00').getTime());
  }
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const key = toKey(d);
    dates.push(key);
    dateSet.add(key);
  }
  if (dates.length === 0) dates.push(toKey(today));

  let tokens = 0;
  let active = 0;
  const dayList = dates.map((key) => {
    const row = byDay[key];
    if (row) {
      const t = totalOf(row);
      tokens += t;
      if (num(row.calls) > 0) active++;
      return { date: key, tokens: t };
    }
    return { date: key, tokens: 0 };
  });

  let sessionsCount = 0;
  let messages = 0;
  const dayModels = {};
  const useDailyModels = data.dailyModels !== undefined;
  for (const sid of Object.keys(sessions)) {
    const sess = sessions[sid];
    if (!sess || !sess.messages) continue;
    let used = false;
    for (const mid of Object.keys(sess.messages)) {
      const msg = sess.messages[mid];
      if (!msg || !msg.time) continue;
      const dt = new Date(msg.time);
      const key = toKey(dt);
      if (dateSet.has(key)) {
        messages++;
        used = true;
        if (useDailyModels) continue;
        const model = msg.model || '?';
        const t = totalOf(msg);
        if (!dayModels[key]) dayModels[key] = {};
        dayModels[key][model] = (dayModels[key][model] || 0) + t;
      }
    }
    if (used) sessionsCount++;
  }
  if (useDailyModels) {
    for (const key of dates) {
      if (data.dailyModels[key]) dayModels[key] = data.dailyModels[key];
    }
  }

  let consec = 0;
  const streakCheck = days > 0 ? days : 4000;
  for (let i = 0; i < streakCheck; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toKey(d);
    if (byDay[key] && num(byDay[key].calls) > 0) consec++;
    else break;
  }

  let modelTotal = 0;
  const models = [];
  for (const modelName of Object.keys(byModel)) {
    const m = byModel[modelName];
    const t = totalOf(m);
    models.push({ name: modelName, tokens: t });
    modelTotal += t;
  }
  models.sort((a, b) => b.tokens - a.tokens);
  models.forEach((m) => {
    m.pct = modelTotal > 0 ? (m.tokens / modelTotal) * 100 : 0;
  });
  const top = models[0] || null;

  const heatList = [];
  for (let i = HEAT_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toKey(d);
    const row = byDay[key];
    heatList.push({
      date: key,
      tokens: totalOf(row),
      calls: row ? num(row.calls) : 0
    });
  }

  let totalTokens = 0;
  let peakTokens = 0;
  const activeDaySet = new Set();
  for (const key of Object.keys(byDay)) {
    const row = byDay[key];
    const t = totalOf(row);
    totalTokens += t;
    if (t > peakTokens) peakTokens = t;
    if (num(row.calls) > 0) activeDaySet.add(key);
  }

  let currentStreak = 0;
  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (activeDaySet.has(toKey(d))) currentStreak++;
    else break;
  }

  let longestStreak = 0;
  if (activeDaySet.size > 0) {
    const keys = [...activeDaySet].sort();
    const first = new Date(keys[0] + 'T00:00:00');
    const last = new Date(keys[keys.length - 1] + 'T00:00:00');
    let run = 0;
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      if (activeDaySet.has(toKey(d))) {
        run++;
        if (run > longestStreak) longestStreak = run;
      } else {
        run = 0;
      }
    }
  }

  let longestChatMs = 0;
  for (const sid of Object.keys(sessions)) {
    const sess = sessions[sid];
    if (!sess) continue;
    if (num(sess.spanMs) > longestChatMs) longestChatMs = num(sess.spanMs);
    if (num(sess.spanMs) > 0 || !sess.messages) continue;
    let min = Infinity;
    let max = -Infinity;
    for (const mid of Object.keys(sess.messages)) {
      const msg = sess.messages[mid];
      if (!msg || !msg.time) continue;
      const t = Number(msg.time);
      if (t < min) min = t;
      if (t > max) max = t;
    }
    if (Number.isFinite(min) && Number.isFinite(max) && max - min > longestChatMs) longestChatMs = max - min;
  }

  let totalInput = 0;
  let totalCacheRead = 0;
  let totalReasoning = 0;
  let totalCacheCreation = 0;
  for (const key of byDayKeys) {
    const row = byDay[key];
    totalInput += num(row.inputTokens);
    totalCacheRead += num(row.cacheReadTokens);
    totalReasoning += num(row.reasoningTokens);
    totalCacheCreation += num(row.cacheCreationTokens);
  }
  const cacheHitRate = totalInput + totalCacheRead > 0 ? (totalCacheRead / (totalInput + totalCacheRead)) * 100 : 0;

  const todayKey = toKey(today);
  const todayTokens = totalOf(byDay[todayKey]);
  let weekTokens = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    weekTokens += totalOf(byDay[toKey(d)]);
  }

  const sessionsRanking = [];
  for (const sid of Object.keys(sessions)) {
    const sess = sessions[sid];
    if (!sess || !sess.messages) continue;
    let sessionTokens = 0;
    let minTime = Infinity;
    let maxTime = -Infinity;
    for (const mid of Object.keys(sess.messages)) {
      const msg = sess.messages[mid];
      if (!msg || !msg.time) continue;
      const ts = new Date(msg.time).getTime();
      if (!Number.isFinite(ts)) continue;
      if (!dateSet.has(toKey(new Date(ts)))) continue;
      sessionTokens += totalOf(msg);
      if (ts < minTime) minTime = ts;
      if (ts > maxTime) maxTime = ts;
    }
    if (sessionTokens <= 0) continue;
    const spanMs =
      Number.isFinite(minTime) && Number.isFinite(maxTime)
        ? Math.max(0, maxTime - minTime)
        : num(sess.spanMs);
    sessionsRanking.push({
      id: sid,
      title: sess.title || sid,
      tokens: sessionTokens,
      durationMs: spanMs,
      duration: fmtDuration(spanMs)
    });
  }
  sessionsRanking.sort((a, b) => b.tokens - a.tokens);

  return {
    ok: true,
    version: HOST_VERSION,
    days,
    coverage: {
      firstDay: byDayKeys[0] || null,
      lastDay: byDayKeys[byDayKeys.length - 1] || null,
      sources: data.sources || null
    },
    tokens,
    sessions: sessionsCount,
    messages,
    activeDays: active,
    consecutiveDays: consec,
    topModel: top ? top.name : '--',
    topPct: top ? top.pct : 0,
    dayList,
    dayModels,
    models,
    heatList,
    totalTokens,
    peakTokens,
    longestChat: fmtDuration(longestChatMs),
    currentStreak,
    longestStreak,
    cacheHitRate,
    reasoningTokens: totalReasoning,
    cacheCreationTokens: totalCacheCreation,
    todayTokens,
    weekTokens,
    cost: data.cost || null,
    sessionsTop: sessionsRanking.slice(0, 5),
    sessionsRanking
  };
}

function sendJson(res, body) {
  res.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

export function apply(ctx) {
  const webServer = ctx.webServer;
  // Warm the incremental cache after startup. The first full scan is CPU-bound,
  // so delay it until the host has finished booting; later requests hit SQLite.
  if (typeof ctx.effect === 'function') {
    ctx.effect(() => {
      const timer = setTimeout(() => {
        try {
          loadData();
        } catch {
          // The API will report the real error on its first request.
        }
      }, 15000);
      timer.unref?.();
      return () => clearTimeout(timer);
    }, 'dsh-token-insight: warmup');
  }
  webServer.register({
    kind: 'exact',
    path: ROUTE,
    handler: (req, res) => {
      if (req.method !== 'GET') {
        sendJson(res, { ok: false, message: 'method not allowed' });
        return;
      }
      const url = new URL(req.url ?? ROUTE, 'http://localhost');
      const daysParam = url.searchParams.get('days');
      const days = daysParam === 'all' || daysParam === '0' ? 0 : daysParam === '30' ? 30 : 7;
      try {
        const data = loadData();
        sendJson(res, computeStats(data, days));
      } catch (error) {
        sendJson(res, {
          ok: false,
          message: '暂无使用数据：' + (error instanceof Error ? error.message : String(error))
        });
      }
    }
  });
}

export { computeStats, parseSessionFile, decodeSessionFile };
