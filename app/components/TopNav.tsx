"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const NAV = [
  { label: "Screener", href: "/screener" },
  { label: "Model Portfolio", href: "/portfolio" },
  { label: "About", href: "/about" },
  { label: "Login", href: "/login" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-900 bg-black/70 backdrop-blur">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="h-14 flex items-center justify-between">
          {/* Brand (click = home) */}
          <Link href="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl border border-zinc-800 bg-zinc-950/70 flex items-center justify-center">
              <div
                className="h-3.5 w-3.5 rounded-sm"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(59,130,246,1), rgba(99,102,241,1))",
                }}
              />
            </div>
            <div className="text-sm font-semibold text-zinc-100">AlphaPanel</div>
          </Link>

          {/* Links */}
          <nav className="flex items-center gap-2">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm transition",
                    active
                      ? "bg-zinc-900 text-zinc-100 border border-zinc-700"
                      : "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/50"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
