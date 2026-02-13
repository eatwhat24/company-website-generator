# 企业信息自动搜集 + 官网生成器

基于 Node.js + Express 的企业官网自动生成系统。

## 功能特性

- 🔍 自动搜索企业网络信息
- 🤖 使用 DeepSeek AI 提取关键企业信息
- 🎨 生成现代化响应式企业官网
- 🚀 自动部署到 GitHub Pages

## 技术栈

- **后端**: Node.js + Express
- **模板引擎**: EJS
- **HTTP 请求**: Axios
- **HTML 解析**: Cheerio
- **GitHub API**: @octokit/rest
- **AI**: DeepSeek API

## 安装

```bash
# 克隆项目
git clone <repository-url>
cd company-website-generator-node

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写你的 API Key 和配置
```

## 环境变量配置

在项目根目录创建 `.env` 文件：

```env
# DeepSeek API 配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions

# GitHub 配置（用于自动部署）
GITHUB_TOKEN=your_github_token_here
GITHUB_USERNAME=your_github_username

# 服务器配置
PORT=3000
NODE_ENV=development
```

### 获取 API Key

1. **DeepSeek API Key**: 
   - 访问 https://platform.deepseek.com/
   - 注册并获取 API Key

2. **GitHub Token**:
   - 访问 https://github.com/settings/tokens
   - 生成 Personal Access Token
   - 勾选 `repo` 权限

## 使用

### 启动服务器

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm start
```

服务器将在 http://localhost:3000 启动。

### API 接口

#### 1. 生成企业官网

```http
POST /api/generate
Content-Type: application/json

{
  "companyName": "阿里巴巴",
  "deployToGithub": true
}
```

**参数说明**:
- `companyName` (必填): 企业名称
- `deployToGithub` (可选): 是否自动部署到 GitHub Pages，默认 false

**响应示例**:
```json
{
  "success": true,
  "message": "企业官网生成成功",
  "data": {
    "companyName": "阿里巴巴",
    "generatedFiles": [...],
    "githubUrl": "https://yourusername.github.io/alibaba-official-website/"
  }
}
```

#### 2. 搜索企业信息

```http
POST /api/search
Content-Type: application/json

{
  "companyName": "腾讯"
}
```

#### 3. 健康检查

```http
GET /api/health
```

### Web 界面

访问 http://localhost:3000 可以使用 Web 界面生成企业官网。

## 项目结构

```
company-website-generator-node/
├── src/
│   ├── app.js              # Express 主程序
│   ├── routes/
│   │   └── api.js          # API 路由
│   ├── services/
│   │   ├── search.js       # 企业信息搜索
│   │   ├── extractor.js    # DeepSeek 信息提取
│   │   ├── generator.js    # 网站生成器
│   │   └── github.js       # GitHub 部署
│   └── utils/
│       └── helpers.js      # 工具函数
├── templates/              # EJS 模板
│   ├── layout.ejs
│   ├── index.ejs
│   ├── about.ejs
│   ├── services.ejs
│   └── contact.ejs
├── public/                 # 静态资源
├── package.json
├── .env.example
├── README.md
└── .gitignore
```

## 生成的网站结构

生成的企业官网包含以下页面：
- **首页**: 企业简介和核心业务展示
- **关于我们**: 企业详细介绍
- **服务/产品**: 企业服务或产品展示
- **联系我们**: 联系方式和表单

所有页面均为响应式设计，支持移动端访问。

## 部署

### 手动部署

生成的网站文件位于 `output/{company-name}/` 目录，可以手动上传到任何静态托管服务。

### 自动部署到 GitHub Pages

设置 `deployToGithub: true` 即可自动部署：

1. 确保 GitHub Token 有 `repo` 权限
2. 调用 API 时设置 `deployToGithub: true`
3. 生成的网站将自动推送到 GitHub Pages

## 注意事项

1. **API 限制**: DeepSeek API 有调用频率限制，请合理使用
2. **GitHub Pages 限制**: 仓库大小和带宽有限制
3. **搜索质量**: 企业信息搜索依赖公开网络信息，可能存在不完整或不准确的情况
4. **版权问题**: 生成的内容请自行审核，确保符合版权要求

## 许可证

MIT
