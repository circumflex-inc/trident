#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { deliberate } from "./orchestrator.js";
import type { ConsensusResult } from "./agents/types.js";

function renderResult(question: string, result: ConsensusResult, verbose: boolean) {
  console.log();
  console.log(chalk.bold.cyan("🔱 TRIDENT — AI Consensus System"));
  console.log(chalk.gray("━".repeat(50)));
  console.log();
  console.log(chalk.bold("📋 Question:"), question);
  console.log();

  for (const { agent, response } of result.votes) {
    const voteColor =
      response.vote === "approve" ? chalk.green : response.vote === "reject" ? chalk.red : chalk.yellow;

    console.log(`${agent.icon} ${chalk.bold(agent.name)} (${agent.codename})`);
    console.log(`   Vote: ${voteColor(response.vote.toUpperCase())}`);
    console.log(`   ${chalk.gray(response.summary)}`);
    if (verbose) {
      console.log(`   ${chalk.dim(response.reasoning)}`);
    }
    console.log();
  }

  console.log(chalk.gray("━".repeat(50)));

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
}

const program = new Command();

program
  .name("trident")
  .description("🔱 AI Consensus System — MAGI-inspired multi-agent deliberation")
  .version("0.1.0")
  .argument("<question>", "The question or proposal to deliberate on")
  .option("-v, --verbose", "Show full reasoning from each agent")
  .option("-m, --model <model>", "LLM model to use", "gpt-4o-mini")
  .action(async (question: string, opts: { verbose?: boolean; model: string }) => {
    console.log();
    console.log(chalk.dim("🔱 Deliberating..."));

    try {
      const result = await deliberate(question, opts.model);
      renderResult(question, result, !!opts.verbose);
    } catch (err: any) {
      console.error(chalk.red(`\n❌ Error: ${err.message}`));
      if (err.message.includes("API key")) {
        console.error(chalk.yellow("   Set OPENAI_API_KEY environment variable"));
      }
      process.exit(1);
    }
  });

program.parse();
