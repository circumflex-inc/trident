import OpenAI from "openai";
import type { Agent, AgentResponse } from "../agents/types.js";

let _openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

export async function queryAgent(
  agent: Agent,
  question: string,
  model: string = "gpt-4o-mini"
): Promise<AgentResponse> {
  const response = await getClient().chat.completions.create({
    model,
    messages: [
      { role: "system", content: agent.systemPrompt },
      { role: "user", content: question },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error(`${agent.name} returned empty response`);

  try {
    const cleaned = content.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as AgentResponse;
    if (!["approve", "reject", "abstain"].includes(parsed.vote)) {
      throw new Error(`Invalid vote: ${parsed.vote}`);
    }
    return parsed;
  } catch (e) {
    return {
      vote: "abstain",
      reasoning: `[Parse error] Raw response: ${content.slice(0, 200)}`,
      summary: "Failed to parse structured response",
    };
  }
}
