"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import ResumeUpload from "./ResumeUpload";
import PreferenceForm from "./PreferenceForm";
import JobMatchList from "./JobMatchList";

type Step = "resume" | "preferences" | "results";

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const [step, setStep] = useState<Step>("resume");
  const [resumeName, setResumeName] = useState("");
  const [matches, setMatches] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  async function runSearch() {
    setSearching(true);
    setSearchError("");
    setStep("results");

    try {
      const res = await fetch("/api/jobs/match", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setMatches(data);
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">afkapply</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{userEmail}</span>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="underline">
            Sign out
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-8 text-sm">
        <StepTab label="1. Resume" active={step === "resume"} onClick={() => setStep("resume")} />
        <StepTab
          label="2. Preferences"
          active={step === "preferences"}
          onClick={() => setStep("preferences")}
        />
        <StepTab label="3. Matches" active={step === "results"} onClick={() => setStep("results")} />
      </div>

      {step === "resume" && (
        <div className="space-y-4">
          <ResumeUpload
            onUploaded={(fileName) => {
              setResumeName(fileName);
              setStep("preferences");
            }}
          />
          {resumeName && <p className="text-sm text-gray-500">Current resume: {resumeName}</p>}
        </div>
      )}

      {step === "preferences" && <PreferenceForm onSaved={runSearch} />}

      {step === "results" && (
        <div>
          {searching && <p className="text-sm text-gray-500 mb-4">Scoring jobs against your resume...</p>}
          {searchError && <p className="text-sm text-red-600 mb-4">{searchError}</p>}
          {!searching && (
            <button onClick={runSearch} className="text-sm underline mb-4 block">
              Run search again
            </button>
          )}
          <JobMatchList matches={matches} />
        </div>
      )}
    </main>
  );
}

function StepTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`pb-2 border-b-2 ${
        active ? "border-accent text-accent font-medium" : "border-transparent text-gray-400"
      }`}
    >
      {label}
    </button>
  );
}
