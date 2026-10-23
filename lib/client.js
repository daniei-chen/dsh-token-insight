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

    var ACCENT = "var(--dti-chart-1, #4176E6)";
    var ACCENT_SOFT = "rgba(65,118,230,0.12)";

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
      if (typeof document === "undefined") return;
      var css = [
        ":root{--dti-chart-1:#4176E6;--dti-chart-2:#22C55E;--dti-chart-3:#F59E0B;--dti-chart-4:#A78BFA;--dti-chart-5:#EC4899;--dti-chart-6:#14B8A6;--dti-chart-7:#B8B8B8;",
        "--dti-heat-0:#F3F4F6;--dti-heat-1:#DCEEFF;--dti-heat-2:#9DD0FF;--dti-heat-3:#72B9FA;--dti-heat-4:#4CA4F5}",
        "html[data-theme=\"dark\"],html[data-dsh-dream-skin-scheme=\"dark\"]{--dti-chart-1:#5B8DEF;--dti-chart-2:#34D399;--dti-chart-3:#FBBF24;--dti-chart-4:#A78BFA;--dti-chart-5:#F472B6;--dti-chart-6:#2DD4BF;--dti-chart-7:#94A3B8;",
        "--dti-heat-0:#1F2937;--dti-heat-1:#1E3A5F;--dti-heat-2:#1D4ED8;--dti-heat-3:#2563EB;--dti-heat-4:#3B82F6}",
        ".dti-root{font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;box-sizing:border-box}",
        ".dti-card{transition:background-color .16s ease,border-color .16s ease}",
        ".dti-line{stroke-dasharray:1;animation:dti-draw 1.1s ease-out both}",
        ".dti-ring{animation:dti-fade .55s ease both}",
        ".dti-heat-cell{animation:dti-fade .28s ease both}",
        ".dti-scroll{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2) transparent}",
        ".dti-scroll::-webkit-scrollbar{height:6px}.dti-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:3px}",
        ".dti-skeleton{animation:dti-pulse 1.2s ease-in-out infinite;background:var(--dsw-alias-bg-layer-1);border-radius:12px}",
        "@keyframes dti-pulse{0%,100%{opacity:.45}50%{opacity:.8}}",
        "@keyframes dti-fade-up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
        "@keyframes dti-fade{from{opacity:0}to{opacity:1}}",
        "@keyframes dti-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}",
        "@keyframes dti-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}",
        ".dti-spin{display:inline-block;animation:dti-spin .9s linear infinite}",
        ".dti-loading-circle{width:28px;height:28px;margin:0 auto 12px;border-radius:50%;border:3px solid rgba(65,118,230,0.18);border-top-color:var(--dti-chart-1,#4176E6);animation:dti-spin .8s linear infinite}",
        "@media (prefers-reduced-motion:reduce){.dti-card,.dti-line,.dti-ring,.dti-heat-cell,.dti-skeleton,.dti-spin{animation:none!important}}"
      ].join("");
      var style = document.getElementById(STYLE_ID);
      if (!style) {
        style = document.createElement("style");
        style.id = STYLE_ID;
        (document.head || document.documentElement).appendChild(style);
      }
      style.textContent = css;
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
    function tipText(node) {
      if (node === null || node === undefined || node === false) return "";
      if (typeof node === "string" || typeof node === "number") return String(node);
      if (Array.isArray(node)) {
        return node.map(tipText).filter(Boolean).join("\n");
      }
      if (typeof node === "object" && node.props) {
        var children = node.props.children;
        if (Array.isArray(children)) {
          return children.map(tipText).filter(Boolean).join("\n");
        }
        return tipText(children);
      }
      return "";
    }

    function HeatmapTooltip(props) {
      useEffect(function () {
        if (typeof document === "undefined") return;
        var id = "dsh-token-insight-floating-tip";
        var el = document.getElementById(id);
        if (!props.tip) {
          if (el) el.style.display = "none";
          return;
        }
        if (!el) {
          el = document.createElement("div");
          el.id = id;
          el.style.position = "fixed";
          el.style.zIndex = "2147483647";
          el.style.background = "var(--dsw-alias-bg-layer-2)";
          el.style.color = "var(--dsw-alias-label-primary)";
          el.style.border = "1px solid var(--dsw-alias-border-l2)";
          el.style.borderRadius = "10px";
          el.style.padding = "10px 12px";
          el.style.fontSize = "12px";
          el.style.lineHeight = "1.6";
          el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.14)";
          el.style.pointerEvents = "none";
          el.style.whiteSpace = "pre-line";
          el.style.wordBreak = "break-word";
          el.style.boxSizing = "border-box";
          document.body.appendChild(el);
        }
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var width = Math.min(340, vw - 24);
        var left = Math.max(12, Math.min(props.tip.x + 14, vw - width - 12));
        var top = Math.max(12, Math.min(props.tip.y + 14, vh - 120));
        el.textContent = tipText(props.tip.content);
        el.style.display = "block";
        el.style.maxWidth = width + "px";
        el.style.left = left + "px";
        el.style.top = top + "px";
        return function () {
          if (el) el.style.display = "none";
        };
      }, [props.tip]);
      return null;
    }

    function HeatmapCell(props) {
      return createElement("div", {
        className: "dti-heat-cell",
        title: props.tip,
        style: {
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 2,
          background: props.color,
          margin: 0,
          flex: "none",
          minWidth: 0,
          position: "relative",
          zIndex: props.selected ? 2 : 0,
          boxShadow: props.selected ? "0 0 0 2px " + ACCENT : "none",
          filter: props.selected ? "brightness(0.84) saturate(1.3)" : "none"
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
      var scrollRef = useRef(null);
      var [width, setWidth] = useState(0);
      var [mode, setMode] = useState("daily");
      var setTip = props.setTip;
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

      useEffect(function () {
        // 手机端热力图比屏幕宽，默认滚到最右侧，先看到最近几周。
        if (scrollRef.current && typeof window !== "undefined" && window.innerWidth < 640) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
      }, [list]);

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
              selected: pinnedKey === x.d.date,
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
            createElement("div", { ref: scrollRef, className: "dti-scroll", style: { overflowX: "auto", width: "100%" } },
              createElement("div", { style: { width: "100%", minWidth: narrow ? 760 : 0, flex: "1 0 auto" } },
                createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(52, minmax(0, 1fr))", gap: 3, width: "100%" } }, grid),
                createElement("div", { style: { position: "relative", height: 18, marginTop: 10, marginLeft: 18 } },
                  monthLabels.map(function (m, mi) {
                    if (narrow && mi % 2 === 1) return null;
                    return createElement("span", {
                      key: m.name,
                      style: { position: "absolute", left: (m.col / 52 * 100) + "%", fontSize: 12, color: T.sub, whiteSpace: "nowrap" }
                    }, m.name);
                  })
                )
              )
            )
          )
        ),
          narrow ? createElement("div", { style: { fontSize: 10, color: T.sub, marginTop: 6, textAlign: "center" } }, "← 左右滑动查看最近 52 周 →") : null
      );
    }

    // ── original components (kept below) ─────────────────────────
    var card = { background: T.bg, border: "none", borderRadius: 12, padding: "16px", marginBottom: 16 };
    var label = { color: T.sub, fontSize: 11 };
    var value = { color: T.text, fontSize: 20, fontWeight: 700, marginTop: 4 };
    var sub = { color: T.sub, fontSize: 11, marginTop: 2 };

    function SummaryCard(l, v, s) {
      return createElement("div", {
        className: "dti-card",
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
        boxShadow: active ? "0 0 0 1.5px " + ACCENT + ", 0 1px 3px rgba(65,118,230,0.2)" : "none"
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
          className: "dti-ring",
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
          onClick: function (ev) {
            if (typeof window !== "undefined" && window.innerWidth < 640 && props.onHover) {
              props.onHover(ev, Object.assign({}, m, { color: color }));
              return;
            }
            if (props.onSelect && m.name !== "其他") props.onSelect(m.name);
          }
        }, createElement("title", null, m.name + " · " + (m.pct || 0).toFixed(1) + "%"));
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
      var [days, setDays] = useState(props.initial.days || 7);
      var [data, setData] = useState(props.initial);
      var setTip = props.setTip;
      var onData = props.onData;
      var [barPinned, setBarPinned] = useState(null);
      var [focusedModel, setFocusedModel] = useState(null);
      var [hoverDate, setHoverDate] = useState(null);
      var [pinnedDate, setPinnedDate] = useState(null);
      var [refreshing, setRefreshing] = useState(false);
      var [loadError, setLoadError] = useState("");
      var [showAllSessions, setShowAllSessions] = useState(false);
      var [sessionPage, setSessionPage] = useState(0);
      var trendSvgRef = useRef(null);
      var firstRender = useRef(true);

      useEffect(function () {
        // initial data comes from the parent; only fetch when the user toggles 7/30
        setSessionPage(0);
        setPinnedDate(null);
        if (firstRender.current) { firstRender.current = false; return; }
        fetch("/usage-stats/api?days=" + days).then(function (r) { return r.json(); }).then(function (d) {
          if (d && d.ok) {
            setData(d);
            setLoadError("");
            if (onData) onData(d);
          } else {
            setLoadError("读取失败，点击重试");
          }
        }).catch(function () {
          setLoadError("读取失败，点击重试");
        });
      }, [days]);

      var dates = data.dayList.map(function (d) { return d.date; });
      var activeDate = hoverDate || pinnedDate;
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
      if (focusedModel) {
        listModels = listModels.filter(function (m) { return m.name === focusedModel; });
      }

      function focusModel(name) {
        setFocusedModel(function (current) { return current === name ? null : name; });
      }
      var visibleModels = focusedModel
        ? rangeModels.filter(function (m) { return m.name === focusedModel; })
        : rangeModels;

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
        setRefreshing(true);
        setLoadError("");
        fetch("/usage-stats/api?days=" + nextDays).then(function (r) { return r.json(); }).then(function (d) {
          if (d && d.ok) {
            setData(d);
            if (onData) onData(d);
          } else {
            setLoadError("读取失败，点击重试");
          }
        }).catch(function () {
          setLoadError("读取失败，点击重试");
        }).then(function () {
          setRefreshing(false);
        });
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
      var pagerStyle = {
        border: "1px solid " + T.border,
        borderRadius: 6,
        background: "transparent",
        color: T.text,
        fontSize: 11,
        minHeight: 32,
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
        createElement("div", { style: sectionCard, className: "dti-card" },
          createElement("div", { style: { fontSize: 13, fontWeight: 500, marginBottom: 10, color: T.text } }, "每日 Token 趋势图"),
          createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: narrow ? 8 : 16, marginBottom: 8 } },
            rangeModels.slice(0, 6).map(function (m, i) {
              var focused = focusedModel === m.name;
              var dimmed = focusedModel ? !focused : false;
              return createElement("span", {
                key: m.name,
                onClick: function () { focusModel(m.name); },
                title: focused ? "点击恢复显示全部模型" : "点击只看 " + m.name,
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: focused ? ACCENT : T.text,
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: 6,
                  border: "1px solid " + (focused ? ACCENT : "transparent"),
                  background: focused ? ACCENT_SOFT : "transparent",
                  opacity: dimmed ? 0.4 : 1,
                  textDecoration: "none"
                }
              },
                createElement("span", { style: { width: 8, height: 8, borderRadius: 4, background: colorForModel(m.name) } }),
                m.name
              );
            })
          ),
          createElement("svg", { ref: trendSvgRef, viewBox: "0 0 1000 200", style: { width: "100%", height: "auto", display: "block", overflow: "hidden" }, onClick: function () { setPinnedDate(null); setHoverDate(null); setTip(null); } },
            [0, 0.25, 0.5, 0.75, 1].map(function (ratio, idx) {
              var y = 10 + 164 * ratio;
              return createElement("line", { key: "g" + idx, x1: 52, y1: y, x2: 988, y2: y, stroke: T.border, strokeDasharray: "3 4", strokeWidth: 1 });
            }),
            [0, 0.25, 0.5, 0.75, 1].map(function (ratio, idx) {
              var y = 10 + 164 * ratio;
              return createElement("text", { key: "y" + idx, x: 44, y: y + 4, textAnchor: "end", fontSize: 10, fill: T.sub }, fmt(maxLineValue * (1 - ratio)));
            }),
            pinnedDate ? (function () {
              var idx = dates.indexOf(pinnedDate);
              if (idx < 0) return null;
              var colW = dates.length <= 1 ? 936 : 936 / (dates.length - 1);
              return createElement("rect", {
                key: "pinned-col",
                x: Math.max(52, xAt(idx) - colW / 2),
                y: 10,
                width: colW,
                height: 164,
                fill: ACCENT,
                fillOpacity: 0.08,
                pointerEvents: "none"
              });
            })() : null,
            activeDate ? (function () {
              var idx = dates.indexOf(activeDate);
              var pinned = pinnedDate === activeDate;
              return idx >= 0
                ? createElement("line", {
                    key: "crosshair",
                    x1: xAt(idx), y1: 10, x2: xAt(idx), y2: 174,
                    stroke: pinned ? ACCENT : T.border,
                    strokeDasharray: pinned ? "none" : "3 3",
                    strokeWidth: pinned ? 1.5 : 1
                  })
                : null;
            })() : null,
            dates.map(function (date, i) {
              var show = dates.length <= 8 || i % 5 === 0 || i === dates.length - 1;
              if (!show) return null;
              var p = date.split("-");
              var pinnedText = date === pinnedDate;
              return createElement("text", { key: "x" + i, x: xAt(i), y: 194, textAnchor: "middle", fontSize: 10, fill: pinnedText ? ACCENT : T.sub, fontWeight: pinnedText ? 600 : 400 }, parseInt(p[1], 10) + "/" + parseInt(p[2], 10));
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
                createElement("path", { d: line, pathLength: "1", className: "dti-line", fill: "none", stroke: color, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" })
              );
            }),
            visibleModels.slice(0, 6).map(function (m, mi) {
              return dates.map(function (date, i) {
                var v = (data.dayModels[date] || {})[m.name] || 0;
                if (v <= 0) return null;
                var isPinned = date === pinnedDate;
                return createElement("circle", {
                  key: m.name + date,
                  cx: xAt(i),
                  cy: yAt(v),
                  r: isPinned ? 4 : 2,
                  fill: colorForModel(m.name),
                  stroke: isPinned ? ACCENT : "none",
                  strokeWidth: isPinned ? 2 : 0
                });
              });
            }),
            dates.map(function (date, i) {
              var colW = dates.length <= 1 ? 936 : 936 / (dates.length - 1);
              return createElement("rect", {
                key: "h" + date, x: Math.max(52, xAt(i) - colW / 2), y: 10, width: colW, height: 164, fill: "transparent", pointerEvents: "all",
                onMouseEnter: function (ev) { setHoverDate(date); setTip({ x: ev.clientX, y: ev.clientY, content: tipMap[date] }); },
                onMouseMove: function (ev) { setHoverDate(date); setTip({ x: ev.clientX, y: ev.clientY, content: tipMap[date] }); },
                onMouseLeave: function () { setHoverDate(null); setTip(null); },
                onClick: function (ev) {
                  ev.stopPropagation();
                  setPinnedDate(pinnedDate === date ? null : date);
                  setHoverDate(null);
                  setTip({ x: ev.clientX, y: ev.clientY, content: tipMap[date] });
                }
              }, createElement("title", null, tipMap[date]));
            })
          )
        ),
        createElement("div", { style: sectionCard, className: "dti-card" },
          createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 } },
            createElement("div", { style: { fontSize: 13, fontWeight: 500, color: T.text } }, "模型用量" + (focusedModel ? " · " + focusedModel : "")),
            focusedModel
              ? createElement("button", {
                  onClick: function () { setFocusedModel(null); },
                  style: { border: "none", background: "transparent", color: ACCENT, fontSize: 11, cursor: "pointer", padding: "2px 0" }
                }, "显示全部")
              : null
          ),
          createElement("div", { style: { display: "flex", flexDirection: narrow ? "column" : "row", alignItems: narrow ? "stretch" : "center", gap: narrow ? 14 : 32, paddingLeft: narrow ? 0 : 32 } },
            createElement("div", { style: { alignSelf: narrow ? "center" : "auto", flex: "none" } },
              createElement(ModelRing, {
                models: visibleModels.map(function (m) { return Object.assign({}, m, { color: colorForModel(m.name) }); }),
                onHover: function (ev, m) { setTip({ x: ev.clientX, y: ev.clientY, content: modelTip(m) }); },
                onLeave: function () { setTip(null); },
                onSelect: focusModel
              })
            ),
            createElement("div", { style: { width: "100%", minWidth: 0 } },
              listModels.slice(0, 7).map(function (m, i) {
                var color = colorForModel(m.name);
                var focused = focusedModel === m.name;
                return createElement("div", {
                  key: m.name,
                  onClick: function () { if (m.tokens > 0) focusModel(m.name); },
                  title: m.tokens > 0 ? (focused ? "点击恢复显示全部模型" : "点击只看 " + m.name) : undefined,
                  style: {
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 6px",
                    margin: "0 -6px",
                    borderRadius: 6,
                    background: focused ? ACCENT_SOFT : "transparent",
                    outline: focused ? "1.5px solid " + ACCENT : "none",
                    cursor: m.tokens > 0 ? "pointer" : "default",
                    opacity: 1,
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
          ? (function () {
              var ranking = data.sessionsRanking && data.sessionsRanking.length ? data.sessionsRanking : data.sessionsTop;
              var pageCount = Math.max(1, Math.ceil(ranking.length / 10));
              var page = Math.min(sessionPage, pageCount - 1);
              var list = showAllSessions ? ranking.slice(page * 10, page * 10 + 10) : data.sessionsTop;
              var rangeLabel = days === 7 ? "近 7 日" : days === 30 ? "近 30 日" : "全部";
              return createElement("div", { style: sectionCard, className: "dti-card" },
                createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 } },
                  createElement("div", { style: { fontSize: 13, fontWeight: 500, color: T.text } }, "会话用量 · " + rangeLabel),
                  ranking.length > 5
                    ? createElement("button", {
                        onClick: function () {
                          setShowAllSessions(!showAllSessions);
                          setSessionPage(0);
                        },
                        style: { border: "none", background: "transparent", color: "#4C8DFF", fontSize: 11, cursor: "pointer", padding: "2px 0" }
                      }, showAllSessions ? "收起" : "查看全部")
                    : null
                ),
                list.map(function (s, i) {
                  var rank = (showAllSessions ? page * 10 : 0) + i + 1;
                  var title = s.title || s.id;
                  var share = "";
                  if (typeof s.cacheReadTokens === "number" && s.tokens > 0) {
                    share += " · 缓存 " + Math.round((s.cacheReadTokens / s.tokens) * 100) + "%";
                    if (typeof s.outputTokens === "number") {
                      share += " · 输出 " + Math.round((s.outputTokens / s.tokens) * 100) + "%";
                    }
                  }
                  return createElement("div", {
                    key: s.id,
                    style: { display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < list.length - 1 ? "1px solid " + T.border : "none" }
                  },
                    createElement("span", { style: { width: 22, fontSize: 11, color: T.sub, flex: "none" } }, String(rank)),
                    createElement("div", { style: { flex: 1, minWidth: 0 } },
                      createElement("div", { title: title, style: { fontSize: 12, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, title),
                      createElement("div", { style: { fontSize: 10, color: T.sub, marginTop: 2 } }, (s.duration || "--") + share)
                    ),
                    createElement("span", { style: { fontSize: 12, color: T.text, whiteSpace: "nowrap", flex: "none" } }, fmt(s.tokens) + " tokens")
                  );
                }),
                showAllSessions && pageCount > 1
                  ? createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 } },
                      createElement("button", {
                        onClick: function () { setSessionPage(Math.max(0, page - 1)); },
                        disabled: page === 0,
                        style: Object.assign({}, pagerStyle, { opacity: page === 0 ? 0.4 : 1, cursor: page === 0 ? "default" : "pointer" })
                      }, "上一页"),
                      createElement("span", { style: { fontSize: 11, color: T.sub } }, "第 " + (page + 1) + " / " + pageCount + " 页"),
                      createElement("button", {
                        onClick: function () { setSessionPage(Math.min(pageCount - 1, page + 1)); },
                        disabled: page >= pageCount - 1,
                        style: Object.assign({}, pagerStyle, { opacity: page >= pageCount - 1 ? 0.4 : 1, cursor: page >= pageCount - 1 ? "default" : "pointer" })
                      }, "下一页")
                    )
                  : null
              );
            })()
          : null,
        createElement("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", marginTop: 12, flexWrap: "wrap" } },
          loadError
            ? createElement("button", {
                onClick: function () { load(days); },
                style: { border: "none", background: "transparent", color: T.error, fontSize: 11, cursor: "pointer", padding: "2px 4px" }
              }, loadError)
            : null,
          createElement("button", {
            onClick: function () { load(days); },
            disabled: refreshing,
            "aria-busy": refreshing,
            style: Object.assign({}, actionStyle, {
              opacity: refreshing ? 0.65 : 1,
              cursor: refreshing ? "wait" : "pointer"
            })
          },
            createElement("span", { className: refreshing ? "dti-spin" : "", style: { fontSize: 14, lineHeight: 1 } }, "↻"),
            refreshing ? "正在读取…" : "刷新"
          )
        )
      );
    }

    // ── page ────────────────────────────────────────────────────
    function LoadingState() {
      return createElement("div", { className: "dti-root", style: { width: "100%", maxWidth: "100%", boxSizing: "border-box", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 10px" } },
        createElement("div", { style: { textAlign: "center", transform: "translateY(-10vh)" } },
          createElement("div", { className: "dti-loading-circle" }),
          createElement("div", { style: { fontSize: 13, color: T.sub } }, "加载中")
        )
      );
    }

    function UsagePage() {
      var [data, setData] = useState(null);
      var [tip, setTip] = useState(null);
      function reload() {
        setData(null);
        fetch("/usage-stats/api?days=7").then(function (r) { return r.json(); }).then(setData).catch(function () { setData({ ok: false, message: "加载失败" }); });
      }
      useEffect(function () {
        reload();
      }, []);

      if (!data) {
        return createElement(LoadingState);
      }
      if (!data.ok) {
        return createElement("div", { style: { color: T.error, textAlign: "center", padding: "48px 8px" } },
          createElement("div", null, data.message || "加载失败"),
          createElement("button", {
            onClick: reload,
            style: { marginTop: 10, border: "1px solid " + T.border, borderRadius: 8, background: "transparent", color: T.text, fontSize: 12, padding: "6px 12px", cursor: "pointer" }
          }, "重试")
        );
      }

      var hasUsage = (data.totalTokens || 0) > 0 || (data.tokens || 0) > 0;
      if (!hasUsage) {
        return createElement("div", { className: "dti-root", style: { width: "100%", maxWidth: "100%", margin: "0 auto", padding: "48px 8px", background: "transparent", textAlign: "center", color: T.sub, border: "1px dashed " + T.border, borderRadius: 16 } },
          "暂无使用数据，去 DeepSeek Harness 里跑几个任务后，这里就会出现统计。"
        );
      }

      var noRecordDays = 0;
      (data.dayList || []).forEach(function (d) {
        if (!d.tokens) noRecordDays++;
      });
      var costText = "";
      if (data.cost && data.cost.amount) {
        var sourceName = data.cost.source === "billing" ? "billing" : "cost-meter";
        var sources = (data.coverage && data.coverage.sources) || null;
        var sourceDays = sources ? sources[data.cost.source === "billing" ? "billing" : "ledger"] : null;
        costText =
          " · 历史计费 ¥" +
          Number(data.cost.amount).toFixed(2) +
          "（部分 · " +
          sourceName +
          (sourceDays ? " " + sourceDays + " 天" : "") +
          "）";
      }

      return createElement("div", { className: "dti-root", style: { width: "100%", maxWidth: "100%", boxSizing: "border-box", margin: "0 auto", padding: "16px 10px", overflowX: "hidden", background: "transparent" } },
        createElement(TokenStatsCard, { stats: data }),
        createElement(TokenActivityHeatmap, { list: data.heatList, setTip: setTip }),
        createElement(OriginalSection, { initial: data, setTip: setTip, onData: setData }),
        createElement(HeatmapTooltip, { tip: tip }),
        createElement("div", { style: { fontSize: 11, color: T.sub, margin: "18px 0 0", lineHeight: 1.8, textAlign: "center" } },
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
              costText
          ),
          noRecordDays > 0
            ? createElement("div", null, "当前范围 " + noRecordDays + " 天无记录")
            : null
        ),
        data.version !== "0.5.10"
          ? createElement("div", { style: { fontSize: 11, color: T.sub, margin: "8px 0 4px", textAlign: "center", lineHeight: 1.7 } },
              "插件客户端与 host 版本不一致（host " + data.version + "），完整重启 DSH 后自动消失"
            )
          : null
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
