# GTD Project

階層型タスク管理アプリ。大・中・小の3階層でタスクを整理し、実行管理まで行う。

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [docs/architecture.md](docs/architecture.md) | システム全体構成・コンポーネント概要 |
| [docs/infrastructure.md](docs/infrastructure.md) | AWSインフラ構成（API Gateway / Lambda / DynamoDB） |
| [docs/database.md](docs/database.md) | DynamoDBテーブル設計 |
| [docs/api.md](docs/api.md) | APIエンドポイント仕様 |
| [openapi.yaml](openapi.yaml) | OpenAPI仕様書 |
| [redoc.html](redoc.html) | Redocで生成したAPIリファレンス（ブラウザで閲覧可） |
| [AGENTS.md](AGENTS.md) | 開発方針・作業ルール |

## 技術スタック

### フロントエンド
- React + Vite
- React Router

### バックエンド（予定）
- AWS API Gateway
- AWS Lambda（Node.js）
- Amazon DynamoDB

## リポジトリ構成

```
GTD-Project/
├── src/                   # フロントエンドソースコード
│   ├── App.jsx            # メインコンポーネント（ルーティング・画面定義）
│   ├── App.css            # スタイル
│   ├── main.jsx           # エントリーポイント
│   └── assets/            # 静的アセット
├── public/                # 公開静的ファイル
├── infra/                 # インフラコード（IaC）
├── docs/                  # ドキュメント
│   ├── architecture.md    # システム全体構成
│   ├── infrastructure.md  # AWSインフラ詳細
│   ├── database.md        # DynamoDBテーブル設計
│   └── api.md             # APIエンドポイント仕様
├── openapi.yaml           # OpenAPI仕様書
├── redoc.html             # Redoc生成APIリファレンス（open redoc.htmlで閲覧）
├── AGENTS.md              # 開発方針・作業ルール
├── index.html             # HTMLエントリーポイント
├── vite.config.js         # Vite設定
└── package.json
```

## 開発

```bash
# フロントエンド起動
npm run dev
```
