# 🔱 Trident

**AI合議システム** - 複数の自律AIエージェントによる多数決意思決定フレームワーク

## Concept

エヴァンゲリオンのMAGIシステムにインスパイアされた、複数AIエージェントの合議制意思決定システム。

3体のAIエージェントがそれぞれ異なる視点・性格で同じ問題を分析し、合議によってより信頼性の高い判断を導き出す。

## Quick Start

```bash
# Install dependencies
npm install

# Set your OpenAI API key
export OPENAI_API_KEY=sk-...

# Run a deliberation
npx tsx src/cli.ts "Should we rewrite our backend in Rust?"

# With verbose reasoning
npx tsx src/cli.ts -v "Is it worth investing in quantum computing stocks?"

# Use a different model
npx tsx src/cli.ts -m gpt-4o "Should we launch this feature before testing is complete?"
```

## Architecture

```
        ┌─────────────┐
        │ Orchestrator │
        └──────┬──────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│ Agent │ │ Agent │ │ Agent │
│  🔴   │ │  🟡   │ │  🔵   │
│Logic  │ │Ethics │ │Intuit │
└───┬───┘ └───┬───┘ └───┬───┘
    │         │         │
    └─────────┼─────────┘
              │
       ┌──────▼──────┐
       │  Consensus  │
       │   Engine    │
       └─────────────┘
```

### Agents

| Agent | Codename | Role | Perspective |
|-------|----------|------|-------------|
| 🔴 | MELCHIOR | Scientist | 論理・データ・効率重視 |
| 🟡 | BALTHASAR | Guardian | 倫理・安全性・ユーザー体験重視 |
| 🔵 | CASPER | Maverick | 直感・創造性・リスクテイク |

### Consensus

- Simple majority: 2/3 agents agree → decision made
- All abstain or split → "no consensus"

## Project Structure

```
src/
├── cli.ts              # CLI entry point
├── orchestrator.ts     # Sends question to all agents in parallel
├── consensus.ts        # Majority vote engine
├── agents/
│   ├── types.ts        # Agent & vote interfaces
│   ├── melchior.ts     # 🔴 Logic agent
│   ├── balthasar.ts    # 🟡 Ethics agent
│   └── casper.ts       # 🔵 Creativity agent
└── llm/
    └── client.ts       # OpenAI API client
```

## Roadmap

- [x] Phase 1: CLI prototype with 3 agents + consensus
- [ ] Phase 2: Web UI + multiple LLM backends
- [ ] Phase 3: Custom agents + API

## License

MIT
