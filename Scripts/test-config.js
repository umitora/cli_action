// Scripts/test-config.js
// 設定ファイルとファイルマッチングのテスト

const { loadConfig, getGlobalConfig } = require('./config-loader');
const { getDocumentGroups } = require('./file-matcher');

console.log('=== Configuration Test ===\n');

try {
  // 設定ファイルを読み込み
  console.log('1. Loading configuration...');
  const config = loadConfig();
  console.log('✓ Configuration loaded successfully\n');

  // グローバル設定を取得
  console.log('2. Global configuration:');
  const globalConfig = getGlobalConfig(config);
  console.log(`   - Retry attempts: ${globalConfig.retry_attempts}`);
  console.log(`   - Batch size: ${globalConfig.batch_size}\n`);

  // ドキュメントグループを取得
  console.log('3. Document groups:');
  const documentGroups = getDocumentGroups(config);

  if (documentGroups.length === 0) {
    console.log('   ⚠️  No files found\n');
  } else {
    documentGroups.forEach(group => {
      console.log(`\n   Group: ${group.groupName}`);
      console.log(`   Database ID: ${group.config.notion_database_id}`);
      console.log(`   Files (${group.files.length}):`);
      group.files.forEach(file => {
        console.log(`     - ${file}`);
      });
    });
  }

  console.log('\n=== Test Completed Successfully ===');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
}
