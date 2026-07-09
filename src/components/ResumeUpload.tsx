"use client";

import { useState } from "react";

export default function ResumeUpload({ onUploaded }: { onUploaded: (fileName: string) => void }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    setStatus("uploading");
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setStatus("done");
      onUploaded(data.fileName);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        dragOver ? "border-accent bg-accent-soft" : "border-slate-300"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
    >
      <input
        id="resume-input"
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <label htmlFor="resume-input" className="cursor-pointer">
        <p className="font-medium">Drop your resume here or click to browse</p>
        <p className="text-sm text-slate-500 mt-1">PDF, DOCX, or TXT · 5 MB max</p>
      </label>

      {status === "uploading" && <p className="text-sm text-slate-500 mt-3">Reading your resume...</p>}
      {status === "done" && <p className="text-sm text-good mt-3">Resume loaded ✓</p>}
      {status === "error" && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
