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

// 预览代理 - 服务器下载七牛云文件后返回给用户
// 格式: /preview/企业名-hash 或 /preview/企业名-hash/index.html
app.get('/preview/:path(*)', async (req, res) => {
  try {
    let previewPath = req.params.path;
    const config = qiniuService.getQiniuConfig();
    const qiniu = require('qiniu');
    const http = require('http');
    const https = require('https');
    
    // 七牛云路径添加统一前缀
    const qiniuPath = `company-websites/${previewPath}`;
    
    // 如果路径不以 /index.html 结尾，自动添加
    const fileKey = qiniuPath.endsWith('/index.html') || qiniuPath.endsWith('.html') 
      ? qiniuPath 
      : `${qiniuPath}/index.html`;
    
    // 创建认证
    const mac = new qiniu.auth.digest.Mac(config.accessKey, config.secretKey);
    
    // 使用配置的域名
    const domain = config.domain || `${config.bucket}.${config.zone}.qiniucs.com`;
    
    // 生成私有URL
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const bucketManager = new qiniu.rs.BucketManager(mac);
    const signedUrl = bucketManager.privateDownloadUrl(domain, fileKey, deadline);
    
    console.log('Downloading:', signedUrl);
    
    // 下载文件
    const client = signedUrl.startsWith('https') ? https : http;
    
    await new Promise((resolve, reject) => {
      client.get(signedUrl, (response) => {
        if (response.statusCode === 401) {
          res.status(401).json({ error: '401 Unauthorized', url: signedUrl });
          return resolve();
        }
        
        // 设置响应头
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('html')) {
          res.set('Content-Type', 'text/html; charset=utf-8');
        } else if (contentType.includes('css')) {
          res.set('Content-Type', 'text/css; charset=utf-8');
        } else if (contentType.includes('javascript')) {
          res.set('Content-Type', 'application/javascript; charset=utf-8');
        } else if (contentType.includes('json')) {
          res.set('Content-Type', 'application/json; charset=utf-8');
        } else if (contentType.includes('image')) {
          res.set('Content-Type', contentType);
        } else {
          res.set('Content-Type', 'text/plain; charset=utf-8');
        }
        
        // 直接 pipe 文件流到响应
        response.pipe(res);
        response.on('end', resolve);
      }).on('error', reject);
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
