/**
 * API 路由
 * 处理企业官网生成的 API 请求
 */

const express = require('express');
const router = express.Router();

const searchService = require('../services/search');
const extractorService = require('../services/extractor');
const generatorService = require('../services/generator');
const githubService = require('../services/github');
const qiniuService = require('../services/qiniu');

/**
 * 健康检查
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    qiniu: qiniuService.checkQiniuConfig(),
    github: githubService.checkConfig()
  });
});

/**
 * 搜索企业信息
 * POST /api/search
 */
router.post('/search', async (req, res) => {
  try {
    const { companyName } = req.body;
    
    if (!companyName || typeof companyName !== 'string') {
      return res.status(400).json({
        success: false,
        message: '请提供有效的企业名称'
      });
    }
    
    console.log(`🔍 开始搜索企业信息: ${companyName}`);
    const searchResults = await searchService.searchCompany(companyName);
    
    res.json({
      success: true,
      message: '搜索完成',
      data: {
        companyName,
        results: searchResults
      }
    });
  } catch (error) {
    console.error('搜索企业信息失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索企业信息失败',
      error: error.message
    });
  }
});

/**
 * 生成企业官网
 * POST /api/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { companyName, deployTarget = 'none' } = req.body;
    
    if (!companyName || typeof companyName !== 'string') {
      return res.status(400).json({
        success: false,
        message: '请提供有效的企业名称'
      });
    }
    
    console.log(`\n========================================`);
    console.log(`🚀 开始生成企业官网: ${companyName}`);
    console.log(`📦 部署目标: ${deployTarget}`);
    console.log(`========================================\n`);
    
    // 步骤 1: 搜索企业信息
    console.log('📡 步骤 1/4: 搜索企业网络信息...');
    const searchResults = await searchService.searchCompany(companyName);
    console.log(`   ✓ 获取到 ${searchResults.length} 条搜索结果`);
    
    // 步骤 2: 使用 DeepSeek 提取关键信息
    console.log('🤖 步骤 2/4: AI 分析提取关键信息...');
    const companyInfo = await extractorService.extractCompanyInfo(companyName, searchResults);
    console.log('   ✓ 企业信息提取完成');
    console.log(`   - 企业名称: ${companyInfo.name}`);
    console.log(`   - 核心业务: ${companyInfo.business?.slice(0, 50)}...`);
    
    // 步骤 3: 生成网站
    console.log('🎨 步骤 3/4: 生成企业官网...');
    const outputDir = await generatorService.generateWebsite(companyInfo);
    console.log(`   ✓ 网站生成完成: ${outputDir}`);
    
    // 步骤 4: 部署
    let deployResult = null;
    
    if (deployTarget === 'github') {
      console.log('🚀 步骤 4/4: 部署到 GitHub Pages...');
      deployResult = await githubService.deployToGithub(outputDir, companyInfo);
      console.log(`   ✓ GitHub 部署完成: ${deployResult.url}`);
    } else if (deployTarget === 'qiniu') {
      console.log('☁️ 步骤 4/4: 部署到七牛云...');
      deployResult = await qiniuService.deployToQiniu(outputDir, companyInfo);
      console.log(`   ✓ 七牛云部署完成: ${deployResult.indexUrl}`);
    } else {
      console.log('⏭️  步骤 4/4: 跳过部署');
    }
    
    console.log(`\n========================================`);
    console.log(`✅ 企业官网生成成功!`);
    console.log(`========================================\n`);
    
    res.json({
      success: true,
      message: '企业官网生成成功',
      data: {
        companyName: companyInfo.name,
        companyInfo,
        outputDir,
        generatedFiles: generatorService.getGeneratedFiles(outputDir),
        deployTarget,
        ...deployResult
      }
    });
  } catch (error) {
    console.error('\n❌ 生成企业官网失败:', error);
    res.status(500).json({
      success: false,
      message: '生成企业官网失败',
      error: error.message
    });
  }
});

/**
 * Web 界面表单提交
 * POST /api/generate-web
 */
router.post('/generate-web', async (req, res) => {
  try {
    const { companyName, deployTarget } = req.body;
    
    const result = await new Promise((resolve, reject) => {
      const mockRes = {
        json: (data) => resolve(data),
        status: () => ({ json: (data) => reject(new Error(data.error || '请求失败')) })
      };
      
      router.handle({ ...req, body: { ...req.body, deployTarget } }, mockRes, () => {});
    });
    
    if (result.success) {
      res.render('result', {
        title: '生成成功 - 企业官网生成器',
        result: result.data,
        error: null
      });
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    res.render('index', {
      title: '企业官网生成器',
      companyName: req.body.companyName || '',
      result: null,
      error: error.message
    });
  }
});

module.exports = router;
