import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { generateOutreachEmail } from "@/lib/aiDocuments";

const draftSchema = z.object({
  contactId: z.string().min(1).max(64),
  matchId: z.string().min(1).max(64).optional()
});

const updateSchema = z.object({
  id: z.string().min(1).max(64),
  subject: z.string().trim().min(1).max(200).optional(),
  body: z.string().min(1).max(10_000).optional(),
  toEmail: z.string().trim().max(254).optional()
});

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const [contact, user, resume] = await Promise.all([
    prisma.contact.findFirst({ where: { id: parsed.data.contactId, userId } }),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.resume.findFirst({ where: { userId, isActive: true } })
  ]);

  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  if (!resume) return NextResponse.json({ error: "Upload a resume in Settings first" }, { status: 400 });

  let jobTitle: string | null = null;
  let jobDescription: string | null = null;
  if (parsed.data.matchId) {
    const match = await prisma.match.findFirst({
      where: { id: parsed.data.matchId, userId },
      include: { job: true }
    });
    if (match) {
      jobTitle = match.job.title;
      jobDescription = match.job.description;
    }
  }

  const draft = await generateOutreachEmail({
    resumeText: resume.rawText,
    contactName: contact.name,
    contactTitle: contact.title,
    company: contact.company,
    jobTitle,
    jobDescription,
    senderName: user?.fromName || user?.name || "Me"
  });

  const email = await prisma.outreachEmail.create({
    data: {
      userId,
      contactId: contact.id,
      toEmail: contact.email,
      subject: draft.subject,
      body: draft.body
    }
  });

  return NextResponse.json(email);
}

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const email = await prisma.outreachEmail.findFirst({
    where: { id: parsed.data.id, userId }
  });
  if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (email.status === "sent") {
    return NextResponse.json({ error: "Already sent, draft a new one instead" }, { status: 400 });
  }

  const updated = await prisma.outreachEmail.update({
    where: { id: email.id },
    data: {
      subject: parsed.data.subject,
      body: parsed.data.body,
      toEmail: parsed.data.toEmail
    }
  });

  return NextResponse.json(updated);
}
