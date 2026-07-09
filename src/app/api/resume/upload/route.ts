import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { extractResumeText } from "@/lib/resumeParser";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!rateLimit(`upload:${userId}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many uploads, wait a few minutes" }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const fileName = file.name.slice(0, 200);
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({ error: "Upload a PDF, DOCX, or TXT file" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large, 5 MB max" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText: string;
  try {
    rawText = await extractResumeText(buffer, fileName);
  } catch {
    return NextResponse.json(
      { error: "Could not read that file. Try exporting it again as PDF or DOCX." },
      { status: 400 }
    );
  }

  if (rawText.length < 50) {
    return NextResponse.json(
      { error: "Could not read enough text from this file. Try a different format." },
      { status: 400 }
    );
  }

  await prisma.resume.updateMany({
    where: { userId },
    data: { isActive: false }
  });

  const resume = await prisma.resume.create({
    data: {
      userId,
      fileName,
      rawText: rawText.slice(0, 100_000),
      isActive: true
    }
  });

  return NextResponse.json({ id: resume.id, fileName: resume.fileName });
}
