/**
 * 企业信息搜索服务
 * 使用网络搜索获取企业相关信息
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 搜索企业信息
 * @param {string} companyName - 企业名称
 * @returns {Promise<Array>} 搜索结果列表
 */
async function searchCompany(companyName) {
  const searchQueries = [
    `${companyName} 公司介绍`,
    `${companyName} 官网`,
    `${companyName} 核心业务`,
    `${companyName} 产品服务`
  ];
  
  const results = [];
  
  for (const query of searchQueries) {
    try {
      const searchResults = await performSearch(query);
      results.push(...searchResults);
    } catch (error) {
      console.warn(`搜索 "${query}" 失败:`, error.message);
    }
  }
  
  // 去重并限制数量
  const uniqueResults = removeDuplicates(results, 'url');
  return uniqueResults.slice(0, 10);
}

/**
 * 执行搜索请求
 * 使用 Bing 搜索（免费，无需 API Key）
 * @param {string} query - 搜索关键词
 * @returns {Promise<Array>} 搜索结果
 */
async function performSearch(query) {
  try {
    // 使用 Bing 搜索
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.bing.com/'
      },
      timeout: 10000,
      maxRedirects: 5
    });
    
    // 解析搜索结果
    const $ = cheerio.load(response.data);
    const results = [];
    
    // Bing 搜索结果选择器
    $('.b_algo').each((index, element) => {
      const $el = $(element);
      const title = $el.find('h2').text().trim();
      const url = $el.find('h2 a').attr('href');
      const snippet = $el.find('.b_caption p, .b_paractl p').text().trim();
      
      if (title && url) {
        results.push({
          title,
          url,
          snippet: snippet || title,
          source: 'bing'
        });
      }
    });
    
    // 如果没有结果，尝试备用选择器
    if (results.length === 0) {
      $('li.b_algo').each((index, element) => {
        const $el = $(element);
        const title = $el.find('a').first().text().trim();
        const url = $el.find('a').first().attr('href');
        const snippet = $el.find('p').first().text().trim();
        
        if (title && url) {
          results.push({
            title,
            url,
            snippet: snippet || title,
            source: 'bing'
          });
        }
      });
    }
    
    return results;
  } catch (error) {
    console.error('搜索请求失败:', error.message);
    return [];
  }
}

/**
 * 获取网页详情内容
 * @param {string} url - 网页 URL
 * @returns {Promise<string>} 页面内容
 */
async function fetchPageContent(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000,
      maxRedirects: 3
    });
    
    const $ = cheerio.load(response.data);
    
    // 移除脚本和样式
    $('script, style, nav, footer, header, aside').remove();
    
    // 提取主要内容
    let content = '';
    
    // 尝试多种内容选择器
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '#content',
      '.post-content',
      'body'
    ];
    
    for (const selector of contentSelectors) {
      const $content = $(selector);
      if ($content.length > 0) {
        content = $content.text().trim();
        if (content.length > 200) {
          break;
        }
      }
    }
    
    // 清理文本
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    // 限制长度
    if (content.length > 3000) {
      content = content.substring(0, 3000) + '...';
    }
    
    return content;
  } catch (error) {
    console.warn(`获取页面内容失败: ${url}`, error.message);
    return '';
  }
}

/**
 * 数组去重
 * @param {Array} arr - 数组
 * @param {string} key - 去重键
 * @returns {Array} 去重后的数组
 */
function removeDuplicates(arr, key) {
  const seen = new Set();
  return arr.filter(item => {
    const val = item[key];
    if (seen.has(val)) {
      return false;
    }
    seen.add(val);
    return true;
  });
}

module.exports = {
  searchCompany,
  fetchPageContent
};
