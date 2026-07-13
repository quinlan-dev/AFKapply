"use client";

import { useEffect, useState } from "react";
import ResumeUpload from "./ResumeUpload";
import { TagInput, AutocompleteInput } from "./TagInput";
import {
  ROLE_SUGGESTIONS,
  SKILL_SUGGESTIONS,
  LOCATION_SUGGESTIONS,
  GREENHOUSE_BOARD_SUGGESTIONS,
  LEVER_BOARD_SUGGESTIONS
} from "@/lib/suggestions";

type Settings = {
  email: string;
  name: string | null;
  fromName: string | null;
  dailyApplyCap: number;
  dailyEmailCap: number;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpConfigured: boolean;
  resume: { fileName: string; createdAt: string } | null;
  aiEnabled: boolean;
  adzunaEnabled: boolean;
};

type Preference = {
  roleTitles: string[];
  keywords: string[];
  locations: string[];
  searchLocation: string | null;
  maxDistanceMiles: number | null;
  remoteOnly: boolean;
  minSalary: number | null;
  salaryPeriod: string;
  jobTypes: string[];
  companySlugs: string[];
  leverSlugs: string[];
} | null;

const HOURS_PER_WORK_YEAR = 2080;
const SALARY_SLIDER = {
  yearly: { max: 300_000, step: 5_000 },
  hourly: { max: 150, step: 1 }
} as const;

const JOB_TYPE_OPTIONS = [
  { key: "full_time", label: "Full-time" },
  { key: "part_time", label: "Part-time" },
  { key: "contract", label: "Contract" },
  { key: "internship", label: "Internship" }
];

export default function SettingsClient() {
  const [settings, setSettings] = useState<Settings | null>(null);

  // preferences form state
  const [roleTitles, setRoleTitles] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [searchLocation, setSearchLocation] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minSalary, setMinSalary] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState<"yearly" | "hourly">("yearly");
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [companySlugs, setCompanySlugs] = useState<string[]>([]);
  const [leverSlugs, setLeverSlugs] = useState<string[]>([]);
  const [prefStatus, setPrefStatus] = useState("");

  // email/profile form state
  const [fromName, setFromName] = useState("");
  const [dailyApplyCap, setDailyApplyCap] = useState(10);
  const [dailyEmailCap, setDailyEmailCap] = useState(10);
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [emailStatus, setEmailStatus] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        setSettings(data);
        setFromName(data.fromName ?? data.name ?? "");
        setDailyApplyCap(data.dailyApplyCap);
        setDailyEmailCap(data.dailyEmailCap);
        if (data.smtpHost) setSmtpHost(data.smtpHost);
        if (data.smtpPort) setSmtpPort(data.smtpPort);
        if (data.smtpUser) setSmtpUser(data.smtpUser);
      })
      .catch(() => {});

    fetch("/api/preferences")
      .then((r) => r.json())
      .then((pref: Preference) => {
        if (!pref) return;
        setRoleTitles(pref.roleTitles);
        setKeywords(pref.keywords);
        setLocations(pref.locations);
        setSearchLocation(pref.searchLocation ?? "");
        setMaxDistance(pref.maxDistanceMiles ? String(pref.maxDistanceMiles) : "");
        setRemoteOnly(pref.remoteOnly);
        setMinSalary(pref.minSalary ? String(pref.minSalary) : "");
        setSalaryPeriod(pref.salaryPeriod === "hourly" ? "hourly" : "yearly");
        setJobTypes(pref.jobTypes);
        setCompanySlugs(pref.companySlugs);
        setLeverSlugs(pref.leverSlugs);
      })
      .catch(() => {});
  }, []);

  // Converts the entered amount when flipping between yearly and hourly so
  // the minimum keeps meaning the same thing.
  function switchSalaryPeriod(next: "yearly" | "hourly") {
    if (next === salaryPeriod) return;
    setSalaryPeriod(next);
    const n = Number(minSalary);
    if (minSalary && Number.isFinite(n) && n > 0) {
      setMinSalary(
        next === "hourly"
          ? String(Math.round(n / HOURS_PER_WORK_YEAR))
          : String(Math.round(n * HOURS_PER_WORK_YEAR))
      );
    }
  }

  async function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    setPrefStatus("");
    if (roleTitles.length === 0) {
      setPrefStatus("Add at least one role title");
      return;
    }
    const res = await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleTitles,
        keywords,
        locations,
        searchLocation: searchLocation.trim() || null,
        maxDistanceMiles: maxDistance ? Math.round(Number(maxDistance)) : null,
        remoteOnly,
        minSalary: minSalary ? Math.round(Number(minSalary)) : null,
        salaryPeriod,
        jobTypes,
        companySlugs,
        leverSlugs
      })
    });
    const data = await res.json();
    setPrefStatus(res.ok ? "Saved ✓" : data.error || "Could not save");
    if (res.ok) setTimeout(() => setPrefStatus(""), 2000);
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailStatus("");
    const payload: Record<string, unknown> = {
      fromName: fromName.trim() || undefined,
      dailyApplyCap,
      dailyEmailCap,
      smtpHost: smtpHost.trim() || undefined,
      smtpPort,
      smtpUser: smtpUser.trim() || undefined
    };
    if (smtpPass) payload.smtpPass = smtpPass;

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    setEmailStatus(res.ok ? "Saved ✓" : data.error || "Could not save");
    if (res.ok) {
      setSmtpPass("");
      setTimeout(() => setEmailStatus(""), 2000);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-slate-500 mb-8">Resume, preferences, and sending setup.</p>

      {/* Resume */}
      <section className="card p-6 mb-6">
        <h2 className="font-semibold mb-1">Resume</h2>
        <p className="text-sm text-slate-500 mb-4">
          {settings?.resume
            ? `Current: ${settings.resume.fileName} (uploaded ${new Date(settings.resume.createdAt).toLocaleDateString()})`
            : "Everything is scored against this, upload it first."}
        </p>
        <ResumeUpload
          onUploaded={(fileName) =>
            setSettings((s) => (s ? { ...s, resume: { fileName, createdAt: new Date().toISOString() } } : s))
          }
        />
      </section>

      {/* Preferences */}
      <section className="card p-6 mb-6">
        <h2 className="font-semibold mb-4">Job preferences</h2>
        <form onSubmit={savePreferences} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Role titles you&apos;re targeting *</label>
            <TagInput
              value={roleTitles}
              onChange={setRoleTitles}
              suggestions={ROLE_SUGGESTIONS}
              max={10}
              ariaLabel="Role titles you're targeting"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Skill keywords</label>
            <TagInput
              value={keywords}
              onChange={setKeywords}
              suggestions={SKILL_SUGGESTIONS}
              max={20}
              ariaLabel="Skill keywords"
            />
            <p className="hint">Boosts matching and scoring</p>
          </div>
          <div>
            <label className="label">Preferred locations</label>
            <TagInput
              value={locations}
              onChange={setLocations}
              suggestions={LOCATION_SUGGESTIONS}
              max={10}
              ariaLabel="Preferred locations"
            />
            <p className="hint">Remote jobs always pass this filter</p>
          </div>
          <div>
            <label className="label">Minimum salary</label>
            <div className="flex items-center gap-2 mb-2">
              {(["yearly", "hourly"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => switchSalaryPeriod(p)}
                  className={`chip !px-3 !py-1.5 transition-colors ${
                    salaryPeriod === p
                      ? "bg-accent text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p === "yearly" ? "Salary (yearly)" : "Hourly"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={SALARY_SLIDER[salaryPeriod].max}
                step={SALARY_SLIDER[salaryPeriod].step}
                value={minSalary ? Math.min(Number(minSalary), SALARY_SLIDER[salaryPeriod].max) : 0}
                onChange={(e) => setMinSalary(e.target.value === "0" ? "" : e.target.value)}
                className="flex-1 accent-accent"
                aria-label="Minimum salary slider"
              />
              <input
                type="number"
                min={0}
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                className="input !w-28"
                aria-label="Minimum salary"
              />
            </div>
            <p className="hint">
              {salaryPeriod === "hourly" ? "Per hour — " : "Per year — "}
              filters out jobs that list a lower max; leave at 0 for no minimum
            </p>
          </div>
          <div>
            <label className="label">Home location (for radius search)</label>
            <AutocompleteInput
              value={searchLocation}
              onChange={setSearchLocation}
              suggestions={LOCATION_SUGGESTIONS}
              ariaLabel="Home location"
            />
          </div>
          <div>
            <label className="label">Max distance (miles)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={maxDistance ? Math.min(Number(maxDistance), 100) : 0}
                onChange={(e) => setMaxDistance(e.target.value === "0" ? "" : e.target.value)}
                className="flex-1 accent-accent"
                aria-label="Max distance slider"
              />
              <input
                type="number"
                min={1}
                max={500}
                value={maxDistance}
                onChange={(e) => setMaxDistance(e.target.value)}
                className="input !w-24"
                aria-label="Max distance in miles"
              />
            </div>
            <p className="hint">
              {settings?.adzunaEnabled
                ? "Radius search is active via Adzuna"
                : "Needs a free Adzuna API key (see README) — otherwise location matching is by name"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Job types</label>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPE_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() =>
                    setJobTypes((prev) =>
                      prev.includes(t.key) ? prev.filter((x) => x !== t.key) : [...prev, t.key]
                    )
                  }
                  className={`chip !px-3 !py-1.5 transition-colors ${
                    jobTypes.includes(t.key)
                      ? "bg-accent text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="hint">None selected = any type</p>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} />
            Remote only
          </label>
          <div>
            <label className="label">Greenhouse company boards</label>
            <TagInput
              value={companySlugs}
              onChange={setCompanySlugs}
              suggestions={GREENHOUSE_BOARD_SUGGESTIONS}
              showAllOnFocus
              max={10}
              ariaLabel="Greenhouse company boards"
            />
            <p className="hint">Slug works if boards.greenhouse.io/&lt;slug&gt; loads</p>
          </div>
          <div>
            <label className="label">Lever company boards</label>
            <TagInput
              value={leverSlugs}
              onChange={setLeverSlugs}
              suggestions={LEVER_BOARD_SUGGESTIONS}
              showAllOnFocus
              max={10}
              ariaLabel="Lever company boards"
            />
            <p className="hint">Slug works if jobs.lever.co/&lt;slug&gt; loads</p>
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" className="btn-primary">
              Save preferences
            </button>
            {prefStatus && <span className={`text-sm ${prefStatus.includes("✓") ? "text-good" : "text-red-600"}`}>{prefStatus}</span>}
          </div>
        </form>
      </section>

      {/* Sending email + caps */}
      <section className="card p-6 mb-6">
        <h2 className="font-semibold mb-1">Outreach sending &amp; daily caps</h2>
        <p className="text-sm text-slate-500 mb-4">
          Outreach goes from your own email account. For Gmail: turn on 2-step verification, create
          an{" "}
          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-accent underline">
            app password
          </a>
          , and use it below with smtp.gmail.com port 587. The password is encrypted at rest and never
          shown again.
        </p>
        <form onSubmit={saveEmail} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Your name on emails</label>
            <input value={fromName} onChange={(e) => setFromName(e.target.value)} maxLength={100} className="input" placeholder="Jane Smith" />
          </div>
          <div>
            <label className="label">Email address (SMTP user)</label>
            <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} maxLength={254} className="input" placeholder="you@gmail.com" />
          </div>
          <div>
            <label className="label">SMTP host</label>
            <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} maxLength={255} className="input" />
          </div>
          <div>
            <label className="label">SMTP port</label>
            <input type="number" min={1} max={65535} value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">
              App password {settings?.smtpConfigured && <span className="text-good font-normal">(configured ✓ — leave blank to keep)</span>}
            </label>
            <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} maxLength={200} className="input" placeholder={settings?.smtpConfigured ? "••••••••" : "16-character app password"} autoComplete="new-password" />
          </div>
          <div>
            <label className="label">Daily application cap</label>
            <input type="number" min={1} max={50} value={dailyApplyCap} onChange={(e) => setDailyApplyCap(Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="label">Daily outreach email cap</label>
            <input type="number" min={1} max={25} value={dailyEmailCap} onChange={(e) => setDailyEmailCap(Number(e.target.value))} className="input" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" className="btn-primary">
              Save
            </button>
            {emailStatus && <span className={`text-sm ${emailStatus.includes("✓") ? "text-good" : "text-red-600"}`}>{emailStatus}</span>}
          </div>
        </form>
      </section>

      {/* Status */}
      <section className="card p-6">
        <h2 className="font-semibold mb-3">Optional upgrades (both free)</h2>
        <ul className="text-sm text-slate-600 space-y-2">
          <li>
            <span className={settings?.aiEnabled ? "text-good" : "text-slate-400"}>●</span>{" "}
            <strong>AI writing &amp; scoring</strong> — {settings?.aiEnabled ? "active" : "not set"}.
            Without it, built-in scoring and smart templates are used. To enable, set{" "}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">ANTHROPIC_API_KEY</code> in your
            deployment environment.
          </li>
          <li>
            <span className={settings?.adzunaEnabled ? "text-good" : "text-slate-400"}>●</span>{" "}
            <strong>Radius &amp; salary search</strong> — {settings?.adzunaEnabled ? "active" : "not set"}.
            Free key at developer.adzuna.com, then set{" "}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">ADZUNA_APP_ID</code> and{" "}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">ADZUNA_APP_KEY</code>.
          </li>
        </ul>
      </section>
    </div>
  );
}
