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
            A systematic approach to<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              ranking the equity market.
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={300}>
          <div className="mt-8 space-y-4 text-[15px] leading-[1.8] text-zinc-400 max-w-[580px]">
            <p>
              AlphaPanel scores every liquid U.S. equity on a 0–100 scale using a three-factor
              quantitative model. The score reflects how strongly a stock aligns with the specific
              momentum and trend characteristics that have historically preceded outperformance.
            </p>
            <p>
              The model is intentionally simple. Three factors, fixed weights, no machine learning,
              no black box. Every scoring decision can be traced back to observable price data.
              The goal isn't to predict the future — it's to systematically identify the stocks
              with the strongest factor alignment right now and let the base rates do the work.
            </p>
            <p>
              The universe covers 1,000+ equities above a $2B market cap floor with institutional-grade
              liquidity. Stocks that fail quality gates for trading volume or price integrity are
              excluded before scoring — if you see it on the screener, it passed.
            </p>
          </div>
        </FadeIn>

        {/* ── The Three Factors ── */}
        <FadeIn delay={400}>
          <section className="mt-16 pb-14 border-t border-zinc-800/60 pt-12">
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">The three factors</h2>
            <p className="text-sm text-zinc-500 mb-8 max-w-[540px]">
              Each stock's composite score is a weighted blend of three signals, each
              rooted in well-documented market anomalies from academic research.
            </p>

            <div className="space-y-6">
              {[
                {
                  title: "Distance from 52-week low",
                  desc: "How far a stock has traveled from its trailing 52-week low. Stocks near new highs score higher than those still close to their lows. This captures trend strength and distinguishes between stocks in active uptrends versus those grinding sideways or recovering. It's the model's largest factor because it's the most persistent signal in the backtest.",
                },
                {
                  title: "12-month momentum (skip recent month)",
                  desc: "The classic cross-sectional momentum factor: trailing 12-month return excluding the most recent month. First documented by Jegadeesh and Titman (1993) and confirmed across geographies, asset classes, and decades. The one-month skip avoids short-term reversal noise. Returns are capped at 200% to prevent a single outlier from dominating the score.",
                },
                {
                  title: "Drawdown depth",
                  desc: "How far a stock has pulled back from its 6-month high. Counterintuitively, among stocks with strong momentum and trend, those that have experienced a recent dip tend to bounce harder. This factor adds a mean-reversion element that complements the two trend-following signals — it favors stocks that are strong but temporarily on sale.",
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

            <div className="mt-8 rounded-lg border border-zinc-800/40 bg-zinc-950/60 p-4 text-sm text-zinc-500">
              The three factor scores are percentile-ranked across the universe, weighted, and blended
              into a raw composite. A stock scoring 90+ has top-decile alignment across all three factors
              simultaneously — that's what makes Leadership tier genuinely selective.
            </div>
          </section>
        </FadeIn>

        {/* ── Principles ── */}
        <FadeIn delay={200}>
          <section className="pb-14 border-t border-zinc-800/60 pt-12">
            <h2 className="text-lg font-semibold text-zinc-100 mb-6">Design principles</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ["Simplicity over complexity", "Three factors, fixed weights. More parameters means more ways to overfit. Everything in the model has to justify its inclusion with persistent, independent edge across multiple market environments."],
                ["Transparency over mystique", "The scoring methodology is fully documented on this page. There's no proprietary black box. You can see exactly what drives every score and decide for yourself whether you trust the signals."],
                ["Honest backtests", "The backtest includes losing periods. It does not include transaction costs, slippage, or taxes. The model portfolio is hypothetical — it shows what the strategy would have done, not what anyone actually earned."],
                ["Continuous research", "The current model is not the final model. We're actively evaluating additional factors, expanded universes, and alternative weighting schemes. But the bar for inclusion is high — new signals have to demonstrate persistent edge before they go live."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-xl border border-zinc-800/50 bg-zinc-950/40 p-5 hover:border-zinc-700/50 transition-colors">
                  <div className="text-sm font-semibold text-zinc-200 mb-1.5">{title}</div>
                  <p className="text-sm leading-relaxed text-zinc-500">{body}</p>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        {/* ── Known limitations ── */}
        <FadeIn delay={200}>
          <section className="pb-14 border-t border-zinc-800/60 pt-12">
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">Known limitations</h2>
            <p className="text-sm text-zinc-500 mb-6 max-w-[540px]">
              No model is perfect. Here's what you should know about the limitations
              of this one — because the things a model can't do matter as much as the things it can.
            </p>

            <div className="space-y-3">
              {[
                {
                  title: "Survivorship bias",
                  desc: "The universe is based on today's index constituents projected backward. Stocks that were delisted, acquired, or went bankrupt aren't in the backtest. This likely overstates historical returns somewhat.",
                },
                {
                  title: "No transaction costs",
                  desc: "The backtest assumes frictionless execution at closing prices. Real-world trading involves commissions, bid-ask spreads, slippage, and market impact — especially for smaller positions.",
                },
                {
                  title: "Momentum crashes",
                  desc: "Momentum strategies can experience sharp drawdowns during market reversals. The 2009 recovery and 2020 COVID snap-back both caused rapid factor rotation. The model doesn't hedge against these events.",
                },
                {
                  title: "Fixed factor weights",
                  desc: "The 45/35/20 weighting doesn't change with market conditions. In environments where momentum underperforms (like sharp V-shaped recoveries), the model will underperform too.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-lg border border-zinc-800/40 bg-zinc-950/40 p-4">
                  <div className="text-sm font-semibold text-zinc-200 mb-1">{item.title}</div>
                  <p className="text-sm leading-relaxed text-zinc-500">{item.desc}</p>
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
                  "A systematic ranking engine built on three documented factor premia",
                  "A screener for identifying relative strength across 1,000+ equities",
                  "A research tool with full backtest transparency including losing periods",
                  "A simple model you can understand and verify",
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
                  "A short-term trading signal or day-trading tool",
                  "A guarantee of future performance — past results are hypothetical",
                  "A replacement for your own research and risk management",
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
                The universe is filtered to U.S. equities above a $2B market cap with sufficient
                trading volume and price history. Stocks that fail liquidity or data integrity
                checks are excluded. If a stock isn't showing up, it didn't pass these quality gates.
              </FAQ>
              <FAQ q="What does the score actually mean?">
                A score of 85 means that stock has stronger factor alignment — momentum, trend
                position, and recovery dynamics — than roughly 85% of the scored universe. It doesn't
                mean the stock will go up. It means the stock matches the profile that has historically
                preceded above-average returns.
              </FAQ>
              <FAQ q="What's included in the backtest?">
                Historical prices with systematic rebalancing at closing prices. It does not include
                transaction costs, slippage, taxes, or market impact. The current universe is
                projected backward, which introduces survivorship bias. The model portfolio
                is entirely hypothetical.
              </FAQ>
              <FAQ q="How do you prevent overfitting?">
                Deliberate simplicity. Three factors with fixed weights. No machine learning,
                no parameter sweeps, no curve-fitting to historical data. The model either works
                because the underlying factor premia are real, or it doesn't.
              </FAQ>
              <FAQ q="Why are the factor weights fixed?">
                Adaptive weights sound sophisticated but they introduce a new optimization problem —
                now you're overfitting the weighting function instead of the factors themselves.
                Fixed weights are more robust and easier to reason about. The current split reflects
                which factors showed the most consistent forward return separation in the backtest.
              </FAQ>
              <FAQ q="Is this free?">
                Free during the current phase. We'll likely introduce paid tiers as the platform
                matures, but core screening functionality will always have a free option.
              </FAQ>
            </div>
          </section>
        </FadeIn>

        {/* ── Closing ── */}
        <FadeIn delay={200}>
          <section className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-8 text-center">
            <p className="text-sm text-zinc-400 max-w-[440px] mx-auto">
              Built by an independent researcher. No institutional backing,
              no conflicts of interest — just a model and the data.
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
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}