// Optional AI layer. Everything in the app works without an API key; when
// ANTHROPIC_API_KEY is set, scoring and writing quality improve.

import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic | null {
  if (!aiEnabled()) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function complete(prompt: string, maxTokens: number): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const response = await c.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }]
    });
    const block = response.content.find((b) => b.type === "text");
    return block && "text" in block ? block.text.trim() : null;
  } catch {
    return null;
  }
}

export async function scoreJobWithAI(
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
  companyName: string
): Promise<{ score: number; rationale: string } | null> {
  const prompt = `You are helping a job seeker figure out how well their resume fits a specific job posting.

Resume:
"""
${resumeText.slice(0, 6000)}
"""

Job title: ${jobTitle}
Company: ${companyName}
Job description:
"""
${jobDescription.slice(0, 6000)}
"""

Score the fit from 0 to 100 based on skills overlap, experience level, and relevance.
Write a short rationale, two to three sentences, plain and direct, no filler.
Respond with only valid JSON in this exact shape, no other text:
{"score": <number>, "rationale": "<string>"}`;

  const raw = await complete(prompt, 400);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return {
      score: Math.max(0, Math.min(100, Math.round(Number(parsed.score)))),
      rationale: String(parsed.rationale).slice(0, 2000)
    };
  } catch {
    return null;
  }
}
