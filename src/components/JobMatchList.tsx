"use client";

import { useState } from "react";
import DocumentPanel from "./DocumentPanel";

type Match = {
  id: string;
  score: number;
  rationale: string;
  job: {
    title: string;
    company: string;
    location: string | null;
    url: string;
  };
};

export default function JobMatchList({ matches }: { matches: Match[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (matches.length === 0) {
    return <p className="text-sm text-gray-500">No matches yet. Run a search to see results here.</p>;
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <div key={match.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{match.job.title}</h3>
              <p className="text-sm text-gray-500">
                {match.job.company}
                {match.job.location ? ` · ${match.job.location}` : ""}
              </p>
            </div>
            <span className="text-sm font-semibold bg-gray-100 rounded-full px-3 py-1">
              {match.score}
            </span>
          </div>
          <p className="text-sm text-gray-700 mt-2">{match.rationale}</p>

          <div className="flex gap-3 items-center mt-2">
            <a
              href={match.job.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-accent underline"
            >
              View listing
            </a>
            <button
              onClick={() => setExpanded(expanded === match.id ? null : match.id)}
              className="text-sm text-gray-500 underline"
            >
              {expanded === match.id ? "Hide documents" : "Tailor documents"}
            </button>
          </div>

          {expanded === match.id && <DocumentPanel matchId={match.id} />}
        </div>
      ))}
    </div>
  );
}
