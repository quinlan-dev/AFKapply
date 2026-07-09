import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { sendOutreachEmail, isValidEmail } from "@/lib/mailer";

const schema = z.object({ id: z.string().min(1).max(64) });

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!rateLimit(`send:${userId}`, 5, 60 * 1000)) {
    return NextResponse.json({ error: "Slow down, sending too fast" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const [email, user] = await Promise.all([
    prisma.outreachEmail.findFirst({
      where: { id: parsed.data.id, userId },
      include: { contact: true }
    }),
    prisma.user.findUnique({ where: { id: userId } })
  ]);

  if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (email.status === "sent") return NextResponse.json({ error: "Already sent" }, { status: 400 });
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!user.smtpHost || !user.smtpPort || !user.smtpUser || !user.smtpPassEnc) {
    return NextResponse.json(
      { error: "Set up your sending email in Settings first (e.g. Gmail app password)" },
      { status: 400 }
    );
  }

  const to = email.toEmail || email.contact.email;
  if (!to || !isValidEmail(to)) {
    return NextResponse.json(
      { error: "Confirm the contact's email address first. Guessed addresses must be confirmed by you before sending." },
      { status: 400 }
    );
  }

  // Daily outreach cap: personal outreach volume, not bulk mail.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const sentToday = await prisma.outreachEmail.count({
    where: { userId, sentAt: { gte: startOfDay } }
  });
  if (sentToday >= user.dailyEmailCap) {
    return NextResponse.json(
      { error: `Daily outreach cap reached (${user.dailyEmailCap}). Raise it in Settings or continue tomorrow.` },
      { status: 429 }
    );
  }

  try {
    await sendOutreachEmail(
      {
        smtpHost: user.smtpHost,
        smtpPort: user.smtpPort,
        smtpUser: user.smtpUser,
        smtpPassEnc: user.smtpPassEnc,
        fromName: user.fromName
      },
      to,
      email.subject,
      email.body
    );
  } catch (err) {
    await prisma.outreachEmail.update({
      where: { id: email.id },
      data: { status: "failed" }
    });
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: `Send failed: ${message}` }, { status: 502 });
  }

  const updated = await prisma.outreachEmail.update({
    where: { id: email.id },
    data: { status: "sent", sentAt: new Date(), toEmail: to }
  });

  return NextResponse.json(updated);
}
