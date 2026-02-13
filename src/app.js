/**
 * Express 主程序
 * 企业官网生成器服务端入口
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

// 加载环境变量
require('dotenv').config();

const apiRoutes = require('./routes/api');
const { ensureDir } = require('./utils/helpers');
const qiniuService = require('./services/qiniu');

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// 提供 React 前端静态文件
app.use(express.static(path.join(__dirname, '../client/dist')));

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../templates'));

// 确保输出目录存在
const outputDir = path.join(__dirname, '../output');
ensureDir(outputDir);

// 路由
app.use('/api', apiRoutes);

// 预览代理 - 手动生成签名URL
// 格式: /preview/企业名-hash/index.html
app.get('/preview/:path(*)', async (req, res) => {
  try {
    const previewPath = req.params.path;
    const config = qiniuService.getQiniuConfig();
    
    // 使用默认域名
    const defaultDomain = `${config.bucket}.${config.zone}.qiniucs.com`;
    const fileKey = previewPath;
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    
    // 手动生成签名（HMAC-SHA1）
    const pathAndQuery = `/${fileKey}?e=${deadline}`;
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha1', config.secretKey);
    hmac.update(pathAndQuery);
    const signature = hmac.digest('base64');
    const encodedSig = signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    // 拼接URL
    let signedUrl = `http://${defaultDomain}/${fileKey}?e=${deadline}&token=${config.accessKey}:${encodedSig}`;
    
    // 替换域名
    if (config.domain) {
      signedUrl = signedUrl.replace(defaultDomain, config.domain);
    }
    
    console.log('Signed URL:', signedUrl);
    
    // 返回可访问的URL
    res.json({
      success: true,
      url: signedUrl,
      message: '直接访问此链接即可预览'
    });
  } catch (error) {
    console.error('预览失败:', error);
    res.status(500).json({ error: '预览失败: ' + error.message });
  }
});

// 首页 - Web 界面 (React 前端)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// 404 处理
app.use((req, res) => {
  // 对于 SPA 回退到 index.html
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  } else {
    res.status(404).json({
      success: false,
      message: '接口不存在',
      path: req.path
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║         企业官网生成器服务器已启动                     ║
╠════════════════════════════════════════════════════════╣
║  本地访问: http://localhost:${PORT}                      ║
║  API 文档: http://localhost:${PORT}/api/health          ║
╚════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
