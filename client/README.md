# 企业官网生成器 - React 前端

基于 React + shadcn/ui 的现代化前端界面。

## 技术栈

- React 18 + Vite
- TypeScript
- shadcn/ui (Radix UI)
- Tailwind CSS
- React Query

## 项目结构

```
client/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui 组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── toast.tsx
│   │   │   └── toaster.tsx
│   │   └── ...
│   ├── hooks/
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── api.ts        # API 客户端
│   │   └── utils.ts
│   ├── pages/
│   │   └── HomePage.tsx  # 主页面
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 开发

```bash
# 安装依赖
cd client
npm install

# 启动开发服务器
npm run dev
```

开发服务器会在 http://localhost:5173 启动，并代理 API 请求到 http://localhost:3000

## 构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 与后端集成

后端 (Express) 已配置为提供 `client/dist` 目录作为静态文件。

1. 首先构建前端：
   ```bash
   cd client
   npm run build
   ```

2. 启动后端服务器：
   ```bash
   cd ..
   npm start
   ```

3. 访问 http://localhost:3000 查看 React 前端

## 功能

- 输入企业名称搜索企业信息
- AI 自动生成企业官网
- 可选部署到 GitHub Pages
- 实时显示生成进度
- 美观的现代化 UI 设计
