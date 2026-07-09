// Sends outreach email through the user's own SMTP account (e.g. Gmail with an
// app password). Mail goes out as the user, from their address, at low volume
// with a daily cap. This is personal outreach, not bulk sending.

import nodemailer from "nodemailer";
import { decryptSecret } from "./crypto";

export type SmtpSettings = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassEnc: string;
  fromName: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

// Header injection guard: subjects and addresses must never contain CR/LF.
function stripHeaderBreaks(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

// SSRF guard: the SMTP host is user-supplied, so refuse loopback/private/link-local
// targets. Real mail providers are always public hostnames.
export function isAllowedSmtpHost(host: string): boolean {
  const h = host.toLowerCase().trim();
  if (!h || h.length > 255) return false;
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (/^\[?::1\]?$/.test(h) || h.startsWith("fe80:") || h.startsWith("fd") || h.startsWith("fc")) return false;
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127 || a === 10 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) {
      return false;
    }
  }
  return /^[a-z0-9.-]+$/.test(h) || ipv4 !== null;
}

export async function sendOutreachEmail(
  smtp: SmtpSettings,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  if (!isValidEmail(to)) throw new Error("Recipient address is not a valid email");
  if (!isAllowedSmtpHost(smtp.smtpHost)) throw new Error("SMTP host is not allowed");

  const transport = nodemailer.createTransport({
    host: smtp.smtpHost,
    port: smtp.smtpPort,
    secure: smtp.smtpPort === 465,
    auth: {
      user: smtp.smtpUser,
      pass: decryptSecret(smtp.smtpPassEnc)
    }
  });

  await transport.sendMail({
    from: smtp.fromName
      ? { name: stripHeaderBreaks(smtp.fromName), address: smtp.smtpUser }
      : smtp.smtpUser,
    to,
    subject: stripHeaderBreaks(subject).slice(0, 200),
    text: body.slice(0, 10_000)
  });
}
