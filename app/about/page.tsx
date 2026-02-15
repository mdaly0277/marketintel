"use client";

import React, { useState, useEffect } from "react";

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-zinc-800/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 py-5 text-left transition-colors hover:text-zinc-100"
      >
        <span className="text-sm font-medium text-zinc-200">{q}</span>
        <span
          className="mt-0.5 shrink-0 text-zinc-600 text-lg leading-none transition-transform duration-200"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        >+</span>
      </button>
      {open && (
        <div className="pb-5 text-sm leading-relaxed text-zinc-400 max-w-[600px]">
          {children}
        </div>
      )}
    </div>
  );
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={`transition-all duration-700 ease-out ${className}`}
      style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(10px)" }}
    >
      {children}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 pt-14">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-[200px] left-[10%] h-[500px] w-[500px] rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)", filter: "blur(80px)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <main className="relative mx-auto max-w-[780px] px-5 pb-20 pt-12">

        {/* ── Intro ── */}
        <FadeIn delay={100}>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-5">About</div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.15] text-zinc-50 max-w-[560px]">
            Quantitative equity rankings<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              grounded in research.
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={300}>
          <div className="mt-8 space-y-4 text-[15px] leading-[1.8] text-zinc-400 max-w-[580px]">
            <p>
              AlphaPanel is a multi-factor ranking engine that scores US equities on a 0–100 scale.
              The Smart Score synthesizes signals rooted in well-documented market anomalies —
              cross-sectional momentum, trend recovery dynamics, and relative strength persistence —
              each supported by decades of academic and practitioner research.
            </p>
            <p>
              The model is adaptive. Factor weights shift based on prevailing market structure,
              giving more influence to trend-following signals in directional regimes and
              adjusting exposure during periods of elevated dispersion or mean reversion.
              The goal is a score that stays useful across market environments, not one that's
              optimized for a single regime.
            </p>
            <p>
              The universe is filtered to liquid, institutional-grade equities — the kind of stocks
              you can actually execute on without moving the market. Every signal is validated
              out-of-sample across bull markets, drawdowns, rate cycles, and sector rotations
              before it earns a place in the composite.
            </p>
          </div>
        </FadeIn>

        {/* ── Research foundation ── */}
        <FadeIn delay={400}>
          <section className="mt-16 pb-14 border-t border-zinc-800/60 pt-12">
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">Research foundation</h2>
            <p className="text-sm text-zinc-500 mb-8 max-w-[540px]">
              The Smart Score draws on factor premia that have been studied extensively
              in financial economics. The core signals include:
            </p>

            <div className="space-y-6">
              {[
                {
                  title: "Cross-sectional momentum",
                  desc: "The tendency for recent relative winners to continue outperforming over intermediate horizons. First documented by Jegadeesh and Titman (1993) and confirmed across geographies, asset classes, and time periods. One of the most robust anomalies in empirical finance.",
                },
                {
                  title: "Trend recovery dynamics",
                  desc: "Stocks that have traveled the farthest from their trailing low points exhibit stronger forward returns than those still near their lows. This signal captures structural recovery and distinguishes between stocks in active uptrends and those grinding sideways — a dimension that standard momentum misses.",
                },
                {
                  title: "Relative strength persistence",
                  desc: "The observation that leadership tends to cluster and persist over multi-month windows. Stocks that rank highly on composite strength metrics show a measurable tendency to sustain that ranking, creating a window for systematic rebalancing to capture ongoing outperformance.",
                },
                {
                  title: "Adaptive factor weighting",
                  desc: "Rather than applying static weights, the model evaluates which signals are contributing most effectively in the current environment. In strong trending markets, momentum signals receive higher emphasis. During regime transitions, the model tempers its conviction — reducing exposure to signals that historically degrade during inflection points.",
                },
              ].map((item, i) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-[11px] font-bold text-zinc-500">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-200">{item.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        {/* ── Principles ── */}
        <FadeIn delay={200}>
          <section className="pb-14 border-t border-zinc-800/60 pt-12">
            <h2 className="text-lg font-semibold text-zinc-100 mb-6">How we build</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ["Out-of-sample first", "No signal makes it into production without passing validation on data the model has never seen. If it only works in hindsight, it doesn't ship."],
                ["Regime-aware", "Markets aren't stationary. The model is tested across expansions, drawdowns, rate hikes, and rotations — and is designed to adapt rather than break."],
                ["Minimal complexity", "More parameters means more ways to overfit. We keep the factor set lean and intentional. Everything in the model has to justify its inclusion with persistent, independent edge."],
                ["Continuous research", "The current model is not the final model. We're actively evaluating additional signals, expanded universes including international equities, and alternative weighting schemes."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-xl border border-zinc-800/50 bg-zinc-950/40 p-5 hover:border-zinc-700/50 transition-colors">
                  <div className="text-sm font-semibold text-zinc-200 mb-1.5">{title}</div>
                  <p className="text-sm leading-relaxed text-zinc-500">{body}</p>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        {/* ── What it is / isn't ── */}
        <FadeIn delay={200}>
          <section className="pb-14 border-t border-zinc-800/60 pt-12">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-emerald-500/70 mb-4">What AlphaPanel is</h3>
                {[
                  "A systematic ranking engine built on documented factor premia",
                  "A screener for identifying relative strength across 1,000+ equities",
                  "A research tool with full backtest transparency including losing periods",
                  "An adaptive model that adjusts to changing market structure",
                ].map((t, i) => (
                  <div key={i} className="flex gap-2.5 mb-2.5 text-sm text-zinc-400">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500/50 shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-red-500/70 mb-4">What it is not</h3>
                {[
                  "Financial advice or a recommendation to buy or sell any security",
                  "A short-term trading signal or intraday indicator",
                  "A guarantee of future performance",
                  "A replacement for independent analysis and risk management",
                ].map((t, i) => (
                  <div key={i} className="flex gap-2.5 mb-2.5 text-sm text-zinc-400">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500/50 shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ── FAQ ── */}
        <FadeIn delay={200}>
          <section className="pb-14 border-t border-zinc-800/60 pt-12">
            <h2 className="text-lg font-semibold text-zinc-100 mb-6">FAQ</h2>
            <div>
              <FAQ q="Why can't I find a specific stock?">
                The universe is filtered to US equities above a market cap threshold with
                sufficient trading history and liquidity. If a stock isn't showing up, it
                likely falls outside these parameters. We're expanding coverage over time.
              </FAQ>
              <FAQ q="What does the backtest include?">
                Historical prices from 2017 through the present with systematic rebalancing
                at closing prices. It does not include transaction costs, slippage, taxes,
                or market impact. The model portfolio is hypothetical.
              </FAQ>
              <FAQ q="How do you prevent overfitting?">
                Three ways. Out-of-sample validation across multiple time periods. Deliberate
                simplicity — fewer parameters, fewer degrees of freedom. And regime stress testing —
                every signal has to work in bull markets, bear markets, and transitions between them.
              </FAQ>
              <FAQ q="Does the model change over time?">
                The model is designed to evolve. We continuously research new signals, weighting
                approaches, and universe expansions. But the bar for inclusion is high — new inputs
                have to demonstrate persistent, independent edge across multiple environments before
                they go live.
              </FAQ>
              <FAQ q="How does the model adapt to different market conditions?">
                The scoring system evaluates which signals are most effective in the current
                environment and adjusts factor emphasis accordingly. In strong trending markets,
                directional signals carry more weight. During volatile or transitional periods,
                the model becomes more conservative in its signal emphasis to avoid whipsaws.
              </FAQ>
              <FAQ q="Is this free?">
                Free during beta. We'll introduce paid tiers as the platform matures,
                but core screening will always have a free option.
              </FAQ>
            </div>
          </section>
        </FadeIn>

        {/* ── Closing ── */}
        <FadeIn delay={200}>
          <section className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-8 text-center">
            <p className="text-sm text-zinc-400 max-w-[440px] mx-auto">
              Built by a team that allocates real capital using this model.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <a
                href="/screener"
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
              >
                Open Screener
              </a>
              <a href="/portfolio" className="rounded-lg border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-sm text-zinc-300 hover:border-zinc-500">
                Model Portfolio
              </a>
            </div>
          </section>
        </FadeIn>

        <footer className="mt-12 border-t border-zinc-900 pt-6 text-[11px] text-zinc-600">
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