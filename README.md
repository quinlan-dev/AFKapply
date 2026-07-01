# afkapply

Upload a resume, set the roles and companies you're targeting, get an AI-ranked
list of open jobs that actually fit, then generate a tailored cover letter,
resume summary, or supporting paragraph for any listing, right from the match
list. This covers phases one and two: resume upload and matching, plus document
tailoring. Auto-apply and outreach come next.

## Why no Indeed or Handshake login

Indeed and Handshake block automated logins and scraping, it's in their terms of
service and they actively detect it. Storing a user's password for those sites and
scripting logins would get accounts flagged or banned, so this version pulls jobs
from Greenhouse's public job board API instead, which is meant for exactly this kind
of use and doesn't require anyone's credentials. You can add more sources the same
way, Lever, Ashby, and Workday all have similar public endpoints.

## What the document generation does

On any job match, click "Tailor documents" to generate a cover letter, a
resume summary, or a short supporting paragraph, all written specifically
against that job description and your resume. Everything is editable in
place, saved on edit, and downloadable as a plain text file. The generation
prompts are written to avoid the usual AI writing tells, no em dashes, no
"I'm excited to leverage my passion for," that kind of thing.

## Local setup

1. Install dependencies:
   ```
   npm install
   ```

2. Get a free Postgres database at [neon.tech](https://neon.tech) (or supabase.com).
   Copy the connection string.

3. Get a free Anthropic API key at [console.anthropic.com](https://console.anthropic.com).

4. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` from Neon
   - `ANTHROPIC_API_KEY` from Anthropic
   - `NEXTAUTH_SECRET`, generate one with `openssl rand -base64 32`
   - `NEXTAUTH_URL`, leave as `http://localhost:3000` for local dev

5. Push the schema to your database:
   ```
   npm run db:push
   ```

6. Run it:
   ```
   npm run dev
   ```

Open http://localhost:3000, sign up, drop a resume, set a few role titles and
company slugs, and it will pull and score live listings. Click into any match
to generate tailored documents.

## Deploying for free

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com), import the repo.
3. In Vercel's project settings, add the same environment variables from your
   `.env` file (`DATABASE_URL`, `ANTHROPIC_API_KEY`, `NEXTAUTH_SECRET`), and set
   `NEXTAUTH_URL` to your Vercel domain once it's assigned.
4. Deploy. Vercel's free tier and Neon's free tier both cover this comfortably
   for personal use.

## Finding company slugs

A company slug works if `https://boards.greenhouse.io/{slug}` loads their job
board. Try the company name in lowercase with no spaces first, most match.

## What's next

- Auto-apply queue with a daily cap you control, everything reviewed before it
  goes out
- Recruiter outreach as a personalized email assistant, not bulk scraping

