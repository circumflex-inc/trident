import type { Agent, AgentResponse, ConsensusResult, Vote } from "./agents/types.js";

export function resolveConsensus(
  votes: { agent: Agent; response: AgentResponse }[]
): ConsensusResult {
  const counts: Record<Vote, number> = { approve: 0, reject: 0, abstain: 0 };
  for (const v of votes) counts[v.response.vote]++;

  const total = votes.length;
  const majority = Math.ceil(total / 2);

  let verdict: ConsensusResult["verdict"] = "no-consensus";
  if (counts.approve >= majority) verdict = "approve";
  else if (counts.reject >= majority) verdict = "reject";

  const summaryParts = votes.map(
    (v) => `${v.agent.icon} ${v.agent.name}: ${v.response.vote.toUpperCase()}`
  );

  const verdictLabel =
    verdict === "no-consensus"
      ? "⚠️  NO CONSENSUS"
      : verdict === "approve"
        ? "✅ APPROVED"
        : "❌ REJECTED";

  return {
    verdict,
    votes,
    summary: `${verdictLabel} (${summaryParts.join(" / ")})`,
  };
}
