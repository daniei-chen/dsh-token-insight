window.__ModuleLoader__.load({
  id: "dsh-token-insight",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var react = require("react");
    var createElement = react.createElement;
    var useState = react.useState;
    var useEffect = react.useEffect;
    var useMemo = react.useMemo;
    var useRef = react.useRef;
    var inject = ["slots"];

    // ── DeepSeek Harness design tokens ──────────────────────────
    var T = {
      bg: "var(--dsw-alias-bg-layer-2)",
      border: "var(--dsw-alias-border-l2)",
      text: "var(--dsw-alias-label-primary)",
      sub: "var(--dsw-alias-label-tertiary)",
      accent: "var(--dsw-alias-state-business-primary)",
      error: "var(--dsw-alias-state-error-primary)"
    };

    // ── helpers ───────────────────────────────────────────────────
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    function fmt(n) {
      if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "亿";
      if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, "") + "万";
      return n.toLocaleString();
    }
    function dateKey(d) {
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }
    function dayKeyToDate(key) {
      var p = key.split("-");
      return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    }
    function weekdayOfDate(d) { return d.getDay(); }

    var MODEL_COLORS = [
      "var(--dti-chart-1)",
      "var(--dti-chart-2)",
      "var(--dti-chart-3)",
      "var(--dti-chart-4)",
      "var(--dti-chart-5)",
      "var(--dti-chart-6)",
      "var(--dti-chart-7)"
    ];

    // ── theme tokens / CSS-in-JS bridge ─────────────────────────
    var STYLE_ID = "dsh-token-insight-styles";
    function injectStyles() {
      if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = [
        ":root{--dti-chart-1:#4176E6;--dti-chart-2:#22C55E;--dti-chart-3:#F59E0B;--dti-chart-4:#A78BFA;--dti-chart-5:#EC4899;--dti-chart-6:#14B8A6;--dti-chart-7:#B8B8B8;",
        "--dti-heat-0:#F3F4F6;--dti-heat-1:#DCEEFF;--dti-heat-2:#9DD0FF;--dti-heat-3:#72B9FA;--dti-heat-4:#4CA4F5}",
        "html[data-theme=\"dark\"],html[data-dsh-dream-skin-scheme=\"dark\"]{--dti-chart-1:#5B8DEF;--dti-chart-2:#34D399;--dti-chart-3:#FBBF24;--dti-chart-4:#A78BFA;--dti-chart-5:#F472B6;--dti-chart-6:#2DD4BF;--dti-chart-7:#94A3B8;",
        "--dti-heat-0:#1F2937;--dti-heat-1:#1E3A5F;--dti-heat-2:#1D4ED8;--dti-heat-3:#2563EB;--dti-heat-4:#3B82F6}",
        ".dti-root{font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;box-sizing:border-box}",
        ".dti-card{transition:background-color .16s ease,border-color .16s ease}",
        ".dti-scroll{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2) transparent}",
        ".dti-scroll::-webkit-scrollbar{height:6px}.dti-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:3px}",
        ".dti-skeleton{animation:dti-pulse 1.2s ease-in-out infinite;background:var(--dsw-alias-bg-layer-1);border-radius:12px}",
        "@keyframes dti-pulse{0%,100%{opacity:.45}50%{opacity:.8}}"
      ].join("");
      (document.head || document.documentElement).appendChild(style);
    }

    // ── color levels (DSH theme aware) ─────────────────────────
    function colorFor(ratio) {
      if (ratio <= 0) return "var(--dti-heat-0)";
      if (ratio > 0.75) return "var(--dti-heat-4)";
      if (ratio > 0.5) return "var(--dti-heat-3)";
      if (ratio > 0.25) return "var(--dti-heat-2)";
      return "var(--dti-heat-1)";
    }

    // ── shared tooltip (heatmap + bar chart) ─────────────────────
    function HeatmapTooltip(props) {
      if (!props.tip) return null;
      var vw = typeof window !== "undefined" ? window.innerWidth : 1200;
      var vh = typeof window !== "undefined" ? window.innerHeight : 800;
      var width = Math.min(340, vw - 24);
      var left = Math.max(12, Math.min(props.tip.x + 14, vw - width - 12));
      var top = Math.max(12, Math.min(props.tip.y + 14, vh - 120));
      return createElement("div", {
        style: {
          position: "fixed",
          left: left + "px",
          top: top + "px",
          width: "max-content",
          maxWidth: width + "px",
          background: "var(--dsw-alias-bg-layer-2)",
          color: T.text,
          border: "1px solid " + T.border,
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 12,
          lineHeight: 1.6,
          boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
          zIndex: 9999,
          pointerEvents: "none",
          whiteSpace: "normal",
          wordBreak: "break-word"
        }
      }, props.tip.content);
    }

    function HeatmapCell(props) {
      return createElement("div", {
        style: {
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 2,
          background: props.color,
          margin: 0,
          flex: "none",
          minWidth: 0
        },
        onMouseEnter: function (ev) { props.onHover(ev, props.tip); },
        onMouseMove: function (ev) { props.onHover(ev, props.tip); },
        onMouseLeave: props.onLeave,
        onClick: function (ev) { props.onClick(ev, props.tip); }
      });
    }

    // ── top stats strip (ZCode App Usage: 5 metrics) ─────────────
    function TokenStatsCard(props) {
      var s = props.stats;
      var narrow = typeof window !== "undefined" && window.innerWidth < 640;
      function spaced(v) { return String(v).replace(/(\d)([万亿])/g, "$1 $2"); }
      var items = [
        { value: spaced(fmt(s.totalTokens || 0)), label: "累计 Token 数" },
        { value: spaced(fmt(s.peakTokens || 0)), label: "峰值 Token 数" },
        { value: s.longestChat || "--", label: "最长聊天时长" },
        { value: (s.currentStreak || 0) + " 天", label: "当前连续天数" },
        { value: (s.longestStreak || 0) + " 天", label: "最长连续天数" }
      ];
      return createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: narrow ? "repeat(3, minmax(0, 1fr))" : "repeat(5, minmax(0, 1fr))",
          alignItems: "center",
          background: T.bg,
          border: "none",
          borderRadius: 12,
          overflow: "hidden"
        }
      }, items.map(function (it, i) {
        return createElement("div", {
          key: i,
          style: {
            minWidth: 0,
            padding: narrow ? "8px 2px" : "10px 4px",
            textAlign: "center",
            borderLeft: i === 0 || (narrow && i === 3) ? "none" : "1px solid " + T.border
          }
        },
          createElement("div", { style: { fontSize: narrow ? 12 : 16, fontWeight: 500, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, it.value),
          createElement("div", { style: { fontSize: narrow ? 9 : 11, color: T.sub, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, it.label)
        );
      }));
    }

    // ── token activity heatmap ───────────────────────────────────
    function TokenActivityHeatmap(props) {
      var list = props.list || [];
      var containerRef = useRef(null);
      var [width, setWidth] = useState(0);
      var [mode, setMode] = useState("daily");
      var [tip, setTip] = useState(null);
      var [pinnedKey, setPinnedKey] = useState(null);

      useEffect(function () {
        var timer = null;
        function measure() {
          if (containerRef.current) setWidth(containerRef.current.clientWidth);
        }
        measure();
        function onResize() {
          if (timer) clearTimeout(timer);
          timer = setTimeout(measure, 150);
        }
        window.addEventListener("resize", onResize);
        return function () {
          window.removeEventListener("resize", onResize);
          if (timer) clearTimeout(timer);
        };
      }, []);

      // week columns: fill the available width, cap at 45 (a bit over one year)
      var maxWeeks = 52;
      var narrow = typeof window !== "undefined" && window.innerWidth < 640;

      var gridData = useMemo(function () {
        var byDate = {};
        list.forEach(function (d) {
          byDate[d.date] = { tokens: d.tokens || 0, calls: d.calls || 0 };
        });
        var last = list.length ? dayKeyToDate(list[list.length - 1].date) : new Date();
        var today0 = new Date(last);
        today0.setHours(0, 0, 0, 0);
        var monday = new Date(today0);
        monday.setDate(today0.getDate() - weekdayOfDate(today0));
        var rangeStart = new Date(monday);
        rangeStart.setDate(monday.getDate() - (maxWeeks - 1) * 7);

        var days = [];
        for (var i = 0; i < maxWeeks * 7; i++) {
          var d = new Date(rangeStart);
          d.setDate(rangeStart.getDate() + i);
          var key = dateKey(d);
          var info = byDate[key] || { tokens: 0, calls: 0 };
          days.push({
            date: key,
            tokens: d > today0 ? 0 : info.tokens,
            calls: d > today0 ? 0 : info.calls,
            week: Math.floor(i / 7)
          });
        }

        var weekTotals = [];
        var weekCalls = [];
        for (var w = 0; w < maxWeeks; w++) {
          var sum = 0;
          var calls = 0;
          days.forEach(function (day) {
            if (day.week === w) {
              sum += day.tokens;
              calls += day.calls;
            }
          });
          weekTotals.push(sum);
          weekCalls.push(calls);
        }
        var cumWeeks = [];
        var cumCalls = [];
        var cum = 0;
        var cumC = 0;
        weekTotals.forEach(function (t, i) {
          cum += t;
          cumWeeks.push(cum);
          cumC += weekCalls[i];
          cumCalls.push(cumC);
        });

        return { days: days, weekTotals: weekTotals, weekCalls: weekCalls, cumWeeks: cumWeeks, cumCalls: cumCalls };
      }, [maxWeeks, list]);

      var cells = useMemo(function () {
        return gridData.days.map(function (day) {
          if (mode === "daily") return { d: day, tokens: day.tokens, calls: day.calls };
          if (mode === "weekly") return { d: day, tokens: gridData.weekTotals[day.week], calls: gridData.weekCalls[day.week] };
          return { d: day, tokens: gridData.cumWeeks[day.week], calls: gridData.cumCalls[day.week] };
        });
      }, [mode, gridData]);

      var max = 1;
      cells.forEach(function (x) { if (x.tokens > max) max = x.tokens; });

      // Month labels: anchor each label under the column containing that
      // month's 1st day (e.g. "8月" sits directly below 8月1号).
      var monthLabels = [];
      var seen = {};
      gridData.days.forEach(function (day, idx) {
        if (day.date.slice(8, 10) !== "01") return;
        var m = day.date.slice(5, 7);
        if (!seen[m]) {
          seen[m] = true;
          monthLabels.push({ col: Math.floor(idx / 7), name: parseInt(m, 10) + "月" });
        }
      });

      function cellTip(x) {
        var p = x.d.date.split("-");
        var day = p[0] + "年" + parseInt(p[1], 10) + "月" + parseInt(p[2], 10) + "日";
        var calls = x.calls || 0;
        var tstr = fmt(x.tokens) + " tokens";
        if (mode === "daily") return day + "\n" + tstr + " · " + calls + " 轮消息";
        if (mode === "weekly") return day + " 当周\n" + tstr + " · " + calls + " 轮消息";
        return "截至 " + day + " 当周累计\n" + tstr + " · " + calls + " 轮消息";
      }

      var grid = [];
      for (var w = 0; w < maxWeeks; w++) {
        var col = createElement("div", { key: "w" + w, style: { display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 } },
          cells.filter(function (x) { return x.d.week === w; }).map(function (x) {
            var ratio = max > 0 ? x.tokens / max : 0;
            return createElement(HeatmapCell, {
              key: x.d.date,
              color: colorFor(ratio),
              tip: cellTip(x),
              onHover: function (ev, html) { setTip({ x: ev.clientX, y: ev.clientY, content: html }); },
              onLeave: function () { if (pinnedKey !== x.d.date) setTip(null); },
              onClick: function (ev, html) {
                ev.stopPropagation();
                if (pinnedKey === x.d.date) { setPinnedKey(null); setTip(null); }
                else { setPinnedKey(x.d.date); setTip({ x: ev.clientX, y: ev.clientY, content: html }); }
              }
            });
          })
        );
        grid.push(col);
      }

      var weekdayLabels = [
        { text: "日", top: "0%" },
        { text: "二", top: "28.57%" },
        { text: "四", top: "57.14%" },
        { text: "六", top: "85.71%" }
      ];

      var tabs = [
        { key: "daily", label: "每日" },
        { key: "weekly", label: "每周" },
        { key: "cumulative", label: "累计" }
      ];

      return createElement("div", {
        className: "dti-card",
        style: Object.assign({}, card, { marginTop: 16, marginBottom: 16, padding: narrow ? "10px 8px" : "16px" }),
        onClick: function () { setPinnedKey(null); setTip(null); }
      },
        createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 16px", flexWrap: "wrap", gap: 8 } },
          createElement("div", { style: { fontSize: 13, fontWeight: 500, color: T.text } }, "Token 活动"),
          createElement("div", { style: { display: "flex", alignItems: "center", gap: 14 } },
            createElement("div", { style: { display: "flex", background: "var(--dsw-alias-bg-layer-1)", borderRadius: 999, padding: 3, gap: 2 } },
              tabs.map(function (t) {
                return createElement("span", {
                  key: t.key,
                  onClick: function (ev) { ev.stopPropagation(); setMode(t.key); },
                  style: {
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    cursor: "pointer",
                    background: mode === t.key ? T.bg : "transparent",
                    color: mode === t.key ? T.text : T.sub,
                    fontWeight: mode === t.key ? 600 : 400
                  }
                }, t.label);
              })
            )
          )
        ),
        createElement("div", { ref: containerRef, style: { width: "100%" } },
          createElement("div", { style: { display: "flex" } },
            createElement("div", { style: { position: "relative", width: 18, marginRight: 2, flex: "none", fontSize: 10, color: T.sub } },
              weekdayLabels.map(function (wl) {
                return createElement("span", { key: wl.text, style: { position: "absolute", left: 0, top: wl.top, lineHeight: "14px" } }, wl.text);
              })
            ),
            createElement("div", { className: "dti-scroll", style: { display: "flex", overflowX: "auto", width: "100%" } },
              createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(52, minmax(0, 1fr))", gap: 3, width: "100%", minWidth: narrow ? 760 : 0, flex: "1 0 auto" } }, grid)
            )
          )
        ),
        createElement("div", { style: { position: "relative", height: 18, marginTop: 10, marginLeft: 18 } },
          monthLabels.map(function (m, mi) {
            if (narrow && mi % 2 === 1) return null;
            return createElement("span", {
              key: m.name,
              style: { position: "absolute", left: (m.col / 52 * 100) + "%", fontSize: 12, color: T.sub, whiteSpace: "nowrap" }
            }, m.name);
          })
        ),
        createElement(HeatmapTooltip, { tip: tip })
      );
    }

    // ── original components (kept below) ─────────────────────────
    var card = { background: T.bg, border: "none", borderRadius: 12, padding: "16px", marginBottom: 16 };
    var label = { color: T.sub, fontSize: 11 };
    var value = { color: T.text, fontSize: 20, fontWeight: 700, marginTop: 4 };
    var sub = { color: T.sub, fontSize: 11, marginTop: 2 };

    function SummaryCard(l, v, s) {
      return createElement("div", {
        style: {
          background: card.background,
          border: card.border,
          borderRadius: card.borderRadius,
          padding: card.padding,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minHeight: 84
        }
      },
        createElement("div", { style: label }, l),
        createElement("div", { style: value }, v),
        s ? createElement("div", { style: sub }, s) : null
      );
    }

    function btnStyle(active) {
      return {
        border: "none",
        borderRadius: 999,
        padding: "5px 12px",
        fontSize: 12,
        cursor: "pointer",
        background: active ? T.bg : "transparent",
        color: active ? T.text : T.sub,
        fontWeight: active ? 600 : 400,
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none"
      };
    }

    // SVG ring: guaranteed circular, never clipped by a square
    function ModelRing(props) {
      var all = props.models || [];
      var total = 0;
      all.forEach(function (m) { total += m.tokens || 0; });
      var shown = all.slice(0, 6);
      var shownPct = 0;
      shown.forEach(function (m) { shownPct += m.pct || 0; });
      var otherPct = Math.max(0, 100 - shownPct);
      if (otherPct > 0.01 && all.length > 6) {
        shown.push({ name: "其他", pct: otherPct, tokens: 0 });
      }
      var r = 44;
      var c = 2 * Math.PI * r;
      var acc = 0;
      var segs = shown.map(function (m, i) {
        var len = Math.max(0, (m.pct / 100) * c);
        var color = m.color || MODEL_COLORS[i % MODEL_COLORS.length];
        var seg = createElement("circle", {
          key: m.name,
          cx: 60,
          cy: 60,
          r: r,
          fill: "none",
          stroke: color,
          strokeWidth: 16,
          strokeDasharray: len + " " + (c - len),
          strokeDashoffset: -acc,
          transform: "rotate(-90 60 60)",
          onMouseEnter: function (ev) { if (props.onHover) props.onHover(ev, Object.assign({}, m, { color: color })); },
          onMouseMove: function (ev) { if (props.onHover) props.onHover(ev, Object.assign({}, m, { color: color })); },
          onMouseLeave: function () { if (props.onLeave) props.onLeave(); },
          onClick: function () { if (props.onSelect && m.name !== "其他") props.onSelect(m.name); }
        });
        acc += len;
        return seg;
      });
      if (!segs.length) {
        segs = [createElement("circle", { key: "empty", cx: 60, cy: 60, r: r, fill: "none", stroke: "#E5E8EC", strokeWidth: 16 })];
      }
      return createElement("svg", { width: 160, height: 160, viewBox: "0 0 120 120", style: { flex: "none", display: "block" } },
        createElement("circle", { cx: 60, cy: 60, r: r, fill: "none", stroke: "#E5E8EC", strokeWidth: 16 }),
        segs,
        createElement("text", { x: 60, y: 58, textAnchor: "middle", fontSize: 12, fontWeight: 600, fill: T.text }, fmt(total)),
        createElement("text", { x: 60, y: 72, textAnchor: "middle", fontSize: 9, fill: T.sub }, "tokens")
      );
    }

    function OriginalSection(props) {
      var [days, setDays] = useState(props.initial.days || 30);
      var [data, setData] = useState(props.initial);
      var [tip, setTip] = useState(null);
      var [barPinned, setBarPinned] = useState(null);
      var [hiddenModels, setHiddenModels] = useState({});
      var [hoverDate, setHoverDate] = useState(null);
      var [rangeWarning, setRangeWarning] = useState("");
      var trendSvgRef = useRef(null);
      var firstRender = useRef(true);

      useEffect(function () {
        // initial data comes from the parent; only fetch when the user toggles 7/30
        if (firstRender.current) { firstRender.current = false; return; }
        fetch("/usage-stats/api?days=" + days).then(function (r) { return r.json(); }).then(function (d) {
          if (d && d.ok) setData(d);
        }).catch(function () {});
      }, [days]);

      var dates = data.dayList.map(function (d) { return d.date; });
      var rangeModelTotals = {};
      dates.forEach(function (date) {
        var models = data.dayModels[date] || {};
        Object.keys(models).forEach(function (name) {
          rangeModelTotals[name] = (rangeModelTotals[name] || 0) + models[name];
        });
      });
      var rangeModels = Object.keys(rangeModelTotals)
        .map(function (name) { return { name: name, tokens: rangeModelTotals[name] }; })
        .sort(function (a, b) { return b.tokens - a.tokens; });
      var rangeModelTotal = 0;
      rangeModels.forEach(function (m) { rangeModelTotal += m.tokens; });
      rangeModels.forEach(function (m) {
        m.pct = rangeModelTotal > 0 ? (m.tokens / rangeModelTotal) * 100 : 0;
      });
      var listModels = (data.models || [])
        .map(function (m) {
          var tokens = rangeModelTotals[m.name] || 0;
          return {
            name: m.name,
            tokens: tokens,
            pct: rangeModelTotal > 0 ? (tokens / rangeModelTotal) * 100 : 0
          };
        })
        .sort(function (a, b) { return b.tokens - a.tokens; });

      function toggleModel(name) {
        setHiddenModels(function (previous) {
          var next = Object.assign({}, previous);
          if (next[name]) delete next[name];
          else next[name] = true;
          return next;
        });
      }
      var visibleModels = rangeModels.filter(function (m) { return !hiddenModels[m.name]; });

      // consistent model colors across bars, ring and tooltips
      var modelColor = {};
      rangeModels.slice(0, 6).forEach(function (m, i) { modelColor[m.name] = MODEL_COLORS[i]; });
      function colorForModel(name) { return modelColor[name] || "#4176E6"; }

      function barTipEl(d, entries) {
        var p = d.date.split("-");
        return createElement("div", null,
          createElement("div", { style: { fontWeight: 600, marginBottom: 4 } }, parseInt(p[1], 10) + "月" + parseInt(p[2], 10) + "日 - " + fmt(d.tokens) + " tokens"),
          entries.map(function (e) {
            return createElement("div", { key: e.name, style: { display: "flex", alignItems: "center", gap: 6, marginTop: 2 } },
              createElement("span", { style: { width: 8, height: 8, borderRadius: 4, background: colorForModel(e.name), display: "inline-block", flex: "none" } }),
              createElement("span", { style: { flex: 1, minWidth: 60 } }, e.name),
              createElement("span", { style: { marginLeft: 10 } }, fmt(e.tokens) + " tokens")
            );
          })
        );
      }

      // Precompute per-day model entries and tooltip elements once per data,
      // instead of rebuilding them on every mousemove.
      var dayEntries = useMemo(function () {
        var map = {};
        data.dayList.forEach(function (d) {
          var models = data.dayModels[d.date] || {};
          var entries = Object.keys(models).map(function (name) { return { name: name, tokens: models[name] }; });
          if (!entries.length) entries = [{ name: data.topModel || "?", tokens: d.tokens }];
          entries.sort(function (a, b) { return b.tokens - a.tokens; });
          map[d.date] = entries;
        });
        return map;
      }, [data]);

      var tipMap = useMemo(function () {
        var map = {};
        data.dayList.forEach(function (d) { map[d.date] = barTipEl(d, dayEntries[d.date]); });
        return map;
      }, [data, dayEntries]);

      function pctText(p) {
        if (p >= 10) return Math.round(p) + "%";
        if (p >= 0.1) return p.toFixed(1) + "%";
        return p >= 0.05 ? "0.1%" : "0%";
      }
      function modelTip(m) {
        return createElement("div", null,
          createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, fontWeight: 600, marginBottom: 4 } },
            createElement("span", { style: { width: 8, height: 8, borderRadius: 4, background: m.color || "#4176E6", display: "inline-block" } }),
            m.name
          ),
          createElement("div", null, fmt(m.tokens) + " tokens · " + pctText(m.pct))
        );
      }

      // model list for the ring card (top 6 + 其他)
      var ringModels = rangeModels.slice(0, 6);
      var shownPct = 0;
      ringModels.forEach(function (m) { shownPct += m.pct || 0; });
      var otherPct = Math.max(0, 100 - shownPct);
      if (otherPct > 0.01 && rangeModels.length > 6) {
        ringModels = ringModels.concat([{ name: "其他", pct: otherPct, tokens: 0 }]);
      }

      function load(nextDays) {
        fetch("/usage-stats/api?days=" + nextDays).then(function (r) { return r.json(); }).then(function (d) {
          if (d && d.ok) {
            if (Number(d.days) !== Number(nextDays)) {
              setRangeWarning("DSH host 还是旧版：请完整重启 DSH，「全部」范围才会生效");
            } else {
              setRangeWarning("");
            }
            setData(d);
          }
        }).catch(function () {});
      }
      function downloadBlob(filename, blob) {
        if (typeof document === "undefined") return;
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      }
      function download(filename, content, type) {
        downloadBlob(filename, new Blob([content], { type: type }));
      }
      function exportJson() {
        download("dsh-token-insight-" + days + ".json", JSON.stringify(data, null, 2), "application/json");
      }
      function exportCsv() {
        var rows = ["date,tokens"];
        data.dayList.forEach(function (d) { rows.push(d.date + "," + d.tokens); });
        download("dsh-token-insight-" + days + ".csv", rows.join("\n"), "text/csv;charset=utf-8");
      }
      function exportPng() {
        if (typeof document === "undefined" || !trendSvgRef.current) return;
        var clone = trendSvgRef.current.cloneNode(true);
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("width", "2000");
        clone.setAttribute("height", "400");
        var rootStyle = getComputedStyle(document.documentElement);
        var bodyStyle = getComputedStyle(document.body);
        var chartColors = {};
        for (var c = 1; c <= 7; c++) {
          chartColors[c] = rootStyle.getPropertyValue("--dti-chart-" + c).trim() || "#4176E6";
        }
        var xml = new XMLSerializer().serializeToString(clone)
          .replace(/var\(--dti-chart-(\d)\)/g, function (_, n) { return chartColors[n] || "#4176E6"; })
          .replace(/var\(--dsw-alias-border-l2\)/g, "#E5E7EB")
          .replace(/var\(--dsw-alias-label-primary\)/g, "#111827")
          .replace(/var\(--dsw-alias-label-tertiary\)/g, "#6B7280");
        var img = new Image();
        img.onload = function () {
          var canvas = document.createElement("canvas");
          canvas.width = 2000;
          canvas.height = 400;
          var ctx = canvas.getContext("2d");
          ctx.fillStyle = bodyStyle.getPropertyValue("--dsw-alias-bg-layer-2").trim() || "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function (blob) {
            if (blob) downloadBlob("dsh-token-insight-" + days + ".png", blob);
          }, "image/png");
        };
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
      }
      var narrow = typeof window !== "undefined" && window.innerWidth < 640;
      var sectionCard = narrow ? Object.assign({}, card, { padding: "10px 8px" }) : card;
      var actionStyle = {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: "1px solid " + T.border,
        borderRadius: 8,
        background: "transparent",
        color: T.text,
        fontSize: 12,
        padding: "6px 10px",
        cursor: "pointer"
      };
      var maxLineValue = 1;
      visibleModels.slice(0, 6).forEach(function (m) {
        dates.forEach(function (date) {
          var v = (data.dayModels[date] || {})[m.name] || 0;
          if (v > maxLineValue) maxLineValue = v;
        });
      });
      function xAt(i) { return dates.length <= 1 ? 52 : 52 + (i / (dates.length - 1)) * 936; }
      function yAt(v) { return 10 + 164 - (v / maxLineValue) * 164; }
      function smoothPath(points) {
        if (!points.length) return "";
        if (points.length === 1) return "M " + points[0][0] + " " + points[0][1];
        var d = "M " + points[0][0] + " " + points[0][1];
        for (var i = 0; i < points.length - 1; i++) {
          var p0 = points[i - 1] || points[i];
          var p1 = points[i];
          var p2 = points[i + 1];
          var p3 = points[i + 2] || p2;
          var cp1x = p1[0] + (p2[0] - p0[0]) / 6;
          var cp1y = p1[1] + (p2[1] - p0[1]) / 6;
          var cp2x = p2[0] - (p3[0] - p1[0]) / 6;
          var cp2y = p2[1] - (p3[1] - p1[1]) / 6;
          d += " C " + cp1x + " " + cp1y + ", " + cp2x + " " + cp2y + ", " + p2[0] + " " + p2[1];
        }
        return d;
      }

      return createElement("div", {
        style: { marginTop: 16 }
      },
        createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 } },
          createElement("div", { style: { fontSize: 13, fontWeight: 500, color: T.text } }, "时间范围"),
          createElement("div", { style: { display: "flex", background: "var(--dsw-alias-bg-layer-1)", borderRadius: 999, padding: 3, gap: 2 } },
            createElement("button", { onClick: function () { setDays(7); }, style: btnStyle(days === 7) }, "近 7 日"),
            createElement("button", { onClick: function () { setDays(30); }, style: btnStyle(days === 30) }, "近 30 日"),
            createElement("button", { onClick: function () { setDays(0); }, style: btnStyle(days === 0) }, "全部")
          )
        ),
        rangeWarning ? createElement("div", { style: { fontSize: 11, color: T.error, margin: "-4px 0 8px" } }, rangeWarning) : null,
        createElement("div", { style: sectionCard, className: "dti-card" },
          createElement("div", { style: { fontSize: 13, fontWeight: 500, marginBottom: 10, color: T.text } }, "每日 Token 趋势图"),
          createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: narrow ? 8 : 16, marginBottom: 8 } },
            rangeModels.slice(0, 6).map(function (m, i) {
              var off = hiddenModels[m.name] === true;
              return createElement("span", {
                key: m.name,
                onClick: function () { toggleModel(m.name); },
                title: off ? "点击显示 " + m.name : "点击隐藏 " + m.name,
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: T.text,
                  cursor: "pointer",
                  opacity: off ? 0.35 : 1,
                  textDecoration: off ? "line-through" : "none"
                }
              },
                createElement("span", { style: { width: 8, height: 8, borderRadius: 4, background: colorForModel(m.name) } }),
                m.name
              );
            })
          ),
          createElement("svg", { ref: trendSvgRef, viewBox: "0 0 1000 200", style: { width: "100%", height: "auto", display: "block", overflow: "hidden" } },
            [0, 0.25, 0.5, 0.75, 1].map(function (ratio, idx) {
              var y = 10 + 164 * ratio;
              return createElement("line", { key: "g" + idx, x1: 52, y1: y, x2: 988, y2: y, stroke: T.border, strokeDasharray: "3 4", strokeWidth: 1 });
            }),
            [0, 0.25, 0.5, 0.75, 1].map(function (ratio, idx) {
              var y = 10 + 164 * ratio;
              return createElement("text", { key: "y" + idx, x: 44, y: y + 4, textAnchor: "end", fontSize: 10, fill: T.sub }, fmt(maxLineValue * (1 - ratio)));
            }),
            hoverDate ? (function () {
              var idx = dates.indexOf(hoverDate);
              return idx >= 0
                ? createElement("line", { key: "crosshair", x1: xAt(idx), y1: 10, x2: xAt(idx), y2: 174, stroke: T.border, strokeDasharray: "3 3", strokeWidth: 1 })
                : null;
            })() : null,
            dates.map(function (date, i) {
              var show = dates.length <= 8 || i % 5 === 0 || i === dates.length - 1;
              if (!show) return null;
              var p = date.split("-");
              return createElement("text", { key: "x" + i, x: xAt(i), y: 194, textAnchor: "middle", fontSize: 10, fill: T.sub }, parseInt(p[1], 10) + "/" + parseInt(p[2], 10));
            }),
            visibleModels.slice(0, 6).map(function (m, mi) {
              var color = colorForModel(m.name);
              var points = dates.map(function (date, i) {
                return [xAt(i), yAt((data.dayModels[date] || {})[m.name] || 0)];
              });
              var line = smoothPath(points);
              var area = line + " L " + xAt(dates.length - 1) + " 174 L " + xAt(0) + " 174 Z";
              return createElement("g", { key: m.name },
                createElement("path", { d: area, fill: color, fillOpacity: 0.06, stroke: "none" }),
                createElement("path", { d: line, fill: "none", stroke: color, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" })
              );
            }),
            visibleModels.slice(0, 6).map(function (m, mi) {
              return dates.map(function (date, i) {
                var v = (data.dayModels[date] || {})[m.name] || 0;
                if (v <= 0) return null;
                return createElement("circle", { key: m.name + date, cx: xAt(i), cy: yAt(v), r: 2, fill: colorForModel(m.name) });
              });
            }),
            dates.map(function (date, i) {
              var colW = dates.length <= 1 ? 936 : 936 / (dates.length - 1);
              return createElement("rect", {
                key: "h" + date, x: Math.max(52, xAt(i) - colW / 2), y: 10, width: colW, height: 164, fill: "transparent",
                onMouseEnter: function (ev) { setHoverDate(date); setTip({ x: ev.clientX, y: ev.clientY, content: tipMap[date] }); },
                onMouseMove: function (ev) { setHoverDate(date); setTip({ x: ev.clientX, y: ev.clientY, content: tipMap[date] }); },
                onMouseLeave: function () { setHoverDate(null); setTip(null); }
              });
            })
          )
        ),
        createElement("div", { style: sectionCard, className: "dti-card" },
          createElement("div", { style: { fontSize: 13, fontWeight: 500, marginBottom: 10, color: T.text } }, "模型用量"),
          createElement("div", { style: { display: "flex", flexDirection: narrow ? "column" : "row", alignItems: narrow ? "stretch" : "center", gap: narrow ? 14 : 32, paddingLeft: narrow ? 0 : 32 } },
            createElement("div", { style: { alignSelf: narrow ? "center" : "auto", flex: "none" } },
              createElement(ModelRing, {
                models: visibleModels.map(function (m) { return Object.assign({}, m, { color: colorForModel(m.name) }); }),
                onHover: function (ev, m) { setTip({ x: ev.clientX, y: ev.clientY, content: modelTip(m) }); },
                onLeave: function () { setTip(null); },
                onSelect: toggleModel
              })
            ),
            createElement("div", { style: { width: "100%", minWidth: 0 } },
              listModels.slice(0, 7).map(function (m, i) {
                var color = colorForModel(m.name);
                return createElement("div", {
                  key: m.name,
                  onClick: function () { if (m.tokens > 0) toggleModel(m.name); },
                  title: m.tokens > 0 ? "点击隐藏/显示 " + m.name : undefined,
                  style: {
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 0",
                    cursor: m.tokens > 0 ? "pointer" : "default",
                    opacity: hiddenModels[m.name] ? 0.35 : 1,
                    borderBottom: i < Math.min(listModels.length, 7) - 1 ? "1px solid " + T.border : "none"
                  }
                },
                  createElement("span", { style: { width: 8, height: 8, borderRadius: 4, background: color, marginTop: 4, flex: "none" } }),
                  createElement("div", { style: { flex: 1, minWidth: 0 } },
                    createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: T.text } },
                      createElement("span", { style: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, m.name),
                      createElement("span", { style: { color: T.sub, flex: "none" } }, pctText(m.pct))
                    ),
                    createElement("div", { style: { fontSize: 11, color: T.sub, marginTop: 2 } }, fmt(m.tokens) + " tokens")
                  )
                );
              })
            )
          )
        ),
        data.sessionsTop && data.sessionsTop.length
          ? createElement("div", { style: sectionCard, className: "dti-card" },
              createElement("div", { style: { fontSize: 13, fontWeight: 500, marginBottom: 10, color: T.text } }, "会话用量 Top 5"),
              data.sessionsTop.map(function (s, i) {
                return createElement("div", {
                  key: s.id,
                  style: { display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < data.sessionsTop.length - 1 ? "1px solid " + T.border : "none" }
                },
                  createElement("span", { style: { width: 16, fontSize: 11, color: T.sub, flex: "none" } }, String(i + 1)),
                  createElement("div", { style: { flex: 1, minWidth: 0 } },
                    createElement("div", { style: { fontSize: 12, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, s.title || s.id),
                    createElement("div", { style: { fontSize: 10, color: T.sub, marginTop: 2 } }, s.duration || "--")
                  ),
                  createElement("span", { style: { fontSize: 12, color: T.text, whiteSpace: "nowrap", flex: "none" } }, fmt(s.tokens) + " tokens")
                );
              })
            )
          : null,
        createElement("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, flexWrap: "wrap" } },
          createElement("button", { onClick: exportCsv, style: actionStyle }, "导出 CSV"),
          createElement("button", { onClick: exportJson, style: actionStyle }, "导出 JSON"),
          createElement("button", { onClick: exportPng, style: actionStyle }, "导出 PNG"),
          createElement("button", { onClick: function () { load(days); }, style: actionStyle }, "↻ 刷新")
        ),
        createElement(HeatmapTooltip, { tip: tip })
      );
    }

    // ── page ────────────────────────────────────────────────────
    function UsagePage() {
      var [data, setData] = useState(null);
      var [budget, setBudget] = useState(function () {
        try {
          return Number(localStorage.getItem("dti-daily-budget")) || 0;
        } catch {
          return 0;
        }
      });
      useEffect(function () {
        fetch("/usage-stats/api?days=30").then(function (r) { return r.json(); }).then(setData).catch(function () { setData({ ok: false, message: "加载失败" }); });
      }, []);

      if (!data) {
        return createElement("div", { className: "dti-root", style: { width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "16px 10px" } },
          createElement("div", { className: "dti-skeleton", style: { height: 64, marginBottom: 16 } }),
          createElement("div", { className: "dti-skeleton", style: { height: 180, marginBottom: 16 } }),
          createElement("div", { className: "dti-skeleton", style: { height: 220, marginBottom: 16 } }),
          createElement("div", { style: { fontSize: 12, color: T.sub, textAlign: "center" } }, "正在扫描本地会话…首次加载可能需要几秒")
        );
      }
      if (!data.ok) return createElement("div", { style: { color: T.error } }, data.message || "加载失败");

      var hasUsage = (data.totalTokens || 0) > 0 || (data.tokens || 0) > 0;
      if (!hasUsage) {
        return createElement("div", { className: "dti-root", style: { width: "100%", maxWidth: "100%", margin: "0 auto", padding: "48px 8px", background: "transparent", textAlign: "center", color: T.sub, border: "1px dashed " + T.border, borderRadius: 16 } },
          "暂无使用数据，去 DeepSeek Harness 里跑几个任务后，这里就会出现统计。"
        );
      }

      var todayTokens = data.todayTokens || 0;
      var budgetPct = budget > 0 ? Math.min(100, (todayTokens / budget) * 100) : 0;

      return createElement("div", { className: "dti-root", style: { width: "100%", maxWidth: "100%", boxSizing: "border-box", margin: "0 auto", padding: "16px 10px", overflowX: "hidden", background: "transparent" } },
        createElement(TokenStatsCard, { stats: data }),
        createElement("div", { style: { fontSize: 11, color: T.sub, margin: "0 0 12px", lineHeight: 1.8 } },
          createElement("div", null,
            "数据覆盖 " +
              ((data.coverage && data.coverage.firstDay) || "--") +
              " ~ " +
              ((data.coverage && data.coverage.lastDay) || "--") +
              " · 本地会话"
          ),
          createElement("div", null,
            "今日 " + fmt(data.todayTokens || 0) +
              " · 本周 " + fmt(data.weekTokens || 0) +
              " · 缓存命中 " + (data.cacheHitRate || 0).toFixed(1) + "%" +
              (data.cost && data.cost.amount
                ? " · 历史计费 ¥" + Number(data.cost.amount).toFixed(2) + "（部分）"
                : "")
          )
        ),
        data.version !== "0.5.0"
          ? createElement("div", { style: { fontSize: 11, color: T.error, margin: "0 0 12px" } },
              "当前 DSH host 还是旧版，新指标和「全部」范围需要完整重启 DSH 后才生效"
            )
          : null,
        createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: T.sub, margin: "0 0 12px", flexWrap: "wrap" } },
          "日预算",
          createElement("input", {
            type: "number",
            min: 0,
            step: 1000000,
            value: budget || "",
            placeholder: "未设置",
            onChange: function (event) {
              var next = Number(event.target.value) || 0;
              setBudget(next);
              try {
                localStorage.setItem("dti-daily-budget", String(next));
              } catch {
                // localStorage can be unavailable in private/sandboxed views.
              }
            },
            style: { width: 110, padding: "3px 6px", border: "1px solid " + T.border, borderRadius: 6, background: "transparent", color: T.text, fontSize: 11 }
          }),
          budget > 0
            ? createElement("span", null, "今日已用 " + budgetPct.toFixed(0) + "%" + (budgetPct >= 100 ? " · 已超预算" : ""))
            : null
        ),
        createElement(TokenActivityHeatmap, { list: data.heatList }),
        createElement(OriginalSection, { initial: data })
      );
    }

    function apply(ctx) {
      injectStyles();
      ctx.slots.inject("settings.section", function () {
        return ctx.slots.register({
          name: "settings.section",
          id: "dsh-token-insight",
          order: 60,
          label: "使用统计"
        }, UsagePage);
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
