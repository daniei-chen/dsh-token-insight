import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { zstdCompressSync } from 'node:zlib';
import { computeStats, parseSessionFile } from '../lib/index.js';

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test('parseSessionFile reads multi-frame zstd, title, usage and turn duration', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dti-'));
  const file = path.join(dir, 'session.v4.jsonl.zstd');
  const events = [
    { type: 'session', version: 4, id: 'session-test' },
    { type: 'session/title', time: 100, data: { title: 'Test session' } },
    { type: 'turn/start', time: 1000, data: { turn: 1 } },
    {
      type: 'assistant/message',
      time: 2000,
      data: {
        message: { source: { model: 'deepseek-test' } },
        usage: {
          inputTokens: 10,
          cacheReadTokens: 20,
          outputTokens: 5,
          reasoningTokens: 2,
          totalTokens: 37
        }
      }
    },
    { type: 'turn/end', time: 9000, data: { turn: 1 } }
  ];
  const frames = events.map((event) => zstdCompressSync(Buffer.from(JSON.stringify(event) + '\n')));
  fs.writeFileSync(file, Buffer.concat(frames));

  const parsed = parseSessionFile(file);
  assert.equal(parsed.sessionId, 'session-test');
  assert.equal(parsed.title, 'Test session');
  assert.equal(parsed.messages.length, 1);
  assert.equal(parsed.messages[0].totalTokens, 37);
  assert.equal(parsed.messages[0].reasoningTokens, 2);
  assert.equal(parsed.spanMs, 8000);
});

test('computeStats keeps totals, cache hit rate and all-time range consistent', () => {
  const today = new Date();
  const key = dayKey(today);
  const data = {
    byDay: {
      [key]: {
        inputTokens: 10,
        cacheReadTokens: 80,
        outputTokens: 8,
        reasoningTokens: 2,
        totalTokens: 100,
        calls: 1
      }
    },
    byModel: {
      'deepseek-test': {
        inputTokens: 10,
        cacheReadTokens: 80,
        outputTokens: 8,
        reasoningTokens: 2,
        totalTokens: 100
      }
    },
    sessions: {
      'session-test': {
        title: 'Test session',
        spanMs: 8000,
        messages: [{ time: Date.now(), model: 'deepseek-test', totalTokens: 100 }]
      }
    },
    dailyModels: { [key]: { 'deepseek-test': 100 } }
  };

  const seven = computeStats(data, 7);
  assert.equal(seven.totalTokens, 100);
  assert.equal(seven.todayTokens, 100);
  assert.equal(seven.weekTokens, 100);
  assert.equal(seven.models[0].tokens, 100);
  assert.equal(seven.dayList.at(-1).tokens, 100);
  assert.equal(seven.sessionsTop[0].title, 'Test session');
  assert.ok(seven.cacheHitRate > 88 && seven.cacheHitRate < 89);

  const all = computeStats(data, 0);
  assert.equal(all.totalTokens, 100);
  assert.equal(all.dayList.at(-1).date, key);
  assert.ok(all.dayList.length >= 1);
});

test('computeStats buckets messages crossing midnight by local day', () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const late = new Date(yesterday);
  late.setHours(23, 59, 0, 0);
  const early = new Date(today);
  early.setHours(0, 1, 0, 0);
  const yesterdayKey = dayKey(yesterday);
  const todayKey = dayKey(today);

  const data = {
    byDay: {
      [yesterdayKey]: { totalTokens: 10, calls: 1 },
      [todayKey]: { totalTokens: 20, calls: 1 }
    },
    byModel: {},
    sessions: {
      'session-midnight': {
        title: 'Midnight',
        spanMs: 0,
        messages: [
          { time: late.getTime(), model: 'deepseek-test', totalTokens: 10 },
          { time: early.getTime(), model: 'deepseek-test', totalTokens: 20 }
        ]
      }
    }
  };

  const stats = computeStats(data, 7);
  assert.equal(stats.dayModels[yesterdayKey]['deepseek-test'], 10);
  assert.equal(stats.dayModels[todayKey]['deepseek-test'], 20);
  assert.equal(stats.sessionsRanking[0].tokens, 30);
});
