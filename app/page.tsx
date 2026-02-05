import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen p-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold">MarketIntel</h1>
        <p className="mt-2 text-slate-400">
          Market intelligence engine — structure over hype.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link className="rounded-xl border border-slate-800 p-4 hover:bg-slate-900" href="/module-1">
            <div className="font-medium">Module 1 — Relative Strength</div>
            <div className="text-sm text-slate-400">Rank the market objectively</div>
          </Link>

          <Link className="rounded-xl border border-slate-800 p-4 hover:bg-slate-900" href="/module-2">
            <div className="font-medium">Module 2 — ETF Exposure Map</div>
            <div className="text-sm text-slate-400">Structural ownership + overlap</div>
          </Link>

          <Link className="rounded-xl border border-slate-800 p-4 hover:bg-slate-900" href="/module-3">
            <div className="font-medium">Module 3 — Market Regime Scanner</div>
            <div className="text-sm text-slate-400">Context layer (breadth/vol/rotation)</div>
          </Link>

          <Link className="rounded-xl border border-slate-800 p-4 hover:bg-slate-900" href="/module-4">
            <div className="font-medium">Module 4 — Liquidity & Flow</div>
            <div className="text-sm text-slate-400">Mechanical pressure + activity</div>
          </Link>

          <Link className="rounded-xl border border-slate-800 p-4 hover:bg-slate-900" href="/module-5">
            <div className="font-medium">Module 5 — Portfolio Lab</div>
            <div className="text-sm text-slate-400">Simulate + stress test</div>
          </Link>
        </div>
      </div>
    </main>
  );
}
