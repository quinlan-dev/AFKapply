// Contact sourcing without scraping. Two legitimate, free techniques:
// 1. Search links the user opens themselves (LinkedIn people search, Google
//    x-ray). No automated collection, no ToS problems.
// 2. Email pattern candidates from a person's name + company domain. These are
//    guesses; the UI requires the user to confirm one before anything sends.

export function emailGuesses(fullName: string, domain: string): string[] {
  const cleanDomain = domain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanDomain)) return [];

  const parts = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s'-]/g, "")
    .replace(/['-]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return [];

  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : "";

  const locals = last
    ? [
        `${first}.${last}`,
        `${first}${last}`,
        `${first[0]}${last}`,
        `${first}`,
        `${first}.${last[0]}`,
        `${first[0]}.${last}`,
        `${last}.${first}`
      ]
    : [first];

  return Array.from(new Set(locals)).map((l) => `${l}@${cleanDomain}`);
}

export type SearchLinks = {
  linkedinPeople: string;
  linkedinRecruiters: string;
  googleXray: string;
};

// Links the user opens in their own browser, logged into their own accounts.
export function searchLinks(company: string, roleHint?: string): SearchLinks {
  const kw = (extra: string) => encodeURIComponent(`${company} ${extra}`.trim());
  const xray = encodeURIComponent(
    `site:linkedin.com/in "${company}" ("recruiter" OR "talent acquisition" OR "hiring manager"${
      roleHint ? ` OR "${roleHint}"` : ""
    })`
  );
  return {
    linkedinPeople: `https://www.linkedin.com/search/results/people/?keywords=${kw(roleHint ?? "hiring manager")}`,
    linkedinRecruiters: `https://www.linkedin.com/search/results/people/?keywords=${kw("recruiter")}`,
    googleXray: `https://www.google.com/search?q=${xray}`
  };
}
