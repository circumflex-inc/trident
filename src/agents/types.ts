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

export interface RoundResult {
  round: number;
  label: string;
  votes: { agent: Agent; response: AgentResponse }[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  calls: number;
}

export interface ConsensusResult {
  verdict: Vote | "no-consensus";
  votes: { agent: Agent; response: AgentResponse }[];
  rounds: RoundResult[];
  summary: string;
  usage: TokenUsage;
}
