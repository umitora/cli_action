// scripts/sync-to-notion.js
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

async function syncMarkdownToNotion(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.md');
  
  // Markdownをパース（必要に応じて）
  const lines = content.split('\n');
  const title = lines[0].replace(/^#\s*/, '');
  
  // Notionページを作成または更新
  try {
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
  } catch (error) {
    console.error(`Error syncing ${fileName}:`, error);
  }
}

function convertMarkdownToBlocks(markdown) {
  // 簡単な変換例（必要に応じて拡張）
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

// docsディレクトリ内のMarkdownファイルをスキャン
const docsDir = './docs';
const files = fs.readdirSync(docsDir)
  .filter(file => file.endsWith('.md'));

Promise.all(files.map(file => 
  syncMarkdownToNotion(path.join(docsDir, file))
)).then(() => {
  console.log('All files synced!');
});
