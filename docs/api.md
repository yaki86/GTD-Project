# API ドキュメント

## 概要

GTDアプリのバックエンドAPI仕様書。  
フロントエンドはこの契約に基づいてデータを取得・操作する。

**Base URL:** `http://localhost:3000/api`

OpenAPI仕様書: [openapi.yaml](../openapi.yaml)

---

## データモデル

### Node（共通スキーマ）

大・中・小すべての階層で共通の構造を持つ。

```json
{
  "id": "string",
  "title": "string",
  "children": [ Node ]
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | サーバーが払い出す一意のID（UUID v4） |
| `title` | string | ノードの表示名（空文字列も許容） |
| `children` | Node[] | 子ノードの配列。末端（小階層）は常に `[]` |

### 階層ルール

- **大階層（Large）** — ルートレベル。`children` に中階層を持つ
- **中階層（Middle）** — 大階層の直下。`children` に小階層を持つ
- **小階層（Small）** — 中階層の直下。`children` は常に `[]`
- 階層は最大3段階。小階層にさらに子を追加することはできない

---

## エンドポイント一覧

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/nodes` | 全ノードをツリー形式で取得 |
| POST | `/api/nodes` | 大階層ノードを新規作成 |
| POST | `/api/nodes/:largeId/children` | 中階層ノードを新規作成 |
| POST | `/api/nodes/:largeId/children/:middleId/children` | 小階層ノードを新規作成 |
| PATCH | `/api/nodes/:id` | ノードのタイトルを更新 |

---

## 詳細

### GET /api/nodes

全ノードを3階層ネストのツリー形式で返す。

**レスポンス `200 OK`**

```json
[
  {
    "id": "large-1",
    "title": "大グループA",
    "children": [
      {
        "id": "middle-1",
        "title": "中グループA-1",
        "children": [
          {
            "id": "small-1",
            "title": "小グループA-1-1",
            "children": []
          }
        ]
      }
    ]
  }
]
```

大階層が0件の場合は空配列 `[]` を返す。

---

### POST /api/nodes

大階層ノードを新規作成する。

**リクエストボディ**

```json
{
  "title": "新規大階層"
}
```

**レスポンス `201 Created`**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "新規大階層",
  "children": []
}
```

---

### POST /api/nodes/:largeId/children

指定した大階層の直下に中階層ノードを新規作成する。

**レスポンス `201 Created`**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "新規中階層",
  "children": []
}
```

**エラー**

- `404 Not Found` — `largeId` に対応するノードが存在しない

---

### POST /api/nodes/:largeId/children/:middleId/children

指定した中階層の直下に小階層ノードを新規作成する。

**レスポンス `201 Created`**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "title": "新規小階層",
  "children": []
}
```

**エラー**

- `404 Not Found` — `largeId` または `middleId` に対応するノードが存在しない

---

### PATCH /api/nodes/:id

指定したIDのノードのタイトルを更新する。大・中・小いずれの階層も対象。

**リクエストボディ**

```json
{
  "title": "更新後のタイトル"
}
```

**レスポンス `200 OK`**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "更新後のタイトル"
}
```

**エラー**

- `404 Not Found` — 対象ノードが存在しない

---

## エラーレスポンス形式

```json
{
  "error": "エラーの説明メッセージ"
}
```

---

## 補足

- IDはサーバー側でUUID v4を払い出す（フロントからIDを指定することはしない）
- 認証・認可は現フェーズのスコープ外
