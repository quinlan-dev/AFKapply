import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const STATUSES = ["queued", "ready", "applied", "interviewing", "offer", "rejected", "withdrawn"] as const;

const createSchema = z.object({ matchId: z.string().min(1).max(64) });
const updateSchema = z.object({
  id: z.string().min(1).max(64),
  status: z.enum(STATUSES).optional(),
  notes: z.string().max(5000).optional()
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const applications = await prisma.application.findMany({
    where: { userId },
    include: { match: { include: { job: true } } },
    orderBy: { updatedAt: "desc" }
  });

  return NextResponse.json(applications);
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

  const match = await prisma.match.findFirst({
    where: { id: parsed.data.matchId, userId }
  });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.application.findUnique({ where: { matchId: match.id } });
  if (existing) return NextResponse.json(existing);

  const application = await prisma.application.create({
    data: { userId, matchId: match.id }
  });

  return NextResponse.json(application);
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

  const application = await prisma.application.findFirst({
    where: { id: parsed.data.id, userId }
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { status?: string; notes?: string; appliedAt?: Date } = {};
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;

  if (parsed.data.status && parsed.data.status !== application.status) {
    // Daily cap applies when a queued application flips to applied.
    if (parsed.data.status === "applied" && !application.appliedAt) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const appliedToday = await prisma.application.count({
        where: { userId, appliedAt: { gte: startOfDay } }
      });
      if (user && appliedToday >= user.dailyApplyCap) {
        return NextResponse.json(
          { error: `Daily application cap reached (${user.dailyApplyCap}). Raise it in Settings or continue tomorrow.` },
          { status: 429 }
        );
      }
      data.appliedAt = new Date();
    }
    data.status = parsed.data.status;
  }

  const updated = await prisma.application.update({
    where: { id: application.id },
    data,
    include: { match: { include: { job: true } } }
  });

  return NextResponse.json(updated);
}
