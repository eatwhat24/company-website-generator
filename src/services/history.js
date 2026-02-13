/**
 * 历史记录服务
 * 保存和管理企业官网生成历史
 */

const fs = require('fs').promises;
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../../data/history.json');

// 确保数据目录存在
async function ensureDataDir() {
  const dataDir = path.dirname(HISTORY_FILE);
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (e) {
    // 目录已存在
  }
}

// 读取历史记录
async function getHistory() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(HISTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// 保存历史记录
async function saveRecord(record) {
  const history = await getHistory();
  
  // 添加新记录（放在最前面）
  history.unshift({
    id: record.id || Date.now().toString(),
    ...record,
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  // 只保留最近 50 条记录
  const trimmed = history.slice(0, 50);
  
  await ensureDataDir();
  await fs.writeFile(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
  
  return trimmed;
}

// 获取单条记录
async function getRecord(id) {
  const history = await getHistory();
  return history.find(r => r.id === id);
}

// 更新记录
async function updateRecord(id, updates) {
  const history = await getHistory();
  const index = history.findIndex(r => r.id === id);
  
  if (index === -1) {
    return null;
  }
  
  history[index] = {
    ...history[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  await ensureDataDir();
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
  
  return history[index];
}

// 删除记录
async function deleteRecord(id) {
  const history = await getHistory();
  const filtered = history.filter(r => r.id !== id);
  
  await ensureDataDir();
  await fs.writeFile(HISTORY_FILE, JSON.stringify(filtered, null, 2));
  
  return filtered;
}

module.exports = {
  getHistory,
  saveRecord,
  getRecord,
  updateRecord,
  deleteRecord
};
