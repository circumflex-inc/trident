import type { Agent, AgentResponse, TokenUsage } from "../agents/types.js";

// Global token tracker
const _usage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0 };

export function getUsage(): TokenUsage { return { ..._usage }; }
export function resetUsage(): void {
  _usage.promptTokens = 0; _usage.completionTokens = 0; _usage.totalTokens = 0; _usage.calls = 0;
}

export async function queryAgent(
  agent: Agent,
  prompt: string,
  model: string = "gpt-4o-mini",
  systemOverride?: string
): Promise<AgentResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY environment variable");

  const body: any = {
    model,
    messages: [
      { role: "system", content: systemOverride ?? agent.systemPrompt },
      { role: "user", content: prompt },
    ],
  };

  // gpt-5+ doesn't support custom temperature
  if (!model.startsWith("gpt-5")) {
    body.temperature = 0.7;
  }

  if (model.startsWith("gpt-5")) {
    body.max_completion_tokens = 4096;
  } else {
    body.max_tokens = 500;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`${res.status} ${(err as any)?.error?.message ?? res.statusText}`);
  }

  const data = await res.json() as any;

  // Track tokens
  if (data.usage) {
    _usage.promptTokens += data.usage.prompt_tokens;
    _usage.completionTokens += data.usage.completion_tokens;
    _usage.totalTokens += data.usage.total_tokens;
  }
  _usage.calls++;

  const content = data.choices?.[0]?.message?.content?.trim();
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
