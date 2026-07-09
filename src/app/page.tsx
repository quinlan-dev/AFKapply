"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const FEATURES = [
  {
    title: "Jobs that actually fit",
    body: "Pulls listings from Remotive, Arbeitnow, The Muse, plus any Greenhouse or Lever company board you pick, then scores every one against your real resume."
  },
  {
    title: "Application pipeline",
    body: "Queue the good ones, generate a tailored cover letter and summary for each, and track everything from applied to offer with a daily cap you control."
  },
  {
    title: "Reach real people",
    body: "Find hiring managers and recruiters, get likely email addresses, and send short personal outreach from your own inbox. No spam, no scraping."
  },
  {
    title: "Free to run",
    body: "No paid APIs required. Built-in scoring and drafting work at zero cost; add a free-tier AI key later if you want sharper writing."
  }
];

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Could not create account");
        }
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error("Wrong email or password");

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-16 items-center min-h-screen">
        <div>
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-sm">
              a
            </span>
            <span className="font-semibold text-lg tracking-tight">afkapply</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-4">
            Your job search,
            <br />
            running while you&apos;re <span className="text-accent">afk</span>.
          </h1>
          <p className="text-slate-600 text-lg mb-10 max-w-md">
            Upload a resume, set what you want, and get scored matches, tailored application
            documents, and direct lines to the people hiring.
          </p>

          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-8 w-full max-w-md mx-auto lg:ml-auto">
          <h2 className="text-xl font-semibold mb-1">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {mode === "login" ? "Sign in to pick up where you left off." : "Free, no card, no catch."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="label" htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                required
                minLength={8}
                maxLength={72}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Working on it..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            className="mt-5 text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
          >
            {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
