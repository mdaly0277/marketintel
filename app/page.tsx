"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";

const TIER_BACKTEST_PATH = "/data/tier_backtest.json";

type AnyObj = Record<string, any>;

function isBlank(v: any) {
  if (v === null || v === undefined) return true;
  const s = String(v).trim().toLowerCase();
  return s === "" || s === "nan" || s === "null" || s === "none" || s === "undefined";
}

function getField(obj: AnyObj, keys: string[], fallback: any = undefined) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return fallback;
}

function fmtPct(v: any, digits = 1) {
  if (isBlank(v)) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  const pct = Math.abs(n) <= 1.5 ? n * 100 : n;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(digits)}%`;
}

async function fetchJson(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} (${res.status})`);
  return res.json();
}

type TierStatRow = { tier: string; n: number; avg: number | null; median: number | null; win_rate: number | null };

function indexTierTable(table: TierStatRow[] | undefined | null) {
  const map = new Map<string, TierStatRow>();
  (table ?? []).forEach((r) => { if (r?.tier) map.set(String(r.tier), r); });
  return map;
}

/* ── Reveal on scroll ───────────────────────────────────── */

function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTimeout(() => setVisible(true), delay); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)" }}
    >
      {children}
    </div>
  );
}

/* ── Animated counter ───────────────────────────────────── */

function Counter({ end, duration = 1400, delay = 0, prefix = "", suffix = "" }: {
  end: number; duration?: number; delay?: number; prefix?: string; suffix?: string;
}) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const e = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(e * end));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, [end, duration, delay]);
  return <>{prefix}{val.toLocaleString()}{suffix}</>;
}

/* ── Tier row ───────────────────────────────────────────── */

function TierRow({
  range, label, accentClass, a3m, a6m, a12m, count, idx,
}: {
  range: string; label: string; accentClass: string;
  a3m: string; a6m: string; a12m: string;
  count?: number; idx: number;
}) {
  return (
    <Reveal delay={idx * 80}>
      <div className="group flex items-center gap-0 rounded-lg border border-zinc-800/50 bg-zinc-950/50 transition-all duration-300 hover:border-zinc-700/70 hover:bg-zinc-900/30 overflow-hidden">
        <div className={`w-1 self-stretch ${accentClass} shrink-0 transition-all duration-300 group-hover:w-1.5`} />

        <div className="flex flex-1 items-center justify-between px-4 py-3.5 sm:px-5 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[11px] font-mono font-bold text-zinc-600 w-[52px] shrink-0">{range}</span>
            <span className="text-sm font-semibold text-zinc-200">{label}</span>
            {count !== undefined && (
              <span className="text-[11px] text-zinc-700 hidden sm:inline">{count} stocks</span>
            )}
          </div>

          <div className="flex gap-5 sm:gap-8 shrink-0">
            {[
              { label: "3M", value: a3m },
              { label: "6M", value: a6m },
              { label: "12M", value: a12m },
            ].map((s) => {
              const isPos = s.value.startsWith("+") && s.value !== "+0.0%";
              const isNeg = s.value.startsWith("-");
              const color = isPos ? "text-emerald-400" : isNeg ? "text-red-400" : "text-zinc-400";
              return (
                <div key={s.label} className="text-right min-w-[44px] sm:min-w-[56px]">
                  <div className="text-[10px] text-zinc-600 hidden sm:block">{s.label}</div>
                  <div className={`text-[13px] sm:text-sm font-bold tabular-nums ${color}`}>{s.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default function HomePage() {
  const [tierBt, setTierBt] = useState<AnyObj | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const t = await fetchJson(TIER_BACKTEST_PATH);
        if (alive) setTierBt(t);
      } catch {
        if (alive) setTierBt(null);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const t3 = useMemo(() => indexTierTable(getField(tierBt ?? {}, ["table_3m"], [])), [tierBt]);
  const t6 = useMemo(() => indexTierTable(getField(tierBt ?? {}, ["table_6m"], [])), [tierBt]);
  const t12 = useMemo(() => indexTierTable(getField(tierBt ?? {}, ["table_12m"], [])), [tierBt]);
  const counts = useMemo(() => getField(tierBt ?? {}, ["current_counts"], null), [tierBt]);
  const totalScored = useMemo(() => getField(tierBt ?? {}, ["total_scored"], null), [tierBt]);
  const nHoldings = 25;

  function stats(k: string) {
    return {
      a3m: fmtPct(t3.get(k)?.avg, 1),
      a6m: fmtPct(t6.get(k)?.avg, 1),
      a12m: fmtPct(t12.get(k)?.avg, 1),
      count: counts?.[k] ?? undefined,
    };
  }

  const s90 = stats("90s");
  const s80 = stats("80s");
  const s70 = stats("70s");
  const s60 = stats("60s");
  const sLow = stats("<60");

  return (
    <div className="min-h-screen bg-black text-zinc-100 pt-14">

      {/* ── Background atmosphere ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-[200px] -left-[100px] h-[600px] w-[600px] rounded-full opacity-[0.10]"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)", filter: "blur(100px)" }}
        />
        <div
          className="absolute top-[40%] right-[-5%] h-[500px] w-[500px] rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)", filter: "blur(100px)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      <main className="relative mx-auto max-w-[960px] px-5 pb-16">

        {/* ══════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════ */}
        <section className="pt-16 sm:pt-24 pb-20 sm:pb-28">
          <Reveal delay={50}>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
              <span className="text-zinc-50">Rank the market.</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                Remove the noise.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-zinc-500 max-w-[520px]">
              AlphaPanel scores every liquid U.S. equity on a 0–100 scale using
              multi-factor quantitative signals — then tracks what happens next.
            </p>
          </Reveal>

          <Reveal delay={350}>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/screener"
                className="group rounded-xl px-7 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-blue-500/20"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
              >
                Open Screener
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a
                href="/dashboard"
                className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-7 py-3.5 text-sm font-medium text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-200"
              >
                Dashboard
              </a>
              <a
                href="/about"
                className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-7 py-3.5 text-sm font-medium text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-200"
              >
                How it works
              </a>
            </div>
          </Reveal>
        </section>

        {/* ══════════════════════════════════════════════════
            TIER EVIDENCE
        ══════════════════════════════════════════════════ */}
        <section className="pb-20 sm:pb-24">
          <Reveal>
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100">Does the score work?</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 max-w-[640px]">
                Each month, every stock in the universe receives a score. The table below groups stocks
                by their score at that moment and tracks what happened next — the average return
                over the following 3, 6, and 12 months across all historical snapshots, covering
                bull markets, drawdowns, rate hikes, and recoveries.
              </p>
            </div>
          </Reveal>

          <div className="space-y-1.5">
            <TierRow range="90–100" label="Leadership" accentClass="bg-emerald-500" {...s90} idx={0} />
            <TierRow range="80–89" label="Positive" accentClass="bg-sky-500" {...s80} idx={1} />
            <TierRow range="70–79" label="Neutral" accentClass="bg-zinc-600" {...s70} idx={2} />
            <TierRow range="60–69" label="Caution" accentClass="bg-amber-500/70" {...s60} idx={3} />
            <TierRow range="< 60" label="Avoid" accentClass="bg-red-500/70" {...sLow} idx={4} />
          </div>

          <Reveal delay={400}>
            <p className="mt-4 text-[11px] text-zinc-700 pl-1">
              Returns include all market conditions. Not a guarantee of future results.
            </p>
          </Reveal>
        </section>

        {/* ══════════════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════════════ */}
        <section className="pb-20 sm:pb-24">
          <Reveal>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 mb-8">How it works</h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                step: "01",
                title: "Signal extraction",
                body: "The model evaluates cross-sectional momentum, trend structure, and mean-reversion dynamics across the full universe. Each signal is rooted in documented market anomalies from peer-reviewed research.",
              },
              {
                step: "02",
                title: "Composite scoring",
                body: "Individual signals are percentile-ranked and combined into a single composite score from 0–100. Factor weights are calibrated to maximize forward return separation between the top and bottom deciles.",
              },
              {
                step: "03",
                title: "Portfolio construction",
                body: "The highest-conviction names form an equal-weight model portfolio. Quality gates filter for liquidity and price integrity before any stock enters the portfolio.",
              },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i * 100}>
                <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/40 p-5 sm:p-6 h-full transition-all duration-300 hover:border-zinc-700/60">
                  <div className="text-[11px] font-mono font-bold text-blue-500/60 mb-3">{item.step}</div>
                  <div className="text-sm font-bold text-zinc-200 mb-2">{item.title}</div>
                  <p className="text-[13px] leading-relaxed text-zinc-500">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            NUMBERS STRIP
        ══════════════════════════════════════════════════ */}
        <Reveal>
          <section className="pb-20 sm:pb-24">
            <div className="flex flex-wrap justify-between gap-6 sm:gap-0 border-y border-zinc-800/50 py-8 px-2">
              {[
                { val: totalScored ?? 1200, suffix: "+", label: "Stocks scored" },
                { val: 2, prefix: "$", suffix: "B+", label: "Market cap floor" },
                { val: nHoldings, suffix: "", label: "Portfolio holdings" },
              ].map((s, i) => (
                <div key={s.label} className="min-w-[100px]">
                  <div className="text-2xl sm:text-3xl font-extrabold tabular-nums text-zinc-100">
                    <Counter end={s.val} delay={200 + i * 120} prefix={s.prefix ?? ""} suffix={s.suffix} />
                  </div>
                  <div className="mt-1 text-[11px] sm:text-xs text-zinc-600">{s.label}</div>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ══════════════════════════════════════════════════
            CTA
        ══════════════════════════════════════════════════ */}
        <Reveal>
          <section className="pb-12">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-3">See what the model sees.</h2>
              <p className="text-sm text-zinc-500 mb-6 max-w-[400px] mx-auto">
                Screen the full universe, explore the model portfolio, or read about the methodology.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href="/screener"
                  className="rounded-xl px-7 py-3 text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                >
                  Open Screener
                </a>
                <a href="/dashboard" className="rounded-xl border border-zinc-800 bg-zinc-950 px-7 py-3 text-sm font-medium text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-all">
                  Dashboard
                </a>
                <a href="/portfolio" className="rounded-xl border border-zinc-800 bg-zinc-950 px-7 py-3 text-sm font-medium text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-all">
                  Model Portfolio
                </a>
                <a href="/about" className="rounded-xl border border-zinc-800 bg-zinc-950 px-7 py-3 text-sm font-medium text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-all">
                  About
                </a>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ── Footer ── */}
        <footer className="border-t border-zinc-900 pt-6 pb-4 text-[11px] text-zinc-700">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span><span className="text-zinc-500">AlphaPanel</span> — Quantitative equity rankings.</span>
            <div className="flex items-center gap-3">
              <span>Not financial advice</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}