"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  matchCount: number;
  savedCount: number;
  queuedCount: number;
  appliedTotal: number;
  appliedToday: number;
  sentToday: number;
  interviewing: number;
  dailyApplyCap: number;
  dailyEmailCap: number;
  hasResume: boolean;
  resumeName: string | null;
  hasPreferences: boolean;
};

export default function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const setupSteps = stats
    ? [
        { done: stats.hasResume, label: "Upload your resume", href: "/settings" },
        { done: stats.hasPreferences, label: "Set job preferences (role, location, salary)", href: "/settings" },
        { done: stats.matchCount > 0, label: "Run your first job search", href: "/jobs" }
      ]
    : [];
  const setupDone = setupSteps.every((s) => s.done);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Dashboard</h1>
      <p className="text-sm text-slate-500 mb-8">Where your search stands right now.</p>

      {stats && !setupDone && (
        <div className="card p-5 mb-8">
          <h2 className="font-semibold mb-3">Get set up</h2>
          <ol className="space-y-2">
            {setupSteps.map((step) => (
              <li key={step.label} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    step.done ? "bg-good text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {step.done ? "✓" : "•"}
                </span>
                {step.done ? (
                  <span className="text-slate-400 line-through">{step.label}</span>
                ) : (
                  <Link href={step.href} className="text-accent hover:underline underline-offset-2">
                    {step.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Job matches" value={stats?.matchCount} href="/jobs" />
        <StatCard label="In queue" value={stats?.queuedCount} href="/applications" />
        <StatCard label="Applied (total)" value={stats?.appliedTotal} href="/applications" />
        <StatCard label="Interviews + offers" value={stats?.interviewing} href="/applications" accent />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-1">Today&apos;s applications</h3>
          <Meter value={stats?.appliedToday ?? 0} cap={stats?.dailyApplyCap ?? 10} />
          <p className="hint">
            {stats ? `${stats.appliedToday} of ${stats.dailyApplyCap} daily cap used` : "Loading..."}
          </p>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-1">Today&apos;s outreach emails</h3>
          <Meter value={stats?.sentToday ?? 0} cap={stats?.dailyEmailCap ?? 10} />
          <p className="hint">
            {stats ? `${stats.sentToday} of ${stats.dailyEmailCap} daily cap used` : "Loading..."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/jobs" className="btn-primary">
          Find new jobs
        </Link>
        <Link href="/applications" className="btn-secondary">
          Work the queue
        </Link>
        <Link href="/outreach" className="btn-secondary">
          Reach out to someone
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  accent
}: {
  label: string;
  value: number | undefined;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link href={href} className="card p-5 hover:border-accent/50 transition-colors">
      <p className={`text-3xl font-bold mb-1 ${accent ? "text-good" : ""}`}>{value ?? "–"}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </Link>
  );
}

function Meter({ value, cap }: { value: number; cap: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, cap)) * 100));
  return (
    <div className="h-2 rounded-full bg-slate-100 my-2 overflow-hidden">
      <div
        className={`h-full rounded-full ${pct >= 100 ? "bg-warn" : "bg-accent"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
