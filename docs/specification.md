# 🔱 Trident — 仕様書

## 概要

**Trident**は、エヴァンゲリオンのMAGIシステムにインスパイアされた**AI合議システム**。3体の自律AIエージェントが異なる視点で同じ問題を分析し、マルチラウンドの討議を経て多数決で意思決定を行う。

### コンセプト
- 単一AIの判断ではなく、**複数の異なるAIモデルによる合議制**で信頼性を高める
- 各エージェントに固有の「性格」「視点」「役割」を与え、多角的な分析を実現
- 3ラウンドの討議プロセスで、相互の意見を踏まえた深い議論を行う

---

## アーキテクチャ

```
        ┌─────────────┐
        │ Orchestrator │
        └──────┬──────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│ 🔴    │ │ 🟡    │ │ 🔵    │
│MELCHI-│ │BALTHA-│ │CASPER │
│OR     │ │SAR    │ │       │
│OpenAI │ │Claude │ │Gemini │
└───┬───┘ └───┬───┘ └───┬───┘
    │         │         │
    └─────────┼─────────┘
              │
       ┌──────▼──────┐
       │  Consensus  │
       │   Engine    │
       └─────────────┘
```

---

## エージェント定義

### 🔴 MELCHIOR — Scientist（科学者）
| 項目 | 内容 |
|------|------|
| Provider | OpenAI |
| Model | `gpt-5` |
| 視点 | 論理・データ・効率 |
| 性格 | 冷徹で精密、数値と確率で語る |
| 判断基準 | エビデンス、コスト効率、スケーラビリティ、歴史的前例 |

### 🟡 BALTHASAR — Guardian（守護者）
| 項目 | 内容 |
|------|------|
| Provider | Anthropic |
| Model | `claude-sonnet-4-6` |
| 視点 | 倫理・安全性・ユーザー体験 |
| 性格 | 温かいが断固、保護者のような存在 |
| 判断基準 | 倫理的影響、安全リスク、公平性、包摂性、長期的社会影響 |

### 🔵 CASPER — Maverick（破壊者）
| 項目 | 内容 |
|------|------|
| Provider | Google |
| Model | `gemini-3-flash-preview` |
| 視点 | 直感・創造性・リスクテイク |
| 性格 | 大胆で型破り、エスプレッソ3杯後のビジョナリー |
| 判断基準 | イノベーション可能性、見逃されている視点、攻めのリスク |

---

## 討議プロセス（3ラウンド制）

### Round 1: Independent Analysis（独立分析）
- 各エージェントが**独立して**質問を分析
- 他のエージェントの意見は見えない
- 各自が `vote`（approve/reject/abstain）+ `reasoning` + `summary` を返す

### Round 2: Deliberation（討議）
- 各エージェントに**他の2者の意見**が提示される
- 相手の論点を検討し、以下を考慮：
  - 見落としていた有効な指摘はあるか？
  - 共通点を見出せるか？
  - 条件付きで合意できる妥協点はあるか？
- 意見を修正 or 維持して再投票

### Round 3: Final Vote（最終投票）
- Round 1の自分の初期意見と、Round 2の全員の修正意見が提示される
- 最終的な判断を下す：
  - 確信があれば自分の立場を維持
  - 議論で考えが変わったならシフト
  - 条件付きの承認/却下も可能

### 合意判定（Consensus Engine）
- **単純多数決**: 3者中2者が同じ投票 → 決定
- 全員abstain or 過半数なし → **NO CONSENSUS**
- 投票の種類: `approve` / `reject` / `abstain`

---

## レスポンス形式

各エージェントはJSON形式で回答する：

```json
{
  "vote": "approve" | "reject" | "abstain",
  "reasoning": "分析の詳細（2-4文）",
  "summary": "一行の結論"
}
```

---

## CLI仕様

### 基本使用法
```bash
npx tsx src/cli.ts "<質問>"
```

### オプション
| Flag | 説明 | デフォルト |
|------|------|-----------|
| `-v, --verbose` | 各エージェントの詳細な推論を表示 | off |
| `-m, --model <model>` | 全エージェントに単一モデルを使用 | multi-provider |
| `-1, --single-round` | 討議をスキップし1ラウンドのみ | 3ラウンド |
| `-p, --preset <name>` | プロバイダーローテーション | default |

### プリセット
| Preset | MELCHIOR | BALTHASAR | CASPER |
|--------|----------|-----------|--------|
| `default` | OpenAI/gpt-5 | Anthropic/claude-sonnet-4-6 | Google/gemini-3-flash-preview |
| `rotate` | Anthropic/claude-sonnet-4-6 | Google/gemini-3-flash-preview | OpenAI/gpt-5 |
| `rotate2` | Google/gemini-3-flash-preview | OpenAI/gpt-5 | Anthropic/claude-sonnet-4-6 |

---

## 技術仕様

### スタック
- **言語**: TypeScript
- **ランタイム**: Node.js + tsx
- **CLI**: commander
- **表示**: chalk（カラー出力）
- **API**: 各プロバイダーのREST API（SDKなし、fetch直接）

### ディレクトリ構成
```
src/
├── cli.ts              # CLIエントリポイント
├── orchestrator.ts     # 3ラウンド討議の制御
├── consensus.ts        # 多数決合意エンジン
├── agents/
│   ├── types.ts        # 型定義
│   ├── melchior.ts     # 🔴 科学者エージェント
│   ├── balthasar.ts    # 🟡 倫理エージェント
│   ├── casper.ts       # 🔵 破壊者エージェント
│   └── index.ts        # エクスポート
└── llm/
    └── client.ts       # マルチプロバイダーLLMクライアント
```

### API仕様

#### OpenAI
- エンドポイント: `POST https://api.openai.com/v1/chat/completions`
- 認証: `Authorization: Bearer $OPENAI_API_KEY`
- gpt-5制約: `temperature`固定（カスタム不可）、`max_completion_tokens`使用

#### Anthropic
- エンドポイント: `POST https://api.anthropic.com/v1/messages`
- 認証: `x-api-key: $ANTHROPIC_API_KEY`
- リトライ: 529/500エラー時に3回まで自動リトライ（バックオフ付き）

#### Google
- エンドポイント: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- 認証: `key=$GOOGLE_API_KEY`（クエリパラメータ）
- JSON安定化: `responseMimeType: "application/json"` + `responseSchema`で構造化出力を強制

### トークン追跡
- 全APIコールのprompt/completion/totalトークンを集計
- CLI出力にコスト概算を表示

---

## 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `OPENAI_API_KEY` | ✅ | OpenAI APIキー |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic APIキー |
| `GOOGLE_API_KEY` | ✅ | Google AI APIキー |

---

## 実験結果サマリ（Phase 1）

### モデル別比較（同一質問: 政治予測）
| Model | 結果 | コスト | 特徴 |
|-------|------|--------|------|
| gpt-4o-mini | NO CONSENSUS | $0.0011 | MELCHIORが揺れて戻る |
| gpt-4.1 | NO CONSENSUS | $0.0013 | 全員ブレない |
| gpt-5 | APPROVED | $0.0082 | 全員合意、数値予測付き |
| gpt-5.2 | NO CONSENSUS | $0.0023 | 全員「断定は危険」に合意 |

### 発見・知見
1. **モデルが賢くなるほど「安易に断定しない」傾向**（gpt-5.2が最顕著）
2. **キャラ（プロンプト）はモデルの個性を上書きする**（ローテ実験で確認）
3. **Claude は倫理面で最もブレない**（BALTHASARに最適）
4. **GPT-5 はどのキャラでも柔軟に対応**
5. **Gemini はスキーマ指定で安定化**、表現力が高い

---

## ロードマップ

- [x] **Phase 1**: CLI プロトタイプ ✅ (2026-02-20)
  - 3エージェント合議
  - マルチラウンド討議
  - マルチプロバイダー
  - ローテーションプリセット
- [ ] **Phase 2**: Web UI
  - ブラウザから質問投稿
  - リアルタイムで討議過程を表示
  - 結果の保存・比較
- [ ] **Phase 3**: カスタマイズ & API
  - カスタムエージェント定義
  - REST API提供
  - Webhook連携

---

## ライセンス

MIT
