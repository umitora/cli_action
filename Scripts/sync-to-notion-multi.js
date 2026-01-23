// Scripts/sync-to-notion-multi.js
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');
const { loadConfig, getGlobalConfig } = require('./config-loader');
const { getDocumentGroups } = require('./file-matcher');

// Notion クライアントを初期化
const notion = new Client({ auth: process.env.NOTION_API_KEY });

/**
 * Markdownファイルを Notion に同期
 * @param {string} filePath - ファイルパス
 * @param {string} databaseId - Notion データベース ID
 * @param {object} groupConfig - ドキュメントグループの設定
 */
async function syncMarkdownToNotion(filePath, databaseId, groupConfig) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.md');

  // Markdownをパース
  const lines = content.split('\n');
  const firstHeading = lines.find(line => line.startsWith('# '));
  const title = firstHeading ? firstHeading.replace(/^#\s*/, '') : fileName;

  try {
    // 既存ページを検索
    const existingPages = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Path',
        rich_text: {
          equals: filePath
        }
      }
    });

    // ページのプロパティを構築
    const properties = buildPageProperties(title, filePath, groupConfig);

    if (existingPages.results.length > 0) {
      // 既存ページを更新
      const pageId = existingPages.results[0].id;

      await notion.pages.update({
        page_id: pageId,
        properties: properties
      });

      // 既存コンテンツを削除
      const existingBlocks = await notion.blocks.children.list({
        block_id: pageId
      });

      for (const block of existingBlocks.results) {
        await notion.blocks.delete({ block_id: block.id });
      }

      // 新しいコンテンツを追加
      await notion.blocks.children.append({
        block_id: pageId,
        children: convertMarkdownToBlocks(content)
      });

      console.log(`✓ Updated: ${filePath}`);
      return { status: 'updated', file: filePath };
    } else {
      // 新規ページを作成
      await notion.pages.create({
        parent: { database_id: databaseId },
        properties: properties,
        children: convertMarkdownToBlocks(content)
      });
      console.log(`✓ Created: ${filePath}`);
      return { status: 'created', file: filePath };
    }
  } catch (error) {
    console.error(`✗ Error syncing ${filePath}:`, error.message);
    return { status: 'error', file: filePath, error: error.message };
  }
}

/**
 * ページプロパティを構築
 * @param {string} title - ページタイトル
 * @param {string} filePath - ファイルパス
 * @param {object} groupConfig - グループ設定
 * @returns {object} - Notion ページプロパティ
 */
function buildPageProperties(title, filePath, groupConfig) {
  const properties = {
    'Name': {
      title: [{ text: { content: title } }]
    },
    'Path': {
      rich_text: [{ text: { content: filePath } }]
    },
    'Last Updated': {
      date: { start: new Date().toISOString() }
    }
  };

  // グループ設定から追加プロパティを適用
  if (groupConfig.properties) {
    for (const [propName, propConfig] of Object.entries(groupConfig.properties)) {
      if (propConfig.type === 'select') {
        properties[propName] = {
          select: { name: propConfig.value }
        };
      }
      // 他のプロパティタイプも将来追加可能
    }
  }

  return properties;
}

/**
 * Markdown を Notion ブロックに変換
 * @param {string} markdown - Markdown コンテンツ
 * @returns {array} - Notion ブロックの配列
 */
function convertMarkdownToBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\n');

  lines.forEach(line => {
    if (line.startsWith('# ')) {
      blocks.push({
        heading_1: {
          rich_text: [{ text: { content: line.substring(2) } }]
        }
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        heading_2: {
          rich_text: [{ text: { content: line.substring(3) } }]
        }
      });
    } else if (line.startsWith('### ')) {
      blocks.push({
        heading_3: {
          rich_text: [{ text: { content: line.substring(4) } }]
        }
      });
    } else if (line.trim()) {
      blocks.push({
        paragraph: {
          rich_text: [{ text: { content: line } }]
        }
      });
    }
  });

  return blocks;
}

/**
 * リトライ付きで同期を実行
 * @param {function} syncFn - 同期関数
 * @param {number} maxRetries - 最大リトライ回数
 * @returns {Promise} - 同期結果
 */
async function syncWithRetry(syncFn, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await syncFn();
    } catch (error) {
      lastError = error;

      // リトライ可能なエラーか判定
      const isRetryable = error.code === 'rate_limited' ||
                         error.code === 'service_unavailable' ||
                         error.code === 'ETIMEDOUT';

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // 指数バックオフ
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`  Retry ${attempt}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Starting Notion sync...\n');

  try {
    // 設定を読み込み
    const config = loadConfig();
    const globalConfig = getGlobalConfig(config);

    console.log(`📋 Configuration loaded`);
    console.log(`   Retry attempts: ${globalConfig.retry_attempts}`);
    console.log(`   Batch size: ${globalConfig.batch_size}\n`);

    // ドキュメントグループを取得
    const documentGroups = getDocumentGroups(config);

    if (documentGroups.length === 0) {
      console.log('⚠️  No files found to sync');
      return;
    }

    let totalFiles = 0;
    let totalUpdated = 0;
    let totalCreated = 0;
    let totalErrors = 0;

    // 各ドキュメントグループを処理
    for (const group of documentGroups) {
      console.log(`\n📁 Processing group: ${group.groupName}`);
      console.log(`   Files: ${group.files.length}`);
      console.log(`   Database: ${group.config.notion_database_id}\n`);

      totalFiles += group.files.length;

      // ファイルを並列処理（バッチサイズ制限）
      for (let i = 0; i < group.files.length; i += globalConfig.batch_size) {
        const batch = group.files.slice(i, i + globalConfig.batch_size);

        const results = await Promise.allSettled(
          batch.map(file =>
            syncWithRetry(
              () => syncMarkdownToNotion(file, group.config.notion_database_id, group.config),
              globalConfig.retry_attempts
            )
          )
        );

        // 結果を集計
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            if (result.value.status === 'updated') totalUpdated++;
            else if (result.value.status === 'created') totalCreated++;
          } else {
            totalErrors++;
          }
        });
      }
    }

    // サマリーを表示
    console.log('\n' + '='.repeat(50));
    console.log('📊 Sync Summary:');
    console.log(`   Total files: ${totalFiles}`);
    console.log(`   Created: ${totalCreated}`);
    console.log(`   Updated: ${totalUpdated}`);
    console.log(`   Errors: ${totalErrors}`);
    console.log('='.repeat(50));

    if (totalErrors > 0) {
      console.log('\n⚠️  Some files failed to sync. Check the logs above.');
      process.exit(1);
    } else {
      console.log('\n✅ All files synced successfully!');
    }
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// スクリプトとして実行された場合にメイン処理を実行
if (require.main === module) {
  main();
}

module.exports = {
  syncMarkdownToNotion,
  convertMarkdownToBlocks,
  buildPageProperties
};
