import { melchior, balthasar, casper } from "./agents/index.js";
import type { Agent, AgentResponse, RoundResult } from "./agents/types.js";
import { queryAgent, getUsage, resetUsage, AGENT_PROVIDERS, type QueryOptions } from "./llm/client.js";
import { resolveConsensus } from "./consensus.js";

const agents: Agent[] = [melchior, balthasar, casper];

async function round1(question: string, opts: QueryOptions): Promise<RoundResult> {
  const votes = await Promise.all(
    agents.map(async (agent) => ({
      agent,
      response: await queryAgent(agent, question, opts),
    }))
  );
  return { round: 1, label: "Independent Analysis", votes };
}

async function round2(question: string, r1: RoundResult, opts: QueryOptions): Promise<RoundResult> {
  const votes = await Promise.all(
    agents.map(async (agent) => {
      const othersOpinions = r1.votes
        .filter((v) => v.agent.name !== agent.name)
        .map((v) => `${v.agent.icon} ${v.agent.name} (${v.agent.codename}) voted ${v.response.vote.toUpperCase()}:\n"${v.response.reasoning}"`)
        .join("\n\n");

      const deliberationPrompt = `Original question: ${question}

You previously voted and gave your opinion. Now the other agents have shared their views:

${othersOpinions}

Consider their perspectives carefully:
- Are there valid points you initially missed?
- Can you find common ground?
- Do their arguments change your assessment?
- What conditions or compromises could lead to agreement?

After reflecting on the discussion, give your REVISED (or unchanged) verdict.
You MUST respond in valid JSON with exactly these fields:
{
  "vote": "approve" | "reject" | "abstain",
  "reasoning": "Your revised analysis considering others' viewpoints (2-4 sentences)",
  "summary": "One-line revised verdict"
}

Respond ONLY with the JSON object, no other text.`;

      return { agent, response: await queryAgent(agent, deliberationPrompt, opts) };
    })
  );
  return { round: 2, label: "Deliberation", votes };
}

async function round3(question: string, r1: RoundResult, r2: RoundResult, opts: QueryOptions): Promise<RoundResult> {
  const votes = await Promise.all(
    agents.map(async (agent) => {
      const r1Vote = r1.votes.find((v) => v.agent.name === agent.name)!;
      const r2Opinions = r2.votes
        .map((v) => `${v.agent.icon} ${v.agent.name}: ${v.response.vote.toUpperCase()} - "${v.response.summary}"`)
        .join("\n");

      const finalPrompt = `Original question: ${question}

This is the FINAL round. Here's how the deliberation has progressed:

YOUR initial position: ${r1Vote.response.vote.toUpperCase()} - "${r1Vote.response.reasoning}"

After deliberation, everyone's revised positions:
${r2Opinions}

Give your FINAL vote. This is your last chance to:
- Lock in your position if you're confident
- Shift if the discussion has genuinely changed your mind
- Find a conditional approval/rejection if there's near-consensus

You MUST respond in valid JSON with exactly these fields:
{
  "vote": "approve" | "reject" | "abstain",
  "reasoning": "Your final verdict with any conditions or caveats (2-4 sentences)",
  "summary": "One-line final verdict"
}

Respond ONLY with the JSON object, no other text.`;

      return { agent, response: await queryAgent(agent, finalPrompt, opts) };
    })
  );
  return { round: 3, label: "Final Vote", votes };
}

export interface DeliberateOptions {
  model?: string;
  rounds?: 1 | 3;
  multiProvider?: boolean;
}

export async function deliberate(question: string, opts: DeliberateOptions = {}) {
  const { model, rounds = 3, multiProvider } = opts;
  const queryOpts: QueryOptions = { model, multiProvider };
  resetUsage();

  const r1 = await round1(question, queryOpts);
  if (rounds === 1) return resolveConsensus(r1.votes, [r1], getUsage());

  const r2 = await round2(question, r1, queryOpts);
  const r3 = await round3(question, r1, r2, queryOpts);
  return resolveConsensus(r3.votes, [r1, r2, r3], getUsage());
}
