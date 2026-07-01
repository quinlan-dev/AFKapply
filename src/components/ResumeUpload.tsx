"use client";

import { useState } from "react";

export default function ResumeUpload({ onUploaded }: { onUploaded: (fileName: string) => void }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState("");

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
    } catch (err: any) {
      setStatus("error");
      setError(err.message);
    }
  }

  return (
    <div className="border-2 border-dashed rounded-lg p-6 text-center">
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
        <p className="text-sm text-gray-500 mt-1">PDF, DOCX, or TXT</p>
      </label>

      {status === "uploading" && <p className="text-sm text-gray-500 mt-3">Reading your resume...</p>}
      {status === "done" && <p className="text-sm text-green-700 mt-3">Resume loaded</p>}
      {status === "error" && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
