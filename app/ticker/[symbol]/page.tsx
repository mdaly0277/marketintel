"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/* ── Types ─────────────────────────────────────────────── */

interface HistoryPoint {
  d: string;
  s: number;
  p: number | null;
}

interface TickerData {
  ticker: string;
  name: string;
  sector: string;
  current_score: number;
  tier: string;
  asof: string;
  history: HistoryPoint[];
}

/* ── Constants ─────────────────────────────────────────── */

const TIER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  Leadership: { bg: "bg-emerald-950/50", border: "border-emerald-700/50", text: "text-emerald-300" },
  Positive: { bg: "bg-sky-950/50", border: "border-sky-700/50", text: "text-sky-300" },
  Neutral: { bg: "bg-zinc-800/50", border: "border-zinc-600/50", text: "text-zinc-300" },
  Caution: { bg: "bg-amber-950/50", border: "border-amber-700/50", text: "text-amber-300" },
  Avoid: { bg: "bg-red-950/50", border: "border-red-800/50", text: "text-red-400" },
};

const TIMEFRAMES = [
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "3Y", days: 1095 },
  { label: "MAX", days: Infinity },
] as const;

const SCORE_LINE_COLOR = "#60a5fa"; // blue-400
const PRICE_AREA_COLOR = "#3f3f46"; // zinc-700

/* ── Helpers ───────────────────────────────────────────── */

function daysBetween(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
}

function formatPrice(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  if (v >= 100) return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

function formatDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/* ── Custom Tooltip ────────────────────────────────────── */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const score = payload.find((p: any) => p.dataKey === "s");
  const price = payload.find((p: any) => p.dataKey === "p");

  return (
    <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/95 px-3 py-2 text-xs backdrop-blur-sm shadow-xl">
      <div className="text-zinc-500 mb-1.5 font-mono">
        {new Date(label + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
      {score && (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SCORE_LINE_COLOR }} />
          <span className="text-zinc-400">Score:</span>
          <span className="font-bold text-zinc-100">{score.value?.toFixed(1)}</span>
        </div>
      )}
      {price && price.value != null && (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#71717a" }} />
          <span className="text-zinc-400">Price:</span>
          <span className="font-bold text-zinc-100">{formatPrice(price.value)}</span>
        </div>
      )}
    </div>
  );
}

/* ── Page Component ────────────────────────────────────── */

export default function TickerPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params?.symbol as string)?.toUpperCase() ?? "";

  const [data, setData] = useState<TickerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timeframe, setTimeframe] = useState<string>("1Y");

  // Fetch ticker data
  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(false);

    fetch(`/data/ticker_history/${symbol}.json`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((d: TickerData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [symbol]);

  // Filter history by timeframe
  const chartData = useMemo(() => {
    if (!data?.history?.length) return [];
    const tf = TIMEFRAMES.find((t) => t.label === timeframe);
    if (!tf) return data.history;

    if (tf.days === Infinity) return data.history;

    const latest = data.history[data.history.length - 1].d;
    return data.history.filter((h) => daysBetween(h.d, latest) <= tf.days);
  }, [data, timeframe]);

  // Price domain for right axis
  const priceDomain = useMemo(() => {
    const prices = chartData.map((d) => d.p).filter((p): p is number => p != null);
    if (!prices.length) return [0, 100];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.08;
    return [Math.max(0, min - pad), max + pad];
  }, [chartData]);

  // Score change
  const scoreChange = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].s;
    const last = chartData[chartData.length - 1].s;
    return { delta: last - first, first, last };
  }, [chartData]);

  // Price change
  const priceChange = useMemo(() => {
    const withPrice = chartData.filter((d) => d.p != null);
    if (withPrice.length < 2) return null;
    const first = withPrice[0].p!;
    const last = withPrice[withPrice.length - 1].p!;
    const pct = ((last - first) / first) * 100;
    return { first, last, pct };
  }, [chartData]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 pt-14">
        <main className="mx-auto max-w-[960px] px-5 pt-16">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 bg-zinc-800 rounded" />
            <div className="h-4 w-48 bg-zinc-800/60 rounded" />
            <div className="h-[400px] bg-zinc-900/50 rounded-xl mt-8" />
          </div>
        </main>
      </div>
    );
  }

  // ── Error / not found ──
  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 pt-14">
        <main className="mx-auto max-w-[960px] px-5 pt-16 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-zinc-200 mb-2">
            {symbol ? `${symbol} not found` : "No ticker specified"}
          </h1>
          <p className="text-sm text-zinc-500 mb-6">
            This stock may not be in our scoring universe. We cover liquid U.S. equities above a $2B market cap.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => router.push("/screener")}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              Back to Screener
            </button>
            <button
              onClick={() => router.back()}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-sm text-zinc-300 hover:border-zinc-500"
            >
              Go Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  const tierStyle = TIER_STYLES[data.tier] ?? TIER_STYLES.Neutral;

  return (
    <div className="min-h-screen bg-black text-zinc-100 pt-14">
      {/* Background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-[200px] -left-[100px] h-[600px] w-[600px] rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)", filter: "blur(100px)" }}
        />
      </div>

      <main className="relative mx-auto max-w-[960px] px-5 pb-16 pt-8 sm:pt-12">
        {/* ── Back link ── */}
        <button
          onClick={() => router.push("/screener")}
          className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors mb-6 flex items-center gap-1"
        >
          ← Back to Screener
        </button>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-50">
                {data.ticker}
              </h1>
              <span
                className={`inline-block rounded-md border px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${tierStyle.bg} ${tierStyle.border} ${tierStyle.text}`}
              >
                {data.tier}
              </span>
            </div>
            {data.name && (
              <p className="text-sm text-zinc-500">
                {data.name}
                {data.sector && <span className="text-zinc-700"> · {data.sector}</span>}
              </p>
            )}
          </div>

          <div className="flex items-end gap-6">
            {/* Current score */}
            <div className="text-right">
              <div className="text-[11px] text-zinc-600 uppercase tracking-wide">Score</div>
              <div className="text-3xl font-extrabold tabular-nums text-zinc-100">
                {data.current_score.toFixed(1)}
              </div>
            </div>

            {/* Price */}
            {priceChange && (
              <div className="text-right">
                <div className="text-[11px] text-zinc-600 uppercase tracking-wide">Price</div>
                <div className="text-xl font-bold tabular-nums text-zinc-200">
                  {formatPrice(priceChange.last)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="flex flex-wrap gap-3 mb-6">
          {scoreChange && (
            <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/60 px-3.5 py-2">
              <div className="text-[10px] text-zinc-600 uppercase">Score Δ ({timeframe})</div>
              <div
                className={`text-sm font-bold tabular-nums ${
                  scoreChange.delta > 0
                    ? "text-emerald-400"
                    : scoreChange.delta < 0
                    ? "text-red-400"
                    : "text-zinc-400"
                }`}
              >
                {scoreChange.delta >= 0 ? "+" : ""}
                {scoreChange.delta.toFixed(1)}
              </div>
            </div>
          )}
          {priceChange && (
            <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/60 px-3.5 py-2">
              <div className="text-[10px] text-zinc-600 uppercase">Return ({timeframe})</div>
              <div
                className={`text-sm font-bold tabular-nums ${
                  priceChange.pct > 0
                    ? "text-emerald-400"
                    : priceChange.pct < 0
                    ? "text-red-400"
                    : "text-zinc-400"
                }`}
              >
                {priceChange.pct >= 0 ? "+" : ""}
                {priceChange.pct.toFixed(1)}%
              </div>
            </div>
          )}
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/60 px-3.5 py-2">
            <div className="text-[10px] text-zinc-600 uppercase">Data Points</div>
            <div className="text-sm font-bold tabular-nums text-zinc-300">{chartData.length}</div>
          </div>
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/60 px-3.5 py-2">
            <div className="text-[10px] text-zinc-600 uppercase">Last Updated</div>
            <div className="text-sm font-bold text-zinc-300">{data.asof}</div>
          </div>
        </div>

        {/* ── Timeframe buttons ── */}
        <div className="flex gap-1 mb-4">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              onClick={() => setTimeframe(tf.label)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition-all ${
                timeframe === tf.label
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-zinc-600 hover:text-zinc-400 border border-transparent"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* ── Chart ── */}
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/60 p-4 sm:p-6">
          <div className="h-[360px] sm:h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />

                <XAxis
                  dataKey="d"
                  tickFormatter={formatDate}
                  tick={{ fill: "#52525b", fontSize: 11 }}
                  axisLine={{ stroke: "#27272a" }}
                  tickLine={false}
                  minTickGap={50}
                />

                {/* Left axis: Score 0-100 */}
                <YAxis
                  yAxisId="score"
                  domain={[0, 100]}
                  tick={{ fill: "#52525b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tickCount={6}
                />

                {/* Right axis: Price */}
                <YAxis
                  yAxisId="price"
                  orientation="right"
                  domain={priceDomain}
                  tickFormatter={(v: number) => formatPrice(v)}
                  tick={{ fill: "#3f3f46", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />

                <Tooltip content={<ChartTooltip />} />

                {/* Price area (background) */}
                <Area
                  yAxisId="price"
                  dataKey="p"
                  stroke="#52525b"
                  strokeWidth={1}
                  fill={PRICE_AREA_COLOR}
                  fillOpacity={0.15}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />

                {/* Score line (foreground) */}
                <Line
                  yAxisId="score"
                  dataKey="s"
                  stroke={SCORE_LINE_COLOR}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-3 pt-3 border-t border-zinc-800/40">
            <div className="flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full" style={{ backgroundColor: SCORE_LINE_COLOR }} />
              <span className="text-[11px] text-zinc-500">Composite Score (0–100)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full bg-zinc-600" />
              <span className="text-[11px] text-zinc-500">Price</span>
            </div>
          </div>
        </div>

        {/* ── Tier thresholds reference ── */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { label: "Leadership", range: "90+", color: "border-emerald-800/40 text-emerald-500/60" },
            { label: "Positive", range: "80–89", color: "border-sky-800/40 text-sky-500/60" },
            { label: "Neutral", range: "70–79", color: "border-zinc-700/40 text-zinc-500" },
            { label: "Caution", range: "60–69", color: "border-amber-800/40 text-amber-500/60" },
            { label: "Avoid", range: "<60", color: "border-red-800/40 text-red-500/60" },
          ].map((t) => (
            <div
              key={t.label}
              className={`rounded-md border px-2 py-1 text-[10px] font-medium ${t.color}`}
            >
              {t.label} {t.range}
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/screener"
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
          >
            Full Screener
          </a>
          <a
            href="/dashboard"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-sm text-zinc-300 hover:border-zinc-500 transition-colors"
          >
            Dashboard
          </a>
        </div>

        {/* ── Disclaimer ── */}
        <p className="mt-8 text-[11px] text-zinc-700">
          Not financial advice. For informational purposes only. Past performance does not guarantee future results.
        </p>
      </main>
    </div>
  );
}

