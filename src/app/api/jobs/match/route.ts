import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchJobsForCompanies } from "@/lib/jobSources";
import { scoreJobMatch } from "@/lib/aiMatch";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  const [resume, preference] = await Promise.all([
    prisma.resume.findFirst({ where: { userId, isActive: true } }),
    prisma.preference.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } })
  ]);

  if (!resume) {
    return NextResponse.json({ error: "Upload a resume first" }, { status: 400 });
  }
  if (!preference) {
    return NextResponse.json({ error: "Set your preferences first" }, { status: 400 });
  }

  const rawJobs = await fetchJobsForCompanies(preference.companySlugs);

  const relevant = rawJobs.filter((job) => {
    const title = job.title.toLowerCase();
    const matchesRole = preference.roleTitles.some((r) =>
      title.includes(r.toLowerCase())
    );
    const matchesLocation =
      preference.locations.length === 0 ||
      !job.location ||
      preference.locations.some((loc) =>
        job.location!.toLowerCase().includes(loc.toLowerCase())
      );
    const matchesRemote =
      !preference.remoteOnly ||
      (job.location && job.location.toLowerCase().includes("remote"));

    return matchesRole && matchesLocation && matchesRemote;
  });

  const capped = relevant.slice(0, 25);

  const results = [];
  for (const rawJob of capped) {
    const job = await prisma.job.upsert({
      where: { source_externalId: { source: "greenhouse", externalId: rawJob.externalId } },
      update: {
        title: rawJob.title,
        location: rawJob.location,
        description: rawJob.description,
        url: rawJob.url,
        fetchedAt: new Date()
      },
      create: {
        source: "greenhouse",
        externalId: rawJob.externalId,
        company: rawJob.company,
        title: rawJob.title,
        location: rawJob.location,
        description: rawJob.description,
        url: rawJob.url,
        postedAt: rawJob.postedAt ? new Date(rawJob.postedAt) : null
      }
    });

    const existingMatch = await prisma.match.findUnique({
      where: { userId_jobId: { userId, jobId: job.id } }
    });

    if (existingMatch) {
      results.push(existingMatch);
      continue;
    }

    const { score, rationale } = await scoreJobMatch(
      resume.rawText,
      job.title,
      job.description,
      job.company
    );

    const match = await prisma.match.create({
      data: { userId, resumeId: resume.id, jobId: job.id, score, rationale }
    });

    results.push(match);
  }

  const sorted = results.sort((a, b) => b.score - a.score);

  const withJobs = await prisma.match.findMany({
    where: { id: { in: sorted.map((m) => m.id) } },
    include: { job: true },
    orderBy: { score: "desc" }
  });

  return NextResponse.json(withJobs);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const matches = await prisma.match.findMany({
    where: { userId },
    include: { job: true },
    orderBy: { score: "desc" }
  });

  return NextResponse.json(matches);
}
