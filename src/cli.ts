#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { deliberate } from "./orchestrator.js";
import type { ConsensusResult, RoundResult } from "./agents/types.js";

// gpt-4o-mini pricing (per 1M tokens)
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4-turbo": { input: 10.00, output: 30.00 },
};

function renderRound(round: RoundResult, verbose: boolean) {
  console.log(chalk.bold.magenta(`\n── Round ${round.round}: ${round.label} ──`));
  console.log();

  for (const { agent, response } of round.votes) {
    const voteColor =
      response.vote === "approve" ? chalk.green : response.vote === "reject" ? chalk.red : chalk.yellow;

    console.log(`  ${agent.icon} ${chalk.bold(agent.name)} (${agent.codename})`);
    console.log(`     Vote: ${voteColor(response.vote.toUpperCase())}`);
    console.log(`     ${chalk.gray(response.summary)}`);
    if (verbose) {
      console.log(`     ${chalk.dim(response.reasoning)}`);
    }
  }
}

function renderResult(question: string, result: ConsensusResult, verbose: boolean, model: string) {
  console.log();
  console.log(chalk.bold.cyan("🔱 TRIDENT — AI Consensus System"));
  console.log(chalk.gray("━".repeat(55)));
  console.log();
  console.log(chalk.bold("📋 Question:"), question);

  // Show all rounds
  for (const round of result.rounds) {
    renderRound(round, verbose);
  }

  console.log();
  console.log(chalk.gray("━".repeat(55)));

  const verdictColor =
    result.verdict === "approve"
      ? chalk.bold.green
      : result.verdict === "reject"
        ? chalk.bold.red
        : chalk.bold.yellow;

  const verdictLabel =
    result.verdict === "no-consensus"
      ? "⚠️  NO CONSENSUS"
      : result.verdict === "approve"
        ? "✅ APPROVED"
        : "❌ REJECTED";

  console.log();
  console.log(verdictColor(`  ${verdictLabel}`));
  console.log();

  // Cost breakdown
  const { usage } = result;
  const pricing = PRICING[model] ?? PRICING["gpt-4o-mini"];
  const inputCost = (usage.promptTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  console.log(chalk.gray("━".repeat(55)));
  console.log(chalk.bold("💰 Cost Breakdown:"));
  console.log(chalk.dim(`   Model:       ${model}`));
  console.log(chalk.dim(`   API Calls:   ${usage.calls}`));
  console.log(chalk.dim(`   Prompt:      ${usage.promptTokens.toLocaleString()} tokens ($${inputCost.toFixed(4)})`));
  console.log(chalk.dim(`   Completion:  ${usage.completionTokens.toLocaleString()} tokens ($${outputCost.toFixed(4)})`));
  console.log(chalk.dim(`   Total:       ${usage.totalTokens.toLocaleString()} tokens`));
  console.log(chalk.bold(`   💵 Cost:     $${totalCost.toFixed(4)}`));
  console.log();
}

const program = new Command();

program
  .name("trident")
  .description("🔱 AI Consensus System — MAGI-inspired multi-agent deliberation")
  .version("0.1.0")
  .argument("<question>", "The question or proposal to deliberate on")
  .option("-v, --verbose", "Show full reasoning from each agent")
  .option("-m, --model <model>", "LLM model to use", "gpt-4o-mini")
  .option("-1, --single-round", "Skip deliberation, single round only")
  .action(async (question: string, opts: { verbose?: boolean; model: string; singleRound?: boolean }) => {
    const rounds = opts.singleRound ? 1 : 3;
    console.log();
    console.log(chalk.dim(`🔱 Deliberating... (${rounds === 1 ? "single round" : "3-round deliberation"})`));

    try {
      const result = await deliberate(question, { model: opts.model, rounds: rounds as 1 | 3 });
      renderResult(question, result, !!opts.verbose, opts.model);
    } catch (err: any) {
      console.error(chalk.red(`\n❌ Error: ${err.message}`));
      if (err.message.includes("API key")) {
        console.error(chalk.yellow("   Set OPENAI_API_KEY environment variable"));
      }
      process.exit(1);
    }
  });

program.parse();
