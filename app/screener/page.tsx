"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";

type Row = Record<string, any>;
type SortDir = "asc" | "desc";

const CSV_FETCH_PATH = "/data/rs_latest.csv";
const FAVORITES_KEY = "alphapanel_favorites";

/* ── Helpers ────────────────────────────────────────────── */

function norm(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  const t = s.toLowerCase();
  if (!s || t === "nan" || t === "null" || t === "none" || t === "undefined") return "";
  return s;
}

function toNum(v: any): number | null {
  const s = norm(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function fmtRet(v: any): { text: string; sign: "pos" | "neg" | "flat" } {
  const n = toNum(v);
  if (n === null) return { text: "—", sign: "flat" };
  const pct = n * 100;
  const sign = pct > 0.01 ? "pos" : pct < -0.01 ? "neg" : "flat";
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, sign };
}

function fmtPrice(v: any): string {
  const n = toNum(v);
  if (n === null) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function uniqueSorted(vals: string[]) {
  return Array.from(new Set(vals.map(norm).filter(Boolean))).sort();
}

/* ── Favorites (in-memory with localStorage persistence) ── */

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveFavorites(favs: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]));
  } catch {}
}

/* ── CSV parser ─────────────────────────────────────────── */

function parseCSV(text: string): Row[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;

  const push = () => { cur.push(field); field = ""; };
  const row = () => {
    if (cur.length === 1 && !cur[0].trim()) { cur = []; return; }
    rows.push(cur); cur = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
      continue;
    }
    if (c === '"') inQ = true;
    else if (c === ",") push();
    else if (c === "\n") { push(); row(); }
    else if (c !== "\r") field += c;
  }
  push(); row();

  if (rows.length < 2) return [];
  const hdr = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o: Row = {};
    hdr.forEach((h, i) => { o[h] = r[i] ?? ""; });
    return o;
  });
}

/* ── Column resolution ──────────────────────────────────── */

const ALIAS: Record<string, string[]> = {
  ticker: ["ticker", "symbol", "Ticker"],
  name: ["name", "shortName", "company_name", "company", "Name"],
  sector: ["sector", "gics_sector", "Sector"],
  cap: ["cap_bucket", "market_cap_bucket", "capBucket", "Market Cap"],
  score: ["raw_composite", "RS_Global", "rs_global", "RS", "rs", "score", "RS_Score"],
  price: ["price", "last_price", "close", "adj_close"],
  asof: ["asof_date", "as_of", "date", "asof"],
  r5d: ["ret_5d", "return_5d"],
  r1m: ["ret_1m", "return_1m"],
  r3m: ["ret_3m", "return_3m"],
  r6m: ["ret_6m", "return_6m"],
  r12m: ["ret_12m", "return_12m"],
  gate: ["gate_pass", "gate"],
};

function pick(row: Row, alias: string): string | null {
  const map = new Map(Object.keys(row).map((k) => [k.trim().toLowerCase(), k]));
  for (const c of ALIAS[alias] ?? []) {
    const found = map.get(c.toLowerCase());
    if (found) return found;
  }
  return null;
}

const CAP_ORD: Record<string, number> = { mega: 1, large: 2, mid: 3, small: 4, micro: 5, nano: 6, unknown: 99 };

function buildRows(parsed: Row[]): Row[] {
  if (!parsed.length) return [];
  const s = parsed[0];
  const k = {
    ticker: pick(s, "ticker"), name: pick(s, "name"), sector: pick(s, "sector"),
    cap: pick(s, "cap"), score: pick(s, "score"),
    price: pick(s, "price"), asof: pick(s, "asof"), gate: pick(s, "gate"),
    r5d: pick(s, "r5d"), r1m: pick(s, "r1m"), r3m: pick(s, "r3m"),
    r6m: pick(s, "r6m"), r12m: pick(s, "r12m"),
  };

  return parsed.map((r) => {
    const cap = norm(k.cap ? r[k.cap] : "") || "Unknown";
    return {
      ...r,
      _ticker: norm(k.ticker ? r[k.ticker] : ""),
      _name: norm(k.name ? r[k.name] : ""),
      _sector: norm(k.sector ? r[k.sector] : "") || "Unknown",
      _cap: cap,
      _capOrd: CAP_ORD[cap.toLowerCase()] ?? 50,
      _score: k.score ? (toNum(r[k.score]) !== null ? String(Math.round(toNum(r[k.score])! * 10) / 10) : "") : "",
      _price: k.price ? r[k.price] : "",
      _asof: k.asof ? r[k.asof] : "",
      _gate: norm(k.gate ? r[k.gate] : "").toLowerCase(),
      _r5d: k.r5d ? r[k.r5d] : "",
      _r1m: k.r1m ? r[k.r1m] : "",
      _r3m: k.r3m ? r[k.r3m] : "",
      _r6m: k.r6m ? r[k.r6m] : "",
      _r12m: k.r12m ? r[k.r12m] : "",
    };
  });
}

/* ── Tier logic (raw composite thresholds) ─────────────── */

type TierInfo = { label: string; cls: string; barColor: string };

function getTier(score: number | null): TierInfo {
  if (score === null) return { label: "—", cls: "text-zinc-600", barColor: "bg-zinc-800" };
  if (score >= 90) return { label: "Leadership", cls: "border-emerald-700/50 bg-emerald-950/40 text-emerald-300", barColor: "bg-emerald-500" };
  if (score >= 80) return { label: "Positive", cls: "border-sky-700/50 bg-sky-950/40 text-sky-300", barColor: "bg-sky-500" };
  if (score >= 70) return { label: "Neutral", cls: "border-zinc-700/50 bg-zinc-800/40 text-zinc-400", barColor: "bg-zinc-500" };
  if (score >= 60) return { label: "Caution", cls: "border-amber-700/50 bg-amber-950/40 text-amber-300", barColor: "bg-amber-500" };
  return { label: "Avoid", cls: "border-red-800/50 bg-red-950/40 text-red-400", barColor: "bg-red-500" };
}

/* ── Components ─────────────────────────────────────────── */

function TierBadge({ score }: { score: number | null }) {
  const tier = getTier(score);
  if (score === null) return <span className="text-zinc-600">—</span>;
  return (
    <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wide uppercase ${tier.cls}`}>
      {tier.label}
    </span>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-600">—</span>;
  const tier = getTier(score);
  const width = Math.max(Math.min(score, 100), 0);
  return (
    <div className="flex items-center gap-2">
      <span className="font-bold tabular-nums text-zinc-200 text-[12px] sm:text-[13px] w-10 text-right shrink-0">
        {score.toFixed(1)}
      </span>
      <div className="flex-1 h-1.5 bg-zinc-800/50 rounded-full overflow-hidden min-w-[40px] max-w-[80px] hidden sm:block">
        <div className={`h-full rounded-full ${tier.barColor} opacity-60 transition-all duration-500`}
          style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ReturnCell({ value }: { value: any }) {
  const r = fmtRet(value);
  const cls = r.sign === "pos" ? "text-emerald-400" : r.sign === "neg" ? "text-red-400" : "text-zinc-600";
  return <span className={`font-medium tabular-nums ${cls}`}>{r.text}</span>;
}

function FavButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`text-xs sm:text-sm transition-all duration-200 ${
        active ? "text-amber-400 scale-110" : "text-zinc-700 hover:text-zinc-500"
      }`}
      title={active ? "Remove from watchlist" : "Add to watchlist"}
    >
      {active ? "★" : "☆"}
    </button>
  );
}

/* ── Sortable header ────────────────────────────────────── */

function TH({
  children, sk, currentSort, currentDir, onClick, align = "left", className = "", hideOnMobile = false,
}: {
  children: React.ReactNode; sk: string;
  currentSort: string; currentDir: SortDir;
  onClick: (key: string) => void; align?: "left" | "right" | "center";
  className?: string; hideOnMobile?: boolean;
}) {
  const active = currentSort === sk;
  const arrow = active ? (currentDir === "desc" ? " ↓" : " ↑") : "";
  const alCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const hideCls = hideOnMobile ? "hidden md:table-cell" : "";
  return (
    <th
      onClick={() => onClick(sk)}
      className={`cursor-pointer select-none whitespace-nowrap border-b border-zinc-800 bg-zinc-950 px-2 sm:px-3 py-2.5 sm:py-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider hover:text-zinc-100 ${
        active ? "text-zinc-100" : "text-zinc-500"
      } ${alCls} ${hideCls} ${className}`}
    >
      {children}{arrow}
    </th>
  );
}

/* ── Tier filter chips ──────────────────────────────────── */

type TierFilter = "all" | "leadership" | "positive" | "neutral" | "caution" | "avoid";

const TIER_CHIPS: { key: TierFilter; label: string; activeClass: string }[] = [
  { key: "all", label: "All", activeClass: "border-zinc-500 bg-zinc-800 text-zinc-100" },
  { key: "leadership", label: "Leadership", activeClass: "border-emerald-600/50 bg-emerald-950/50 text-emerald-300" },
  { key: "positive", label: "Positive", activeClass: "border-sky-600/50 bg-sky-950/50 text-sky-300" },
  { key: "neutral", label: "Neutral", activeClass: "border-zinc-600/50 bg-zinc-800/50 text-zinc-300" },
  { key: "caution", label: "Caution", activeClass: "border-amber-600/50 bg-amber-950/50 text-amber-300" },
  { key: "avoid", label: "Avoid", activeClass: "border-red-700/50 bg-red-950/50 text-red-300" },
];

function tierFilterMatch(score: number | null, filter: TierFilter): boolean {
  if (filter === "all") return true;
  if (score === null) return false;
  if (filter === "leadership") return score >= 90;
  if (filter === "positive") return score >= 80 && score < 90;
  if (filter === "neutral") return score >= 70 && score < 80;
  if (filter === "caution") return score >= 60 && score < 70;
  if (filter === "avoid") return score < 60;
  return true;
}

/* ── Mobile return periods ─────────────────────────────── */

type PerfKey = "_r5d" | "_r1m" | "_r3m" | "_r6m" | "_r12m";
const PERIODS: { key: PerfKey; label: string }[] = [
  { key: "_r5d", label: "5D" },
  { key: "_r1m", label: "1M" },
  { key: "_r3m", label: "3M" },
  { key: "_r6m", label: "6M" },
  { key: "_r12m", label: "12M" },
];

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */

export default function ScreenerPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [sector, setSector] = useState("All");
  const [cap, setCap] = useState("All");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [showFavs, setShowFavs] = useState(false);
  const [showGated, setShowGated] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const [sortKey, setSortKey] = useState("_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [mobilePerf, setMobilePerf] = useState<PerfKey>("_r1m");

  // Load favorites on mount
  useEffect(() => { setFavorites(loadFavorites()); }, []);

  const toggleFavorite = useCallback((ticker: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      saveFavorites(next);
      return next;
    });
  }, []);

  /* Load CSV */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setError(null);
        const res = await fetch(CSV_FETCH_PATH, { cache: "no-store" });
        if (!res.ok) throw new Error(`CSV load failed (${res.status})`);
        const built = buildRows(parseCSV(await res.text()));
        if (alive) setRows(built);
      } catch (e: any) {
        if (alive) { setError(e?.message ?? "Unknown error"); setRows([]); }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const asOf = useMemo(() => {
    const s = rows.find((r) => norm(r._asof));
    return s ? norm(s._asof) : "—";
  }, [rows]);

  const sectorOpts = useMemo(() => ["All", ...uniqueSorted(rows.map((r) => r._sector))], [rows]);
  const capOpts = useMemo(() => ["All", ...uniqueSorted(rows.map((r) => r._cap))], [rows]);

  // Count gated rows
  const gatedCount = useMemo(() => rows.filter((r) => r._gate === "false").length, [rows]);
  const scoredCount = useMemo(() => rows.filter((r) => r._gate !== "false").length, [rows]);

  const filtered = useMemo(() => {
    const query = norm(q).toUpperCase();
    return rows.filter((r) => {
      // Hide gated stocks unless toggled on
      if (!showGated && r._gate === "false") return false;
      if (query && !norm(r._ticker).toUpperCase().includes(query) && !norm(r._name).toUpperCase().includes(query)) return false;
      if (sector !== "All" && r._sector !== sector) return false;
      if (cap !== "All" && r._cap !== cap) return false;
      if (showFavs && !favorites.has(r._ticker)) return false;
      const score = toNum(r._score);
      if (!tierFilterMatch(score, tierFilter)) return false;
      return true;
    });
  }, [rows, q, sector, cap, tierFilter, showFavs, showGated, favorites]);

  const sorted = useMemo(() => {
    const mul = sortDir === "desc" ? -1 : 1;
    const numKeys = new Set(["_score", "_price", "_capOrd", "_r5d", "_r1m", "_r3m", "_r6m", "_r12m"]);
    const isNum = numKeys.has(sortKey);

    return [...filtered].sort((a, b) => {
      // Favorites always at top when watching
      if (showFavs) {
        const aFav = favorites.has(a._ticker);
        const bFav = favorites.has(b._ticker);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
      }

      let av: any, bv: any;
      if (isNum) { av = toNum(a[sortKey]); bv = toNum(b[sortKey]); }
      else { av = norm(a[sortKey]); bv = norm(b[sortKey]); }
      const aNull = av === null || av === "" || av === undefined;
      const bNull = bv === null || bv === "" || bv === undefined;
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
      return String(av).localeCompare(String(bv)) * mul;
    });
  }, [filtered, sortKey, sortDir, showFavs, favorites]);

  function doSort(key: string) {
    if (sortKey === key) { setSortDir((d) => (d === "desc" ? "asc" : "desc")); }
    else {
      setSortKey(key);
      const textKeys = new Set(["_ticker", "_name", "_sector", "_cap"]);
      setSortDir(textKeys.has(key) ? "asc" : "desc");
    }
  }

  function doMobilePerfSort(key: PerfKey) {
    setMobilePerf(key);
    setSortKey(key);
    setSortDir("desc");
  }

  function resetAll() {
    setQ(""); setSector("All"); setCap("All");
    setTierFilter("all"); setShowFavs(false); setShowGated(false);
  }

  const thProps = { currentSort: sortKey, currentDir: sortDir, onClick: doSort };

  return (
    <div className="min-h-screen bg-black text-zinc-100 pt-14">
      {/* ── Sticky filters ── */}
      <div className="sticky top-14 z-40 bg-black/95 backdrop-blur-sm border-b border-zinc-900">
        <div className="mx-auto max-w-[1600px] px-3 sm:px-6 py-3 sm:py-4">

          {/* Title row */}
          <div className="mb-2 sm:mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-50">Screener</h1>
              <p className="text-[11px] sm:text-xs text-zinc-500">
                {scoredCount > 0 ? `${scoredCount.toLocaleString()} stocks scored` : "Loading…"}
                {gatedCount > 0 && !showGated && (
                  <span className="text-zinc-700"> · {gatedCount} gated</span>
                )}
              </p>
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-500">
              <span className="text-zinc-300 font-mono">{asOf}</span>
            </div>
          </div>

          {/* Tier filter chips */}
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {TIER_CHIPS.map((chip) => {
              const active = tierFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setTierFilter(active && chip.key !== "all" ? "all" : chip.key)}
                  className={`rounded-lg border px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all ${
                    active ? chip.activeClass : "border-zinc-800/50 bg-transparent text-zinc-600 hover:text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Search + filters */}
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-6 sm:gap-3">
            <div className="lg:col-span-2">
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search ticker or name…"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:contents">
              <select
                value={sector} onChange={(e) => setSector(e.target.value)}
                className="w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600 cursor-pointer"
              >
                {sectorOpts.map((o) => <option key={o} value={o}>{o === "All" ? "All Sectors" : o}</option>)}
              </select>
              <select
                value={cap} onChange={(e) => setCap(e.target.value)}
                className="w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600 cursor-pointer"
              >
                {capOpts.map((o) => <option key={o} value={o}>{o === "All" ? "All Caps" : o}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFavs((v) => !v)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  showFavs
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                }`}
              >
                ★ Watchlist{favorites.size > 0 ? ` (${favorites.size})` : ""}
              </button>
              <button
                onClick={resetAll}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
              >
                Reset
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500">
              <span>
                Showing <span className="text-zinc-300 font-medium">{filtered.length.toLocaleString()}</span>
                {showFavs && <span className="text-amber-400 ml-1">★</span>}
              </span>
              {gatedCount > 0 && (
                <button
                  onClick={() => setShowGated((v) => !v)}
                  className="text-zinc-700 hover:text-zinc-500 transition-colors"
                >
                  {showGated ? "Hide" : "Show"} gated ({gatedCount})
                </button>
              )}
            </div>
          </div>

          {/* Mobile period toggle */}
          <div className="flex items-center gap-1 mt-2 md:hidden">
            <span className="text-[10px] text-zinc-600 mr-1">Return:</span>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => doMobilePerfSort(p.key)}
                className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  mobilePerf === p.key
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="mx-auto max-w-[1600px] px-2 sm:px-6 pb-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden mt-2 sm:mt-4">
          <div className="overflow-auto max-h-[calc(100vh-320px)] sm:max-h-[calc(100vh-260px)]">
            <table className="w-full border-collapse text-[12px] sm:text-[13px]">
              <thead className="sticky top-0 z-30">
                <tr>
                  {/* Favorite star */}
                  <th className="border-b border-zinc-800 bg-zinc-950 px-1 sm:px-2 py-2.5 text-center text-[10px] sm:text-[11px] font-semibold text-zinc-600 w-6 sm:w-8">
                    ★
                  </th>

                  <TH {...thProps} sk="_ticker">Ticker</TH>
                  <TH {...thProps} sk="_name" className="min-w-[120px]" hideOnMobile>Name</TH>
                  <TH {...thProps} sk="_score" align="right">Score</TH>

                  {/* Tier — not sortable */}
                  <th className="border-b border-zinc-800 bg-zinc-950 px-2 sm:px-3 py-2.5 text-center text-[10px] sm:text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Tier
                  </th>

                  <TH {...thProps} sk="_price" align="right">Price</TH>
                  <TH {...thProps} sk="_sector" hideOnMobile>Sector</TH>
                  <TH {...thProps} sk="_capOrd" hideOnMobile>Cap</TH>

                  {/* Desktop return columns */}
                  <TH {...thProps} sk="_r5d" align="right" hideOnMobile>5D</TH>
                  <TH {...thProps} sk="_r1m" align="right" hideOnMobile>1M</TH>
                  <TH {...thProps} sk="_r3m" align="right" hideOnMobile>3M</TH>
                  <TH {...thProps} sk="_r6m" align="right" hideOnMobile>6M</TH>
                  <TH {...thProps} sk="_r12m" align="right" hideOnMobile>12M</TH>

                  {/* Mobile return column */}
                  <th
                    onClick={() => doSort(mobilePerf)}
                    className="md:hidden cursor-pointer select-none whitespace-nowrap border-b border-zinc-800 bg-zinc-950 px-2 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-zinc-100"
                  >
                    {PERIODS.find((p) => p.key === mobilePerf)?.label ?? "1M"}
                    {sortKey === mobilePerf ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
                  </th>
                </tr>
              </thead>

              <tbody>
                {!loading && sorted.length === 0 && (
                  <tr>
                    <td colSpan={20} className="px-4 py-8 text-center text-sm text-zinc-500">
                      {showFavs && favorites.size === 0
                        ? "No stocks in your watchlist yet. Click ☆ to add one."
                        : "No stocks match your filters."
                      }
                    </td>
                  </tr>
                )}

                {sorted.map((r, i) => {
                  const score = toNum(r._score);
                  const gated = r._gate === "false";
                  const isFav = favorites.has(r._ticker);

                  return (
                    <tr
                      key={r._ticker || i}
                      className={`border-b border-zinc-900/60 transition-colors hover:bg-zinc-900/50 ${
                        gated ? "opacity-25" : ""
                      }`}
                    >
                      {/* Favorite */}
                      <td className="px-1 sm:px-2 py-2 sm:py-2.5 text-center">
                        <FavButton active={isFav} onClick={() => toggleFavorite(r._ticker)} />
                      </td>

                      {/* Ticker */}
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5 font-bold text-zinc-200 tracking-wide whitespace-nowrap text-[12px] sm:text-[13px]">
                        {r._ticker || "—"}
                      </td>

                      {/* Name (desktop) */}
                      <td className="hidden md:table-cell px-3 py-2.5 text-zinc-400 text-xs truncate max-w-[180px]" title={r._name}>
                        {r._name || "—"}
                      </td>

                      {/* Score with bar */}
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5 text-right">
                        <ScoreBar score={score} />
                      </td>

                      {/* Tier badge */}
                      <td className="px-1.5 sm:px-3 py-2 sm:py-2.5 text-center">
                        <TierBadge score={score} />
                      </td>

                      {/* Price */}
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5 text-right tabular-nums text-zinc-300 whitespace-nowrap text-[12px] sm:text-[13px]">
                        {fmtPrice(r._price)}
                      </td>

                      {/* Sector & Cap (desktop) */}
                      <td className="hidden md:table-cell px-3 py-2.5 text-zinc-400 text-xs whitespace-nowrap">{r._sector}</td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-zinc-400 text-xs whitespace-nowrap">{r._cap}</td>

                      {/* Desktop returns */}
                      <td className="hidden md:table-cell px-3 py-2.5 text-right"><ReturnCell value={r._r5d} /></td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-right"><ReturnCell value={r._r1m} /></td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-right"><ReturnCell value={r._r3m} /></td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-right"><ReturnCell value={r._r6m} /></td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-right"><ReturnCell value={r._r12m} /></td>

                      {/* Mobile return */}
                      <td className="md:hidden px-2 py-2 text-right"><ReturnCell value={r[mobilePerf]} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-zinc-800 px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[11px] text-zinc-600">
            <span>Click headers to sort · ★ = watchlist · Scores are raw composite (not percentile rank)</span>
            <span>Not financial advice</span>
          </div>
        </div>
      </div>
    </div>
  );
}

