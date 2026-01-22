// Scripts/file-matcher.js
const { globSync } = require('glob');
const path = require('path');

/**
 * パターンにマッチするファイルを検索
 * @param {string[]} patterns - Globパターンの配列
 * @param {string[]} excludePatterns - 除外パターンの配列
 * @returns {string[]} - マッチしたファイルパスの配列
 */
function findMatchingFiles(patterns, excludePatterns = []) {
  const allFiles = new Set();

  // 各パターンでファイルを検索
  patterns.forEach(pattern => {
    try {
      const files = globSync(pattern, {
        ignore: excludePatterns,
        nodir: true, // ディレクトリは除外
        dot: false   // 隠しファイルは除外
      });

      files.forEach(file => {
        // 正規化されたパスを追加
        allFiles.add(path.normalize(file));
      });
    } catch (error) {
      console.error(`Error matching pattern "${pattern}":`, error.message);
    }
  });

  return Array.from(allFiles).sort();
}

/**
 * 設定から全ドキュメントグループのファイルを取得
 * @param {object} config - 設定オブジェクト
 * @returns {object[]} - { groupName, files, config } の配列
 */
function getDocumentGroups(config) {
  const excludePatterns = config.exclude || [];
  const groups = [];

  for (const [groupName, groupConfig] of Object.entries(config.document_groups)) {
    const files = findMatchingFiles(groupConfig.paths, excludePatterns);

    if (files.length > 0) {
      groups.push({
        groupName,
        files,
        config: groupConfig
      });
    } else {
      console.warn(`No files found for document group "${groupName}"`);
    }
  }

  return groups;
}

/**
 * ファイルパスを相対パスに変換（カレントディレクトリ基準）
 * @param {string} filePath - ファイルパス
 * @returns {string} - 相対パス
 */
function toRelativePath(filePath) {
  return path.relative(process.cwd(), filePath);
}

module.exports = {
  findMatchingFiles,
  getDocumentGroups,
  toRelativePath
};
