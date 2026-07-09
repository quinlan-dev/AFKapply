// Multi-source job aggregation, all free.
//
// Keyless sources (work out of the box):
//   - Remotive          remote jobs, keyword search, salary text
//   - Arbeitnow         mixed remote/on-site
//   - The Muse          large multi-industry board
//   - Greenhouse boards public per-company API (user picks companies)
//   - Lever boards      public per-company API (user picks companies)
// Optional source (free API key, adds real radius + salary filtering):
//   - Adzuna            set ADZUNA_APP_ID + ADZUNA_APP_KEY
//
// None of these involve logging into or scraping Indeed/LinkedIn/Handshake,
// which would violate their terms and get user accounts banned.

export type RawJob = {
  source: string;
  externalId: string;
  company: string;
  title: string;
  location: string | null;
  description: string;
  url: string;
  postedAt: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  jobType: string | null;
};

export type SearchParams = {
  roleTitles: string[];
  searchLocation?: string | null;
  maxDistanceMiles?: number | null;
  minSalary?: number | null;
  remoteOnly?: boolean;
  greenhouseSlugs: string[];
  leverSlugs: string[];
};

const FETCH_TIMEOUT_MS = 10_000;

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: "application/json" },
      next: { revalidate: 1800 }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Board slugs are interpolated into URLs; restrict to safe characters so a
// crafted "slug" can't alter the request path (SSRF/path traversal guard).
export function sanitizeSlug(slug: string): string | null {
  const s = slug.trim().toLowerCase();
  return /^[a-z0-9_-]{1,64}$/.test(s) ? s : null;
}

function parseSalaryText(text: string | null | undefined): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };
  const nums = (text.match(/\$?\s?(\d{2,3})[,.]?(\d{3})/g) || [])
    .map((m) => parseInt(m.replace(/[^0-9]/g, ""), 10))
    .filter((n) => n >= 10_000 && n <= 2_000_000);
  if (nums.length === 0) return { min: null, max: null };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

async function fetchRemotive(query: string): Promise<RawJob[]> {
  const data = await getJson(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=50`
  );
  return (data?.jobs ?? []).map((j: any) => {
    const salary = parseSalaryText(j.salary);
    return {
      source: "remotive",
      externalId: String(j.id),
      company: j.company_name ?? "Unknown",
      title: j.title ?? "",
      location: j.candidate_required_location || "Remote",
      description: stripHtml(j.description ?? "").slice(0, 20_000),
      url: j.url ?? "",
      postedAt: j.publication_date ?? null,
      salaryMin: salary.min,
      salaryMax: salary.max,
      jobType: j.job_type || null
    };
  });
}

async function fetchArbeitnow(): Promise<RawJob[]> {
  const data = await getJson("https://www.arbeitnow.com/api/job-board-api");
  return (data?.data ?? []).map((j: any) => ({
    source: "arbeitnow",
    externalId: String(j.slug),
    company: j.company_name ?? "Unknown",
    title: j.title ?? "",
    location: j.remote ? `Remote${j.location ? ` (${j.location})` : ""}` : j.location || null,
    description: stripHtml(j.description ?? "").slice(0, 20_000),
    url: j.url ?? "",
    postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
    salaryMin: null,
    salaryMax: null,
    jobType: Array.isArray(j.job_types) && j.job_types.length ? String(j.job_types[0]) : null
  }));
}

async function fetchTheMuse(location?: string | null): Promise<RawJob[]> {
  const loc = location ? `&location=${encodeURIComponent(location)}` : "";
  const pages = await Promise.all(
    [1, 2].map((p) => getJson(`https://www.themuse.com/api/public/jobs?page=${p}${loc}`))
  );
  const results: RawJob[] = [];
  for (const data of pages) {
    for (const j of data?.results ?? []) {
      results.push({
        source: "themuse",
        externalId: String(j.id),
        company: j.company?.name ?? "Unknown",
        title: j.name ?? "",
        location: (j.locations ?? []).map((l: any) => l.name).join("; ") || null,
        description: stripHtml(j.contents ?? "").slice(0, 20_000),
        url: j.refs?.landing_page ?? "",
        postedAt: j.publication_date ?? null,
        salaryMin: null,
        salaryMax: null,
        jobType: null
      });
    }
  }
  return results;
}

async function fetchGreenhouse(slugRaw: string): Promise<RawJob[]> {
  const slug = sanitizeSlug(slugRaw);
  if (!slug) return [];
  const data = await getJson(
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`
  );
  return (data?.jobs ?? []).map((j: any) => ({
    source: "greenhouse",
    externalId: String(j.id),
    company: slug,
    title: j.title ?? "",
    location: j.location?.name ?? null,
    description: stripHtml(j.content ?? "").slice(0, 20_000),
    url: j.absolute_url ?? "",
    postedAt: j.updated_at ?? null,
    salaryMin: null,
    salaryMax: null,
    jobType: null
  }));
}

async function fetchLever(slugRaw: string): Promise<RawJob[]> {
  const slug = sanitizeSlug(slugRaw);
  if (!slug) return [];
  const data = await getJson(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  if (!Array.isArray(data)) return [];
  return data.map((j: any) => ({
    source: "lever",
    externalId: String(j.id),
    company: slug,
    title: j.text ?? "",
    location: j.categories?.location ?? null,
    description: stripHtml(j.descriptionPlain ?? j.description ?? "").slice(0, 20_000),
    url: j.hostedUrl ?? "",
    postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
    salaryMin: null,
    salaryMax: null,
    jobType: j.categories?.commitment ?? null
  }));
}

// Adzuna is the one source with true "within N miles of X" and salary
// filtering. Free key at developer.adzuna.com; entirely optional.
async function fetchAdzuna(params: SearchParams): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const country = (process.env.ADZUNA_COUNTRY || "us").toLowerCase();
  if (!/^[a-z]{2}$/.test(country)) return [];

  const qs = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "50",
    what_or: params.roleTitles.join(" ").slice(0, 200)
  });
  if (params.searchLocation) qs.set("where", params.searchLocation);
  if (params.maxDistanceMiles) qs.set("distance", String(Math.round(params.maxDistanceMiles * 1.609)));
  if (params.minSalary) qs.set("salary_min", String(params.minSalary));

  const data = await getJson(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${qs}`);
  return (data?.results ?? []).map((j: any) => ({
    source: "adzuna",
    externalId: String(j.id),
    company: j.company?.display_name ?? "Unknown",
    title: j.title ? stripHtml(j.title) : "",
    location: j.location?.display_name ?? null,
    description: stripHtml(j.description ?? "").slice(0, 20_000),
    url: j.redirect_url ?? "",
    postedAt: j.created ?? null,
    salaryMin: j.salary_min ? Math.round(j.salary_min) : null,
    salaryMax: j.salary_max ? Math.round(j.salary_max) : null,
    jobType: j.contract_time === "part_time" ? "part_time" : j.contract_time === "full_time" ? "full_time" : null
  }));
}

export async function fetchAllSources(params: SearchParams): Promise<RawJob[]> {
  const query = params.roleTitles.slice(0, 3).join(" ") || "software";

  const tasks: Promise<RawJob[]>[] = [
    fetchRemotive(query),
    fetchArbeitnow(),
    fetchTheMuse(params.searchLocation),
    fetchAdzuna(params),
    ...params.greenhouseSlugs.slice(0, 10).map(fetchGreenhouse),
    ...params.leverSlugs.slice(0, 10).map(fetchLever)
  ];

  const settled = await Promise.allSettled(tasks);
  const jobs = settled
    .filter((r): r is PromiseFulfilledResult<RawJob[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((j) => j.title && j.url && j.url.startsWith("https://"));

  // Dedupe across sources by company+title+location.
  const seen = new Set<string>();
  return jobs.filter((j) => {
    const key = `${j.company}|${j.title}|${j.location ?? ""}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function adzunaEnabled(): boolean {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}
