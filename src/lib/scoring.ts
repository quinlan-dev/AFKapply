// Zero-cost resume-to-job scoring. Works with no API key: extracts the
// distinctive terms of the job posting and measures how much of them the
// resume covers, with boosts for title fit and preference keywords.
// If ANTHROPIC_API_KEY is set, scoreJob() upgrades to an AI score instead.

import { scoreJobWithAI, aiEnabled } from "./ai";

const STOPWORDS = new Set(
  `a about above after again all also an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its itself just me more most my no nor not of off on once only or other our ours out over own same she should so some such than that the their theirs them then there these they this those through to too under until up very was we were what when where which while who whom why will with you your yours
  ability able across analyze applicant application apply benefits candidate candidates company culture day description duties eligible employee employees employer employment ensure equal etc every excellent experience full including job join looking may must new opportunity opportunities per perform plus position preferred provide qualified qualifications range receive related required requirements responsibilities responsible role salary seeking skills status strong team time today type understanding us using want well within work working world would year years`.split(/\s+/)
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./ -]/g, " ")
    .split(/[\s/]+/)
    .map((w) => w.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

function topTerms(text: string, count: number): string[] {
  const freq = new Map<string, number>();
  for (const word of tokenize(text)) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([w]) => w);
}

// ---------- graded role-title matching ----------
// "software engineer" should also hit "Backend Engineer", "Software
// Developer", "Sr. Software Engineer II" — not just exact substrings.

// Seniority/level words carry no signal about *what* the role is.
const LEVEL_TOKENS = new Set(
  "junior senior sr jr lead staff principal intern internship entry level associate mid midlevel i ii iii iv 1 2 3 4".split(" ")
);

// Small synonym map so close variants of a token still count as a title hit.
const TOKEN_SYNONYMS: Record<string, string[]> = {
  engineer: ["developer", "engineering", "programmer", "dev"],
  developer: ["engineer", "engineering", "programmer", "dev"],
  software: ["swe", "application", "applications"],
  analyst: ["analytics", "analysis"],
  scientist: ["science"],
  security: ["cybersecurity", "infosec", "appsec", "soc"],
  cybersecurity: ["security", "infosec", "soc"],
  frontend: ["front-end", "front end", "ui"],
  backend: ["back-end", "back end", "server"],
  fullstack: ["full-stack", "full stack"],
  ml: ["machine learning", "ai"],
  ai: ["ml", "machine learning", "artificial intelligence"],
  machine: ["ml"],
  data: ["analytics"],
  devops: ["sre", "platform", "infrastructure"],
  manager: ["management", "mgr"],
  administrator: ["admin", "administration"],
  qa: ["quality", "test", "sdet"],
  designer: ["design"],
  product: ["pm"]
};

function significantTokens(role: string): string[] {
  return role
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 0 && !LEVEL_TOKENS.has(t));
}

function tokenHits(token: string, haystack: string): boolean {
  if (haystack.includes(token)) return true;
  return (TOKEN_SYNONYMS[token] ?? []).some((s) => haystack.includes(s));
}

/**
 * How well a job title fits any of the user's target roles: 0 (unrelated)
 * to 1 (exact or near-exact). Partial token overlap gives partial credit.
 */
export function roleTitleFit(jobTitle: string, roleTitles: string[]): number {
  const title = jobTitle.toLowerCase();
  let best = 0;
  for (const role of roleTitles) {
    const r = role.toLowerCase().trim();
    if (!r) continue;
    if (title.includes(r)) return 1;
    const tokens = significantTokens(r);
    if (tokens.length === 0) continue;
    const hits = tokens.filter((t) => tokenHits(t, title)).length;
    best = Math.max(best, hits / tokens.length);
  }
  return best;
}

export type ScoreResult = { score: number; rationale: string };

export function heuristicScore(
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
  roleTitles: string[],
  keywords: string[]
): ScoreResult {
  const resumeTerms = new Set(tokenize(resumeText));
  const jobTerms = topTerms(`${jobTitle} ${jobDescription}`, 40);

  const overlapping = jobTerms.filter((t) => resumeTerms.has(t));
  const missing = jobTerms.filter((t) => !resumeTerms.has(t)).slice(0, 5);
  const coverage = jobTerms.length ? overlapping.length / jobTerms.length : 0;

  const titleFit = roleTitleFit(jobTitle, roleTitles);
  const descLower = jobDescription.toLowerCase();
  const keywordHits = keywords.filter((k) => descLower.includes(k.toLowerCase()));
  // Hitting 3 of your keywords is a full keyword score — listing 20 keywords
  // shouldn't make every job look worse.
  const keywordRatio = keywords.length
    ? Math.min(1, keywordHits.length / Math.min(3, keywords.length))
    : 0;

  // sqrt flattens the coverage curve: real resumes rarely cover more than
  // ~40% of a posting's top terms, and that's still a strong match.
  let score = Math.round(
    titleFit * 40 + Math.sqrt(coverage) * 45 + keywordRatio * 15
  );
  score = Math.max(0, Math.min(100, score));

  const parts: string[] = [];
  if (titleFit >= 0.99) parts.push("The title matches a role you're targeting.");
  else if (titleFit >= 0.5) parts.push("The title is close to a role you're targeting.");
  if (overlapping.length) {
    parts.push(`Your resume covers ${overlapping.length} of the ${jobTerms.length} key terms in this posting, including ${overlapping.slice(0, 6).join(", ")}.`);
  } else {
    parts.push("Little overlap between your resume and this posting's key terms.");
  }
  if (keywordHits.length) parts.push(`Mentions your keywords: ${keywordHits.slice(0, 4).join(", ")}.`);
  if (missing.length && score < 85) parts.push(`Not clearly covered: ${missing.join(", ")}.`);

  return { score, rationale: parts.join(" ") };
}

export async function scoreJob(
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
  companyName: string,
  roleTitles: string[],
  keywords: string[]
): Promise<ScoreResult> {
  if (aiEnabled()) {
    const aiResult = await scoreJobWithAI(resumeText, jobTitle, jobDescription, companyName);
    if (aiResult) return aiResult;
  }
  return heuristicScore(resumeText, jobTitle, jobDescription, roleTitles, keywords);
}
