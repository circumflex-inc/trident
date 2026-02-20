import OpenAI from "openai";
import type { Agent, AgentResponse, TokenUsage } from "../agents/types.js";

let _openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

// Global token tracker
const _usage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0 };

export function getUsage(): TokenUsage {
  return { ..._usage };
}

export function resetUsage(): void {
  _usage.promptTokens = 0;
  _usage.completionTokens = 0;
  _usage.totalTokens = 0;
  _usage.calls = 0;
}

export async function queryAgent(
  agent: Agent,
  prompt: string,
  model: string = "gpt-4o-mini",
  systemOverride?: string
): Promise<AgentResponse> {
  const response = await getClient().chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemOverride ?? agent.systemPrompt },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  // Track tokens
  if (response.usage) {
    _usage.promptTokens += response.usage.prompt_tokens;
    _usage.completionTokens += response.usage.completion_tokens;
    _usage.totalTokens += response.usage.total_tokens;
  }
  _usage.calls++;

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
