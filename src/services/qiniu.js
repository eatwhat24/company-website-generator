/**
 * 七牛云部署服务
 * 将生成的静态网站上传到七牛云存储
 */

const qiniu = require('qiniu');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 生成8位确定性hash（企业名+密钥）
function generateHash(companyName) {
  const secret = process.env.HASH_SECRET || 'default-secret';
  const hash = crypto.createHash('md5')
    .update(`${companyName}-${secret}`)
    .digest('hex');
  return hash.substring(0, 8);
}

// 七牛云配置
function getQiniuConfig() {
  return {
    accessKey: process.env.QINIU_ACCESS_KEY,
    secretKey: process.env.QINIU_SECRET_KEY,
    bucket: process.env.QINIU_BUCKET,
    zone: process.env.QINIU_ZONE || 'z0',
    domain: process.env.QINIU_DOMAIN
  };
}

/**
 * 上传到七牛云
 * @param {string} sourceDir - 本地文件目录
 * @param {Object} companyInfo - 企业信息
 * @returns {Promise<Object>} 上传结果
 */
async function deployToQiniu(sourceDir, companyInfo) {
  const config = getQiniuConfig();
  
  // 验证配置
  if (!config.accessKey || !config.secretKey) {
    throw new Error('未配置七牛云 AccessKey 或 SecretKey');
  }
  if (!config.bucket) {
    throw new Error('未配置七牛云 Bucket');
  }
  
  // 使用 hash 生成固定目录名
  const hashCode = generateHash(companyInfo.name);
  const dirName = `${companyInfo.name}-${hashCode}`;
  
  console.log(`   📦 准备上传到七牛云...`);
  console.log(`   🗂️  目录: ${dirName} (hash: ${hashCode})`);
  
  // 创建七牛云上传凭证
  const mac = new qiniu.auth.digest.Mac(config.accessKey, config.secretKey);
  const options = {
    scope: config.bucket,
    expires: 3600 * 24 // 24小时有效期
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  const uploadToken = putPolicy.uploadToken(mac);
  
  // 创建配置
  const qiniuConfig = new qiniu.conf.Config();
  qiniuConfig.zone = qiniu.zone[config.zone];
  
  // 创建上传客户端
  const formUploader = new qiniu.form_up.FormUploader(qiniuConfig);
  const putExtra = new qiniu.form_up.PutExtra();
  
  // 递归读取目录
  const files = await readDirRecursive(sourceDir, sourceDir);
  
  console.log(`   📤 开始上传 ${files.length} 个文件...`);
  
  let uploadedCount = 0;
  let failedCount = 0;
  
  for (const file of files) {
    try {
      const fileBuffer = await fs.readFile(file.path);
      const remotePath = `${dirName}/${file.relativePath}`;
      
      await new Promise((resolve, reject) => {
        formUploader.put(uploadToken, remotePath, fileBuffer, putExtra, 
          (err, ret) => {
            if (err) {
              reject(err);
            } else {
              resolve(ret);
            }
          }
        );
      });
      
      uploadedCount++;
      console.log(`   ✓ ${file.relativePath}`);
    } catch (error) {
      failedCount++;
      console.error(`   ✗ ${file.relativePath}: ${error.message}`);
    }
  }
  
  if (failedCount > 0) {
    console.warn(`   ⚠️ 上传完成，${failedCount} 个文件失败`);
  }
  
  // 构建访问链接
  const baseUrl = config.domain 
    ? `https://${config.domain}/${dirName}`
    : `https://${config.bucket}.${config.zone}.qiniucs.com/${dirName}`;
  
  const indexUrl = `${baseUrl}/index.html`;
  
  // 使用环境变量中的服务器地址，或默认使用 localhost
  const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
  const previewUrl = `${serverUrl}/preview/${dirName}/`;
  
  console.log(`   ✅ 上传完成！`);
  console.log(`   🔗 访问地址: ${indexUrl}`);
  console.log(`   🔍 预览地址: ${previewUrl}`);
  
  return {
    success: true,
    dirName: dirName,
    baseUrl: baseUrl,
    indexUrl: indexUrl,
    previewUrl: previewUrl,
    uploadedCount: uploadedCount,
    failedCount: failedCount
  };
}

/**
 * 递归读取目录
 */
async function readDirRecursive(dir, baseDir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    
    if (entry.isDirectory()) {
      const subFiles = await readDirRecursive(fullPath, baseDir);
      files.push(...subFiles);
    } else {
      files.push({
        path: fullPath,
        relativePath: relativePath
      });
    }
  }
  
  return files;
}

/**
 * 检查七牛云配置
 */
function checkQiniuConfig() {
  const config = getQiniuConfig();
  return {
    accessKey: !!config.accessKey,
    secretKey: !!config.secretKey,
    bucket: !!config.bucket,
    domain: !!config.domain,
    configured: !!(config.accessKey && config.secretKey && config.bucket)
  };
};

/**
 * 从七牛云删除文件
 * @param {string} dirName - 要删除的目录名
 * @returns {Promise<Object>} 删除结果
 */
async function deleteFromQiniu(dirName) {
  const config = getQiniuConfig();
  
  if (!config.accessKey || !config.secretKey || !config.bucket) {
    throw new Error('七牛云配置不完整');
  }
  
  const mac = new qiniu.auth.digest.Mac(config.accessKey, config.secretKey);
  const bucketManager = new qiniu.rs.BucketManager(mac);
  
  return new Promise((resolve, reject) => {
    // 删除整个目录（前缀匹配）
    bucketManager.listPrefix(config.bucket, { prefix: `${dirName}/` }, (err, respBody, respInfo) => {
      if (err) {
        return reject(err);
      }
      
      if (respInfo.statusCode !== 200) {
        return resolve({ success: true, message: '目录为空或不存在' });
      }
      
      const items = respBody.items || [];
      if (items.length === 0) {
        return resolve({ success: true, message: '目录为空' });
      }
      
      // 批量删除文件
      const deleteOperations = items.map(item => 
        qiniu.rs.deleteOp(config.bucket, item.key)
      );
      
      bucketManager.batch(deleteOperations, (err2, respBody2, respInfo2) => {
        if (err2) {
          return reject(err2);
        }
        
        const successCount = respBody2.filter(r => r.code === 200).length;
        resolve({ 
          success: true, 
          deletedCount: successCount,
          totalCount: items.length
        });
      });
    });
  });
}

module.exports = {
  deployToQiniu,
  checkQiniuConfig,
  generateHash,
  getQiniuConfig,
  deleteFromQiniu
};
