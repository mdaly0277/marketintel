"use client";

import React, { useEffect, useMemo, useState } from "react";

const DATA_PATH = "/data/dashboard_data.json";

type AnyObj = Record<string, any>;

function norm(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return s.toLowerCase() === "nan" || s.toLowerCase() === "null" ? "" : s;
}

async function fetchJson(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} (${res.status})`);
  return res.json();
}

/* ── Regime badge ───────────────────────────────────────── */

function RegimeBadge({ regime }: { regime: string }) {
  const isOn = regime.toUpperCase().includes("ON");
  const isCaution = regime.toUpperCase().includes("CAUTION") || regime.toUpperCase().includes("MIXED");
  let bg: string, text: string, dot: string;
  if (isOn) {
    bg = "bg-emerald-950/60 border-emerald-800/50";
    text = "text-emerald-300";
    dot = "bg-emerald-400";
  } else if (isCaution) {
    bg = "bg-amber-950/60 border-amber-800/50";
    text = "text-amber-300";
    dot = "bg-amber-400";
  } else {
    bg = "bg-red-950/60 border-red-800/50";
    text = "text-red-300";
    dot = "bg-red-400";
  }
  return (
    <div className={`inline-flex items-center gap-2.5 rounded-lg border px-4 py-2 ${bg}`}>
      <div className={`h-2 w-2 rounded-full ${dot} animate-pulse`} />
      <span className={`text-sm font-bold uppercase tracking-wider ${text}`}>{regime}</span>
    </div>
  );
}

/* ── Section wrapper ────────────────────────────────────── */

function Section({ title, subtitle, children, className = "" }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`${className}`}>
      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12px] text-zinc-600">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

/* ── Score distribution bars ────────────────────────────── */

function DistBar({ label, pct, color, count }: { label: string; pct: number; color: string; count: number }) {
  const maxW = 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-mono text-zinc-500 w-[52px] shrink-0 text-right">{label}</span>
      <div className="flex-1 h-7 bg-zinc-900/50 rounded overflow-hidden relative">
        <div
          className={`h-full rounded ${color} transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(pct * (maxW / 40), 100)}%` }}
        />
        <div className="absolute inset-y-0 right-2 flex items-center">
          <span className="text-[11px] font-bold tabular-nums text-zinc-400">{pct.toFixed(1)}%</span>
        </div>
      </div>
      <span className="text-[11px] text-zinc-700 w-[40px] shrink-0 tabular-nums">{count}</span>
    </div>
  );
}

/* ── Migration row ──────────────────────────────────────── */

function MigrationRow({ ticker, name, scoreDelta, direction, score }: {
  ticker: string; name: string; scoreDelta: number; direction: "enter" | "exit"; score: number;
}) {
  const isEnter = direction === "enter";
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-900/50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isEnter ? "bg-emerald-400" : "bg-red-400"}`} />
        <span className="text-sm font-bold text-zinc-200 shrink-0">{ticker}</span>
        <span className="text-[12px] text-zinc-600 truncate hidden sm:inline">{name}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[12px] font-mono text-zinc-500">{score}</span>
        <span className={`text-[12px] font-bold tabular-nums ${isEnter ? "text-emerald-400" : "text-red-400"}`}>
          {isEnter ? "+" : ""}{scoreDelta}
        </span>
      </div>
    </div>
  );
}

/* ── Sector row ─────────────────────────────────────────── */

function SectorBar({ sector, avgScore, rank, total }: {
  sector: string; avgScore: number; rank: number; total: number;
}) {
  const pct = (avgScore / 100) * 100;
  let color: string;
  if (avgScore >= 75) color = "bg-emerald-500/60";
  else if (avgScore >= 60) color = "bg-sky-500/50";
  else if (avgScore >= 45) color = "bg-zinc-500/40";
  else color = "bg-red-500/40";

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-[12px] text-zinc-500 w-[140px] sm:w-[180px] shrink-0 truncate">{sector}</span>
      <div className="flex-1 h-5 bg-zinc-900/30 rounded overflow-hidden relative">
        <div className={`h-full rounded ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[13px] font-bold tabular-nums text-zinc-300 w-[32px] text-right">{avgScore.toFixed(0)}</span>
    </div>
  );
}

/* ── Stat box ───────────────────────────────────────────── */

function Stat({ label, value, sub, color = "text-zinc-100" }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">{label}</div>
      <div className={`text-xl sm:text-2xl font-extrabold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default function DashboardPage() {
  const [data, setData] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const d = await fetchJson(DATA_PATH);
        if (alive) setData(d);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load dashboard data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 pt-14 flex items-center justify-center">
        <div className="text-sm text-zinc-600">Loading dashboard…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 pt-14 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-red-400 mb-2">Dashboard data not available</div>
          <div className="text-xs text-zinc-600">{error ?? "dashboard_data.json not found"}</div>
        </div>
      </div>
    );
  }

  const regime = data.regime ?? {};
  const dist = data.score_distribution ?? {};
  const migration = data.leadership_migration ?? {};
  const sectors = data.sector_intelligence ?? [];
  const dispersion = data.dispersion ?? {};
  const brief = data.intelligence_brief ?? "";
  const asof = data.asof ?? "—";
  const prevAsof = data.prev_asof ?? "";

  const distBuckets = [
    { label: "90–100", key: "90s", color: "bg-emerald-500/70" },
    { label: "80–89", key: "80s", color: "bg-sky-500/60" },
    { label: "70–79", key: "70s", color: "bg-zinc-500/50" },
    { label: "60–69", key: "60s", color: "bg-amber-500/40" },
    { label: "< 60", key: "below_60", color: "bg-red-500/40" },
  ];

  const entering = migration.entering ?? [];
  const exiting = migration.exiting ?? [];

  return (
    <div className="min-h-screen bg-black text-zinc-100 pt-14">
      {/* Background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[200px] -left-[100px] h-[600px] w-[600px] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)", filter: "blur(100px)" }} />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }} />
      </div>

      <main className="relative mx-auto max-w-[1000px] px-4 sm:px-6 pb-12">

        {/* ── Header ── */}
        <div className="pt-8 sm:pt-10 pb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">Dashboard</h1>
            <p className="text-[12px] text-zinc-600 mt-1">Snapshot as of {asof}{prevAsof ? ` • Prior: ${prevAsof}` : ""}</p>
          </div>
          <RegimeBadge regime={regime.label ?? "UNKNOWN"} />
        </div>

        {/* ── Regime detail strip ── */}
        {regime.detail && (
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/50 px-4 sm:px-5 py-3 mb-8">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
              {regime.detail.map((item: { label: string; value: string }, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-zinc-600">{item.label}:</span>
                  <span className="font-bold text-zinc-300">{item.value}</span>
                </div>
              ))}
            </div>
            {regime.last_change && (
              <div className="text-[11px] text-zinc-700 mt-2">Last regime change: {regime.last_change}</div>
            )}
          </div>
        )}

        {/* ── Grid layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── SCORE DISTRIBUTION ── */}
          <Section title="Score Distribution" subtitle="Current universe breakdown by tier">
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-4 sm:p-5">
              <div className="space-y-2">
                {distBuckets.map((b) => {
                  const d = dist[b.key] ?? {};
                  return (
                    <DistBar
                      key={b.key}
                      label={b.label}
                      pct={d.pct ?? 0}
                      count={d.count ?? 0}
                      color={b.color}
                    />
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-900/50 flex justify-between text-[11px] text-zinc-600">
                <span>Total: {dist.total ?? "—"} stocks</span>
                <span>Leadership: {dist["90s"]?.pct?.toFixed(1) ?? "—"}%</span>
              </div>
            </div>
          </Section>

          {/* ── CONCENTRATION & DISPERSION ── */}
          <Section title="Concentration & Dispersion" subtitle="Leadership breadth vs universe">
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-6 mb-5">
                <Stat
                  label="Top 10 Avg Score"
                  value={dispersion.top10_avg?.toFixed(1) ?? "—"}
                  color="text-emerald-400"
                />
                <Stat
                  label="Universe Avg"
                  value={dispersion.universe_avg?.toFixed(1) ?? "—"}
                  color="text-zinc-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-6 mb-4">
                <Stat
                  label="Score Spread"
                  value={dispersion.spread?.toFixed(1) ?? "—"}
                  sub="Top 10 − Universe"
                />
                <Stat
                  label="Std Dev"
                  value={dispersion.std_dev?.toFixed(1) ?? "—"}
                  sub={dispersion.std_dev_change
                    ? `${dispersion.std_dev_change > 0 ? "+" : ""}${dispersion.std_dev_change.toFixed(1)} vs prior`
                    : undefined}
                  color={
                    dispersion.std_dev_change > 0 ? "text-amber-400" :
                    dispersion.std_dev_change < 0 ? "text-sky-400" : "text-zinc-300"
                  }
                />
              </div>
              <div className="text-[11px] text-zinc-700">
                {dispersion.spread > 30
                  ? "Leadership is narrow — high conviction concentrated in few names."
                  : dispersion.spread > 20
                  ? "Moderate concentration — leadership is selective but not extreme."
                  : "Leadership is broad — scores are distributed widely across the universe."}
              </div>
            </div>
          </Section>

          {/* ── LEADERSHIP MIGRATION ── */}
          <Section title="Leadership Migration" subtitle="Entering and exiting the 90+ tier vs prior month">
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 overflow-hidden">
              {/* Entering */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/80">
                    Entering Leadership ({entering.length})
                  </span>
                </div>
                {entering.length > 0 ? (
                  <div>
                    {entering.slice(0, 8).map((s: any) => (
                      <MigrationRow
                        key={s.ticker}
                        ticker={s.ticker}
                        name={s.name ?? ""}
                        score={s.score ?? 0}
                        scoreDelta={s.score_delta ?? 0}
                        direction="enter"
                      />
                    ))}
                    {entering.length > 8 && (
                      <div className="text-[11px] text-zinc-700 pt-2">+{entering.length - 8} more</div>
                    )}
                  </div>
                ) : (
                  <div className="text-[12px] text-zinc-700">No new entries this month.</div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-zinc-800/50" />

              {/* Exiting */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-400/80">
                    Exiting Leadership ({exiting.length})
                  </span>
                </div>
                {exiting.length > 0 ? (
                  <div>
                    {exiting.slice(0, 8).map((s: any) => (
                      <MigrationRow
                        key={s.ticker}
                        ticker={s.ticker}
                        name={s.name ?? ""}
                        score={s.score ?? 0}
                        scoreDelta={s.score_delta ?? 0}
                        direction="exit"
                      />
                    ))}
                    {exiting.length > 8 && (
                      <div className="text-[11px] text-zinc-700 pt-2">+{exiting.length - 8} more</div>
                    )}
                  </div>
                ) : (
                  <div className="text-[12px] text-zinc-700">No exits this month.</div>
                )}
              </div>
            </div>
          </Section>

          {/* ── SECTOR INTELLIGENCE ── */}
          <Section title="Sector Intelligence" subtitle="Average composite score by sector">
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-4 sm:p-5">
              {sectors.length > 0 ? (
                <div>
                  {sectors.map((s: any, i: number) => (
                    <SectorBar
                      key={s.sector}
                      sector={s.sector}
                      avgScore={s.avg_score ?? 0}
                      rank={i + 1}
                      total={sectors.length}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-zinc-700">No sector data available.</div>
              )}
            </div>
          </Section>
        </div>

        {/* ── INTELLIGENCE BRIEF (full width) ── */}
        {brief && (
          <Section title="Monthly Intelligence Brief" subtitle="Auto-generated from model output" className="mt-6">
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-5 sm:p-6">
              <p className="text-sm leading-relaxed text-zinc-400 whitespace-pre-line">{brief}</p>
            </div>
          </Section>
        )}

        {/* ── Footer link ── */}
        <div className="mt-8 flex items-center justify-between text-[11px] text-zinc-700">
          <span>Data updates monthly with each rebalance cycle.</span>
          <a href="/screener" className="text-zinc-500 hover:text-zinc-300 transition-colors">Screener →</a>
        </div>
      </main>
    </div>
  );
}