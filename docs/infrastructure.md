# インフラ構成

## AWS サービス構成

| サービス | 用途 |
|---|---|
| API Gateway | RESTエンドポイントの公開 |
| Lambda | バックエンドロジックの実行 |
| DynamoDB | ノードツリーの永続化 |

## API Gateway

- REST API（HTTP API）でエンドポイントを定義
- すべてのルートを1つのLambda関数に転送（プロキシ統合）
- フェーズ2でCognitoオーソライザーを追加予定

## Lambda

- ランタイム: Node.js（予定）
- 関数は1つにまとめてルーティングをコード内で処理
- 環境変数でDynamoDBのテーブル名を管理

```
lambda/
└── handler.js   # 全エンドポイントをここで処理
```

### 関数の責務

| エンドポイント | 処理内容 |
|---|---|
| `GET /api/nodes` | DynamoDBから `data` を取得してパースして返す |
| `POST /api/nodes` | 大階層を追加してDynamoDBに上書き保存 |
| `POST /api/nodes/:largeId/children` | 中階層を追加して上書き保存 |
| `POST /api/nodes/:largeId/children/:middleId/children` | 小階層を追加して上書き保存 |
| `PATCH /api/nodes/:id` | 該当IDのタイトルを更新して上書き保存 |

## DynamoDB

詳細は [database.md](./database.md) を参照。

## 将来の拡張

- Cognito User Pool（認証追加時）
- CloudFront（フロントエンドのCDN配信）
- S3（フロントエンドの静的ホスティング）
