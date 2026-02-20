import { melchior, balthasar, casper } from "./agents/index.js";
import type { Agent, AgentResponse } from "./agents/types.js";
import { queryAgent } from "./llm/client.js";
import { resolveConsensus } from "./consensus.js";

export async function deliberate(question: string, model?: string) {
  const agents: Agent[] = [melchior, balthasar, casper];

  // Query all agents in parallel
  const results = await Promise.all(
    agents.map(async (agent) => {
      const response = await queryAgent(agent, question, model);
      return { agent, response };
    })
  );

  return resolveConsensus(results);
}
