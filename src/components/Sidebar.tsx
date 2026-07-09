"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
  { href: "/jobs", label: "Find jobs", icon: "M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" },
  {
    href: "/applications",
    label: "Applications",
    icon: "M9 5h6a2 2 0 012 2v12a2 2 0 01-2 2H9a2 2 0 01-2-2V7a2 2 0 012-2zm0 0V4a2 2 0 012-2h2a2 2 0 012 2v1M9 12h6M9 16h4"
  },
  {
    href: "/outreach",
    label: "Outreach",
    icon: "M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066 1.724 1.724 0 012.37 2.37 1.724 1.724 0 001.065 2.572 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.066 2.573 1.724 1.724 0 01-2.37 2.37 1.724 1.724 0 00-2.572 1.065 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.066 1.724 1.724 0 01-2.37-2.37 1.724 1.724 0 00-1.065-2.572 1.724 1.724 0 010-3.35 1.724 1.724 0 001.066-2.573 1.724 1.724 0 012.37-2.37c.996.574 2.25.072 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
  }
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <path d={d} />
    </svg>
  );
}

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-slate-200 bg-white px-4 py-6 sticky top-0 h-screen">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-8">
          <span className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-sm">a</span>
          <span className="font-semibold tracking-tight">afkapply</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-accent-soft text-accent" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <NavIcon d={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-2 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 truncate mb-2" title={userEmail}>
            {userEmail}
          </p>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 flex justify-around py-2">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
                active ? "text-accent" : "text-slate-500"
              }`}
            >
              <NavIcon d={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
