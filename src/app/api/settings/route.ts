import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { encryptSecret } from "@/lib/crypto";
import { isAllowedSmtpHost } from "@/lib/mailer";
import { adzunaEnabled } from "@/lib/jobSources";
import { aiEnabled } from "@/lib/ai";

const schema = z.object({
  name: z.string().trim().max(100).optional(),
  fromName: z.string().trim().max(100).optional(),
  dailyApplyCap: z.number().int().min(1).max(50).optional(),
  dailyEmailCap: z.number().int().min(1).max(25).optional(),
  smtpHost: z.string().trim().max(255).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().trim().max(254).optional(),
  // Write-only: accepted here, encrypted at rest, never returned.
  smtpPass: z.string().min(1).max(200).optional()
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [user, resume] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        fromName: true,
        dailyApplyCap: true,
        dailyEmailCap: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPassEnc: true
      }
    }),
    prisma.resume.findFirst({
      where: { userId, isActive: true },
      select: { fileName: true, createdAt: true }
    })
  ]);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { smtpPassEnc, ...safe } = user;
  return NextResponse.json({
    ...safe,
    smtpConfigured: Boolean(smtpPassEnc && user.smtpHost && user.smtpUser),
    resume,
    aiEnabled: aiEnabled(),
    adzunaEnabled: adzunaEnabled()
  });
}

export async function PUT(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { smtpPass, ...rest } = parsed.data;

  if (rest.smtpHost && !isAllowedSmtpHost(rest.smtpHost)) {
    return NextResponse.json({ error: "That SMTP host is not allowed" }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...rest };
  if (smtpPass) {
    try {
      data.smtpPassEnc = encryptSecret(smtpPass);
    } catch {
      return NextResponse.json(
        { error: "Server needs a real NEXTAUTH_SECRET before storing email credentials" },
        { status: 500 }
      );
    }
  }

  await prisma.user.update({ where: { id: userId }, data });

  return NextResponse.json({ ok: true });
}
