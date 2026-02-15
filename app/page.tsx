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

/* ── Animated counter ───────────────────────────────────── */

function Counter({ end, duration = 1500, delay = 0, prefix = "", suffix = "" }: {
  end: number; duration?: number; delay?: number; prefix?: string; suffix?: string;
}) {
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setVal(Math.round(eased * end));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timeout);
  }, [end, duration, delay]);

  return <>{prefix}{val.toLocaleString()}{suffix}</>;
}

/* ── Fade in wrapper ────────────────────────────────────── */

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

/* ── Tier card ──────────────────────────────────────────── */

function TierCard({
  range, label, accent, glowColor, a3m, a6m, a12m, count, delay = 0,
}: {
  range: string; label: string; accent: string; glowColor: string;
  a3m: string; a6m: string; a12m: string;
  count?: number; delay?: number;
}) {
  const [show, setShow] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-950/60 transition-all duration-500 ease-out hover:border-zinc-700/80"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(12px)",
        boxShadow: hovered ? `0 0 30px -10px ${glowColor}` : "none",
      }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accent} transition-all duration-300`}
        style={{ width: hovered ? "4px" : "3px" }}
      />

      <div className="flex items-center justify-between gap-4 p-4 pl-5">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 shrink-0">{range}</span>
          <span className="text-sm font-semibold text-zinc-200">{label}</span>
          {count !== undefined && (
            <span className="text-[11px] text-zinc-600 hidden sm:inline">{count} stocks</span>
          )}
        </div>

        <div className="flex gap-4 shrink-0">
          {[
            { label: "3M", value: a3m },
            { label: "6M", value: a6m },
            { label: "12M", value: a12m },
          ].map((s) => (
            <div key={s.label} className="text-right min-w-[52px]">
              <div className="text-[10px] text-zinc-600">{s.label}</div>
              <div className="text-sm font-bold tabular-nums text-zinc-200">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Mini score bar visualization ───────────────────────── */

function ScoreBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(t);
  }, []);

  const bars = [
    { h: 18, color: "bg-red-500/60" },
    { h: 22, color: "bg-red-500/50" },
    { h: 20, color: "bg-red-500/40" },
    { h: 25, color: "bg-amber-500/40" },
    { h: 28, color: "bg-amber-500/40" },
    { h: 30, color: "bg-zinc-500/40" },
    { h: 33, color: "bg-zinc-500/40" },
    { h: 38, color: "bg-sky-500/40" },
    { h: 44, color: "bg-emerald-500/50" },
    { h: 56, color: "bg-emerald-500/70" },
  ];

  return (
    <div className="flex items-end gap-[3px] h-[60px]">
      {bars.map((b, i) => (
        <div
          key={i}
          className={`w-[6px] rounded-t-sm ${b.color} transition-all duration-700 ease-out`}
          style={{
            height: show ? `${b.h}px` : "2px",
            transitionDelay: `${900 + i * 60}ms`,
          }}
        />
      ))}
    </div>
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

  const tierMeta = useMemo(() => {
    const asof = getField(tierBt ?? {}, ["asof"], null);
    const nDates = getField(tierBt ?? {}, ["signal_dates_used"], null);
    if (!asof || !nDates) return null;
    return { asof, nDates };
  }, [tierBt]);

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
  const sLow = stats("<60");

  return (
    <div className="min-h-screen bg-black text-zinc-100 pt-14">
      {/* ── Background ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-[200px] -left-[100px] h-[700px] w-[700px] rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)", filter: "blur(100px)" }}
        />
        <div
          className="absolute top-[30%] right-[-10%] h-[600px] w-[600px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)", filter: "blur(100px)" }}
        />
        <div
          className="absolute bottom-[10%] left-[30%] h-[400px] w-[400px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #10b981, transparent 70%)", filter: "blur(80px)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <main className="relative mx-auto max-w-[1100px] px-5 pb-16 pt-10">

        {/* ── HERO ── */}
        <section className="pb-20">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[560px]">
              {tierMeta && (
                <FadeIn delay={0}>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/50 px-3.5 py-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-zinc-400">
                      {tierMeta.nDates} months of data through {tierMeta.asof}
                    </span>
                  </div>
                </FadeIn>
              )}

              <FadeIn delay={100}>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.08]">
                  <span className="text-zinc-50">Every stock.</span>
                  <br />
                  <span className="text-zinc-50">One score.</span>
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                    Zero opinions.
                  </span>
                </h1>
              </FadeIn>

              <FadeIn delay={350}>
                <p className="mt-6 text-base leading-relaxed text-zinc-400 max-w-[480px]">
                  AlphaPanel ranks equities 0–100 using quantitative factor signals
                  grounded in academic research. Systematic, adaptive, end-of-day.
                </p>
              </FadeIn>

              <FadeIn delay={550}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="/screener"
                    className="group rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/25"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                  >
                    Open Screener
                    <span className="inline-block ml-1.5 transition-transform group-hover:translate-x-1">→</span>
                  </a>
                  <a
                    href="/portfolio"
                    className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-6 py-3 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:text-zinc-100"
                  >
                    Model Portfolio
                  </a>
                </div>
              </FadeIn>
            </div>

            {/* ── Hero visual ── */}
            <FadeIn delay={600} className="hidden lg:block">
              <div className="relative">
                {/* Glow behind card */}
                <div
                  className="absolute -inset-4 rounded-3xl opacity-30"
                  style={{ background: "radial-gradient(ellipse at center, rgba(59,130,246,0.15), transparent 70%)" }}
                />
                <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-6 w-[320px] backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-zinc-600">Smart Score</div>
                      <div className="text-4xl font-bold tabular-nums text-zinc-50 mt-1">
                        <Counter end={94} delay={800} suffix="" />
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-2.5 py-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Leadership</span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between mb-4">
                    <ScoreBar />
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-600">Decile 10</div>
                      <div className="text-sm font-bold text-emerald-400">+2.4%/mo</div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800/60 pt-3">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "3M Fwd", val: "+5.5%" },
                        { label: "6M Fwd", val: "+10.4%" },
                        { label: "12M Fwd", val: "+19.1%" },
                      ].map((s) => (
                        <div key={s.label}>
                          <div className="text-[10px] text-zinc-600">{s.label}</div>
                          <div className="text-xs font-bold text-zinc-200 tabular-nums">{s.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 text-[10px] text-zinc-700 text-center">
                    Leadership tier · Historical avg forward returns
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── Three pillars ── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 pb-16">
          {[
            { icon: "◎", title: "Score", body: "Multi-factor composite ranked 0–100 against the full universe. Quantitative, cross-sectional, adaptive." },
            { icon: "⊞", title: "Screen", body: "Filter by score, sector, cap. Sort by any return period. Find relative strength leaders in seconds." },
            { icon: "△", title: "Track", body: "Full backtest against the S&P 500. See exactly how top-scored names have performed — including the bad years." },
          ].map((item, i) => (
            <FadeIn key={item.title} delay={700 + i * 100}>
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-5 transition-all duration-300 hover:border-zinc-700/60 hover:bg-zinc-950/70 h-full">
                <div className="text-lg mb-2 text-blue-500/50">{item.icon}</div>
                <div className="text-sm font-semibold text-zinc-200 mb-1.5">{item.title}</div>
                <p className="text-sm leading-relaxed text-zinc-500">{item.body}</p>
              </div>
            </FadeIn>
          ))}
        </section>

        {/* ── TIER EVIDENCE ── */}
        <section className="pb-16">
          <FadeIn delay={200}>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Historical tier returns</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Average forward return by score bucket.
                  {tierMeta && <span> {tierMeta.nDates} snapshots through {tierMeta.asof}.</span>}
                </p>
              </div>
              <a href="/screener" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Screener →
              </a>
            </div>
          </FadeIn>

          <div className="space-y-2">
            <TierCard range="90–100" label="Leadership" accent="bg-emerald-400" glowColor="rgba(16,185,129,0.15)" {...s90} delay={300} />
            <TierCard range="80–89" label="Positive Bias" accent="bg-sky-400" glowColor="rgba(56,189,248,0.12)" {...s80} delay={400} />
            <TierCard range="70–79" label="Neutral" accent="bg-zinc-500" glowColor="rgba(161,161,170,0.08)" {...s70} delay={500} />
            <TierCard range="< 60" label="Avoid" accent="bg-red-500/80" glowColor="rgba(239,68,68,0.10)" {...sLow} delay={600} />
          </div>

          <div className="mt-4 text-[11px] text-zinc-700 pl-1">
            * Returns include all market conditions. Not a guarantee of future results.
          </div>
        </section>

        {/* ── Numbers ── */}
        <FadeIn delay={200}>
          <section className="pb-16">
            <div className="rounded-2xl border border-zinc-800/50 bg-gradient-to-br from-zinc-950/80 to-zinc-900/20 p-8 sm:p-10">
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
                {[
                  { val: 1000, suffix: "+", label: "Equities scored" },
                  { val: 9, suffix: " yrs", label: "Backtest depth" },
                  { val: 2, prefix: "$", suffix: "B+", label: "Market cap floor" },
                  { val: 25, suffix: "", label: "Portfolio holdings" },
                ].map((s, i) => (
                  <div key={s.label} className="text-center sm:text-left">
                    <div className="text-2xl sm:text-3xl font-bold tabular-nums text-zinc-100">
                      <Counter end={s.val} delay={1200 + i * 150} prefix={s.prefix ?? ""} suffix={s.suffix} />
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ── CTA ── */}
        <FadeIn delay={200}>
          <section className="pb-8">
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/60 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-100">Ready to dig in?</div>
                <p className="mt-1 text-xs text-zinc-500">
                  Screen the full universe or see what the model portfolio holds.
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href="/screener"
                  className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                >
                  Screener
                </a>
                <a href="/portfolio" className="rounded-lg border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-sm text-zinc-300 hover:border-zinc-500">
                  Portfolio
                </a>
                <a href="/about" className="rounded-lg border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-sm text-zinc-300 hover:border-zinc-500">
                  About
                </a>
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ── Footer ── */}
        <footer className="border-t border-zinc-900 pt-6 text-[11px] text-zinc-600">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span><span className="text-zinc-400">AlphaPanel</span> — Quantitative equity rankings.</span>
            <div className="flex items-center gap-3">
              <span>Not financial advice</span>
              <span className="text-zinc-800">·</span>
              <span>v2.0</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

