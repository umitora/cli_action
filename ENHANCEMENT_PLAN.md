# ドキュメント同期システム拡張プラン

## 📋 現状分析

### 現在の機能
- ✅ README.md → Notion 自動同期
- ✅ 基本的なMarkdown変換（見出し1-3、パラグラフ）
- ✅ GitHub → Notion 一方向同期
- ✅ GitHub Actions による自動化

### 制限事項
- ❌ README.md のみ対象（他のドキュメントは非対応）
- ❌ 限定的なMarkdown構文サポート
- ❌ 固定的なNotion構造
- ❌ エラーハンドリングが基本的
- ❌ テストカバレッジ不足

---

## 🎯 拡張の目標

業務レベルで使える、汎用的なドキュメント同期システムを構築する：

1. **多様なドキュメント形式への対応**
2. **柔軟な設定と拡張性**
3. **堅牢なエラーハンドリング**
4. **保守性とテスタビリティ**

---

## 🚀 Phase 1: 複数ドキュメント対応（基盤強化）

### 1.1 複数ファイル同期機能

**実装内容：**
```yaml
# 設定ファイル例: .github/notion-sync-config.yml
documents:
  - path: "README.md"
    notion_database_id: "${NOTION_DATABASE_ID}"
    page_title_prefix: "[Main]"

  - path: "docs/**/*.md"
    notion_database_id: "${NOTION_DOCS_DB_ID}"
    exclude:
      - "docs/drafts/**"
      - "docs/_templates/**"

  - path: "CHANGELOG.md"
    notion_database_id: "${NOTION_DATABASE_ID}"
    page_title_prefix: "[Changelog]"
```

**技術的変更：**
- Glob パターンマッチング（`minimatch` または `glob` ライブラリ）
- ファイル差分検出（変更されたファイルのみ同期）
- バッチ処理（複数ファイルの並列処理）

**期待効果：**
- ドキュメント全体の同期が可能
- リポジトリ構造がNotionに反映される

---

### 1.2 ディレクトリ構造の保持

**実装内容：**
```javascript
// ファイルパスを階層構造に変換
// docs/api/authentication.md → Notion上で親子関係を構築

const hierarchy = {
  'docs': {
    'api': {
      'authentication.md': pageObject,
      'rate-limits.md': pageObject
    },
    'guides': {
      'getting-started.md': pageObject
    }
  }
};
```

**Notion上の表現：**
- オプション1: Notion Database の階層プロパティ
- オプション2: Notion Pages の親子関係
- オプション3: Breadcrumb プロパティで階層パスを保存

---

## 🎨 Phase 2: 高度なMarkdown変換

### 2.1 拡張Markdown構文サポート

**対応する構文：**

| Markdown | Notion Block Type | 優先度 |
|----------|------------------|--------|
| ``` code ``` | Code block | 🔴 高 |
| `inline code` | Text with code style | 🔴 高 |
| - リスト | Bulleted list | 🔴 高 |
| 1. 番号リスト | Numbered list | 🔴 高 |
| - [ ] Todo | To-do list | 🟡 中 |
| > Quote | Quote block | 🟡 中 |
| \| table \| | Table | 🟡 中 |
| ![image](url) | Image | 🟢 低 |
| [link](url) | Rich text link | 🔴 高 |
| **bold**, *italic* | Text styling | 🔴 高 |
| --- | Divider | 🟢 低 |
| Callout | Callout block | 🟢 低 |

**実装アプローチ：**
```javascript
// マークダウンパーサーの導入
const marked = require('marked');
const { unified } = require('unified');
const remarkParse = require('remark-parse');
const remarkGfm = require('remark-gfm');

// AST (抽象構文木) からNotionブロックへの変換
function convertASTToNotionBlocks(ast) {
  // 各ノードタイプを対応するNotionブロックに変換
}
```

**推奨ライブラリ：**
- `remark` / `unified`: Markdown AST パーサー
- `remark-gfm`: GitHub Flavored Markdown サポート
- `notion-md-converter`: 既存のMD→Notion変換ライブラリ（参考）

---

### 2.2 Front Matter メタデータ対応

**Markdownの例：**
```markdown
---
title: "APIリファレンス"
author: "開発チーム"
tags: ["api", "reference", "v2"]
status: "published"
updated: 2024-01-15
notion_icon: "📚"
---

# APIリファレンス
本文...
```

**Notion プロパティへのマッピング：**
```javascript
properties: {
  'Name': { title: [{ text: { content: frontmatter.title } }] },
  'Author': { rich_text: [{ text: { content: frontmatter.author } }] },
  'Tags': { multi_select: frontmatter.tags.map(t => ({ name: t })) },
  'Status': { select: { name: frontmatter.status } },
  'Last Updated': { date: { start: frontmatter.updated } },
  'Path': { rich_text: [{ text: { content: filePath } }] }
}
```

**実装：**
- `gray-matter` ライブラリでFront Matterを抽出
- 設定ファイルでプロパティマッピングを定義
- デフォルト値の設定

---

## ⚙️ Phase 3: 柔軟な設定システム

### 3.1 設定ファイル構造

**`.github/notion-sync-config.yml`:**
```yaml
# グローバル設定
global:
  notion_version: "2022-06-28"
  retry_attempts: 3
  batch_size: 10

# デフォルトプロパティマッピング
default_properties:
  title_field: "Name"
  path_field: "Path"
  updated_field: "Last Updated"
  author_field: "Author"
  tags_field: "Tags"

# ドキュメントグループ定義
document_groups:
  main_docs:
    paths:
      - "README.md"
      - "CONTRIBUTING.md"
    notion_database_id: "${NOTION_MAIN_DB_ID}"
    properties:
      Category:
        type: "select"
        value: "Main Documentation"

  api_docs:
    paths:
      - "docs/api/**/*.md"
    notion_database_id: "${NOTION_API_DB_ID}"
    icon: "🔧"
    properties:
      Category:
        type: "select"
        value: "API"
      Version:
        type: "select"
        value_from_frontmatter: "version"

  changelogs:
    paths:
      - "CHANGELOG.md"
      - "docs/releases/**/*.md"
    notion_database_id: "${NOTION_CHANGELOG_DB_ID}"
    icon: "📝"

# 除外パターン
exclude:
  - "**/node_modules/**"
  - "**/.git/**"
  - "**/drafts/**"
  - "**/_*/**"  # アンダースコアで始まるディレクトリ

# 通知設定
notifications:
  on_success: true
  on_failure: true
  slack_webhook: "${SLACK_WEBHOOK_URL}"
  discord_webhook: "${DISCORD_WEBHOOK_URL}"
```

---

### 3.2 設定の読み込みと検証

**実装：**
```javascript
const yaml = require('js-yaml');
const Ajv = require('ajv');

// スキーマ検証
const configSchema = {
  type: 'object',
  required: ['document_groups'],
  properties: {
    global: { type: 'object' },
    document_groups: {
      type: 'object',
      minProperties: 1
    }
  }
};

function loadConfig(configPath) {
  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  const ajv = new Ajv();
  const validate = ajv.compile(configSchema);

  if (!validate(config)) {
    throw new Error(`Invalid config: ${JSON.stringify(validate.errors)}`);
  }

  return config;
}
```

---

## 🛡️ Phase 4: 堅牢性の向上

### 4.1 エラーハンドリングとリトライ

**実装内容：**
```javascript
class NotionSyncError extends Error {
  constructor(message, code, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

async function syncWithRetry(syncFn, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await syncFn();
    } catch (error) {
      lastError = error;

      // リトライ可能なエラーか判定
      if (!isRetryable(error) || attempt === maxRetries) {
        throw error;
      }

      // 指数バックオフ
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`Retry ${attempt}/${maxRetries} after ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

function isRetryable(error) {
  // Notion API のレート制限、一時的なネットワークエラー等
  return error.code === 'rate_limited' ||
         error.code === 'service_unavailable' ||
         error.code === 'ETIMEDOUT';
}
```

---

### 4.2 差分検出と最適化

**実装アプローチ：**
```javascript
// ファイルのハッシュを計算してNotionに保存
const crypto = require('crypto');

function calculateFileHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function needsUpdate(filePath, content, notionPage) {
  const currentHash = calculateFileHash(content);
  const storedHash = notionPage.properties['Content Hash']?.rich_text[0]?.text?.content;

  return currentHash !== storedHash;
}

// 同期時にハッシュも保存
properties: {
  // ... 既存のプロパティ
  'Content Hash': {
    rich_text: [{ text: { content: calculateFileHash(content) } }]
  }
}
```

**期待効果：**
- 不要な API 呼び出しを削減
- 同期速度の向上
- Notion API レート制限の回避

---

### 4.3 通知システム

**実装内容：**
```javascript
async function sendNotification(config, result) {
  const message = formatNotificationMessage(result);

  // Slack通知
  if (config.notifications.slack_webhook) {
    await fetch(config.notifications.slack_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `📚 Notion Sync ${result.status}`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: message }
          }
        ]
      })
    });
  }

  // Discord通知
  if (config.notifications.discord_webhook) {
    await fetch(config.notifications.discord_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `Notion Sync ${result.status}`,
          description: message,
          color: result.status === 'SUCCESS' ? 0x00ff00 : 0xff0000
        }]
      })
    });
  }
}

function formatNotificationMessage(result) {
  return `
**Sync Result**: ${result.status}
**Files Processed**: ${result.filesProcessed}
**Updated**: ${result.updated}
**Created**: ${result.created}
**Errors**: ${result.errors}
**Duration**: ${result.duration}ms
  `.trim();
}
```

---

## 🧪 Phase 5: テストとドキュメント

### 5.1 テストスイート

**構造：**
```
Tests/
├── unit/
│   ├── markdown-converter.test.js
│   ├── config-loader.test.js
│   ├── file-matcher.test.js
│   └── hash-calculator.test.js
├── integration/
│   ├── notion-sync.test.js
│   └── workflow.test.js
└── fixtures/
    ├── sample.md
    ├── config.yml
    └── notion-responses.json
```

**実装例（Jest）：**
```javascript
// Tests/unit/markdown-converter.test.js
const { convertMarkdownToNotionBlocks } = require('../../Scripts/markdown-converter');

describe('Markdown to Notion Converter', () => {
  test('converts headings correctly', () => {
    const markdown = '# Heading 1\n## Heading 2';
    const blocks = convertMarkdownToNotionBlocks(markdown);

    expect(blocks[0].type).toBe('heading_1');
    expect(blocks[0].heading_1.rich_text[0].text.content).toBe('Heading 1');
    expect(blocks[1].type).toBe('heading_2');
  });

  test('converts code blocks with language', () => {
    const markdown = '```javascript\nconst x = 1;\n```';
    const blocks = convertMarkdownToNotionBlocks(markdown);

    expect(blocks[0].type).toBe('code');
    expect(blocks[0].code.language).toBe('javascript');
    expect(blocks[0].code.rich_text[0].text.content).toBe('const x = 1;');
  });

  test('converts lists', () => {
    const markdown = '- Item 1\n- Item 2\n  - Nested';
    const blocks = convertMarkdownToNotionBlocks(markdown);

    expect(blocks[0].type).toBe('bulleted_list_item');
    expect(blocks[1].type).toBe('bulleted_list_item');
  });
});
```

---

### 5.2 ドキュメント

**作成するドキュメント：**

1. **README.md** （更新）
   - プロジェクト概要
   - クイックスタート
   - 基本的な使い方

2. **docs/SETUP.md**
   - Notion API キーの取得方法
   - データベース設定
   - GitHub Secrets の設定

3. **docs/CONFIGURATION.md**
   - 設定ファイルの詳細
   - プロパティマッピング
   - 高度な設定例

4. **docs/TROUBLESHOOTING.md**
   - よくある問題と解決方法
   - エラーコード一覧
   - デバッグ方法

5. **docs/EXAMPLES.md**
   - 実用的な設定例
   - ユースケース集

---

## 📦 Phase 6: 追加機能（オプション）

### 6.1 双方向同期（Notion → GitHub）

**実装アプローチ：**
- Notion Webhooks または定期ポーリング
- Notion の変更を検出
- GitHub に自動コミット（Pull Request作成）
- 競合解決メカニズム

**課題：**
- Notion → Markdown 変換の複雑性
- 競合管理
- セキュリティ（自動コミットの承認フロー）

---

### 6.2 プレビュー機能

**実装内容：**
- Pull Request でドキュメント変更時
- Notion プレビューページを自動生成
- PR コメントにプレビューリンクを投稿
- マージ後に本番ページへ反映

---

### 6.3 マルチプラットフォーム対応

**対応プラットフォーム：**
- Confluence
- GitBook
- DocuWiki
- Markdown Wiki (GitHub Wiki, GitLab Wiki)

**実装：**
- プラグインアーキテクチャ
- 各プラットフォーム用のアダプター

---

## 🗓️ 実装スケジュールの推奨

### ステップ1: 基盤強化（1-2週）
- [ ] Phase 1.1: 複数ファイル対応
- [ ] Phase 3.1: 設定ファイル導入
- [ ] Phase 4.1: エラーハンドリング

### ステップ2: 機能拡張（2-3週）
- [ ] Phase 2.1: 拡張Markdown構文
- [ ] Phase 2.2: Front Matter対応
- [ ] Phase 4.2: 差分検出

### ステップ3: 運用改善（1週）
- [ ] Phase 4.3: 通知システム
- [ ] Phase 5.1: テストスイート
- [ ] Phase 5.2: ドキュメント

### ステップ4: 高度な機能（オプション）
- [ ] Phase 1.2: ディレクトリ構造保持
- [ ] Phase 6: 追加機能

---

## 💡 技術スタック

### 必須ライブラリ
```json
{
  "dependencies": {
    "@notionhq/client": "^2.2.14",
    "gray-matter": "^4.0.3",
    "glob": "^10.3.10",
    "js-yaml": "^4.1.0",
    "unified": "^11.0.4",
    "remark-parse": "^11.0.0",
    "remark-gfm": "^4.0.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/node": "^20.10.0",
    "ajv": "^8.12.0"
  }
}
```

---

## 🎯 成功指標

1. **機能性**
   - ✅ 複数のMarkdownファイルを同期できる
   - ✅ 10種類以上のMarkdown構文をサポート
   - ✅ 設定ファイルでカスタマイズ可能

2. **堅牢性**
   - ✅ エラー発生時に自動リトライ
   - ✅ 失敗時に通知が届く
   - ✅ 差分検出で不要な同期を回避

3. **保守性**
   - ✅ テストカバレッジ 80% 以上
   - ✅ 詳細なドキュメント
   - ✅ 設定の検証機能

4. **パフォーマンス**
   - ✅ 100ファイルの同期が5分以内
   - ✅ API レート制限に抵触しない

---

## 📚 参考リソース

- [Notion API Reference](https://developers.notion.com/reference)
- [Remark (Markdown AST)](https://github.com/remarkjs/remark)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Jest Testing Framework](https://jestjs.io/)
