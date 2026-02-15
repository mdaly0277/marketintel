"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";

const DATA_PATH = "/data/model_portfolio.json";

type AnyObj = Record<string, any>;

function norm(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return s.toLowerCase() === "nan" || s.toLowerCase() === "null" ? "" : s;
}

function pct(v: any, digits = 1, showPlus = true): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const p = Math.abs(n) <= 1.5 ? n * 100 : n;
  return `${showPlus && p >= 0 ? "+" : ""}${p.toFixed(digits)}%`;
}

function money(v: any): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/* ── Minimal SVG chart ──────────────────────────────────── */

function EquityChart({ curve }: { curve: { date: string; portfolio: number; benchmark: number }[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 340 });

  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 100) setDims({ w: width, h: Math.min(380, Math.max(260, width * 0.38)) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (curve.length < 2) return <div className="text-zinc-500 text-sm py-8 text-center">Not enough data for chart.</div>;

  const W = dims.w;
  const H = dims.h;
  const pad = { t: 20, r: 16, b: 32, l: 60 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;

  const allVals = curve.flatMap((d) => [d.portfolio, d.benchmark]);
  const minV = Math.min(...allVals) * 0.95;
  const maxV = Math.max(...allVals) * 1.02;

  const xScale = (i: number) => pad.l + (i / (curve.length - 1)) * cw;
  const yScale = (v: number) => pad.t + (1 - (v - minV) / (maxV - minV)) * ch;

  function pathD(key: "portfolio" | "benchmark") {
    return curve.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(d[key]).toFixed(1)}`).join(" ");
  }

  // Y-axis labels
  const yTicks: number[] = [];
  const step = Math.pow(10, Math.floor(Math.log10((maxV - minV) / 4)));
  const niceStep = step * Math.ceil((maxV - minV) / (4 * step));
  let yv = Math.ceil(minV / niceStep) * niceStep;
  while (yv <= maxV) { yTicks.push(yv); yv += niceStep; }

  // X-axis labels (years)
  const yearLabels: { i: number; label: string }[] = [];
  let lastYear = "";
  curve.forEach((d, i) => {
    const yr = d.date.slice(0, 4);
    if (yr !== lastYear) { yearLabels.push({ i, label: yr }); lastYear = yr; }
  });

  // Final values for legend
  const lastPort = curve[curve.length - 1].portfolio;
  const lastSpy = curve[curve.length - 1].benchmark;

  return (
    <div className="w-full">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={yScale(v)} y2={yScale(v)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={pad.l - 8} y={yScale(v) + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={10} fontFamily="monospace">
              {money(v)}
            </text>
          </g>
        ))}

        {/* X labels */}
        {yearLabels.map((yl, i) => (
          <text key={i} x={xScale(yl.i)} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={10} fontFamily="monospace">
            {yl.label}
          </text>
        ))}

        {/* Area fill for portfolio */}
        <path
          d={`${pathD("portfolio")} L${xScale(curve.length - 1).toFixed(1)},${yScale(minV).toFixed(1)} L${xScale(0).toFixed(1)},${yScale(minV).toFixed(1)} Z`}
          fill="rgba(59,130,246,0.08)"
        />

        {/* Lines */}
        <path d={pathD("benchmark")} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} strokeDasharray="4,3" />
        <path d={pathD("portfolio")} fill="none" stroke="rgba(59,130,246,0.9)" strokeWidth={2} />

        {/* Legend */}
        <g transform={`translate(${pad.l + 12}, ${pad.t + 8})`}>
          <rect x={0} y={0} width={200} height={44} rx={6} fill="rgba(0,0,0,0.6)" />
          <line x1={10} x2={28} y1={16} y2={16} stroke="rgba(59,130,246,0.9)" strokeWidth={2} />
          <text x={34} y={20} fill="rgba(255,255,255,0.8)" fontSize={11}>Portfolio {money(lastPort)}</text>
          <line x1={10} x2={28} y1={32} y2={32} stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} strokeDasharray="4,3" />
          <text x={34} y={36} fill="rgba(255,255,255,0.5)" fontSize={11}>SPY {money(lastSpy)}</text>
        </g>
      </svg>
    </div>
  );
}

/* ── Stat card ──────────────────────────────────────────── */

function StatBox({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${highlight ? "border-blue-800/50 bg-blue-950/20" : "border-zinc-800 bg-zinc-950"}`}>
      <div className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${highlight ? "text-blue-300" : "text-zinc-100"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default function PortfolioPage() {
  const [data, setData] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(DATA_PATH, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status}`);
        setData(await res.json());
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const s = data?.summary ?? {};
  const bs = data?.benchmark_summary ?? {};
  const annual: any[] = data?.annual_returns ?? [];
  const curve: any[] = data?.equity_curve ?? [];
  const holdings: any[] = data?.current_holdings ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading portfolio data…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="text-lg font-semibold">Model Portfolio</div>
          <div className="mt-3 text-sm text-zinc-400">
            Place <span className="font-mono text-zinc-300">model_portfolio.json</span> in{" "}
            <span className="font-mono text-zinc-300">public/data/</span> to enable this page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6">

        {/* ── Header ── */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold tracking-tight">Model Portfolio</h1>
          <p className="mt-1 text-xs text-zinc-500">
            {data.model} • {data.weighting} • {data.rebalance_freq} rebalance •{" "}
            Since {data.inception} • As of {data.asof}
          </p>
        </div>

        {/* ── Key Stats ── */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatBox label="Ann. Excess" value={
            (() => {
              const p = Number(s.ann_return ?? 0);
              const b = Number(bs.ann_return ?? 0);
              const ex = (p - b) * 100;
              return `${ex >= 0 ? "+" : ""}${ex.toFixed(1)}%`;
            })()
          } sub="vs SPY annualized" highlight />
          
          <StatBox label="Ann. Return" value={pct(s.ann_return)} sub={`SPY: ${pct(bs.ann_return)}`} />
          <StatBox label="Sharpe" value={s.sharpe?.toFixed(2) ?? "—"} sub={`SPY: ${bs.sharpe?.toFixed(2) ?? "—"}`} highlight />
          <StatBox label="Max Drawdown" value={pct(s.max_drawdown)} sub={`SPY: ${pct(bs.max_drawdown)}`} />
          <StatBox label="Win Rate" value={pct(s.win_rate, 0)} sub="% of months positive" />
          <StatBox label="Batting Avg" value={pct(s.batting_avg, 0)} sub="% months beat SPY" />
        </section>

        {/* ── Equity Curve ── */}
        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-100">Growth of $10,000</div>
              <div className="text-xs text-zinc-500">{data.inception} → {data.asof}</div>
            </div>
            <div className="text-xs text-zinc-500">{s.months} months</div>
          </div>
          <EquityChart curve={curve} />
        </section>

        {/* ── Two-column: Annual Returns + More Stats ── */}
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-5">

          {/* Annual Returns Table */}
          <section className="lg:col-span-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
            <div className="text-sm font-semibold text-zinc-100 mb-3">Annual Returns</div>
            <div className="overflow-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider pb-2 px-2">Year</th>
                    <th className="text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider pb-2 px-2">Portfolio</th>
                    <th className="text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider pb-2 px-2">SPY</th>
                    <th className="text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider pb-2 px-2">Excess</th>
                  </tr>
                </thead>
                <tbody>
                  {annual.map((row: any) => {
                    const excess = row.excess ?? (row.portfolio - row.benchmark);
                    const exCls = excess > 0.001 ? "text-emerald-400" : excess < -0.001 ? "text-red-400" : "text-zinc-500";
                    const portCls = row.portfolio > 0.001 ? "text-emerald-300" : row.portfolio < -0.001 ? "text-red-300" : "text-zinc-400";
                    return (
                      <tr key={row.year} className="border-t border-zinc-800/60">
                        <td className="py-2 px-2 font-medium text-zinc-200">{row.year}</td>
                        <td className={`py-2 px-2 text-right font-semibold tabular-nums ${portCls}`}>{pct(row.portfolio)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-zinc-400">{pct(row.benchmark)}</td>
                        <td className={`py-2 px-2 text-right font-semibold tabular-nums ${exCls}`}>{pct(excess)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Additional Stats */}
          <section className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
            <div className="text-sm font-semibold text-zinc-100 mb-3">Portfolio Detail</div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Holdings</span>
                <span className="text-zinc-200 font-medium">{data.n_holdings}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Weighting</span>
                <span className="text-zinc-200 font-medium">{data.weighting}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Rebalance</span>
                <span className="text-zinc-200 font-medium">{data.rebalance_freq}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Avg Monthly Turnover</span>
                <span className="text-zinc-200 font-medium">{s.avg_turnover?.toFixed(0) ?? "—"} names</span>
              </div>

              <div className="border-t border-zinc-800 pt-3 mt-3">
                <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">Risk Metrics</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Ann. Volatility</span>
                    <span className="text-zinc-200 font-medium">{pct(s.ann_vol, 1, false)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Max Drawdown</span>
                    <span className="text-red-400 font-medium">{pct(s.max_drawdown)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Best Month</span>
                    <span className="text-emerald-400 font-medium">{pct(s.best_month)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Worst Month</span>
                    <span className="text-red-400 font-medium">{pct(s.worst_month)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Win Rate</span>
                    <span className="text-zinc-200 font-medium">{pct(s.win_rate, 0)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-3 mt-3">
                <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">vs Benchmark</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">SPY Ann. Return</span>
                    <span className="text-zinc-300">{pct(bs.ann_return)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">SPY Max Drawdown</span>
                    <span className="text-zinc-300">{pct(bs.max_drawdown)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">SPY Sharpe</span>
                    <span className="text-zinc-300">{bs.sharpe?.toFixed(2) ?? "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── Current Holdings ── */}
        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-100">Current Holdings</div>
              <div className="text-xs text-zinc-500">As of {data.asof} • {holdings.length} positions • Equal weight</div>
            </div>
            <a href="/module-1" className="text-xs text-zinc-400 hover:text-zinc-200">
              Open Screener →
            </a>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <th className="text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider pb-2 px-2 w-8">#</th>
                  <th className="text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider pb-2 px-2">Ticker</th>
                  <th className="text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider pb-2 px-2">Name</th>
                  <th className="text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider pb-2 px-2">Smart Score</th>
                  <th className="text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider pb-2 px-2">Price</th>
                  <th className="text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider pb-2 px-2">Weight</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h: any, i: number) => (
                  <tr key={i} className="border-t border-zinc-800/60 hover:bg-zinc-900/30">
                    <td className="py-2 px-2 text-zinc-600">{i + 1}</td>
                    <td className="py-2 px-2 font-bold text-zinc-100 tracking-wide">{h.ticker}</td>
                    <td className="py-2 px-2 text-zinc-400 text-xs truncate max-w-[200px]" title={h.name}>{h.name || "—"}</td>
                    <td className="py-2 px-2 text-right font-semibold tabular-nums text-zinc-100">{h.score?.toFixed(1) ?? "—"}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-300">
                      {h.price ? `$${h.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-500">{h.weight?.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <section className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-4">
          <div className="text-[11px] text-zinc-600 leading-relaxed">
            <span className="font-semibold text-zinc-500">Disclaimer:</span> This model portfolio is a hypothetical backtest for research and educational purposes only.
            It does not represent actual trading, does not account for transaction costs, slippage, taxes, or market impact, and is not financial advice.
            Past performance does not guarantee future results. The portfolio is rebalanced monthly using end-of-day data with no intraday execution assumptions.
          </div>
        </section>
      </div>
    </div>
  );
}

