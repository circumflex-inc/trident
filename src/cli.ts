#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { deliberate } from "./orchestrator.js";
import { AGENT_PROVIDERS } from "./llm/client.js";
import type { ConsensusResult, RoundResult } from "./agents/types.js";

function renderRound(round: RoundResult, verbose: boolean) {
  console.log(chalk.bold.magenta(`\n── Round ${round.round}: ${round.label} ──`));
  console.log();

  for (const { agent, response } of round.votes) {
    const voteColor =
      response.vote === "approve" ? chalk.green : response.vote === "reject" ? chalk.red : chalk.yellow;

    const providerInfo = AGENT_PROVIDERS[agent.name];
    const providerTag = providerInfo ? chalk.dim(` [${providerInfo.provider}/${providerInfo.model}]`) : "";

    console.log(`  ${agent.icon} ${chalk.bold(agent.name)} (${agent.codename})${providerTag}`);
    console.log(`     Vote: ${voteColor(response.vote.toUpperCase())}`);
    console.log(`     ${chalk.gray(response.summary)}`);
    if (verbose) {
      console.log(`     ${chalk.dim(response.reasoning)}`);
    }
  }
}

function renderResult(question: string, result: ConsensusResult, verbose: boolean, modelLabel: string) {
  console.log();
  console.log(chalk.bold.cyan("🔱 TRIDENT — AI Consensus System"));
  console.log(chalk.gray("━".repeat(55)));
  console.log();
  console.log(chalk.bold("📋 Question:"), question);

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
  console.log(chalk.gray("━".repeat(55)));
  console.log(chalk.bold("💰 Cost Breakdown:"));
  console.log(chalk.dim(`   Config:      ${modelLabel}`));
  console.log(chalk.dim(`   API Calls:   ${usage.calls}`));
  console.log(chalk.dim(`   Prompt:      ${usage.promptTokens.toLocaleString()} tokens`));
  console.log(chalk.dim(`   Completion:  ${usage.completionTokens.toLocaleString()} tokens`));
  console.log(chalk.dim(`   Total:       ${usage.totalTokens.toLocaleString()} tokens`));
  console.log();
}

const program = new Command();

program
  .name("trident")
  .description("🔱 AI Consensus System — MAGI-inspired multi-agent deliberation")
  .version("0.2.0")
  .argument("<question>", "The question or proposal to deliberate on")
  .option("-v, --verbose", "Show full reasoning from each agent")
  .option("-m, --model <model>", "Use single model for all agents (overrides multi-provider)")
  .option("-1, --single-round", "Skip deliberation, single round only")
  .action(async (question: string, opts: { verbose?: boolean; model?: string; singleRound?: boolean }) => {
    const rounds = opts.singleRound ? 1 : 3;
    const multiProvider = !opts.model;
    const modelLabel = multiProvider
      ? `Multi-provider (🔴 OpenAI/${AGENT_PROVIDERS.MELCHIOR.model} 🟡 Anthropic/${AGENT_PROVIDERS.BALTHASAR.model} 🔵 Google/${AGENT_PROVIDERS.CASPER.model})`
      : `Single: ${opts.model}`;

    console.log();
    console.log(chalk.dim(`🔱 Deliberating... (${rounds === 1 ? "single round" : "3-round"}, ${multiProvider ? "multi-provider" : opts.model})`));

    try {
      const result = await deliberate(question, { model: opts.model, rounds: rounds as 1 | 3, multiProvider });
      renderResult(question, result, !!opts.verbose, modelLabel);
    } catch (err: any) {
      console.error(chalk.red(`\n❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

program.parse();
