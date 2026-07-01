// Pulls listings from Greenhouse's public job board API. This is the same
// data Greenhouse serves to embeddable public job boards, no login or
// scraping involved, so it will not get anyone's account flagged.
// Find a company's slug by checking if https://boards.greenhouse.io/{slug} exists.

export type RawJob = {
  externalId: string;
  company: string;
  title: string;
  location: string | null;
  description: string;
  url: string;
  postedAt: string | null;
};

export async function fetchGreenhouseJobs(companySlug: string): Promise<RawJob[]> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs?content=true`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) {
    console.error(`Greenhouse fetch failed for ${companySlug}: ${res.status}`);
    return [];
  }

  const data = await res.json();

  return (data.jobs || []).map((job: any) => ({
    externalId: String(job.id),
    company: companySlug,
    title: job.title,
    location: job.location?.name ?? null,
    description: stripHtml(job.content || ""),
    url: job.absolute_url,
    postedAt: job.updated_at ?? null
  }));
}

export async function fetchJobsForCompanies(slugs: string[]): Promise<RawJob[]> {
  const results = await Promise.allSettled(slugs.map(fetchGreenhouseJobs));
  return results
    .filter((r): r is PromiseFulfilledResult<RawJob[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
