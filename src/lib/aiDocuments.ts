import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

Keep it to three or four short paragraphs. Open with something specific to this role or company, not "I am writing to apply for." Close with a plain, direct line, not "I look forward to hearing from you." Return only the letter text, no subject line, no "Dear Hiring Manager" header needed unless it fits naturally.`;
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

export async function generateTailoredDocument(
  type: DocumentType,
  resumeText: string,
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<string> {
  const prompt = buildPrompt(type, resumeText, jobTitle, company, jobDescription);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }]
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock && "text" in textBlock ? textBlock.text : "";

  return text.trim();
}
