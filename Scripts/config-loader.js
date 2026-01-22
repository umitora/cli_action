// Scripts/config-loader.js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 設定ファイルを読み込んで検証する
 * @param {string} configPath - 設定ファイルのパス
 * @returns {object} - パース済みの設定オブジェクト
 */
function loadConfig(configPath = './.github/notion-sync-config.yml') {
  try {
    // 設定ファイルの存在確認
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    // YAMLファイルを読み込み
    const fileContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContent);

    // 基本的な検証
    validateConfig(config);

    // 環境変数を展開
    const expandedConfig = expandEnvironmentVariables(config);

    return expandedConfig;
  } catch (error) {
    console.error('Failed to load config:', error.message);
    throw error;
  }
}

/**
 * 設定の妥当性を検証
 * @param {object} config - 設定オブジェクト
 */
function validateConfig(config) {
  if (!config) {
    throw new Error('Config is empty or invalid');
  }

  if (!config.document_groups || typeof config.document_groups !== 'object') {
    throw new Error('Config must have "document_groups" object');
  }

  const groupNames = Object.keys(config.document_groups);
  if (groupNames.length === 0) {
    throw new Error('At least one document group must be defined');
  }

  // 各グループの検証
  groupNames.forEach(groupName => {
    const group = config.document_groups[groupName];

    if (!group.paths || !Array.isArray(group.paths) || group.paths.length === 0) {
      throw new Error(`Document group "${groupName}" must have non-empty "paths" array`);
    }

    if (!group.notion_database_id) {
      throw new Error(`Document group "${groupName}" must have "notion_database_id"`);
    }
  });
}

/**
 * 環境変数を展開する（${VAR_NAME}を実際の値に置換）
 * @param {any} obj - 対象オブジェクト
 * @returns {any} - 環境変数が展開されたオブジェクト
 */
function expandEnvironmentVariables(obj) {
  if (typeof obj === 'string') {
    // ${VAR_NAME}パターンを環境変数で置換
    return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = process.env[varName];
      if (value === undefined) {
        console.warn(`Warning: Environment variable ${varName} is not set`);
        return match; // 置換せずそのまま返す
      }
      return value;
    });
  } else if (Array.isArray(obj)) {
    return obj.map(item => expandEnvironmentVariables(item));
  } else if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      result[key] = expandEnvironmentVariables(obj[key]);
    }
    return result;
  }
  return obj;
}

/**
 * デフォルト設定を取得
 * @param {object} config - 設定オブジェクト
 * @returns {object} - デフォルト設定
 */
function getGlobalConfig(config) {
  return {
    retry_attempts: config.global?.retry_attempts || 3,
    batch_size: config.global?.batch_size || 5
  };
}

module.exports = {
  loadConfig,
  validateConfig,
  expandEnvironmentVariables,
  getGlobalConfig
};
