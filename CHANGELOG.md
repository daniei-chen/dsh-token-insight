# Changelog

## 0.5.1

- Move the hover tooltip to `document.body` so themes that transform/backdrop-filter dialogs
  (for example Catppuccin glass) cannot trap or clip it.
- Add native `title` fallbacks on heatmap cells, trend buckets and model ring segments.
- Convert React tooltip content to readable multi-line text for the body-level tooltip.
- Keep tooltips above the settings dialog with a dedicated top z-index.

## 0.5.0

- Add `days=all` / `全部` range for the trend and model charts.
- Add data coverage (first/last local day) and source counts.
- Add today / last-7-days totals and cache-hit rate.
- Add session Top 5 (title, tokens, duration).
- Add CSV / JSON / PNG export.
- Add a local-only daily token budget.
- Add model legend toggle, ring/list model filtering, hover crosshair and area fill.
- Add theme-aware CSS variables, dark-mode chart palette, mobile horizontal heatmap scroll.
- Add loading skeleton and pulse animation.
- Move the incremental cache from JSON to SQLite (`session-cache.sqlite`), with JSON fallback/migration.
- Add `DSH_HOME` support.
- Add host tests for multi-frame zstd parsing and stats calculations.

## 0.4.0

- Rename package to `dsh-token-insight`, visible name to「使用统计」.
- Use local DSH sessions + legacy billing/cost-meter data.
- Add 5 metric cards, 52-week heatmap, smooth trend chart and model ring.
- Add ZCode-style tooltips, model list and AI install guide.
