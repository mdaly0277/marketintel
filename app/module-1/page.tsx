"use client";

import React, { useEffect, useMemo, useState } from "react";

type Row = Record<string, any>;
type SortDir = "asc" | "desc";

/** ✅ Your CSV is here: public/data/rs_latest.csv */
const CSV_FETCH_PATH = "/data/rs_latest.csv";

/** --------------------------
 * Helpers
 * -------------------------- */
function normStr(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (s.toLowerCase() === "nan") return "";
  return s;
}

function normKey(k: string): string {
  return k.trim().toLowerCase();
}

function toNum(v: any): number | null {
  const s = normStr(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Basic CSV parser with quoted-field support */
function parseCSV(text: string): Row[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    cur.push(field);
    field = "";
  };
  const pushRow = () => {
    // ignore empty trailing row
    if (cur.length === 1 && cur[0].trim() === "") {
      cur = [];
      return;
    }
    rows.push(cur);
    cur = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') inQuotes = true;
    else if (ch === ",") pushField();
    else if (ch === "\n") {
      pushField();
      pushRow();
    } else if (ch === "\r") {
      // skip
    } else field += ch;
  }

  pushField();
  pushRow();

  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Row = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = r[i] ?? "";
    return obj;
  });
}

/** --------------------------
 * Column aliases (handles different header names)
 * -------------------------- */
const ALIASES: Record<string, string[]> = {
  ticker: ["ticker", "symbol"],
  sector: ["sector", "gics_sector", "Sector"],
  industry: ["industry", "gics_industry", "Industry"],
  cap_bucket: ["cap_bucket", "market_cap_bucket", "Market Cap", "capBucket"],
  rs: ["RS_Global", "rs_global", "RS", "rs", "RS Score", "RS_Score"],
  price: ["price", "last_price", "close", "Adj_Close"],
  asof: ["asof_date", "as_of", "date", "asof"],
  ret_5d: ["ret_5d", "ret_5", "ret_1w", "ret_7d"],
  ret_1m: ["ret_1m", "return_1m", "r1m"],
  ret_3m: ["ret_3m", "return_3m", "r3m"],
  ret_6m: ["ret_6m", "return_6m", "r6m"],
  ret_12m: ["ret_12m", "return_12m", "r12m"],
  vol_63: ["vol_63", "volatility_63d", "volatility (63d)", "Volatility (63d)"],
  max_dd_252: ["max_dd_252", "max_dd_1y", "max_drawdown_252", "Max Drawdown (1Y)"],
};

function pickKey(row: Row, logical: keyof typeof ALIASES): string | null {
  const keys = Object.keys(row);
  const keysNorm = new Map(keys.map((k) => [normKey(k), k])); // normalized -> actual

  for (const candidate of ALIASES[logical]) {
    const actual = keysNorm.get(normKey(candidate));
    if (actual) return actual;
  }
  return null;
}

/** Apply a standard shape so filters/sorts always hit the right values */
function normalizeRows(parsed: Row[]): Row[] {
  if (!parsed.length) return [];
  const sample = parsed[0];

  const kTicker = pickKey(sample, "ticker");
  const kSector = pickKey(sample, "sector");
  const kIndustry = pickKey(sample, "industry");
  const kCap = pickKey(sample, "cap_bucket");
  const kRS = pickKey(sample, "rs");
  const kPrice = pickKey(sample, "price");
  const kAsOf = pickKey(sample, "asof");
  const kR5 = pickKey(sample, "ret_5d");
  const kR1 = pickKey(sample, "ret_1m");
  const kR3 = pickKey(sample, "ret_3m");
  const kR6 = pickKey(sample, "ret_6m");
  const kR12 = pickKey(sample, "ret_12m");
  const kVol = pickKey(sample, "vol_63");
  const kDD = pickKey(sample, "max_dd_252");

  return parsed.map((r) => {
    const out: Row = { ...r };

    // Canonical keys used by the UI
    out.__ticker = normStr(kTicker ? r[kTicker] : "");
    out.__sector = normStr(kSector ? r[kSector] : "") || "Unknown";
    out.__industry = normStr(kIndustry ? r[kIndustry] : "") || "Unknown";
    out.__cap = normStr(kCap ? r[kCap] : "") || "Unknown";

    out.__rs = kRS ? r[kRS] : "";
    out.__price = kPrice ? r[kPrice] : "";
    out.__asof = kAsOf ? r[kAsOf] : "";

    out.__ret_5d = kR5 ? r[kR5] : "";
    out.__ret_1m = kR1 ? r[kR1] : "";
    out.__ret_3m = kR3 ? r[kR3] : "";
    out.__ret_6m = kR6 ? r[kR6] : "";
    out.__ret_12m = kR12 ? r[kR12] : "";

    out.__vol_63 = kVol ? r[kVol] : "";
    out.__max_dd_252 = kDD ? r[kDD] : "";

    return out;
  });
}

/** Returns in your file might be decimals (0.12) or percent (12). */
function fmtReturn(v: any): { text: string; sign: "pos" | "neg" | "flat" } {
  const n0 = toNum(v);
  if (n0 === null) return { text: "", sign: "flat" };

  const pct = Math.abs(n0) > 1.5 ? n0 : n0 * 100; // if already percent, keep
  const sign = pct > 0.0001 ? "pos" : pct < -0.0001 ? "neg" : "flat";
  return { text: `${pct.toFixed(1)}%`, sign };
}

function fmtNumber(v: any, digits = 2): string {
  const n = toNum(v);
  if (n === null) return "";
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function uniqueSorted(vals: string[]) {
  const set = new Set(vals.map((v) => normStr(v)).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** --------------------------
 * Custom dropdown (fixes grey-on-grey native select)
 * -------------------------- */
function Dropdown({
  label,
  value,
  options,
  onChange,
  widthClass = "w-[220px]",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative ${widthClass}`}>
      <div className="mb-1 text-xs font-medium text-zinc-400">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-600"
      >
        <span className="truncate">{value}</span>
        <span className="ml-2 text-zinc-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-zinc-900 ${
                opt === value ? "bg-zinc-900 text-zinc-100" : "text-zinc-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** --------------------------
 * UI
 * -------------------------- */
export default function Module1RelativeStrengthPage() {
  const [rawRows, setRawRows] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("All");
  const [industry, setIndustry] = useState("All");
  const [cap, setCap] = useState("All");

  // Sorting
  const [sortKey, setSortKey] = useState<"rs" | "ticker" | "price">("rs");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Column picker
  const [showCols, setShowCols] = useState(false);
  const [colPerf, setColPerf] = useState(true);
  const [colRisk, setColRisk] = useState(true);
  const [colSector, setColSector] = useState(true);
  const [colIndustry, setColIndustry] = useState(true);
  const [colCap, setColCap] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch(CSV_FETCH_PATH, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load CSV (${res.status})`);
        const text = await res.text();
        const parsed = parseCSV(text);

        if (!alive) return;
        setRawRows(parsed);

        const normalized = normalizeRows(parsed);
        setRows(normalized);
      } catch (e: any) {
        if (!alive) return;
        setLoadError(e?.message ?? "Unknown error loading CSV");
        setRawRows([]);
        setRows([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const asOfText = useMemo(() => {
    // try to infer as-of from CSV column
    const sample = rows.find((r) => normStr(r.__asof));
    const v = sample ? normStr(sample.__asof) : "";
    if (v) return v;

    // fallback: unknown
    return "Unknown (add asof_date in pipeline)";
  }, [rows]);

  const sectorOptions = useMemo(() => ["All", ...uniqueSorted(rows.map((r) => r.__sector))], [rows]);
  const industryOptions = useMemo(() => ["All", ...uniqueSorted(rows.map((r) => r.__industry))], [rows]);
  const capOptions = useMemo(() => ["All", ...uniqueSorted(rows.map((r) => r.__cap))], [rows]);

  const filtered = useMemo(() => {
    const query = normStr(q).toUpperCase();
    return rows.filter((r) => {
      const t = normStr(r.__ticker).toUpperCase();
      if (query && !t.includes(query)) return false;

      if (sector !== "All" && r.__sector !== sector) return false;
      if (industry !== "All" && r.__industry !== industry) return false;
      if (cap !== "All" && r.__cap !== cap) return false;

      return true;
    });
  }, [rows, q, sector, industry, cap]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "desc" ? -1 : 1;

    const getVal = (r: Row) => {
      if (sortKey === "ticker") return normStr(r.__ticker);
      if (sortKey === "price") return toNum(r.__price);
      // rs
      return toNum(r.__rs);
    };

    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);

      // blanks last
      const aBlank = av === null || av === "";
      const bBlank = bv === null || bv === "";
      if (aBlank && bBlank) return 0;
      if (aBlank) return 1;
      if (bBlank) return -1;

      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dirMul;
      return String(av).localeCompare(String(bv)) * dirMul;
    });

    return copy;
  }, [filtered, sortKey, sortDir]);

  const showPerformance = colPerf;
  const showRisk = colRisk;

  const showSectorCol = colSector;
  const showIndustryCol = colIndustry;
  const showCapCol = colCap;

  /** Performance chips (5D/1M/3M/6M/12M if present) */
  function PerfCell({ r }: { r: Row }) {
    const items: { k: string; label: string; v: any }[] = [
      { k: "__ret_5d", label: "5D", v: r.__ret_5d },
      { k: "__ret_1m", label: "1M", v: r.__ret_1m },
      { k: "__ret_3m", label: "3M", v: r.__ret_3m },
      { k: "__ret_6m", label: "6M", v: r.__ret_6m },
      { k: "__ret_12m", label: "12M", v: r.__ret_12m },
    ];

    const present = items.filter((x) => normStr(x.v) !== "");
    if (!present.length) return <span className="text-zinc-500">—</span>;

    return (
      <div className="flex flex-wrap gap-2">
        {present.map((x) => {
          const { text, sign } = fmtReturn(x.v);
          const cls =
            sign === "pos"
              ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-200"
              : sign === "neg"
              ? "border-red-900/60 bg-red-950/40 text-red-200"
              : "border-zinc-800 bg-zinc-950 text-zinc-300";
          return (
            <span
              key={x.k}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${cls}`}
              title={`${x.label} return`}
            >
              <span className="text-[11px] opacity-80">{x.label}</span>
              <span className="tabular-nums">{text || "—"}</span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Market Intelligence — Relative Strength</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Source: <span className="font-mono text-zinc-300">{CSV_FETCH_PATH}</span>
          </p>

          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-medium text-zinc-200">How to read this table</div>
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              <li>
                <span className="text-zinc-200">RS Score:</span> Higher = stronger vs the universe. (We’ll keep standardizing to
                a clean 0–100 percentile style.)
              </li>
              <li>
                <span className="text-zinc-200">Performance:</span> Condensed momentum view (5D/1M/3M/6M/12M).
              </li>
              <li>
                <span className="text-zinc-200">Risk:</span> Volatility + max drawdown help avoid “strong but unstable”.
              </li>
              <li className="text-zinc-500">
                Price as of: <span className="font-mono text-zinc-300">{asOfText}</span>
              </li>
            </ul>
          </div>
        </header>

        {/* Controls */}
        <section className="mb-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="w-[220px]">
                <div className="mb-1 text-xs font-medium text-zinc-400">Search ticker</div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="e.g., TSLA"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600"
                />
              </div>

              <Dropdown label="Sector" value={sector} options={sectorOptions} onChange={setSector} />
              <Dropdown label="Industry" value={industry} options={industryOptions} onChange={setIndustry} />
              <Dropdown label="Market Cap" value={cap} options={capOptions} onChange={setCap} />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-[220px]">
                <div className="mb-1 text-xs font-medium text-zinc-400">Sort</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortKey("rs")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      sortKey === "rs"
                        ? "border-zinc-600 bg-zinc-900 text-zinc-100"
                        : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    RS
                  </button>
                  <button
                    onClick={() => setSortKey("price")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      sortKey === "price"
                        ? "border-zinc-600 bg-zinc-900 text-zinc-100"
                        : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    Price
                  </button>
                  <button
                    onClick={() => setSortKey("ticker")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      sortKey === "ticker"
                        ? "border-zinc-600 bg-zinc-900 text-zinc-100"
                        : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    Ticker
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-zinc-400">Direction</div>
                <button
                  onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-600"
                >
                  {sortDir === "desc" ? "Desc ↓" : "Asc ↑"}
                </button>
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-zinc-400">Columns</div>
                <button
                  onClick={() => setShowCols((v) => !v)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-600"
                >
                  Choose columns
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
            <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1">
              Rows: <span className="text-zinc-200">{filtered.length.toLocaleString()}</span>
            </span>
            <button
              onClick={() => {
                setQ("");
                setSector("All");
                setIndustry("All");
                setCap("All");
              }}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-200 hover:border-zinc-600"
            >
              Reset filters
            </button>

            {loading ? (
              <span className="text-zinc-500">Loading…</span>
            ) : loadError ? (
              <span className="text-red-400">Error: {loadError}</span>
            ) : (
              <span className="text-zinc-500">Loaded {rows.length.toLocaleString()} rows</span>
            )}
          </div>

          {showCols && (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-xs font-semibold text-zinc-300">Show/Hide Columns</div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input type="checkbox" checked={colSector} onChange={(e) => setColSector(e.target.checked)} />
                  Sector
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input type="checkbox" checked={colIndustry} onChange={(e) => setColIndustry(e.target.checked)} />
                  Industry
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input type="checkbox" checked={colCap} onChange={(e) => setColCap(e.target.checked)} />
                  Market Cap
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input type="checkbox" checked={colPerf} onChange={(e) => setColPerf(e.target.checked)} />
                  Performance
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input type="checkbox" checked={colRisk} onChange={(e) => setColRisk(e.target.checked)} />
                  Risk
                </label>
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                If you want more columns here, we add them by exporting more fields into the CSV (price, ranks, etc.).
              </div>
            </div>
          )}
        </section>

        {/* Table */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="overflow-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="border-b border-zinc-800 bg-zinc-950 px-3 py-3 text-left text-xs font-semibold text-zinc-300">
                    Ticker
                  </th>

                  {showSectorCol && (
                    <th className="border-b border-zinc-800 bg-zinc-950 px-3 py-3 text-left text-xs font-semibold text-zinc-300">
                      Sector
                    </th>
                  )}
                  {showIndustryCol && (
                    <th className="border-b border-zinc-800 bg-zinc-950 px-3 py-3 text-left text-xs font-semibold text-zinc-300">
                      Industry
                    </th>
                  )}
                  {showCapCol && (
                    <th className="border-b border-zinc-800 bg-zinc-950 px-3 py-3 text-left text-xs font-semibold text-zinc-300">
                      Market Cap
                    </th>
                  )}

                  <th className="border-b border-zinc-800 bg-zinc-950 px-3 py-3 text-right text-xs font-semibold text-zinc-300">
                    RS Score
                  </th>

                  <th className="border-b border-zinc-800 bg-zinc-950 px-3 py-3 text-right text-xs font-semibold text-zinc-300">
                    Price
                  </th>

                  {showPerformance && (
                    <th className="border-b border-zinc-800 bg-zinc-950 px-3 py-3 text-left text-xs font-semibold text-zinc-300">
                      Performance
                    </th>
                  )}

                  {showRisk && (
                    <>
                      <th className="border-b border-zinc-800 bg-zinc-950 px-3 py-3 text-right text-xs font-semibold text-zinc-300">
                        Vol (63d)
                      </th>
                      <th className="border-b border-zinc-800 bg-zinc-950 px-3 py-3 text-right text-xs font-semibold text-zinc-300">
                        Max DD (1Y)
                      </th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {!loading && !loadError && sorted.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-sm text-zinc-400" colSpan={12}>
                      No rows match your filters.
                    </td>
                  </tr>
                ) : null}

                {sorted.map((r, idx) => {
                  const rs = toNum(r.__rs);
                  return (
                    <tr key={idx} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                      <td className="px-3 py-2 font-semibold text-zinc-100">{r.__ticker || "—"}</td>

                      {showSectorCol && <td className="px-3 py-2 text-zinc-200">{r.__sector}</td>}
                      {showIndustryCol && <td className="px-3 py-2 text-zinc-200">{r.__industry}</td>}
                      {showCapCol && <td className="px-3 py-2 text-zinc-200">{r.__cap}</td>}

                      <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-100">
                        {rs === null ? "—" : rs.toFixed(2)}
                      </td>

                      <td className="px-3 py-2 text-right tabular-nums text-zinc-100">
                        {fmtNumber(r.__price, 2) || "—"}
                      </td>

                      {showPerformance && (
                        <td className="px-3 py-2">
                          <PerfCell r={r} />
                        </td>
                      )}

                      {showRisk && (
                        <>
                          <td className="px-3 py-2 text-right tabular-nums text-zinc-100">
                            {fmtNumber(r.__vol_63, 2) || "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-zinc-100">
                            {fmtReturn(r.__max_dd_252).text || "—"}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-zinc-800 p-4 text-xs text-zinc-500">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-zinc-300">Note:</span> If Sector/Industry/Market Cap show “Unknown” for most rows, that’s
                your pipeline not merging metadata into the RS output (we fix that next).
              </div>
              <div className="text-zinc-600">Custom dropdowns • Performance condensed • Sorts are numeric-safe</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
