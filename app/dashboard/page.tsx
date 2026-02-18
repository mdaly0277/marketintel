"use client";

import React, { useEffect, useState, useRef } from "react";

const DATA_PATH = "/data/dashboard_data.json";
type AnyObj = Record<string, any>;

async function fetchJson(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} (${res.status})`);
  return res.json();
}

/* ── Reveal ─────────────────────────────────────────────── */

function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setTimeout(() => setVis(true), delay); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return (
    <div ref={ref} className={`transition-all duration-600 ease-out ${className}`}
      style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)" }}>
      {children}
    </div>
  );
}

/* ── Small components ───────────────────────────────────── */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-zinc-800/50 bg-zinc-950/50 ${className}`}>{children}</div>;
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">{title}</h2>
      {sub && <p className="text-[11px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-4">
      <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">{label}</div>
      <div className={`text-2xl font-extrabold tabular-nums ${accent ?? "text-zinc-100"}`}>{value}</div>
      {sub && <div className="text-[11px] text-zinc-600 mt-1">{sub}</div>}
    </div>
  );
}

/* ── Outlook banner ─────────────────────────────────────── */

function OutlookBanner({ outlook }: { outlook: AnyObj }) {
  const env = outlook.environment ?? "Unknown";
  const isStrong = env.includes("Broad") || env.includes("Healthy");
  const isWeak = env.includes("Weak");

  const dotColor = isStrong ? "bg-emerald-400" : isWeak ? "bg-red-400" : "bg-amber-400";
  const textColor = isStrong ? "text-emerald-400" : isWeak ? "text-red-400" : "text-amber-400";
  const borderColor = isStrong ? "border-emerald-900/40" : isWeak ? "border-red-900/40" : "border-amber-900/40";
  const bgGlow = isStrong
    ? "radial-gradient(ellipse at 15% 50%, rgba(16,185,129,0.06), transparent 70%)"
    : isWeak
    ? "radial-gradient(ellipse at 15% 50%, rgba(239,68,68,0.06), transparent 70%)"
    : "radial-gradient(ellipse at 15% 50%, rgba(245,158,11,0.06), transparent 70%)";

  const fwd3 = outlook.positive_fwd_3m ?? outlook.leadership_fwd_3m;
  const fwd6 = outlook.positive_fwd_6m ?? outlook.leadership_fwd_6m;
  const profile = outlook.profile ?? {};

  return (
    <div className={`rounded-xl border ${borderColor} bg-zinc-950/60`} style={{ background: bgGlow }}>
      <div className="p-5 sm:p-6">
        {/* Environment label */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`h-2.5 w-2.5 rounded-full ${dotColor} animate-pulse`} />
          <span className={`text-lg sm:text-xl font-extrabold uppercase tracking-wider ${textColor}`}>{env}</span>
        </div>
        <p className="text-[13px] leading-relaxed text-zinc-500 mb-5">
          {outlook.environment_desc ?? ""}
        </p>

        {/* Forward returns */}
        {(fwd3 || fwd6) && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-3">
              Positive tier · Historical forward returns in similar conditions
              <span className="text-zinc-700"> · {outlook.similar_periods} matching periods</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {fwd3 && (
                <div className="rounded-lg border border-zinc-800/40 bg-zinc-900/20 p-3">
                  <div className="text-[10px] text-zinc-600 mb-1">Next 3 months</div>
                  <div className="text-xl font-extrabold tabular-nums text-zinc-100">{fwd3.avg >= 0 ? "+" : ""}{fwd3.avg}%</div>
                  <div className="flex gap-3 mt-1.5 text-[11px]">
                    <span className="text-zinc-600">Median: <span className="text-zinc-400 font-bold">{fwd3.median >= 0 ? "+" : ""}{fwd3.median}%</span></span>
                    <span className="text-zinc-600">Win: <span className="text-zinc-400 font-bold">{fwd3.win_rate}%</span></span>
                  </div>
                </div>
              )}
              {fwd6 && (
                <div className="rounded-lg border border-zinc-800/40 bg-zinc-900/20 p-3">
                  <div className="text-[10px] text-zinc-600 mb-1">Next 6 months</div>
                  <div className="text-xl font-extrabold tabular-nums text-zinc-100">{fwd6.avg >= 0 ? "+" : ""}{fwd6.avg}%</div>
                  <div className="flex gap-3 mt-1.5 text-[11px]">
                    <span className="text-zinc-600">Median: <span className="text-zinc-400 font-bold">{fwd6.median >= 0 ? "+" : ""}{fwd6.median}%</span></span>
                    <span className="text-zinc-600">Win: <span className="text-zinc-400 font-bold">{fwd6.win_rate}%</span></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profile strip */}
      <div className="border-t border-zinc-800/30 px-5 sm:px-6 py-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
        <span className="text-zinc-600">Avg score: <span className="font-bold text-zinc-400">{profile.avg_score ?? "—"}</span></span>
        <span className="text-zinc-600">Dispersion: <span className="font-bold text-zinc-400">{profile.score_dispersion ?? "—"}</span></span>
        <span className="text-zinc-600">Top 10 avg: <span className="font-bold text-zinc-400">{profile.top10_avg ?? "—"}</span></span>
        <span className="text-zinc-600">Concentration: <span className="font-bold text-zinc-400">{profile.concentration_spread ?? "—"}</span></span>
      </div>
    </div>
  );
}

/* ── Mover row ──────────────────────────────────────────── */

function MoverRow({ ticker, name, score, delta, rank }: {
  ticker: string; name: string; score: number; delta: number; rank: number;
}) {
  const color = delta > 0 ? "text-emerald-400" : "text-red-400";
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-zinc-900/40 last:border-0 group">
      <span className="text-[11px] font-mono text-zinc-700 w-5 shrink-0">{rank}</span>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{ticker}</span>
        <span className="text-[11px] text-zinc-600 truncate hidden sm:inline">{name}</span>
      </div>
      <span className="text-[12px] font-mono text-zinc-500 tabular-nums w-8 text-right">{score.toFixed(0)}</span>
      <span className={`text-[12px] font-bold tabular-nums w-12 text-right ${color}`}>
        {delta > 0 ? "+" : ""}{delta.toFixed(0)}
      </span>
    </div>
  );
}

/* ── Migration row ────────────────────────────────────── */

function MigrationRow({ ticker, name, score, delta, direction, isNew }: {
  ticker: string; name: string; score: number; delta: number | null; direction: "enter" | "exit"; isNew?: boolean;
}) {
  const isEnter = direction === "enter";
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-900/30 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isEnter ? "bg-emerald-400" : "bg-red-400"}`} />
        <span className="text-sm font-bold text-zinc-200">{ticker}</span>
        <span className="text-[11px] text-zinc-600 truncate hidden sm:inline">{name}</span>
        {isNew && <span className="text-[9px] uppercase tracking-wider text-amber-500/70 font-bold">New</span>}
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-[12px] font-mono text-zinc-500 tabular-nums">{score.toFixed(0)}</span>
        {delta !== null && delta !== undefined && (
          <span className={`text-[12px] font-bold tabular-nums ${isEnter ? "text-emerald-400" : "text-red-400"}`}>
            {delta > 0 ? "+" : ""}{delta.toFixed(0)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Sector row ─────────────────────────────────────────── */

function SectorRow({ sector, avgScore, delta, rank }: {
  sector: string; avgScore: number; delta?: number; rank: number;
}) {
  let barColor: string;
  if (avgScore >= 70) barColor = "bg-emerald-500/60";
  else if (avgScore >= 55) barColor = "bg-sky-500/50";
  else if (avgScore >= 45) barColor = "bg-zinc-500/40";
  else barColor = "bg-red-500/35";

  return (
    <div className="flex items-center gap-3 py-2 border-b border-zinc-900/30 last:border-0">
      <span className="text-[11px] font-mono text-zinc-700 w-4 shrink-0 text-right">{rank}</span>
      <span className="text-[12px] text-zinc-400 w-[130px] sm:w-[170px] shrink-0 truncate">{sector}</span>
      <div className="flex-1 h-4 bg-zinc-900/30 rounded overflow-hidden">
        <div className={`h-full rounded ${barColor} transition-all duration-700`} style={{ width: `${avgScore}%` }} />
      </div>
      <span className="text-[13px] font-bold tabular-nums text-zinc-300 w-8 text-right">{avgScore.toFixed(0)}</span>
      {delta !== undefined && delta !== null && (
        <span className={`text-[11px] font-bold tabular-nums w-10 text-right ${
          delta > 0 ? "text-emerald-400/70" : delta < 0 ? "text-red-400/70" : "text-zinc-600"
        }`}>
          {delta > 0 ? "+" : ""}{delta.toFixed(0)}
        </span>
      )}
    </div>
  );
}

/* ── Distribution bar ─────────────────────────────────── */

function DistBar({ label, pct, count, color }: {
  label: string; pct: number; count: number; color: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[11px] font-mono text-zinc-500 w-[48px] shrink-0 text-right">{label}</span>
      <div className="flex-1 h-6 bg-zinc-900/30 rounded overflow-hidden relative">
        <div className={`h-full rounded ${color} transition-all duration-700`}
          style={{ width: `${Math.max(pct * 2.2, 1)}%` }} />
        <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-bold tabular-nums text-zinc-500">
          {pct.toFixed(1)}%
        </span>
      </div>
      <span className="text-[10px] text-zinc-700 w-[36px] shrink-0 tabular-nums text-right">{count}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const [data, setData] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moverTab, setMoverTab] = useState<"up" | "down">("up");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetchJson(DATA_PATH);
        if (alive) setData(d);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-black text-zinc-100 pt-14 flex items-center justify-center">
      <div className="text-sm text-zinc-600">Loading dashboard…</div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-black text-zinc-100 pt-14 flex items-center justify-center">
      <div className="text-center">
        <div className="text-sm text-red-400 mb-2">Dashboard unavailable</div>
        <div className="text-[11px] text-zinc-600">{error}</div>
      </div>
    </div>
  );

  const snap = data.snapshot ?? {};
  const dist = data.score_distribution ?? {};
  const outlook = data.outlook;
  const movers = data.biggest_movers ?? {};
  const migration = data.tier_migration ?? data.leadership_migration ?? {};
  const sectors = data.sector_intelligence ?? [];
  const brief = data.market_overview ?? "";
  const asof = data.asof ?? "—";

  const entering = migration.entering_positive ?? migration.entering ?? [];
  const exiting = migration.exiting_positive ?? migration.exiting ?? [];
  const moversUp = movers.up ?? [];
  const moversDown = movers.down ?? [];
  const activeMoverList = moverTab === "up" ? moversUp : moversDown;

  const distBuckets = [
    { label: "75–100", key: "75+", color: "bg-emerald-500/60" },
    { label: "40–74", key: "40-74", color: "bg-zinc-400/40" },
    { label: "0–39", key: "<40", color: "bg-red-500/30" },
  ];

  const positiveCount = snap.positive_count ?? snap.leadership_count ?? 0;
  const prevPositiveCount = snap.prev_positive_count ?? snap.prev_leadership_count;
  const positiveDelta = prevPositiveCount !== undefined
    ? positiveCount - prevPositiveCount : null;

  return (
    <div className="min-h-screen bg-black text-zinc-100 pt-14">
      {/* Background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[200px] -left-[100px] h-[500px] w-[500px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)", filter: "blur(100px)" }} />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }} />
      </div>

      <main className="relative mx-auto max-w-[1060px] px-4 sm:px-6 pb-12">

        {/* Header */}
        <Reveal>
          <div className="pt-8 sm:pt-10 pb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">Market Dashboard</h1>
            <p className="text-[12px] text-zinc-600 mt-1">
              Last updated {asof}
              {data.prev_asof && <span> · Prior: {data.prev_asof}</span>}
              <span> · Updated weekly</span>
            </p>
          </div>
        </Reveal>

        {/* Market Outlook */}
        {outlook && (
          <Reveal delay={50}>
            <div className="mb-6">
              <OutlookBanner outlook={outlook} />
            </div>
          </Reveal>
        )}

        {/* Snapshot stats */}
        <Reveal delay={100}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Universe"
              value={snap.total_scored ?? "—"}
              sub={snap.new_to_universe ? `${snap.new_to_universe} new this update` : "Liquid U.S. equities"}
            />
            <StatCard
              label="Positive Tier"
              value={positiveCount}
              sub={positiveDelta !== null
                ? `${positiveDelta >= 0 ? "+" : ""}${positiveDelta} vs prior`
                : "Scoring 75+"}
              accent="text-emerald-400"
            />
            <StatCard
              label="Avg Score"
              value={snap.avg_score ?? "—"}
              sub={snap.avg_delta !== undefined
                ? `${snap.avg_delta >= 0 ? "+" : ""}${snap.avg_delta} vs prior`
                : undefined}
            />
            <StatCard
              label="Negative"
              value={snap.negative_count ?? "—"}
              sub={snap.total_scored
                ? `${((snap.negative_count / snap.total_scored) * 100).toFixed(0)}% of universe`
                : undefined}
              accent="text-red-400/80"
            />
          </div>
        </Reveal>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">

          {/* LEFT (3/5) */}
          <div className="lg:col-span-3 space-y-6">

            {/* Biggest movers */}
            <Reveal delay={150}>
              <div>
                <SectionHead title="Biggest Movers" sub="Largest score changes vs prior update" />
                <Card>
                  <div className="flex border-b border-zinc-800/50">
                    <button onClick={() => setMoverTab("up")}
                      className={`flex-1 py-3 text-[12px] font-bold uppercase tracking-wider text-center transition-colors ${
                        moverTab === "up" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-zinc-600 hover:text-zinc-400"
                      }`}>
                      Winners ({Math.min(moversUp.length, 10)})
                    </button>
                    <button onClick={() => setMoverTab("down")}
                      className={`flex-1 py-3 text-[12px] font-bold uppercase tracking-wider text-center transition-colors ${
                        moverTab === "down" ? "text-red-400 border-b-2 border-red-400" : "text-zinc-600 hover:text-zinc-400"
                      }`}>
                      Losers ({Math.min(moversDown.length, 10)})
                    </button>
                  </div>
                  <div className="px-4 sm:px-5 py-3">
                    <div className="flex items-center gap-3 pb-2 mb-1 border-b border-zinc-800/30">
                      <span className="text-[10px] text-zinc-700 w-5 shrink-0">#</span>
                      <span className="text-[10px] text-zinc-700 flex-1">Ticker</span>
                      <span className="text-[10px] text-zinc-700 w-8 text-right">Score</span>
                      <span className="text-[10px] text-zinc-700 w-12 text-right">Chg</span>
                    </div>
                    {activeMoverList.length > 0 ? (
                      activeMoverList.slice(0, 10).map((m: any, i: number) => (
                        <MoverRow key={m.ticker} ticker={m.ticker} name={m.name ?? ""}
                          score={m.score ?? 0} delta={m.delta ?? 0} rank={i + 1} />
                      ))
                    ) : (
                      <div className="py-6 text-[12px] text-zinc-700 text-center">No movers this period</div>
                    )}
                  </div>
                </Card>
              </div>
            </Reveal>

            {/* Sector rankings */}
            <Reveal delay={200}>
              <div>
                <SectionHead title="Sector Rankings" sub="Average score by sector · change vs prior" />
                <Card className="px-4 sm:px-5 py-4">
                  <div className="flex items-center gap-3 pb-2 mb-1 border-b border-zinc-800/30">
                    <span className="text-[10px] text-zinc-700 w-4 shrink-0 text-right">#</span>
                    <span className="text-[10px] text-zinc-700 w-[130px] sm:w-[170px] shrink-0">Sector</span>
                    <span className="flex-1"></span>
                    <span className="text-[10px] text-zinc-700 w-8 text-right">Avg</span>
                    <span className="text-[10px] text-zinc-700 w-10 text-right">Chg</span>
                  </div>
                  {sectors.length > 0 ? (
                    sectors.map((s: any, i: number) => (
                      <SectorRow key={s.sector} sector={s.sector}
                        avgScore={s.avg_score ?? 0} delta={s.delta} rank={i + 1} />
                    ))
                  ) : (
                    <div className="py-6 text-[12px] text-zinc-700 text-center">No data</div>
                  )}
                </Card>
              </div>
            </Reveal>
          </div>

          {/* RIGHT (2/5) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Leadership changes */}
            <Reveal delay={150}>
              <div>
                <SectionHead title="Positive Tier Changes" sub="Entering and exiting 75+" />
                <Card>
                  <div className="px-4 sm:px-5 pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/80">
                        Entered Positive ({entering.length})
                      </span>
                    </div>
                    {entering.length > 0 ? (
                      entering.slice(0, 8).map((s: any) => (
                        <MigrationRow key={s.ticker} ticker={s.ticker} name={s.name ?? ""}
                          score={s.score ?? 0} delta={s.delta ?? null} direction="enter"
                          isNew={s.new_entrant} />
                      ))
                    ) : (
                      <div className="text-[12px] text-zinc-700 py-2">None this period</div>
                    )}
                  </div>
                  <div className="border-t border-zinc-800/40" />
                  <div className="px-4 sm:px-5 pt-3 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-red-400/80">
                        Dropped Out ({exiting.length})
                      </span>
                    </div>
                    {exiting.length > 0 ? (
                      exiting.slice(0, 8).map((s: any) => (
                        <MigrationRow key={s.ticker} ticker={s.ticker} name={s.name ?? ""}
                          score={s.score ?? 0} delta={s.delta ?? null} direction="exit" />
                      ))
                    ) : (
                      <div className="text-[12px] text-zinc-700 py-2">None this period</div>
                    )}
                  </div>
                </Card>
              </div>
            </Reveal>

            {/* Score distribution */}
            <Reveal delay={200}>
              <div>
                <SectionHead title="Score Distribution" sub="Universe breakdown by tier" />
                <Card className="px-4 sm:px-5 py-4">
                  <div className="space-y-1">
                    {distBuckets.map((b) => {
                      const d = dist[b.key] ?? {};
                      return <DistBar key={b.key} label={b.label} pct={d.pct ?? 0} count={d.count ?? 0} color={b.color} />;
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-900/40 text-[11px] text-zinc-600 flex justify-between">
                    <span>Total: {dist.total ?? "—"}</span>
                    <span>Positive: {dist["75+"]?.pct?.toFixed(1) ?? "—"}%</span>
                  </div>
                </Card>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Intelligence brief */}
        {brief && (
          <Reveal delay={250}>
            <div className="mb-6">
              <SectionHead title="Market Overview" />
              <Card className="p-5 sm:p-6">
                <p className="text-sm leading-relaxed text-zinc-400">{brief}</p>
              </Card>
            </div>
          </Reveal>
        )}

        {/* Footer */}
        <Reveal delay={300}>
          <div className="flex items-center justify-between text-[11px] text-zinc-700 pt-2 pb-4">
            <span>Updated weekly. Scores rebalance monthly.</span>
            <a href="/screener" className="text-zinc-500 hover:text-zinc-300 transition-colors">Open Screener →</a>
          </div>
        </Reveal>
      </main>
    </div>
  );
}