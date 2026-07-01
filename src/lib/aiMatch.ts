import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type MatchResult = {
  score: number;
  rationale: string;
};

export async function scoreJobMatch(
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
  companyName: string
): Promise<MatchResult> {
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

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }]
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      rationale: String(parsed.rationale)
    };
  } catch {
    return { score: 0, rationale: "Could not score this listing, try again later." };
  }
}
