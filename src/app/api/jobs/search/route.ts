import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { fetchAllSources, RawJob } from "@/lib/jobSources";
import { scoreJob } from "@/lib/scoring";

export const maxDuration = 60;

const MAX_NEW_SCORES_PER_SEARCH = 30;

function passesFilters(
  job: RawJob,
  pref: {
    roleTitles: string[];
    keywords: string[];
    locations: string[];
    remoteOnly: boolean;
    minSalary: number | null;
    jobTypes: string[];
  }
): boolean {
  const title = job.title.toLowerCase();
  const desc = job.description.toLowerCase();

  const matchesRole =
    pref.roleTitles.some((r) => title.includes(r.toLowerCase())) ||
    (pref.keywords.length > 0 && pref.keywords.some((k) => title.includes(k.toLowerCase())));
  if (!matchesRole) return false;

  const loc = (job.location ?? "").toLowerCase();
  const isRemote = loc.includes("remote") || loc.includes("anywhere") || loc.includes("worldwide");

  if (pref.remoteOnly && !isRemote) return false;

  if (pref.locations.length > 0 && !isRemote) {
    const matchesLocation = pref.locations.some((l) => loc.includes(l.toLowerCase()));
    if (!matchesLocation && job.location) return false;
  }

  if (pref.minSalary && job.salaryMax && job.salaryMax < pref.minSalary) return false;

  if (pref.jobTypes.length > 0 && job.jobType) {
    const jt = job.jobType.toLowerCase().replace(/[\s-]/g, "_");
    const matchesType = pref.jobTypes.some((t) => jt.includes(t) || t.includes(jt));
    if (!matchesType && desc.length > 0) {
      // Fall back to checking the description if the source's type label is odd.
      const typeWords: Record<string, string[]> = {
        full_time: ["full-time", "full time"],
        part_time: ["part-time", "part time"],
        contract: ["contract"],
        internship: ["intern"]
      };
      const hit = pref.jobTypes.some((t) => (typeWords[t] ?? []).some((w) => desc.includes(w)));
      if (!hit) return false;
    }
  }

  return true;
}

export async function POST() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!rateLimit(`search:${userId}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many searches, wait a few minutes" }, { status: 429 });
  }

  const [resume, pref] = await Promise.all([
    prisma.resume.findFirst({ where: { userId, isActive: true } }),
    prisma.preference.findUnique({ where: { userId } })
  ]);

  if (!resume) return NextResponse.json({ error: "Upload a resume in Settings first" }, { status: 400 });
  if (!pref) return NextResponse.json({ error: "Set your job preferences in Settings first" }, { status: 400 });

  const rawJobs = await fetchAllSources({
    roleTitles: pref.roleTitles,
    searchLocation: pref.searchLocation,
    maxDistanceMiles: pref.maxDistanceMiles,
    minSalary: pref.minSalary,
    remoteOnly: pref.remoteOnly,
    greenhouseSlugs: pref.companySlugs,
    leverSlugs: pref.leverSlugs
  });

  const relevant = rawJobs.filter((j) => passesFilters(j, pref));

  let scored = 0;
  for (const rawJob of relevant) {
    const job = await prisma.job.upsert({
      where: { source_externalId: { source: rawJob.source, externalId: rawJob.externalId } },
      update: {
        title: rawJob.title,
        location: rawJob.location,
        description: rawJob.description,
        url: rawJob.url,
        salaryMin: rawJob.salaryMin,
        salaryMax: rawJob.salaryMax,
        jobType: rawJob.jobType,
        fetchedAt: new Date()
      },
      create: {
        source: rawJob.source,
        externalId: rawJob.externalId,
        company: rawJob.company,
        title: rawJob.title,
        location: rawJob.location,
        description: rawJob.description,
        url: rawJob.url,
        salaryMin: rawJob.salaryMin,
        salaryMax: rawJob.salaryMax,
        jobType: rawJob.jobType,
        postedAt: rawJob.postedAt ? new Date(rawJob.postedAt) : null
      }
    });

    const existing = await prisma.match.findUnique({
      where: { userId_jobId: { userId, jobId: job.id } }
    });
    if (existing) continue;
    if (scored >= MAX_NEW_SCORES_PER_SEARCH) continue;

    const { score, rationale } = await scoreJob(
      resume.rawText,
      job.title,
      job.description,
      job.company,
      pref.roleTitles,
      pref.keywords
    );

    await prisma.match.create({
      data: { userId, resumeId: resume.id, jobId: job.id, score, rationale }
    });
    scored++;
  }

  const matches = await prisma.match.findMany({
    where: { userId, status: { not: "dismissed" } },
    include: { job: true, application: { select: { id: true, status: true } } },
    orderBy: { score: "desc" },
    take: 100
  });

  return NextResponse.json({ matches, newlyScored: scored, totalFetched: rawJobs.length });
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const matches = await prisma.match.findMany({
    where: { userId, status: { not: "dismissed" } },
    include: { job: true, application: { select: { id: true, status: true } } },
    orderBy: { score: "desc" },
    take: 100
  });

  return NextResponse.json({ matches });
}
