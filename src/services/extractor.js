/**
 * MiniMax AI 信息提取服务
 * 使用 MiniMax API 的 web_search 能力获取企业信息
 */

const axios = require('axios');

// MiniMax API 配置
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_API_URL = process.env.MINIMAX_API_URL || 'https://api.minimax.chat/v1';

/**
 * 使用 MiniMax web_search 获取企业信息
 * @param {string} companyName - 企业名称
 * @returns {Promise<Object>} 提取的企业信息
 */
async function extractCompanyInfo(companyName) {
  if (!MINIMAX_API_KEY) {
    console.warn('⚠️  未配置 MiniMax API Key，使用模拟数据');
    return generateMockCompanyInfo(companyName);
  }

  try {
    console.log('🔍 使用 MiniMax web_search 获取企业信息...');
    
    // 调用 MiniMax API，使用 web_search 工具
    const response = await axios.post(
      `${MINIMAX_API_URL}/text/chatcompletion_v2`,
      {
        model: 'MiniMax-M2.5',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的企业信息分析师，擅长通过搜索获取企业信息。请尽可能详细地搜索和整理企业信息。'
          },
          {
            role: 'user',
            content: `请搜索并整理关于"${companyName}"企业的详细信息，包括：\n\n1. 企业全称和简称\n2. 企业口号/slogan\n3. 核心业务介绍\n4. 成立时间\n5. 总部地点\n6. 行业领域\n7. 主要产品和服务（至少3个）\n8. 企业特色/优势（至少3个）\n9. 官方网站\n10. 联系电话、邮箱、地址等联系信息（如果没有可以标注"待确认"）\n\n请尽可能详细地搜索，提供准确的信息。如果某些信息搜索不到，请标注"待确认"。`
          }
        ],
        tools: [
          {
            type: 'web_search',
            web_search: {
              search_engine: 'search',
              enable: true,
              reason: '需要搜索获取企业详细信息'
            }
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MINIMAX_API_KEY}`
        },
        timeout: 120000
      }
    );

    // 解析 AI 返回的内容
    const assistantMessage = response.data.choices?.[0]?.message;
    
    if (!assistantMessage) {
      console.warn('MiniMax 返回格式异常，使用模拟数据');
      return generateMockCompanyInfo(companyName);
    }

    // 获取思考过程（如果有）和最终回复
    const thinkingContent = assistantMessage. Reasoning || '';
    const aiContent = assistantMessage.content;

    console.log('✅ MiniMax web_search 完成');

    // 解析 AI 返回的 JSON
    let companyInfo = parseCompanyInfo(aiContent, companyName);
    
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
    console.error('MiniMax API 调用失败:', error.message);
    
    if (error.response) {
      console.error('API 错误详情:', JSON.stringify(error.response.data, null, 2));
    }
    
    // 使用模拟数据作为后备
    console.log('使用模拟数据作为后备...');
    return generateMockCompanyInfo(companyName);
  }
}

/**
 * 解析 AI 返回的企业信息
 * @param {string} content - AI 返回的内容
 * @param {string} companyName - 企业名称
 * @returns {Object} 解析后的企业信息
 */
function parseCompanyInfo(content, companyName) {
  try {
    // 尝试直接解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // 如果不是 JSON 格式，手动提取字段
    const info = {
      name: companyName,
      shortName: extractField(content, ['简称', '简称叫', 'shortName']) || companyName.replace(/有限公司|股份有限公司|集团|科技|网络|信息/g, ''),
      slogan: extractField(content, ['口号', 'slogan', '标语']) || '创新引领未来',
      business: extractField(content, ['核心业务', '主要业务', 'business']) || '',
      description: extractField(content, ['介绍', 'description', '详细']) || '',
      industry: extractField(content, ['行业', 'industry']) || '互联网/科技',
      founded: extractField(content, ['成立', 'founded', '创建于']) || '待确认',
      headquarters: extractField(content, ['总部', 'headquarters', '位于']) || '待确认',
      services: extractArrayField(content, ['服务', '产品', 'services']),
      features: extractArrayField(content, ['特色', '优势', 'features', '特点']),
      contact: {
        phone: extractField(content, ['电话', 'phone', '联系方式']) || '待确认',
        email: extractField(content, ['邮箱', 'email', '信箱']) || '待确认',
        address: extractField(content, ['地址', 'address', '办公地点']) || '待确认'
      },
      social: {
        website: extractField(content, ['官网', 'website', '官方网站']) || '',
        weibo: extractField(content, ['微博']) || '',
        wechat: extractField(content, ['微信公众号', '微信']) || ''
      }
    };
    
    return info;
  } catch (parseError) {
    console.warn('解析企业信息失败:', parseError.message);
    return generateMockCompanyInfo(companyName);
  }
}

/**
 * 从文本中提取字段值
 * @param {string} text - 原始文本
 * @param {Array} keywords - 关键词列表
 * @returns {string} 提取的值
 */
function extractField(text, keywords) {
  for (const keyword of keywords) {
    // 尝试多种匹配模式
    const patterns = [
      new RegExp(`${keyword}[：:][\\s]*([^\\n]{2,100})`, 'i'),
      new RegExp(`${keyword}[^\\u4e00-\\u9fa5]*([^\\n]{2,50})`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }
  return '';
}

/**
 * 从文本中提取数组字段
 * @param {string} text - 原始文本
 * @param {Array} keywords - 关键词列表
 * @returns {Array} 提取的数组
 */
function extractArrayField(text, keywords) {
  const results = [];
  
  for (const keyword of keywords) {
    // 匹配列表项
    const listPattern = new RegExp(`[\\d、\\.\\-][\\s]*([^\\n]{5,80})`, 'g');
    let match;
    while ((match = listPattern.exec(text)) !== null && results.length < 5) {
      const item = match[1].trim();
      if (item.length > 3) {
        results.push({ name: item, description: '' });
      }
    }
    
    if (results.length >= 3) break;
  }
  
  // 如果提取不到，返回默认值
  if (results.length < 3) {
    return [
      { name: '主营业务一', description: '相关服务描述' },
      { name: '主营业务二', description: '相关服务描述' },
      { name: '主营业务三', description: '相关服务描述' }
    ];
  }
  
  return results;
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
    description: `${companyName}成立于2000年，总部位于中国北京。作为行业领先的技术企业，我们始终坚持"以客户为中心，以创新为驱动"的经营理念。经过二十多年的发展，公司已经成为集研发，生产、销售、服务于一体的综合性企业集团。

公司拥有一支高素质的专业团队，在人工智能、云计算，大数据等前沿技术领域具有深厚的积累。我们的产品广泛应用于金融、医疗、教育，制造等多个行业，为客户创造价值，推动社会进步。`,
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
