"use client";

import { useState } from "react";

export default function PreferenceForm({ onSaved }: { onSaved: () => void }) {
  const [roleTitles, setRoleTitles] = useState("");
  const [locations, setLocations] = useState("");
  const [companySlugs, setCompanySlugs] = useState("stripe, airbnb, doordash");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleTitles: splitList(roleTitles),
          locations: splitList(locations),
          companySlugs: splitList(companySlugs),
          remoteOnly
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?._errors?.[0] || "Could not save preferences");

      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Role titles you're targeting</label>
        <input
          value={roleTitles}
          onChange={(e) => setRoleTitles(e.target.value)}
          placeholder="software engineer, data analyst"
          className="w-full border rounded-md px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">Comma separated, matched against job titles</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Locations</label>
        <input
          value={locations}
          onChange={(e) => setLocations(e.target.value)}
          placeholder="New York, Austin"
          className="w-full border rounded-md px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Companies to search</label>
        <input
          value={companySlugs}
          onChange={(e) => setCompanySlugs(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Greenhouse board slugs, comma separated. Find one by checking if
          boards.greenhouse.io/companyname exists.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={remoteOnly}
          onChange={(e) => setRemoteOnly(e.target.checked)}
        />
        Remote only
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-accent text-white rounded-md px-4 py-2 font-medium disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save preferences"}
      </button>
    </div>
  );
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
