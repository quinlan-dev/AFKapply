import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [user, matchCount, savedCount, queuedCount, appliedTotal, appliedToday, sentToday, interviewing, resume, preference] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { dailyApplyCap: true, dailyEmailCap: true } }),
      prisma.match.count({ where: { userId, status: { not: "dismissed" } } }),
      prisma.match.count({ where: { userId, status: "saved" } }),
      prisma.application.count({ where: { userId, status: { in: ["queued", "ready"] } } }),
      prisma.application.count({ where: { userId, appliedAt: { not: null } } }),
      prisma.application.count({ where: { userId, appliedAt: { gte: startOfDay } } }),
      prisma.outreachEmail.count({ where: { userId, sentAt: { gte: startOfDay } } }),
      prisma.application.count({ where: { userId, status: { in: ["interviewing", "offer"] } } }),
      prisma.resume.findFirst({ where: { userId, isActive: true }, select: { fileName: true } }),
      prisma.preference.findUnique({ where: { userId }, select: { id: true } })
    ]);

  return NextResponse.json({
    matchCount,
    savedCount,
    queuedCount,
    appliedTotal,
    appliedToday,
    sentToday,
    interviewing,
    dailyApplyCap: user?.dailyApplyCap ?? 10,
    dailyEmailCap: user?.dailyEmailCap ?? 10,
    hasResume: Boolean(resume),
    resumeName: resume?.fileName ?? null,
    hasPreferences: Boolean(preference)
  });
}
