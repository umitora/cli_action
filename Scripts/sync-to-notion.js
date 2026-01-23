// scripts/sync-to-notion.js
// このファイルは後方互換性のために残されています
// 設定ファイルがある場合は自動的に sync-to-notion-multi.js を使用します

const fs = require('fs');
const path = require('path');

// 設定ファイルの存在チェック
const configPath = './.github/notion-sync-config.yml';

if (fs.existsSync(configPath)) {
  // 設定ファイルが存在する場合は新しいマルチファイル対応版を使用
  console.log('📋 Config file detected. Using multi-file sync mode...\n');
  require('./sync-to-notion-multi.js');
} else {
  // 設定ファイルがない場合は従来通りREADME.mdのみを同期
  console.log('⚠️  No config file found. Falling back to single-file mode (README.md only).');
  console.log('💡 To sync multiple files, create .github/notion-sync-config.yml\n');

  const { Client } = require('@notionhq/client');

  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const databaseId = process.env.NOTION_DATABASE_ID;

  async function syncMarkdownToNotion(filePath) {
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

      if (existingPages.results.length > 0) {
        // 既存ページを更新
        const pageId = existingPages.results[0].id;

        await notion.pages.update({
          page_id: pageId,
          properties: {
            'Name': {
              title: [{ text: { content: title } }]
            },
            'Last Updated': {
              date: { start: new Date().toISOString() }
            }
          }
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

        console.log(`Updated: ${fileName}`);
      } else {
        // 新規ページを作成
        await notion.pages.create({
          parent: { database_id: databaseId },
          properties: {
            'Name': {
              title: [{ text: { content: title } }]
            },
            'Path': {
              rich_text: [{ text: { content: filePath } }]
            },
            'Last Updated': {
              date: { start: new Date().toISOString() }
            }
          },
          children: convertMarkdownToBlocks(content)
        });
        console.log(`Synced: ${fileName}`);
      }
    } catch (error) {
      console.error(`Error syncing ${fileName}:`, error);
    }
  }

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

  // README.mdを同期
  const readmePath = './README.md';

  if (fs.existsSync(readmePath)) {
    syncMarkdownToNotion(readmePath).then(() => {
      console.log('README sync completed!');
    }).catch(error => {
      console.error('Sync failed:', error);
      process.exit(1);
    });
  } else {
    console.error('README.md not found!');
    process.exit(1);
  }
}
