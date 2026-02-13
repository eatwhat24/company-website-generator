/**
 * 网站生成服务
 * 使用 EJS 模板生成企业官网
 */

const ejs = require('ejs');
const fs = require('fs').promises;
const path = require('path');
const { ensureDir } = require('../utils/helpers');

// 模板目录
const TEMPLATES_DIR = path.join(__dirname, '../../templates');
const OUTPUT_DIR = path.join(__dirname, '../../output');

/**
 * 生成企业官网
 * @param {Object} companyInfo - 企业信息
 * @returns {Promise<string>} 输出目录路径
 */
async function generateWebsite(companyInfo) {
  const companyDirName = companyInfo.name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const outputDir = path.join(OUTPUT_DIR, `${companyDirName}-official-website`);
  
  // 确保输出目录存在
  await ensureDir(outputDir);
  await ensureDir(path.join(outputDir, 'css'));
  await ensureDir(path.join(outputDir, 'js'));
  await ensureDir(path.join(outputDir, 'images'));
  
  // 生成页面
  const pages = [
    { name: 'index', title: '首页' },
    { name: 'about', title: '关于我们' },
    { name: 'services', title: '服务与产品' },
    { name: 'contact', title: '联系我们' }
  ];
  
  for (const page of pages) {
    const html = await renderTemplate(page.name, {
      ...companyInfo,
      pageTitle: page.title,
      currentPage: page.name,
      pages: pages
    });
    
    const fileName = page.name === 'index' ? 'index.html' : `${page.name}.html`;
    await fs.writeFile(path.join(outputDir, fileName), html, 'utf-8');
    console.log(`   生成页面: ${fileName}`);
  }
  
  // 生成 CSS
  const cssContent = generateCSS(companyInfo);
  await fs.writeFile(path.join(outputDir, 'css', 'style.css'), cssContent, 'utf-8');
  console.log(`   生成样式: css/style.css`);
  
  // 生成 JavaScript
  const jsContent = generateJS();
  await fs.writeFile(path.join(outputDir, 'js', 'main.js'), jsContent, 'utf-8');
  console.log(`   生成脚本: js/main.js`);
  
  return outputDir;
}

/**
 * 渲染 EJS 模板
 * @param {string} templateName - 模板名称
 * @param {Object} data - 模板数据
 * @returns {Promise<string>} 渲染后的 HTML
 */
async function renderTemplate(templateName, data) {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.ejs`);
  const layoutPath = path.join(TEMPLATES_DIR, 'layout.ejs');
  
  try {
    // 读取页面模板
    const pageTemplate = await fs.readFile(templatePath, 'utf-8');
    
    // 渲染页面内容
    const pageContent = ejs.render(pageTemplate, data, {
      filename: templatePath
    });
    
    // 渲染布局
    const layoutTemplate = await fs.readFile(layoutPath, 'utf-8');
    const fullHtml = ejs.render(layoutTemplate, {
      ...data,
      body: pageContent
    }, {
      filename: layoutPath
    });
    
    return fullHtml;
  } catch (error) {
    console.error(`渲染模板失败: ${templateName}`, error);
    throw error;
  }
}

/**
 * 生成 CSS 样式
 * @param {Object} companyInfo - 企业信息
 * @returns {string} CSS 内容
 */
function generateCSS(companyInfo) {
  const primaryColor = '#2563eb';
  const secondaryColor = '#1e40af';
  const accentColor = '#f59e0b';
  
  return `
/* ============================================
   ${companyInfo.name} - 企业官网样式
   ============================================ */

/* CSS 变量 */
:root {
  --primary: ${primaryColor};
  --primary-dark: ${secondaryColor};
  --accent: ${accentColor};
  --text: #1f2937;
  --text-light: #6b7280;
  --bg: #ffffff;
  --bg-light: #f3f4f6;
  --border: #e5e7eb;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --radius: 8px;
  --radius-lg: 16px;
  --transition: all 0.3s ease;
}

/* 重置样式 */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
}

a {
  text-decoration: none;
  color: inherit;
}

img {
  max-width: 100%;
  height: auto;
}

/* 容器 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 导航栏 */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  z-index: 1000;
  transition: var(--transition);
}

.navbar.scrolled {
  box-shadow: var(--shadow);
}

.navbar .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.logo span {
  color: var(--text);
}

.nav-links {
  display: flex;
  list-style: none;
  gap: 2rem;
}

.nav-links a {
  font-weight: 500;
  transition: var(--transition);
  position: relative;
}

.nav-links a:hover,
.nav-links a.active {
  color: var(--primary);
}

.nav-links a::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--primary);
  transition: var(--transition);
}

.nav-links a:hover::after,
.nav-links a.active::after {
  width: 100%;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text);
}

/* 主要内容区 */
main {
  min-height: calc(100vh - 70px - 300px);
  padding-top: 70px;
}

/* Hero 区域 */
.hero {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
  padding: 120px 0 80px;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 600px;
  height: 600px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero h1 {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.hero .slogan {
  font-size: 1.5rem;
  opacity: 0.9;
  margin-bottom: 1.5rem;
}

.hero p {
  font-size: 1.125rem;
  opacity: 0.85;
  max-width: 600px;
  margin-bottom: 2rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 12px 28px;
  border-radius: var(--radius);
  font-weight: 600;
  transition: var(--transition);
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: white;
  color: var(--primary);
}

.btn-primary:hover {
  background: var(--accent);
  color: white;
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-outline {
  background: transparent;
  color: white;
  border: 2px solid white;
}

.btn-outline:hover {
  background: white;
  color: var(--primary);
}

/* 区块样式 */
.section {
  padding: 80px 0;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-header h2 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--text);
}

.section-header p {
  color: var(--text-light);
  font-size: 1.125rem;
  max-width: 600px;
  margin: 0 auto;
}

.bg-light {
  background: var(--bg-light);
}

/* 特性卡片 */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
}

.feature-card {
  background: white;
  padding: 40px 30px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  transition: var(--transition);
  text-align: center;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  font-size: 2rem;
  color: white;
}

.feature-card h3 {
  font-size: 1.25rem;
  margin-bottom: 12px;
}

.feature-card p {
  color: var(--text-light);
}

/* 服务卡片 */
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.service-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: var(--transition);
}

.service-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}

.service-image {
  height: 200px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: white;
}

.service-content {
  padding: 30px;
}

.service-content h3 {
  font-size: 1.25rem;
  margin-bottom: 12px;
  color: var(--text);
}

.service-content p {
  color: var(--text-light);
  margin-bottom: 20px;
}

.service-link {
  color: var(--primary);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.service-link:hover {
  color: var(--primary-dark);
}

/* 关于页面 */
.about-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.about-image {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  border-radius: var(--radius-lg);
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5rem;
  color: white;
}

.about-text h3 {
  font-size: 2rem;
  margin-bottom: 20px;
  color: var(--text);
}

.about-text p {
  color: var(--text-light);
  margin-bottom: 20px;
  line-height: 1.8;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  margin-top: 40px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--primary);
}

.stat-label {
  color: var(--text-light);
  font-size: 0.875rem;
}

/* 联系页面 */
.contact-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
}

.contact-info h3 {
  font-size: 1.5rem;
  margin-bottom: 30px;
}

.contact-item {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 30px;
}

.contact-item .icon {
  width: 50px;
  height: 50px;
  background: var(--bg-light);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--primary);
  flex-shrink: 0;
}

.contact-item h4 {
  font-size: 1rem;
  margin-bottom: 5px;
}

.contact-item p {
  color: var(--text-light);
}

.contact-form {
  background: white;
  padding: 40px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 1rem;
  transition: var(--transition);
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-group textarea {
  min-height: 120px;
  resize: vertical;
}

/* 页脚 */
.footer {
  background: var(--text);
  color: white;
  padding: 60px 0 30px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
}

.footer-brand h3 {
  font-size: 1.5rem;
  margin-bottom: 15px;
}

.footer-brand p {
  opacity: 0.7;
  line-height: 1.8;
}

.footer-links h4 {
  font-size: 1rem;
  margin-bottom: 20px;
}

.footer-links ul {
  list-style: none;
}

.footer-links li {
  margin-bottom: 10px;
}

.footer-links a {
  opacity: 0.7;
  transition: var(--transition);
}

.footer-links a:hover {
  opacity: 1;
  color: var(--primary);
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 30px;
  text-align: center;
  opacity: 0.7;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .about-content,
  .contact-content {
    grid-template-columns: 1fr;
  }
  
  .about-image {
    height: 300px;
    order: -1;
  }
  
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
    position: absolute;
    top: 70px;
    left: 0;
    right: 0;
    background: white;
    flex-direction: column;
    padding: 20px;
    box-shadow: var(--shadow);
    gap: 1rem;
  }
  
  .nav-links.active {
    display: flex;
  }
  
  .mobile-menu-btn {
    display: block;
  }
  
  .hero h1 {
    font-size: 2.5rem;
  }
  
  .hero .slogan {
    font-size: 1.25rem;
  }
  
  .section-header h2 {
    font-size: 2rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .footer-grid {
    grid-template-columns: 1fr;
    text-align: center;
  }
}

/* 动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeInUp 0.6s ease forwards;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-light);
}

::-webkit-scrollbar-thumb {
  background: var(--primary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--primary-dark);
}
`;
}

/**
 * 生成 JavaScript
 * @returns {string} JS 内容
 */
function generateJS() {
  return `
/**
 * ${new Date().getFullYear()} 企业官网脚本
 */

document.addEventListener('DOMContentLoaded', function() {
  // 移动端菜单
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function() {
      navLinks.classList.toggle('active');
    });
  }
  
  // 导航栏滚动效果
  const navbar = document.querySelector('.navbar');
  
  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
  
  // 平滑滚动
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // 滚动显示动画
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
      }
    });
  }, observerOptions);
  
  document.querySelectorAll('.feature-card, .service-card').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
  
  // 联系表单处理
  const contactForm = document.getElementById('contactForm');
  
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(contactForm);
      const data = Object.fromEntries(formData);
      
      // 模拟提交
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      submitBtn.disabled = true;
      submitBtn.textContent = '发送中...';
      
      setTimeout(() => {
        alert('感谢您的留言！我们会尽快与您联系。');
        contactForm.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }, 1500);
    });
  }
  
  // 数字动画
  function animateNumber(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    function update() {
      start += increment;
      if (start < target) {
        element.textContent = Math.floor(start) + '+';
        requestAnimationFrame(update);
      } else {
        element.textContent = target + '+';
      }
    }
    
    update();
  }
  
  // 观察统计数字
  const statNumbers = document.querySelectorAll('.stat-number');
  
  const statObserver = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.target);
        animateNumber(entry.target, target);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  statNumbers.forEach(stat => {
    statObserver.observe(stat);
  });
});
`;
}

/**
 * 获取生成的文件列表
 * @param {string} outputDir - 输出目录
 * @returns {Array} 文件列表
 */
function getGeneratedFiles(outputDir) {
  return [
    'index.html',
    'about.html',
    'services.html',
    'contact.html',
    'css/style.css',
    'js/main.js'
  ];
}

module.exports = {
  generateWebsite,
  getGeneratedFiles
};
