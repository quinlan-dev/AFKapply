import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "afkapply",
  description: "Upload your resume, pick your target roles, let AI find and rank the best fits."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
