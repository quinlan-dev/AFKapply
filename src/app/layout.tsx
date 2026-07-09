import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "afkapply — job search on autopilot",
  description:
    "Pull jobs from across the web that fit your preferences, score them against your resume, queue applications with tailored documents, and reach hiring contacts directly."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
