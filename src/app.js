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

// 预览代理 - 通过七牛云私有链访问
// 格式: /preview/企业名-随机码 或 /preview/企业名-随机码/index.html
app.get('/preview/:path(*)', async (req, res) => {
  try {
    const previewPath = req.params.path;
    const config = qiniuService.getQiniuConfig();
    
    // 构建七牛云文件路径
    const fileKey = previewPath;
    
    // 获取私有下载链接
    const mac = new (require('qiniu').auth.digest.Mac)(config.accessKey, config.secretKey);
    const configQiniu = new (require('qiniu').conf.Config());
    configQiniu.zone = require('qiniu').zone[config.zone];
    
    const bucketManager = new (require('qiniu').rs.BucketManager)(mac, configQiniu);
    
    // 生成私有访问链接（有效期1小时）
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const privateUrl = bucketManager.privateDownloadUrl(
      `http://${config.bucket}.${config.zone}.qiniucs.com/${fileKey}`,
      deadline
    );
    
    // 重定向到私有链接
    res.redirect(privateUrl);
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
