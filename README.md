# 🔱 Trident

**AI合議システム** - 複数の自律AIエージェントによる多数決意思決定フレームワーク

## Concept

エヴァンゲリオンのMAGIシステムにインスパイアされた、複数AIエージェントの合議制意思決定システム。

3体（以上）のAIエージェントがそれぞれ異なる視点・性格で同じ問題を分析し、合議によってより信頼性の高い判断を導き出す。

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

### Default Agents

| Agent | Codename | Role | Perspective |
|-------|----------|------|-------------|
| 🔴 | MELCHIOR | Scientist | 論理・データ・効率重視 |
| 🟡 | BALTHASAR | Guardian | 倫理・安全性・ユーザー体験重視 |
| 🔵 | CASPER | Maverick | 直感・創造性・リスクテイク |

## Roadmap

- [ ] Phase 1: 実験 - 基本的な3エージェント合議プロトタイプ
- [ ] Phase 2: プロトタイプ - Web UI + 異なるLLMバックエンド
- [ ] Phase 3: プロダクト - カスタマイズ可能なMAGI + API提供

## Tech Stack

TBD - Phase 1で検証しながら決定

## License

MIT
