# GitHub to Notion Sync Action

GitHub上のMarkdownドキュメントを自動的にNotionに同期するGitHub Actionsツールです。

## 機能

- 複数のMarkdownファイルを一括同期
- Globパターンによる柔軟なファイル指定
- ドキュメントグループごとに異なるNotionデータベースへ同期
- 自動リトライ機能
- 並列処理による高速同期

## セットアップ

### 1. Notion APIキーの取得

1. [Notion Developers](https://www.notion.so/my-integrations)でインテグレーションを作成
2. APIキーをコピー
3. 同期先のNotionデータベースにインテグレーションを追加

### 2. GitHub Secretsの設定

リポジトリの Settings > Secrets and variables > Actions で以下を設定：

- `NOTION_API_KEY`: Notion APIキー
- `NOTION_DATABASE_ID`: 同期先のNotionデータベースID

### 3. 設定ファイルの作成

`.github/notion-sync-config.yml` を作成して、同期対象のファイルを指定：

```yaml
global:
  retry_attempts: 3
  batch_size: 5

document_groups:
  main_docs:
    paths:
      - "README.md"
      - "CONTRIBUTING.md"
    notion_database_id: "${NOTION_DATABASE_ID}"
    properties:
      Category:
        type: "select"
        value: "Main"

  docs:
    paths:
      - "docs/**/*.md"
    notion_database_id: "${NOTION_DATABASE_ID}"

exclude:
  - "**/node_modules/**"
  - "**/.git/**"
```

## 使い方

### GitHub Actionsで自動同期

mainブランチにMarkdownファイルがpushされると自動的に同期されます。

### ローカルで実行

```bash
# 依存関係をインストール
npm install

# 同期を実行
npm run sync
```

## 設定オプション

### グローバル設定

- `retry_attempts`: エラー時のリトライ回数（デフォルト: 3）
- `batch_size`: 並列処理するファイル数（デフォルト: 5）

### ドキュメントグループ

各グループで以下を設定可能：

- `paths`: 同期対象のファイルパターン（Glob形式）
- `notion_database_id`: 同期先のNotionデータベースID
- `properties`: Notionページに設定する追加プロパティ

## Notionデータベースの必須プロパティ

同期先のNotionデータベースには以下のプロパティが必要です：

- `Name` (Title): ページタイトル
- `Path` (Text): ファイルパス
- `Last Updated` (Date): 最終更新日時

## 今後の拡張予定

詳細は [ENHANCEMENT_PLAN.md](./ENHANCEMENT_PLAN.md) を参照してください。

- Phase 2: 高度なMarkdown変換（コード、リスト、テーブル等）
- Phase 3: Front Matterメタデータ対応
- Phase 4: エラーハンドリングと通知機能の強化

## ライセンス

MIT
