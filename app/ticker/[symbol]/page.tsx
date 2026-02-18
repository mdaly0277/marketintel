"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

/* ── Types ─────────────────────────────────────────────── */

interface HistoryPoint { d: string; s: number; p: number | null; }
interface TierPerf { n: number; avg: number; win: number; }

interface TickerData {
  ticker: string;
  name: string;
  sector: string;
  current_score: number;
  tier: string;
  asof: string;
  returns: { "1m": number | null; "3m": number | null; "6m": number | null; "12m": number | null; };
  tier_perf: Record<string, TierPerf>;
  history: HistoryPoint[];
}

/* ── Constants ─────────────────────────────────────────── */

const TIERS = [
  { key: "Positive", range: "75–100", color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "border-emerald-800/40", text: "text-emerald-400", badge: "border-emerald-700/50 bg-emerald-950/40 text-emerald-300" },
  { key: "Neutral", range: "40–74", color: "#71717a", bg: "rgba(113,113,122,0.05)", border: "border-zinc-700/40", text: "text-zinc-400", badge: "border-zinc-700/50 bg-zinc-800/40 text-zinc-400" },
  { key: "Negative", range: "0–39", color: "#f87171", bg: "rgba(248,113,113,0.06)", border: "border-red-800/40", text: "text-red-400", badge: "border-red-800/50 bg-red-950/40 text-red-400" },
] as const;

const TIMEFRAMES = [
  { label: "3M", weeks: 13 },
  { label: "6M", weeks: 26 },
  { label: "1Y", weeks: 52 },
  { label: "3Y", weeks: 156 },
  { label: "ALL", weeks: Infinity },
] as const;

/* ── Helpers ───────────────────────────────────────────── */

function getTierInfo(score: number) {
  if (score >= 75) return TIERS[0];
  if (score >= 40) return TIERS[1];
  return TIERS[2];
}

function fmtPrice(v: number) {
  if (v >= 10000) return `$${(v / 1000).toFixed(1)}k`;
  if (v >= 1000) return `$${v.toFixed(0)}`;
  if (v >= 100) return `$${v.toFixed(0)}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(3)}`;
}

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function fmtDateFull(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtRet(v: number | null) {
  if (v === null || v === undefined) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function retColor(v: number | null) {
  if (v === null) return "text-zinc-600";
  if (v > 0.05) return "text-emerald-400";
  if (v < -0.05) return "text-red-400";
  return "text-zinc-400";
}

/* ── Fade In ───────────────────────────────────────────── */

function FadeIn({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={`transition-all duration-700 ease-out ${className}`}
      style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(12px)" }}
    >
      {children}
    </div>
  );
}

/* ── Custom Tooltip ────────────────────────────────────── */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const tierInfo = getTierInfo(d.s);

  return (
    <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/95 px-4 py-3 backdrop-blur-md shadow-2xl min-w-[160px]">
      <div className="text-[11px] text-zinc-500 font-mono mb-2">
        {fmtDateFull(d.d)}
      </div>
      {d.p != null && (
        <div className="flex items-center justify-between gap-4 mb-1.5">
          <span className="text-[11px] text-zinc-500">Price</span>
          <span className="text-sm font-bold text-zinc-100 tabular-nums">{fmtPrice(d.p)}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <span className="text-[11px] text-zinc-500">Score</span>
        <span className="text-sm font-bold tabular-nums" style={{ color: tierInfo.color }}>
          {d.s.toFixed(1)}
        </span>
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-zinc-800/60">
        <span
          className={`inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tierInfo.badge}`}
        >
          {tierInfo.key}
        </span>
      </div>
    </div>
  );
}

/* ── Tier Background Zones for Chart ───────────────────── */

function TierZones({ data }: { data: HistoryPoint[] }) {
  if (data.length < 2) return null;

  const zones: { x1: string; x2: string; tier: typeof TIERS[number] }[] = [];
  let currentTier = getTierInfo(data[0].s);
  let zoneStart = data[0].d;

  for (let i = 1; i < data.length; i++) {
    const tier = getTierInfo(data[i].s);
    if (tier.key !== currentTier.key) {
      zones.push({ x1: zoneStart, x2: data[i].d, tier: currentTier });
      currentTier = tier;
      zoneStart = data[i].d;
    }
  }
  zones.push({ x1: zoneStart, x2: data[data.length - 1].d, tier: currentTier });

  return (
    <>
      {zones.map((z, i) => (
        <ReferenceArea
          key={i}
          x1={z.x1}
          x2={z.x2}
          fill={z.tier.bg}
          fillOpacity={1}
          stroke="none"
        />
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */

export default function TickerPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params?.symbol as string)?.toUpperCase() ?? "";

  const [data, setData] = useState<TickerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timeframe, setTimeframe] = useState<string>("1Y");

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(false);

    fetch(`/data/ticker_history/${symbol}.json`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((d: TickerData) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [symbol]);

  const chartData = useMemo(() => {
    if (!data?.history?.length) return [];
    const tf = TIMEFRAMES.find((t) => t.label === timeframe);
    if (!tf || tf.weeks === Infinity) return data.history.filter((h) => h.p != null);
    const cutoff = data.history.length - tf.weeks;
    return data.history.slice(Math.max(0, cutoff)).filter((h) => h.p != null);
  }, [data, timeframe]);

  const priceDomain = useMemo(() => {
    const prices = chartData.map((d) => d.p).filter((p): p is number => p != null);
    if (!prices.length) return [0, 100];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.06;
    return [Math.max(0, min - pad), max + pad];
  }, [chartData]);

  const periodReturn = useMemo(() => {
    const withPrice = chartData.filter((d) => d.p != null);
    if (withPrice.length < 2) return null;
    const first = withPrice[0].p!;
    const last = withPrice[withPrice.length - 1].p!;
    return ((last - first) / first) * 100;
  }, [chartData]);

  const scoreChange = useMemo(() => {
    if (chartData.length < 2) return null;
    return chartData[chartData.length - 1].s - chartData[0].s;
  }, [chartData]);

  const tierInfo = data ? getTierInfo(data.current_score) : TIERS[1];

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 pt-14">
        <main className="mx-auto max-w-[960px] px-5 pt-12 sm:pt-16">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-24 bg-zinc-800/60 rounded" />
            <div className="flex items-end gap-4">
              <div className="h-10 w-28 bg-zinc-800 rounded-lg" />
              <div className="h-6 w-20 bg-zinc-800/40 rounded" />
            </div>
            <div className="h-[380px] bg-zinc-900/30 rounded-2xl border border-zinc-800/30" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 bg-zinc-900/30 rounded-xl" />
              <div className="h-20 bg-zinc-900/30 rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 pt-14">
        <main className="mx-auto max-w-[960px] px-5 pt-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-5">
            <span className="text-2xl">?</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-200 mb-2">
            {symbol ? `${symbol} not found` : "No ticker specified"}
          </h1>
          <p className="text-sm text-zinc-500 mb-8 max-w-[360px] mx-auto">
            This stock may not be in our scoring universe. We cover liquid U.S. equities above a $2B market cap.
          </p>
          <a
            href="/screener"
            className="inline-block rounded-xl px-6 py-3 text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
          >
            Back to Screener
          </a>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 pt-14">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-[300px] -left-[150px] h-[700px] w-[700px] rounded-full opacity-[0.06]"
          style={{ background: `radial-gradient(circle, ${tierInfo.color}, transparent 70%)`, filter: "blur(120px)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <main className="relative mx-auto max-w-[960px] px-4 sm:px-5 pb-16 pt-6 sm:pt-10">

        <FadeIn>
          <a
            href="/screener"
            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors mb-6 sm:mb-8"
          >
            <span>←</span>
            <span>Screener</span>
          </a>
        </FadeIn>

        <FadeIn delay={50}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6 sm:mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-50">
                  {data.ticker}
                </h1>
                <span className={`inline-block rounded-lg border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase ${tierInfo.badge}`}>
                  {tierInfo.key}
                </span>
              </div>
              {data.name && (
                <p className="text-sm text-zinc-500">
                  {data.name}
                  {data.sector && <span className="text-zinc-700 ml-1.5">· {data.sector}</span>}
                </p>
              )}
            </div>

            <div className="flex items-end gap-5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">Score</div>
                <div className="text-4xl font-extrabold tabular-nums" style={{ color: tierInfo.color }}>
                  {data.current_score.toFixed(1)}
                </div>
              </div>
              {chartData.length > 0 && chartData[chartData.length - 1].p != null && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">Price</div>
                  <div className="text-2xl font-bold tabular-nums text-zinc-200">
                    {fmtPrice(chartData[chartData.length - 1].p!)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
            {[
              { label: "1M Return", value: fmtRet(data.returns["1m"]), raw: data.returns["1m"] },
              { label: "3M Return", value: fmtRet(data.returns["3m"]), raw: data.returns["3m"] },
              { label: "6M Return", value: fmtRet(data.returns["6m"]), raw: data.returns["6m"] },
              { label: "12M Return", value: fmtRet(data.returns["12m"]), raw: data.returns["12m"] },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-zinc-800/40 bg-zinc-950/60 px-3.5 py-3">
                <div className="text-[10px] text-zinc-600 uppercase tracking-wide">{s.label}</div>
                <div className={`text-lg sm:text-xl font-bold tabular-nums mt-0.5 ${retColor(s.raw)}`}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={150}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.label}
                  onClick={() => setTimeframe(tf.label)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-bold tracking-wide transition-all ${
                    timeframe === tf.label
                      ? "bg-zinc-800 text-zinc-100 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              {periodReturn !== null && (
                <span className={`font-bold tabular-nums ${periodReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {periodReturn >= 0 ? "+" : ""}{periodReturn.toFixed(1)}%
                </span>
              )}
              {scoreChange !== null && (
                <span className={`tabular-nums ${scoreChange >= 0 ? "text-emerald-400/60" : "text-red-400/60"}`}>
                  Score {scoreChange >= 0 ? "+" : ""}{scoreChange.toFixed(0)}
                </span>
              )}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={200}>
          <div className="rounded-2xl border border-zinc-800/40 bg-zinc-950/50 overflow-hidden">
            <div className="h-[300px] sm:h-[400px] px-2 pt-4 pb-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={tierInfo.color} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={tierInfo.color} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>

                  <TierZones data={chartData} />

                  <XAxis
                    dataKey="d"
                    tickFormatter={fmtDate}
                    tick={{ fill: "#3f3f46", fontSize: 10 }}
                    axisLine={{ stroke: "#27272a" }}
                    tickLine={false}
                    minTickGap={60}
                  />
                  <YAxis
                    domain={priceDomain}
                    tickFormatter={(v: number) => fmtPrice(v)}
                    tick={{ fill: "#3f3f46", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickCount={6}
                  />

                  <Tooltip content={<ChartTooltip />} />

                  <Area
                    dataKey="p"
                    stroke={tierInfo.color}
                    strokeWidth={1.5}
                    fill="url(#priceGradient)"
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-4 px-4 py-3 border-t border-zinc-800/30 bg-zinc-950/80">
              {TIERS.map((t) => (
                <div key={t.key} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color, opacity: 0.7 }} />
                  <span className="text-[10px] text-zinc-600">{t.key}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {Object.keys(data.tier_perf).length > 0 && (
          <FadeIn delay={300}>
            <div className="mt-6 sm:mt-8">
              <h2 className="text-sm font-bold text-zinc-300 mb-1">
                How {data.ticker} performed in each tier
              </h2>
              <p className="text-[11px] text-zinc-600 mb-4">
                Average 3-month forward return when {data.ticker} was in each scoring tier.
              </p>

              <div className="rounded-xl border border-zinc-800/40 bg-zinc-950/50 overflow-hidden">
                <table className="w-full text-[12px] sm:text-[13px]">
                  <thead>
                    <tr className="border-b border-zinc-800/50">
                      <th className="text-left px-4 py-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Tier</th>
                      <th className="text-right px-4 py-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Occurrences</th>
                      <th className="text-right px-4 py-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Avg 3M Return</th>
                      <th className="text-right px-4 py-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TIERS.map((tier) => {
                      const perf = data.tier_perf[tier.key];
                      if (!perf) return null;
                      return (
                        <tr key={tier.key} className="border-b border-zinc-800/20 last:border-0 transition-colors hover:bg-zinc-900/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tier.color, opacity: 0.8 }} />
                              <span className="font-semibold text-zinc-200">{tier.key}</span>
                              <span className="text-[10px] text-zinc-700 hidden sm:inline">{tier.range}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-400">{perf.n}×</td>
                          <td className={`px-4 py-3 text-right font-bold tabular-nums ${perf.avg >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {perf.avg >= 0 ? "+" : ""}{perf.avg.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                            {perf.win.toFixed(0)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>
        )}

        <FadeIn delay={350}>
          <div className="mt-6 sm:mt-8">
            <h2 className="text-sm font-bold text-zinc-300 mb-3">Score timeline</h2>
            <div className="flex items-stretch gap-[1px] rounded-lg overflow-hidden h-8 sm:h-10">
              {chartData.map((d, i) => {
                const tier = getTierInfo(d.s);
                return (
                  <div
                    key={i}
                    className="flex-1 min-w-0 transition-opacity hover:opacity-80"
                    style={{ backgroundColor: tier.color, opacity: 0.5 }}
                    title={`${fmtDateFull(d.d)}: Score ${d.s.toFixed(1)} (${tier.key})`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-zinc-700">{chartData.length > 0 ? fmtDate(chartData[0].d) : ""}</span>
              <span className="text-[10px] text-zinc-700">{chartData.length > 0 ? fmtDate(chartData[chartData.length - 1].d) : ""}</span>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={400}>
          <div className="mt-8 sm:mt-10 flex flex-wrap gap-2.5">
            <a
              href="/screener"
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              Full Screener
            </a>
            <a href="/dashboard" className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-2.5 text-sm font-medium text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-all">
              Dashboard
            </a>
            <a href="/portfolio" className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-2.5 text-sm font-medium text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-all">
              Model Portfolio
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={450}>
          <p className="mt-8 text-[11px] text-zinc-700">
            Not financial advice. For informational purposes only. Past performance does not guarantee future results.
            Score history is computed from weekly snapshots and may not reflect intraday changes.
          </p>
        </FadeIn>
      </main>
    </div>
  );
}