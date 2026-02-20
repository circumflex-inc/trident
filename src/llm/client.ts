import type { Agent, AgentResponse, TokenUsage } from "../agents/types.js";

// Global token tracker
const _usage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0 };
export function getUsage(): TokenUsage { return { ..._usage }; }
export function resetUsage(): void {
  _usage.promptTokens = 0; _usage.completionTokens = 0; _usage.totalTokens = 0; _usage.calls = 0;
}

type Provider = "openai" | "anthropic" | "google";

interface ProviderConfig {
  provider: Provider;
  model: string;
}

// Default provider mapping per agent
// Rotation presets
const PRESETS: Record<string, Record<string, ProviderConfig>> = {
  default: {
    MELCHIOR:  { provider: "openai",    model: "gpt-5" },
    BALTHASAR: { provider: "anthropic", model: "claude-sonnet-4-20250514" },
    CASPER:    { provider: "google",    model: "gemini-2.5-flash" },
  },
  rotate: {
    MELCHIOR:  { provider: "anthropic", model: "claude-sonnet-4-20250514" },
    BALTHASAR: { provider: "google",    model: "gemini-2.5-flash" },
    CASPER:    { provider: "openai",    model: "gpt-5" },
  },
  rotate2: {
    MELCHIOR:  { provider: "google",    model: "gemini-2.5-flash" },
    BALTHASAR: { provider: "openai",    model: "gpt-5" },
    CASPER:    { provider: "anthropic", model: "claude-sonnet-4-20250514" },
  },
};

let AGENT_PROVIDERS: Record<string, ProviderConfig> = PRESETS.default;

export function setPreset(name: string) {
  if (!PRESETS[name]) throw new Error(`Unknown preset: ${name}. Available: ${Object.keys(PRESETS).join(", ")}`);
  AGENT_PROVIDERS = PRESETS[name];
}

export { PRESETS };

// ── OpenAI ──
async function callOpenAI(system: string, prompt: string, model: string): Promise<{ content: string; usage: any }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const body: any = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  };
  if (model.startsWith("gpt-5")) {
    body.max_completion_tokens = 4096;
  } else {
    body.temperature = 0.7;
    body.max_tokens = 500;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(`OpenAI ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }
  const data = await res.json() as any;
  return { content: data.choices?.[0]?.message?.content?.trim() ?? "", usage: data.usage };
}

// ── Retry helper ──
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 3000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (e: any) {
      if (i < retries - 1 && (e.message?.includes("529") || e.message?.includes("Overloaded") || e.message?.includes("500"))) {
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Unreachable");
}

// ── Anthropic (Claude) ──
async function callAnthropic(system: string, prompt: string, model: string): Promise<{ content: string; usage: any }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const res = await withRetry(() => fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(`Anthropic ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }
  const data = await res.json() as any;
  const content = data.content?.map((c: any) => c.text).join("") ?? "";
  return {
    content: content.trim(),
    usage: { prompt_tokens: data.usage?.input_tokens ?? 0, completion_tokens: data.usage?.output_tokens ?? 0, total_tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0) },
  };
}

// ── Google (Gemini) ──
async function callGoogle(system: string, prompt: string, model: string): Promise<{ content: string; usage: any }> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            vote: { type: "string", enum: ["approve", "reject", "abstain"] },
            reasoning: { type: "string" },
            summary: { type: "string" },
          },
          required: ["vote", "reasoning", "summary"],
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(`Google ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }
  const data = await res.json() as any;
  const content = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  const meta = data.usageMetadata ?? {};
  return {
    content: content.trim(),
    usage: { prompt_tokens: meta.promptTokenCount ?? 0, completion_tokens: meta.candidatesTokenCount ?? 0, total_tokens: meta.totalTokenCount ?? 0 },
  };
}

// ── Unified call ──
async function callProvider(provider: Provider, system: string, prompt: string, model: string) {
  switch (provider) {
    case "openai": return callOpenAI(system, prompt, model);
    case "anthropic": return callAnthropic(system, prompt, model);
    case "google": return callGoogle(system, prompt, model);
  }
}

export interface QueryOptions {
  model?: string;          // Override model for all agents (single-provider mode)
  multiProvider?: boolean; // Use agent-specific providers (default: true if no model specified)
}

export async function queryAgent(
  agent: Agent,
  prompt: string,
  opts: QueryOptions = {},
): Promise<AgentResponse> {
  const useMulti = opts.multiProvider ?? !opts.model;
  let provider: Provider;
  let model: string;

  if (useMulti && AGENT_PROVIDERS[agent.name]) {
    const cfg = AGENT_PROVIDERS[agent.name];
    provider = cfg.provider;
    model = cfg.model;
  } else {
    provider = "openai";
    model = opts.model ?? "gpt-4o-mini";
  }

  const system = agent.systemPrompt;
  const { content, usage } = await callProvider(provider, system, prompt, model);

  // Track tokens
  if (usage) {
    _usage.promptTokens += usage.prompt_tokens ?? 0;
    _usage.completionTokens += usage.completion_tokens ?? 0;
    _usage.totalTokens += usage.total_tokens ?? 0;
  }
  _usage.calls++;

  if (!content) throw new Error(`${agent.name} (${provider}/${model}) returned empty response`);

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
      reasoning: `[Parse error from ${provider}/${model}] Raw: ${content.slice(0, 200)}`,
      summary: "Failed to parse structured response",
    };
  }
}

export { AGENT_PROVIDERS };
export type { Provider, ProviderConfig };
