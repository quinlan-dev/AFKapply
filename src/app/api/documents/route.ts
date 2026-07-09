import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { generateTailoredDocument, DocumentType } from "@/lib/aiDocuments";

const generateSchema = z.object({
  matchId: z.string(),
  type: z.enum(["cover_letter", "resume_summary", "supporting_paragraph"])
});

const updateSchema = z.object({
  documentId: z.string(),
  content: z.string().min(1)
});

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  const match = await prisma.match.findFirst({ where: { id: matchId, userId } });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const documents = await prisma.tailoredDocument.findMany({ where: { matchId } });
  return NextResponse.json(documents);
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
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { matchId, type } = parsed.data;

  const match = await prisma.match.findFirst({
    where: { id: matchId, userId },
    include: { job: true, resume: true }
  });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const content = await generateTailoredDocument(
    type as DocumentType,
    match.resume.rawText,
    match.job.title,
    match.job.company,
    match.job.description
  );

  const document = await prisma.tailoredDocument.upsert({
    where: { matchId_type: { matchId, type } },
    update: { content },
    create: { matchId, type, content }
  });

  return NextResponse.json(document);
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

  const { documentId, content } = parsed.data;

  const document = await prisma.tailoredDocument.findUnique({
    where: { id: documentId },
    include: { match: true }
  });
  if (!document || document.match.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.tailoredDocument.update({
    where: { id: documentId },
    data: { content }
  });

  return NextResponse.json(updated);
}
