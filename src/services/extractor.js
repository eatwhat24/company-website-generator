/**
 * DeepSeek AI 信息提取服务
 * 使用 DeepSeek API 从搜索结果中提取企业关键信息
 */

const axios = require('axios');

// DeepSeek API 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

/**
 * 使用 DeepSeek 提取企业信息
 * @param {string} companyName - 企业名称
 * @param {Array} searchResults - 搜索结果列表
 * @returns {Promise<Object>} 提取的企业信息
 */
async function extractCompanyInfo(companyName, searchResults) {
  if (!DEEPSEEK_API_KEY) {
    console.warn('⚠️  未配置 DeepSeek API Key，使用模拟数据');
    return generateMockCompanyInfo(companyName);
  }
  
  try {
    // 构建搜索内容摘要
    const searchContent = searchResults
      .map((result, index) => `
[结果 ${index + 1}]
标题: ${result.title}
链接: ${result.url}
摘要: ${result.snippet}
`)
      .join('\n');
    
    // 构建提示词
    const prompt = `请根据以下搜索结果，提取关于"${companyName}"企业的关键信息。

搜索结果：
${searchContent}

请提取并返回以下信息（JSON格式）：
{
  "name": "企业全称",
  "shortName": "企业简称",
  "slogan": "企业口号/标语",
  "business": "核心业务描述（100字左右）",
  "description": "企业详细介绍（300字左右）",
  "industry": "所属行业",
  "founded": "成立时间",
  "headquarters": "总部地点",
  "services": [
    {"name": "服务/产品名称", "description": "服务描述"}
  ],
  "features": ["企业特色1", "企业特色2", "企业特色3"],
  "contact": {
    "phone": "联系电话（模拟）",
    "email": "联系邮箱（模拟）",
    "address": "办公地址（模拟）"
  },
  "social": {
    "website": "官方网站",
    "weibo": "微博链接（如有）",
    "wechat": "微信公众号（如有）"
  }
}

注意：
1. 如果搜索信息不足，请根据企业名称合理推测填充
2. 所有字段不能为空
3. services 至少包含 3 个服务
4. features 至少包含 3 个特色
5. 只返回 JSON 格式，不要添加其他说明文字`;

    // 调用 DeepSeek API
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的企业信息分析师，擅长从搜索结果中提取和整理企业信息。请只返回 JSON 格式的结果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        timeout: 60000
      }
    );
    
    // 解析 AI 返回的内容
    const aiContent = response.data.choices[0].message.content;
    let companyInfo;
    
    try {
      companyInfo = JSON.parse(aiContent);
    } catch (parseError) {
      // 尝试从文本中提取 JSON
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        companyInfo = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析 AI 返回的 JSON');
      }
    }
    
    // 确保必要字段存在
    const defaultInfo = generateMockCompanyInfo(companyName);
    companyInfo = { ...defaultInfo, ...companyInfo };
    
    // 确保数组字段存在
    companyInfo.services = companyInfo.services || defaultInfo.services;
    companyInfo.features = companyInfo.features || defaultInfo.features;
    companyInfo.contact = { ...defaultInfo.contact, ...companyInfo.contact };
    companyInfo.social = { ...defaultInfo.social, ...companyInfo.social };
    
    return companyInfo;
  } catch (error) {
    console.error('DeepSeek API 调用失败:', error.message);
    
    if (error.response) {
      console.error('API 错误详情:', error.response.data);
    }
    
    // 使用模拟数据作为后备
    console.log('使用模拟数据作为后备...');
    return generateMockCompanyInfo(companyName);
  }
}

/**
 * 生成模拟企业信息（用于测试或 API 失败时）
 * @param {string} companyName - 企业名称
 * @returns {Object} 模拟的企业信息
 */
function generateMockCompanyInfo(companyName) {
  const shortName = companyName.replace(/有限公司|股份有限公司|集团|科技|网络|信息/g, '');
  
  return {
    name: companyName,
    shortName: shortName || companyName,
    slogan: '创新引领未来，科技改变生活',
    business: `${companyName}是一家专注于技术创新和行业解决方案的领先企业。公司致力于为客户提供高质量的产品和专业的服务，在行业内享有良好的声誉。`,
    description: `${companyName}成立于2000年，总部位于中国北京。作为行业领先的技术企业，我们始终坚持"以客户为中心，以创新为驱动"的经营理念。经过二十多年的发展，公司已经成为集研发、生产、销售、服务于一体的综合性企业集团。

公司拥有一支高素质的专业团队，在人工智能、云计算、大数据等前沿技术领域具有深厚的积累。我们的产品广泛应用于金融、医疗、教育、制造等多个行业，为客户创造价值，推动社会进步。`,
    industry: '互联网/科技',
    founded: '2000年',
    headquarters: '中国北京',
    services: [
      {
        name: '智能解决方案',
        description: '基于人工智能技术的行业解决方案，帮助企业实现数字化转型'
      },
      {
        name: '云计算服务',
        description: '安全可靠的云计算基础设施，提供弹性计算和存储服务'
      },
      {
        name: '数据分析',
        description: '大数据分析和商业智能服务，助力企业数据驱动决策'
      },
      {
        name: '技术咨询',
        description: '专业的技术咨询服务，为企业量身定制信息化解决方案'
      }
    ],
    features: [
      '行业领先的技术实力',
      '丰富的项目经验',
      '专业的服务团队',
      '完善的售后支持'
    ],
    contact: {
      phone: '400-123-4567',
      email: 'contact@company.com',
      address: '北京市朝阳区科技园区88号'
    },
    social: {
      website: `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
      weibo: '#',
      wechat: companyName
    }
  };
}

module.exports = {
  extractCompanyInfo
};
