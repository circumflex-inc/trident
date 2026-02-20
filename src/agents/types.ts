export type Vote = "approve" | "reject" | "abstain";

export interface AgentResponse {
  vote: Vote;
  reasoning: string;
  summary: string;
}

export interface Agent {
  name: string;
  codename: string;
  icon: string;
  role: string;
  systemPrompt: string;
}

export interface ConsensusResult {
  verdict: Vote | "no-consensus";
  votes: { agent: Agent; response: AgentResponse }[];
  summary: string;
}
