// Tailored document generation. With ANTHROPIC_API_KEY set it writes with AI;
// without a key it falls back to a solid fill-in template built from the
// actual resume/job overlap, so the app stays fully functional at $0.

import { complete, aiEnabled } from "./ai";
import { heuristicScore } from "./scoring";

export type DocumentType = "cover_letter" | "resume_summary" | "supporting_paragraph";

const STYLE_RULES = `Write like a person actually wrote it, not an AI. Follow these rules strictly:
- No em dashes, ever. Use periods or commas instead.
- No phrases like "I am excited to," "I would be thrilled," "delve into," "leverage my skills," "passionate about," or "in today's fast-paced world." These read as generated and hurt the applicant.
- Vary sentence length. Short sentences are fine. Don't make every sentence the same shape.
- Be specific and concrete. Reference actual things from the resume and the job description, not generic claims.
- No bullet-point restating of the resume, write in real sentences.
- Confident and direct tone, not stiff or overly formal, not casual either. Like a competent person explaining why they're a fit.`;

function buildPrompt(
  type: DocumentType,
  resumeText: string,
  jobTitle: string,
  company: string,
  jobDescription: string
): string {
  const shared = `Resume:
"""
${resumeText.slice(0, 6000)}
"""

Job title: ${jobTitle}
Company: ${company}
Job description:
"""
${jobDescription.slice(0, 6000)}
"""

${STYLE_RULES}`;

  if (type === "cover_letter") {
    return `Write a cover letter for this job application, based on the resume below.

${shared}

Keep it to three or four short paragraphs. Open with something specific to this role or company, not "I am writing to apply for." Close with a plain, direct line, not "I look forward to hearing from you." Return only the letter text.`;
  }

  if (type === "resume_summary") {
    return `Write a two to three sentence resume summary tailored to this specific job, based on the resume below. This goes at the top of the resume in place of a generic summary.

${shared}

Pull the most relevant experience and skills for this exact role. Return only the summary text.`;
  }

  return `Write a short supporting paragraph, about 100 to 150 words, that this applicant could send to a recruiter or include in an application form's "why are you a fit" field, based on the resume below.

${shared}

Return only the paragraph text.`;
}

function overlapTerms(resumeText: string, jobTitle: string, jobDescription: string): string[] {
  const { rationale } = heuristicScore(resumeText, jobTitle, jobDescription, [], []);
  const match = rationale.match(/including ([^.]+)\./);
  return match ? match[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
}

function templateDocument(
  type: DocumentType,
  resumeText: string,
  jobTitle: string,
  company: string,
  jobDescription: string
): string {
  const skills = overlapTerms(resumeText, jobTitle, jobDescription);
  const skillLine = skills.length
    ? `My background covers ${skills.slice(0, 4).join(", ")}, which line up directly with what this role calls for.`
    : `My background lines up with the core requirements listed for this role.`;

  if (type === "resume_summary") {
    return `${jobTitle} candidate with hands-on experience in ${skills.slice(0, 3).join(", ") || "the core skills this role requires"}. Track record of delivering real results in similar environments. [Edit this line to add your strongest measurable win.]`;
  }

  if (type === "supporting_paragraph") {
    return `I'm applying for the ${jobTitle} position at ${company}. ${skillLine} [Add one concrete accomplishment with a number here, e.g. "At my last role I cut processing time 30% by..."] I work well with minimal ramp-up and I'm ready to contribute from week one. Happy to walk through any part of my experience in more detail.`;
  }

  return `The ${jobTitle} opening at ${company} matches the work I already do well. ${skillLine}

[Add a short paragraph with your single strongest, most relevant accomplishment. Use a real number: revenue, users, time saved, error rate.]

I keep my applications targeted, and this one is. The overlap between what you're asking for and what I've done is direct, not a stretch. I'd welcome a conversation about the specifics.

[Your name]

Note: this is a template draft because no AI key is configured. Add an ANTHROPIC_API_KEY in settings/env for fully written drafts, or edit the bracketed sections by hand.`;
}

export async function generateTailoredDocument(
  type: DocumentType,
  resumeText: string,
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<string> {
  if (aiEnabled()) {
    const text = await complete(buildPrompt(type, resumeText, jobTitle, company, jobDescription), 800);
    if (text) return text;
  }
  return templateDocument(type, resumeText, jobTitle, company, jobDescription);
}

export async function generateOutreachEmail(args: {
  resumeText: string;
  contactName: string | null;
  contactTitle: string | null;
  company: string;
  jobTitle: string | null;
  jobDescription: string | null;
  senderName: string;
}): Promise<{ subject: string; body: string }> {
  const { resumeText, contactName, contactTitle, company, jobTitle, jobDescription, senderName } = args;
  const greetName = contactName ? contactName.split(" ")[0] : "there";
  const roleLine = jobTitle ? `the ${jobTitle} opening` : `opportunities on your team`;

  if (aiEnabled()) {
    const prompt = `Write a short cold outreach email from a job seeker to ${
      contactName ?? "a hiring contact"
    }${contactTitle ? ` (${contactTitle})` : ""} at ${company} about ${roleLine}.

Sender's resume:
"""
${resumeText.slice(0, 5000)}
"""
${jobDescription ? `Job description:\n"""\n${jobDescription.slice(0, 4000)}\n"""` : ""}

${STYLE_RULES}
- Maximum 120 words in the body.
- One specific, concrete reason the sender fits, pulled from the resume.
- End with a low-pressure ask (a short call or pointing them to the application).
- Sign off with the name "${senderName}".

Respond with only valid JSON, no other text: {"subject": "<string>", "body": "<string>"}`;

    const raw = await complete(prompt, 500);
    if (raw) {
      try {
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        if (parsed.subject && parsed.body) {
          return { subject: String(parsed.subject).slice(0, 200), body: String(parsed.body).slice(0, 5000) };
        }
      } catch {
        // fall through to template
      }
    }
  }

  const skills = jobDescription ? overlapTerms(resumeText, jobTitle ?? "", jobDescription) : [];
  return {
    subject: jobTitle ? `${jobTitle} at ${company}` : `Quick question about ${company}`,
    body: `Hi ${greetName},

I just applied for ${roleLine} at ${company} and wanted to reach out directly rather than sit in the queue.${
      skills.length ? ` My experience with ${skills.slice(0, 3).join(", ")} maps closely to what the posting asks for.` : ""
    } [Add one sentence with your most relevant concrete accomplishment.]

If it's useful, I'm glad to share more detail or take a short call. Either way, I'd appreciate the application getting a look.

Thanks,
${senderName}`
  };
}
