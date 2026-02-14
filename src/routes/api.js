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
const historyService = require('../services/history');

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
    const { companyName, deployTarget = 'none', forceRegenerate = false } = req.body;
    
    if (!companyName || typeof companyName !== 'string') {
      return res.status(400).json({
        success: false,
        message: '请提供有效的企业名称'
      });
    }
    
    console.log(`\n========================================`);
    console.log(`🚀 开始处理: ${companyName}`);
    console.log(`📦 部署目标: ${deployTarget}, 强制重生成: ${forceRegenerate}`);
    console.log(`========================================\n`);
    
    // 检查是否已存在（仅针对七牛云）
    if (!forceRegenerate && deployTarget === 'qiniu') {
      const existingHistory = await historyService.getHistory();
      const existing = existingHistory.find(h => 
        h.companyName === companyName && h.deployTarget === 'qiniu'
      );
      
      if (existing && existing.previewUrl) {
        console.log(`   ✅ 企业已存在，返回已有预览链接`);
        return res.json({
          success: true,
          message: '企业官网已存在',
          data: {
            id: existing.id,
            companyName: existing.companyName,
            companyInfo: existing.companyInfo,
            deployTarget: existing.deployTarget,
            previewUrl: existing.previewUrl,
            indexUrl: existing.indexUrl,
            qiniuDir: existing.qiniuDir,
            isExisting: true
          }
        });
      }
    }
    
    // 步骤 1: 使用 MiniMax web_search 获取企业信息
    console.log('🔍 步骤 1/3: MiniMax AI 搜索企业信息...');
    const companyInfo = await extractorService.extractCompanyInfo(companyName);
    console.log('   ✓ 企业信息获取完成');
    console.log(`   - 企业名称: ${companyInfo.name}`);
    console.log(`   - 核心业务: ${companyInfo.business?.slice(0, 50)}...`);
    
    // 步骤 2: 生成网站
    console.log('🎨 步骤 2/3: 生成企业官网...');
    const outputDir = await generatorService.generateWebsite(companyInfo);
    console.log(`   ✓ 网站生成完成: ${outputDir}`);
    
    // 步骤 3: 部署
    let deployResult = null;
    
    if (deployTarget === 'github') {
      console.log('🚀 步骤 3/3: 部署到 GitHub Pages...');
      deployResult = await githubService.deployToGithub(outputDir, companyInfo);
      console.log(`   ✓ GitHub 部署完成: ${deployResult.url}`);
    } else if (deployTarget === 'qiniu') {
      console.log('☁️ 步骤 3/3: 部署到七牛云...');
      deployResult = await qiniuService.deployToQiniu(outputDir, companyInfo);
      console.log(`   ✓ 七牛云部署完成: ${deployResult.indexUrl}`);
    } else {
      console.log('⏭️  步骤 3/3: 跳过部署');
    }
    
    console.log(`\n========================================`);
    console.log(`✅ 企业官网生成成功!`);
    console.log(`========================================\n`);
    
    // 保存到历史记录
    const recordId = Date.now().toString();
    await historyService.saveRecord({
      id: recordId,
      companyName: companyInfo.name,
      companyInfo,
      deployTarget,
      previewUrl: deployResult?.previewUrl,
      indexUrl: deployResult?.indexUrl,
      qiniuDir: deployResult?.dirName
    });
    
    res.json({
      success: true,
      message: '企业官网生成成功',
      data: {
        id: recordId,
        companyName: companyInfo.name,
        companyInfo,
        outputDir,
        generatedFiles: generatorService.getGeneratedFiles(outputDir),
        deployTarget,
        previewUrl: deployResult?.previewUrl,
        indexUrl: deployResult?.indexUrl,
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

/**
 * 获取历史记录列表
 * GET /api/history
 */
router.get('/history', async (req, res) => {
  try {
    const history = await historyService.getHistory();
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取历史记录失败',
      error: error.message
    });
  }
});

/**
 * 获取单条历史记录
 * GET /api/history/:id
 */
router.get('/history/:id', async (req, res) => {
  try {
    const record = await historyService.getRecord(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }
    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取记录失败',
      error: error.message
    });
  }
});

/**
 * 删除历史记录
 * DELETE /api/history/:id
 */
router.delete('/history/:id', async (req, res) => {
  try {
    const record = await historyService.getRecord(req.params.id);
    
    // 如果是七牛云部署，删除七牛云上的文件
    if (record && record.deployTarget === 'qiniu' && record.qiniuDir) {
      try {
        await qiniuService.deleteFromQiniu(record.qiniuDir);
        console.log(`   🗑️ 已删除七牛云文件: ${record.qiniuDir}`);
      } catch (e) {
        console.error('   ⚠️ 删除七牛云文件失败:', e.message);
      }
    }
    
    await historyService.deleteRecord(req.params.id);
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除失败',
      error: error.message
    });
  }
});

module.exports = router;
