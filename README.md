# afkapply

Your job search, running while you're afk. Upload a resume, set your preferences
(roles, location, salary, job type), and afkapply:

1. **Finds jobs** across free sources — Remotive, Arbeitnow, The Muse, plus any
   Greenhouse or Lever company boards you pick — and **scores every listing
   against your actual resume** with a plain-English rationale.
2. **Runs your application pipeline** — queue the good ones, generate a tailored
   cover letter / resume summary / supporting paragraph for each, apply, and
   track status from applied to offer. A daily cap you control keeps volume sane.
3. **Finds the people hiring** — one-click LinkedIn and Google x-ray searches to
   identify recruiters and hiring managers, likely email addresses generated
   from company patterns, and a personalized cold-email composer that **sends
   from your own inbox** (e.g. Gmail app password), also capped daily.

**Runs 100% free.** No paid APIs are required: match scoring and document
drafting have a built-in zero-cost engine, and hosting fits in Vercel + Neon
free tiers. Two optional free keys make it better (see below).

## Design choices worth knowing

- **No Indeed/LinkedIn/Handshake bots.** Those sites ban automated logins and
  scraping; a bot would get your accounts flagged. afkapply uses public,
  intended-for-this APIs for jobs, and for people it generates *search links
  you open yourself* plus email-pattern guesses *you confirm* before sending.
- **"Auto-apply" means a prepared pipeline, not a form-filling bot.** Every
  application gets generated documents and one-click access, and you confirm
  the final submit on the company's own page. That keeps you in control and
  out of ATS spam filters.
- **Outreach is personal, not bulk.** Emails send one at a time from your own
  account, with a daily cap (default 10, max 25) and a per-minute rate limit.

## Local setup

1. Install dependencies:
   ```
   npm install
   ```

2. Get a free Postgres database at [neon.tech](https://neon.tech). Copy the
   connection string.

3. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` from Neon
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` — leave as `http://localhost:3000` for local dev

4. Push the schema and run:
   ```
   npm run db:push
   npm run dev
   ```

Open http://localhost:3000, create an account, and follow the setup checklist
on the dashboard (resume → preferences → first search).

## Deploying for free

1. Push this folder to a GitHub repo.
2. Import the repo at [vercel.com](https://vercel.com) (free Hobby tier).
3. Add the environment variables from your `.env` in Vercel's project settings,
   and set `NEXTAUTH_URL` to your assigned Vercel domain.
4. Deploy.

## Optional free upgrades

| Feature | How |
|---|---|
| AI-written documents, outreach, and scoring | Set `ANTHROPIC_API_KEY` ([console.anthropic.com](https://console.anthropic.com)) |
| True radius search ("within 25 miles") + salary filters | Free key at [developer.adzuna.com](https://developer.adzuna.com), set `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` |
| Sending outreach email | In-app: Settings → add your Gmail app password (encrypted at rest) |

## Security posture

- Passwords hashed with bcrypt (cost 12); login and registration rate-limited.
- SMTP credentials encrypted at rest with AES-256-GCM; never returned by any API.
- Every API route enforces ownership checks; all input validated with zod.
- Company-board slugs sanitized before URL interpolation (SSRF guard); job
  descriptions HTML-stripped before storage (XSS guard); email headers
  sanitized against injection.
- Security headers (CSP, HSTS, X-Frame-Options, nosniff) on every response.
- Daily caps and per-user rate limits on applying, sending, and searching.

## Finding company board slugs

- Greenhouse: slug works if `https://boards.greenhouse.io/{slug}` loads.
- Lever: slug works if `https://jobs.lever.co/{slug}` loads.
- Try the company name lowercase with no spaces first; most match.
