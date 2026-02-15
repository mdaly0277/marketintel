"use client";

import React, { useEffect, useMemo, useState } from "react";

type Row = Record<string, any>;
type SortDir = "asc" | "desc";

const CSV_FETCH_PATH = "/data/rs_latest.csv";

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

/**
 * Format a return value from CSV.
 * CSV stores returns as decimals: 0.05 = 5%, 1.53 = 153%.
 * ALWAYS multiply by 100 — no guessing.
 */
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
  score: ["RS_Global", "rs_global", "RS", "rs", "score", "RS_Score"],
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
      _score: k.score ? r[k.score] : "",
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

/* ── Components ─────────────────────────────────────────── */

function TierBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-600">—</span>;
  let label: string, cls: string;
  if (score >= 90)      { label = "Leadership"; cls = "border-emerald-700/50 bg-emerald-950/40 text-emerald-300"; }
  else if (score >= 80) { label = "Positive";   cls = "border-sky-700/50 bg-sky-950/40 text-sky-300"; }
  else if (score >= 70) { label = "Neutral";    cls = "border-zinc-700/50 bg-zinc-800/40 text-zinc-400"; }
  else if (score >= 60) { label = "Caution";    cls = "border-amber-700/50 bg-amber-950/40 text-amber-300"; }
  else                  { label = "Avoid";      cls = "border-red-800/50 bg-red-950/40 text-red-400"; }
  return <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${cls}`}>{label}</span>;
}

function ReturnCell({ value }: { value: any }) {
  const r = fmtRet(value);
  const cls = r.sign === "pos" ? "text-emerald-400" : r.sign === "neg" ? "text-red-400" : "text-zinc-600";
  return <span className={`font-medium tabular-nums ${cls}`}>{r.text}</span>;
}

/* ── Sortable header ────────────────────────────────────── */

function TH({
  children, sk, currentSort, currentDir, onClick, align = "left", className = "",
}: {
  children: React.ReactNode; sk: string;
  currentSort: string; currentDir: SortDir;
  onClick: (key: string) => void; align?: "left" | "right" | "center";
  className?: string;
}) {
  const active = currentSort === sk;
  const arrow = active ? (currentDir === "desc" ? " ↓" : " ↑") : "";
  const alCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      onClick={() => onClick(sk)}
      className={`cursor-pointer select-none whitespace-nowrap border-b border-zinc-800 bg-zinc-950 px-3 py-3 text-[11px] font-semibold uppercase tracking-wider hover:text-zinc-100 ${
        active ? "text-zinc-100" : "text-zinc-500"
      } ${alCls} ${className}`}
    >
      {children}{arrow}
    </th>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default function ScreenerPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [sector, setSector] = useState("All");
  const [cap, setCap] = useState("All");
  const [top100, setTop100] = useState(false);

  const [sortKey, setSortKey] = useState("_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* Load CSV */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setError(null);
        const res = await fetch(CSV_FETCH_PATH, { cache: "no-store" });
        if (!res.ok) throw new Error(`CSV load failed (${res.status})`);
        const built = buildRows(parseCSV(await res.text()));

        const ranked = [...built]
          .map((r) => ({ t: r._ticker, s: toNum(r._score) }))
          .filter((x) => x.t && x.s !== null)
          .sort((a, b) => b.s! - a.s!);
        const t100 = new Set(ranked.slice(0, 100).map((x) => x.t));
        built.forEach((r) => { r._top100 = t100.has(r._ticker); });

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

  /* Filter */
  const filtered = useMemo(() => {
    const query = norm(q).toUpperCase();
    return rows.filter((r) => {
      if (query && !norm(r._ticker).toUpperCase().includes(query) && !norm(r._name).toUpperCase().includes(query)) return false;
      if (sector !== "All" && r._sector !== sector) return false;
      if (cap !== "All" && r._cap !== cap) return false;
      if (top100 && !r._top100) return false;
      return true;
    });
  }, [rows, q, sector, cap, top100]);

  /* Sort */
  const sorted = useMemo(() => {
    const mul = sortDir === "desc" ? -1 : 1;
    const numKeys = new Set(["_score", "_price", "_capOrd", "_r5d", "_r1m", "_r3m", "_r6m", "_r12m"]);
    const isNum = numKeys.has(sortKey);

    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      if (isNum) {
        av = toNum(a[sortKey]);
        bv = toNum(b[sortKey]);
      } else {
        av = norm(a[sortKey]);
        bv = norm(b[sortKey]);
      }
      const aNull = av === null || av === "" || av === undefined;
      const bNull = bv === null || bv === "" || bv === undefined;
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
      return String(av).localeCompare(String(bv)) * mul;
    });
  }, [filtered, sortKey, sortDir]);

  function doSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      const textKeys = new Set(["_ticker", "_name", "_sector", "_cap"]);
      setSortDir(textKeys.has(key) ? "asc" : "desc");
    }
  }

  const thProps = { currentSort: sortKey, currentDir: sortDir, onClick: doSort };

  return (
    <div className="min-h-screen bg-black text-zinc-100 pt-14">
      {/* ── Sticky filters bar ── */}
      <div className="sticky top-14 z-40 bg-black border-b border-zinc-900">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 py-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-50">Screener</h1>
              <p className="text-xs text-zinc-500">
                {rows.length > 0 ? `${rows.length.toLocaleString()} stocks ranked by Smart Score` : "Loading…"}
              </p>
            </div>
            <div className="text-xs text-zinc-500">
              Snapshot <span className="text-zinc-300 font-mono">{asOf}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search ticker or name…"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
              />
            </div>
            <div>
              <select
                value={sector} onChange={(e) => setSector(e.target.value)}
                className="w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600 cursor-pointer"
              >
                {sectorOpts.map((o) => <option key={o} value={o}>{o === "All" ? "All Sectors" : o}</option>)}
              </select>
            </div>
            <div>
              <select
                value={cap} onChange={(e) => setCap(e.target.value)}
                className="w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600 cursor-pointer"
              >
                {capOpts.map((o) => <option key={o} value={o}>{o === "All" ? "All Caps" : o}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTop100((v) => !v)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  top100
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                ★ Top 100
              </button>
              <button
                onClick={() => { setQ(""); setSector("All"); setCap("All"); setTop100(false); }}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
              >
                Reset
              </button>
            </div>
            <div className="flex items-center text-xs text-zinc-500">
              Showing <span className="text-zinc-300 font-medium mx-1">{filtered.length.toLocaleString()}</span>
              {top100 && <span className="text-amber-400 ml-1">★</span>}
              {loading && <span className="ml-2 text-zinc-600">Loading…</span>}
              {error && <span className="ml-2 text-red-400">Error: {error}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 pb-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden mt-4">
          <div className="overflow-auto max-h-[calc(100vh-220px)]">
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 z-30">
                <tr>
                  <th className="border-b border-zinc-800 bg-zinc-950 px-2 py-3 text-center text-[11px] font-semibold text-zinc-600 w-8">★</th>
                  <TH {...thProps} sk="_ticker">Ticker</TH>
                  <TH {...thProps} sk="_name" className="min-w-[120px]">Name</TH>
                  <TH {...thProps} sk="_score" align="right">Score</TH>
                  <th className="border-b border-zinc-800 bg-zinc-950 px-3 py-3 text-center text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Tier</th>
                  <TH {...thProps} sk="_price" align="right">Price</TH>
                  <TH {...thProps} sk="_sector">Sector</TH>
                  <TH {...thProps} sk="_capOrd">Cap</TH>
                  <TH {...thProps} sk="_r5d" align="right">5D</TH>
                  <TH {...thProps} sk="_r1m" align="right">1M</TH>
                  <TH {...thProps} sk="_r3m" align="right">3M</TH>
                  <TH {...thProps} sk="_r6m" align="right">6M</TH>
                  <TH {...thProps} sk="_r12m" align="right">12M</TH>
                </tr>
              </thead>

              <tbody>
                {!loading && sorted.length === 0 && (
                  <tr><td colSpan={20} className="px-4 py-8 text-center text-sm text-zinc-500">No stocks match your filters.</td></tr>
                )}

                {sorted.map((r, i) => {
                  const score = toNum(r._score);
                  const gated = r._gate === "false";

                  return (
                    <tr
                      key={r._ticker || i}
                      className={`border-b border-zinc-900/60 transition-colors hover:bg-zinc-900/50 ${gated ? "opacity-30" : ""}`}
                    >
                      <td className="px-2 py-2.5 text-center text-amber-400 text-sm">
                        {r._top100 ? "★" : ""}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-zinc-200 tracking-wide whitespace-nowrap">
                        {r._ticker || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400 text-xs truncate max-w-[180px]" title={r._name}>
                        {r._name || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-bold tabular-nums text-zinc-200">
                          {score !== null ? score.toFixed(1) : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <TierBadge score={score} />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300 whitespace-nowrap">
                        {fmtPrice(r._price)}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400 text-xs whitespace-nowrap">{r._sector}</td>
                      <td className="px-3 py-2.5 text-zinc-400 text-xs whitespace-nowrap">{r._cap}</td>
                      <td className="px-3 py-2.5 text-right"><ReturnCell value={r._r5d} /></td>
                      <td className="px-3 py-2.5 text-right"><ReturnCell value={r._r1m} /></td>
                      <td className="px-3 py-2.5 text-right"><ReturnCell value={r._r3m} /></td>
                      <td className="px-3 py-2.5 text-right"><ReturnCell value={r._r6m} /></td>
                      <td className="px-3 py-2.5 text-right"><ReturnCell value={r._r12m} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-[11px] text-zinc-600">
            <span>Click headers to sort • ★ Top 100 by Smart Score • Dimmed = gated</span>
            <span>Not financial advice</span>
          </div>
        </div>
      </div>
    </div>
  );
}

