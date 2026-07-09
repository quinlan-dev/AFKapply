"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DocumentPanel from "./DocumentPanel";

type Match = {
  id: string;
  score: number;
  rationale: string;
  status: string;
  application: { id: string; status: string } | null;
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    url: string;
    source: string;
    salaryMin: number | null;
    salaryMax: number | null;
    jobType: string | null;
    description: string;
    postedAt: string | null;
  };
};

function salaryLabel(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt(min ?? max ?? 0);
}

function scoreColor(score: number): string {
  if (score >= 75) return "bg-emerald-100 text-emerald-800";
  if (score >= 50) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export default function JobsClient() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [docsFor, setDocsFor] = useState<string | null>(null);
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    fetch("/api/jobs/search")
      .then((r) => r.json())
      .then((data) => setMatches(data.matches ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function runSearch() {
    setSearching(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/jobs/search", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setMatches(data.matches ?? []);
      setNotice(
        `Pulled ${data.totalFetched} listings, scored ${data.newlyScored} new ones against your resume.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function setMatchStatus(matchId: string, status: string) {
    setMatches((prev) =>
      status === "dismissed"
        ? prev.filter((m) => m.id !== matchId)
        : prev.map((m) => (m.id === matchId ? { ...m, status } : m))
    );
    await fetch("/api/matches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, status })
    });
  }

  async function queueApplication(match: Match) {
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id })
    });
    if (res.ok) {
      const app = await res.json();
      setMatches((prev) =>
        prev.map((m) => (m.id === match.id ? { ...m, application: { id: app.id, status: app.status } } : m))
      );
    }
  }

  const visible = matches.filter((m) => m.score >= minScore);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Find jobs</h1>
          <p className="text-sm text-slate-500">
            Searches free job APIs using the preferences in{" "}
            <Link href="/settings" className="text-accent hover:underline">
              Settings
            </Link>
            , then scores each listing against your resume.
          </p>
        </div>
        <button onClick={runSearch} disabled={searching} className="btn-primary">
          {searching ? "Searching & scoring..." : "Search now"}
        </button>
      </div>

      <div className="flex items-center gap-3 mt-6 mb-4">
        <label className="text-sm text-slate-600">Minimum score</label>
        <select
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="input w-auto py-1.5"
        >
          <option value={0}>Any</option>
          <option value={50}>50+</option>
          <option value={65}>65+</option>
          <option value={80}>80+</option>
        </select>
        <span className="text-sm text-slate-400">
          {loaded ? `${visible.length} match${visible.length === 1 ? "" : "es"}` : ""}
        </span>
      </div>

      {notice && <p className="text-sm text-good mb-4">{notice}</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {searching && (
        <div className="card p-4 mb-4 text-sm text-slate-500">
          Pulling from Remotive, Arbeitnow, The Muse and your company boards, then scoring. This can
          take up to a minute.
        </div>
      )}

      {loaded && visible.length === 0 && !searching && (
        <div className="card p-10 text-center">
          <p className="font-medium mb-1">No matches yet</p>
          <p className="text-sm text-slate-500 mb-4">
            Make sure your resume and preferences are set, then run a search.
          </p>
          <button onClick={runSearch} className="btn-primary">
            Search now
          </button>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((match) => {
          const salary = salaryLabel(match.job.salaryMin, match.job.salaryMax);
          const isExpanded = expanded === match.id;
          return (
            <div key={match.id} className="card p-5">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold leading-snug">{match.job.title}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {match.job.company}
                    {match.job.location ? ` · ${match.job.location}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {salary && <span className="chip bg-emerald-50 text-emerald-700">{salary}</span>}
                    {match.job.jobType && (
                      <span className="chip bg-slate-100 text-slate-600">
                        {match.job.jobType.replace(/_/g, " ")}
                      </span>
                    )}
                    <span className="chip bg-slate-100 text-slate-500">via {match.job.source}</span>
                    {match.status === "saved" && (
                      <span className="chip bg-accent-soft text-accent">saved</span>
                    )}
                    {match.application && (
                      <span className="chip bg-indigo-100 text-indigo-700">
                        {match.application.status === "queued" ? "in queue" : match.application.status}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 text-sm font-bold rounded-full px-3 py-1 ${scoreColor(match.score)}`}
                  title="Fit score against your resume"
                >
                  {match.score}
                </span>
              </div>

              <p className="text-sm text-slate-600 mt-3 leading-relaxed">{match.rationale}</p>

              <div className="flex flex-wrap gap-2 mt-4">
                {!match.application ? (
                  <button onClick={() => queueApplication(match)} className="btn-primary !py-1.5">
                    Queue application
                  </button>
                ) : (
                  <Link href="/applications" className="btn-secondary !py-1.5">
                    View in pipeline
                  </Link>
                )}
                <a href={match.job.url} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5">
                  Open listing ↗
                </a>
                <button
                  onClick={() => setDocsFor(docsFor === match.id ? null : match.id)}
                  className="btn-ghost !py-1.5"
                >
                  {docsFor === match.id ? "Hide documents" : "Tailor documents"}
                </button>
                <button
                  onClick={() => setExpanded(isExpanded ? null : match.id)}
                  className="btn-ghost !py-1.5"
                >
                  {isExpanded ? "Hide overview" : "Job overview"}
                </button>
                {match.status !== "saved" && (
                  <button onClick={() => setMatchStatus(match.id, "saved")} className="btn-ghost !py-1.5">
                    Save
                  </button>
                )}
                <button
                  onClick={() => setMatchStatus(match.id, "dismissed")}
                  className="btn-ghost !py-1.5 text-slate-400"
                >
                  Dismiss
                </button>
              </div>

              {isExpanded && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {match.job.description.slice(0, 3000)}
                    {match.job.description.length > 3000 ? "…" : ""}
                  </p>
                </div>
              )}

              {docsFor === match.id && <DocumentPanel matchId={match.id} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
