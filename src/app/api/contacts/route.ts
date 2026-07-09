import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { emailGuesses, searchLinks } from "@/lib/emailPatterns";
import { isValidEmail } from "@/lib/mailer";

const createSchema = z.object({
  company: z.string().trim().min(1).max(120),
  domain: z.string().trim().max(120).optional(),
  name: z.string().trim().max(120).optional(),
  title: z.string().trim().max(120).optional(),
  linkedinUrl: z.string().trim().max(300).optional(),
  roleHint: z.string().trim().max(120).optional()
});

const updateSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().max(120).optional(),
  title: z.string().trim().max(120).optional(),
  email: z.string().trim().max(254).optional(),
  linkedinUrl: z.string().trim().max(300).optional(),
  notes: z.string().max(5000).optional()
});

function safeLinkedinUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    if (!/(^|\.)linkedin\.com$/.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const contacts = await prisma.contact.findMany({
    where: { userId },
    include: { outreachEmails: { orderBy: { updatedAt: "desc" } } },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(
    contacts.map((c) => ({ ...c, links: searchLinks(c.company, c.title ?? undefined) }))
  );
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { company, domain, name, title, linkedinUrl, roleHint } = parsed.data;

  const guesses = name && domain ? emailGuesses(name, domain) : [];

  const contact = await prisma.contact.create({
    data: {
      userId,
      company,
      domain: domain || null,
      name: name || null,
      title: title || null,
      linkedinUrl: safeLinkedinUrl(linkedinUrl),
      emailGuesses: guesses
    }
  });

  return NextResponse.json({ ...contact, links: searchLinks(company, roleHint ?? title) });
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

  const contact = await prisma.contact.findFirst({
    where: { id: parsed.data.id, userId }
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.email && !isValidEmail(parsed.data.email)) {
    return NextResponse.json({ error: "That email address doesn't look valid" }, { status: 400 });
  }

  const updated = await prisma.contact.update({
    where: { id: contact.id },
    data: {
      name: parsed.data.name,
      title: parsed.data.title,
      email: parsed.data.email,
      linkedinUrl: parsed.data.linkedinUrl !== undefined ? safeLinkedinUrl(parsed.data.linkedinUrl) : undefined,
      notes: parsed.data.notes
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const contact = await prisma.contact.findFirst({ where: { id, userId } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.outreachEmail.deleteMany({ where: { contactId: contact.id } });
  await prisma.contact.delete({ where: { id: contact.id } });

  return NextResponse.json({ ok: true });
}
