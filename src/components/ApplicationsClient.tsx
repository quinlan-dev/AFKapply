"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DocumentPanel from "./DocumentPanel";

type Application = {
  id: string;
  status: string;
  notes: string | null;
  appliedAt: string | null;
  match: {
    id: string;
    score: number;
    job: {
      title: string;
      company: string;
      location: string | null;
      url: string;
    };
  };
};

const STATUSES = [
  { key: "queued", label: "Queued", chip: "bg-slate-100 text-slate-600" },
  { key: "ready", label: "Ready to send", chip: "bg-accent-soft text-accent" },
  { key: "applied", label: "Applied", chip: "bg-indigo-100 text-indigo-700" },
  { key: "interviewing", label: "Interviewing", chip: "bg-amber-100 text-amber-800" },
  { key: "offer", label: "Offer", chip: "bg-emerald-100 text-emerald-800" },
  { key: "rejected", label: "Rejected", chip: "bg-slate-100 text-slate-400" },
  { key: "withdrawn", label: "Withdrawn", chip: "bg-slate-100 text-slate-400" }
] as const;

function chipFor(status: string) {
  return STATUSES.find((s) => s.key === status)?.chip ?? "bg-slate-100 text-slate-600";
}

export default function ApplicationsClient() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [docsFor, setDocsFor] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [filter, setFilter] = useState<string>("active");

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((data) => setApps(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function update(id: string, patch: { status?: string; notes?: string }) {
    setError("");
    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Update failed");
      return;
    }
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  }

  const visible = apps.filter((a) => {
    if (filter === "all") return true;
    if (filter === "active") return !["rejected", "withdrawn"].includes(a.status);
    return a.status === filter;
  });

  const counts: Record<string, number> = {};
  for (const a of apps) counts[a.status] = (counts[a.status] ?? 0) + 1;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Applications</h1>
      <p className="text-sm text-slate-500 mb-6">
        Your pipeline. Generate documents for each queued job, apply on the company&apos;s page, then
        mark it applied. Daily cap keeps volume sane.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <FilterChip label={`Active (${apps.filter((a) => !["rejected", "withdrawn"].includes(a.status)).length})`} active={filter === "active"} onClick={() => setFilter("active")} />
        {STATUSES.map((s) => (
          <FilterChip
            key={s.key}
            label={`${s.label} (${counts[s.key] ?? 0})`}
            active={filter === s.key}
            onClick={() => setFilter(s.key)}
          />
        ))}
        <FilterChip label={`All (${apps.length})`} active={filter === "all"} onClick={() => setFilter("all")} />
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loaded && visible.length === 0 && (
        <div className="card p-10 text-center">
          <p className="font-medium mb-1">Nothing here yet</p>
          <p className="text-sm text-slate-500 mb-4">
            Queue applications from your job matches to start the pipeline.
          </p>
          <Link href="/jobs" className="btn-primary">
            Find jobs
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((app) => (
          <div key={app.id} className="card p-5">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div className="min-w-0">
                <h3 className="font-semibold leading-snug">{app.match.job.title}</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {app.match.job.company}
                  {app.match.job.location ? ` · ${app.match.job.location}` : ""}
                  {app.appliedAt ? ` · applied ${new Date(app.appliedAt).toLocaleDateString()}` : ""}
                </p>
              </div>
              <select
                value={app.status}
                onChange={(e) => update(app.id, { status: e.target.value })}
                className={`text-xs font-medium rounded-full px-3 py-1.5 border-0 cursor-pointer ${chipFor(app.status)}`}
              >
                {STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <a href={app.match.job.url} target="_blank" rel="noreferrer" className="btn-primary !py-1.5">
                Open listing & apply ↗
              </a>
              <button
                onClick={() => setDocsFor(docsFor === app.id ? null : app.id)}
                className="btn-secondary !py-1.5"
              >
                {docsFor === app.id ? "Hide documents" : "Application documents"}
              </button>
              <button
                onClick={() => {
                  setNotesFor(notesFor === app.id ? null : app.id);
                  setNoteDraft(app.notes ?? "");
                }}
                className="btn-ghost !py-1.5"
              >
                Notes
              </button>
              {app.status !== "applied" && (
                <button onClick={() => update(app.id, { status: "applied" })} className="btn-ghost !py-1.5 text-good">
                  Mark applied ✓
                </button>
              )}
            </div>

            {notesFor === app.id && (
              <div className="mt-4">
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={3}
                  placeholder="Interview dates, contacts, follow-ups..."
                  className="input"
                />
                <button
                  onClick={() => {
                    update(app.id, { notes: noteDraft });
                    setNotesFor(null);
                  }}
                  className="btn-secondary !py-1.5 mt-2"
                >
                  Save notes
                </button>
              </div>
            )}

            {docsFor === app.id && <DocumentPanel matchId={app.match.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`chip !px-3 !py-1.5 transition-colors ${
        active ? "bg-ink text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
