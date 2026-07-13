import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { sanitizeSlug } from "@/lib/jobSources";

const JOB_TYPES = ["full_time", "part_time", "contract", "internship"] as const;

const schema = z.object({
  roleTitles: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
  keywords: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  locations: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  searchLocation: z.string().trim().max(120).nullable().optional(),
  maxDistanceMiles: z.number().int().min(1).max(500).nullable().optional(),
  remoteOnly: z.boolean().default(false),
  minSalary: z.number().int().min(0).max(2_000_000).nullable().optional(),
  salaryPeriod: z.enum(["yearly", "hourly"]).default("yearly"),
  jobTypes: z.array(z.enum(JOB_TYPES)).max(4).default([]),
  companySlugs: z.array(z.string().trim().min(1).max(64)).max(10).default([]),
  leverSlugs: z.array(z.string().trim().min(1).max(64)).max(10).default([])
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const preference = await prisma.preference.findUnique({ where: { userId } });
  return NextResponse.json(preference);
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check your inputs and try again" }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    searchLocation: parsed.data.searchLocation ?? null,
    maxDistanceMiles: parsed.data.maxDistanceMiles ?? null,
    minSalary: parsed.data.minSalary ?? null,
    companySlugs: parsed.data.companySlugs
      .map(sanitizeSlug)
      .filter((s): s is string => s !== null),
    leverSlugs: parsed.data.leverSlugs
      .map(sanitizeSlug)
      .filter((s): s is string => s !== null)
  };

  const preference = await prisma.preference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data }
  });

  return NextResponse.json(preference);
}
