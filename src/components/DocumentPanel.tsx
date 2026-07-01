"use client";

import { useState, useEffect } from "react";

type DocType = "cover_letter" | "resume_summary" | "supporting_paragraph";

const TABS: { key: DocType; label: string }[] = [
  { key: "cover_letter", label: "Cover letter" },
  { key: "resume_summary", label: "Resume summary" },
  { key: "supporting_paragraph", label: "Supporting paragraph" }
];

type StoredDoc = { id: string; type: DocType; content: string };

export default function DocumentPanel({ matchId }: { matchId: string }) {
  const [activeTab, setActiveTab] = useState<DocType>("cover_letter");
  const [docs, setDocs] = useState<Record<string, StoredDoc>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    fetch(`/api/documents?matchId=${matchId}`)
      .then((res) => res.json())
      .then((data: StoredDoc[]) => {
        const map: Record<string, StoredDoc> = {};
        data.forEach((d) => (map[d.type] = d));
        setDocs(map);
        if (map[activeTab]) setDraft(map[activeTab].content);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useEffect(() => {
    setDraft(docs[activeTab]?.content ?? "");
  }, [activeTab, docs]);

  async function generate(type: DocType) {
    setLoading((prev) => ({ ...prev, [type]: true }));
    setError("");

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, type })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setDocs((prev) => ({ ...prev, [type]: data }));
      if (type === activeTab) setDraft(data.content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  }

  async function saveEdit() {
    const doc = docs[activeTab];
    if (!doc) return;

    const res = await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.id, content: draft })
    });

    if (res.ok) {
      setDocs((prev) => ({ ...prev, [activeTab]: { ...doc, content: draft } }));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    }
  }

  function download() {
    const blob = new Blob([draft], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const currentDoc = docs[activeTab];

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex gap-3 text-xs mb-3">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 py-1 rounded ${
              activeTab === tab.key ? "bg-accent text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {!currentDoc && (
        <button
          onClick={() => generate(activeTab)}
          disabled={loading[activeTab]}
          className="text-xs bg-ink text-white rounded px-3 py-1.5 disabled:opacity-50"
        >
          {loading[activeTab] ? "Writing..." : `Generate ${TABS.find((t) => t.key === activeTab)?.label}`}
        </button>
      )}

      {currentDoc && (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={activeTab === "resume_summary" ? 3 : 8}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
          <div className="flex gap-2 mt-2 items-center">
            <button onClick={saveEdit} className="text-xs bg-accent text-white rounded px-3 py-1.5">
              Save edits
            </button>
            <button
              onClick={() => generate(activeTab)}
              disabled={loading[activeTab]}
              className="text-xs bg-gray-100 rounded px-3 py-1.5 disabled:opacity-50"
            >
              {loading[activeTab] ? "Rewriting..." : "Regenerate"}
            </button>
            <button onClick={download} className="text-xs bg-gray-100 rounded px-3 py-1.5">
              Download .txt
            </button>
            {saveStatus === "saved" && <span className="text-xs text-green-700">Saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}
