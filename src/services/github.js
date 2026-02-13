/**
 * GitHub 部署服务
 * 自动推送生成的网站到 GitHub Pages
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

// GitHub 配置
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;

/**
 * 部署到 GitHub Pages
 * @param {string} sourceDir - 源文件目录
 * @param {Object} companyInfo - 企业信息
 * @returns {Promise<Object>} 部署结果
 */
async function deployToGithub(sourceDir, companyInfo) {
  if (!GITHUB_TOKEN || !GITHUB_USERNAME) {
    throw new Error('未配置 GitHub Token 或用户名，请检查环境变量');
  }
  
  const octokit = new Octokit({ auth: GITHUB_TOKEN });
  
  // 生成仓库名称 - 中文用时间戳处理
  let repoName = companyInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  // 如果名称为空或全是横线，使用默认名称
  if (!repoName || repoName.length < 3) {
    repoName = `company-website-${Date.now()}`;
  }
  repoName = `${repoName}-official-website`;
  
  try {
    console.log(`   检查/创建仓库: ${repoName}`);
    
    // 尝试获取仓库，如果不存在则创建
    let repo;
    try {
      const { data } = await octokit.repos.get({
        owner: GITHUB_USERNAME,
        repo: repoName
      });
      repo = data;
      console.log(`   仓库已存在: ${repo.html_url}`);
    } catch (error) {
      if (error.status === 404) {
        // 创建新仓库
        const { data } = await octokit.repos.createForAuthenticatedUser({
          name: repoName,
          description: `${companyInfo.name} 官方网站 - 由企业官网生成器创建`,
          homepage: `https://${GITHUB_USERNAME}.github.io/${repoName}/`,
          private: false,
          has_issues: false,
          has_projects: false,
          has_wiki: false
        });
        repo = data;
        console.log(`   仓库创建成功: ${repo.html_url}`);
      } else {
        throw error;
      }
    }
    
    // 获取当前文件列表
    console.log('   获取仓库文件列表...');
    let existingFiles = [];
    try {
      const { data } = await octokit.repos.getContent({
        owner: GITHUB_USERNAME,
        repo: repoName,
        path: ''
      });
      existingFiles = Array.isArray(data) ? data : [];
    } catch (error) {
      // 仓库可能是空的
      console.log('   仓库为空');
    }
    
    // 读取本地文件
    console.log('   读取本地文件...');
    const filesToUpload = await readDirRecursive(sourceDir, sourceDir);
    
    // 上传文件 - 使用 Contents API（更简单，支持新仓库）
    console.log(`   开始上传 ${filesToUpload.length} 个文件...`);
    
    for (const file of filesToUpload) {
      try {
        const content = await fs.readFile(file.path);
        const base64Content = content.toString('base64');
        
        // 尝试获取文件 SHA（如果存在）
        let fileSha = null;
        try {
          const existing = await octokit.repos.getContent({
            owner: GITHUB_USERNAME,
            repo: repoName,
            path: file.relativePath
          });
          fileSha = existing.data.sha;
        } catch (e) {
          // 文件不存在，正常情况
        }
        
        // 上传/更新文件
        await octokit.repos.createOrUpdateFileContents({
          owner: GITHUB_USERNAME,
          repo: repoName,
          path: file.relativePath,
          message: `Add ${file.relativePath}`,
          content: base64Content,
          sha: fileSha // 如果提供 SHA 则更新，否则创建新文件
        });
        
        console.log(`   上传: ${file.relativePath}`);
      } catch (fileError) {
        console.error(`   上传失败 ${file.relativePath}:`, fileError.message);
      }
    }
    
    console.log('   所有文件上传完成');
    
    // 检查并启用 GitHub Pages
    console.log('   配置 GitHub Pages...');
    try {
      await octokit.repos.update({
        owner: GITHUB_USERNAME,
        repo: repoName,
        has_pages: true
      });
      
      // 尝试设置 Pages 源 - 使用默认分支
      try {
        await octokit.request('PUT /repos/{owner}/{repo}/pages', {
          owner: GITHUB_USERNAME,
          repo: repoName,
          source: {
            branch: 'main',
            path: '/'
          }
        });
      } catch (e) {
        // 尝试 master 分支
        try {
          await octokit.request('PUT /repos/{owner}/{repo}/pages', {
            owner: GITHUB_USERNAME,
            repo: repoName,
            source: {
              branch: 'master',
              path: '/'
            }
          });
        } catch (e2) {
          console.log('   Pages 配置可能需要手动在 GitHub 设置中开启');
        }
      }
    } catch (error) {
      console.log('   Pages 配置可能需要手动在 GitHub 设置中开启');
    }
    
    const githubPagesUrl = `https://${GITHUB_USERNAME}.github.io/${repoName}/`;
    
    console.log(`   部署完成: ${githubPagesUrl}`);
    
    return {
      success: true,
      repoUrl: repo.html_url,
      pagesUrl: githubPagesUrl,
      repoName
    };
  } catch (error) {
    console.error('GitHub 部署失败:', error.message);
    
    if (error.status === 401) {
      throw new Error('GitHub Token 无效或已过期，请检查 GITHUB_TOKEN 环境变量');
    } else if (error.status === 403) {
      throw new Error('GitHub API 限流或权限不足，请检查 Token 权限设置');
    } else if (error.status === 404) {
      throw new Error('GitHub 用户不存在，请检查 GITHUB_USERNAME 环境变量');
    }
    
    throw error;
  }
}

/**
 * 递归读取目录
 * @param {string} dir - 目录路径
 * @param {string} baseDir - 基础目录（用于计算相对路径）
 * @returns {Promise<Array>} 文件列表
 */
async function readDirRecursive(dir, baseDir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      const subFiles = await readDirRecursive(fullPath, baseDir);
      files.push(...subFiles);
    } else {
      // 判断文件类型
      const ext = path.extname(entry.name).toLowerCase();
      const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
      const isBinary = binaryExts.includes(ext);
      
      files.push({
        path: fullPath,
        relativePath: relativePath.replace(/\\\\/g, '/'),
        encoding: isBinary ? 'base64' : 'utf-8'
      });
    }
  }
  
  return files;
}

/**
 * 检查 GitHub 配置
 * @returns {Object} 配置状态
 */
function checkConfig() {
  return {
    token: !!GITHUB_TOKEN,
    username: !!GITHUB_USERNAME,
    configured: !!(GITHUB_TOKEN && GITHUB_USERNAME)
  };
}

module.exports = {
  deployToGithub,
  checkConfig
};
