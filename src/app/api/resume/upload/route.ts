import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractResumeText } from "@/lib/resumeParser";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText: string;
  try {
    rawText = await extractResumeText(buffer, file.name);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (rawText.length < 50) {
    return NextResponse.json(
      { error: "Could not read enough text from this file. Try a different format." },
      { status: 400 }
    );
  }

  const userId = (session.user as any).id as string;

  await prisma.resume.updateMany({
    where: { userId },
    data: { isActive: false }
  });

  const resume = await prisma.resume.create({
    data: {
      userId,
      fileName: file.name,
      rawText,
      isActive: true
    }
  });

  return NextResponse.json({ id: resume.id, fileName: resume.fileName });
}
