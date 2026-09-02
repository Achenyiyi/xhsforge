<div align="center">

# 📕 Xiaohongshu Agent

**AI 驱动的小红书内容运营工作台**

_热点素材搜集 · 通义千问文案改写 · 即梦智能配图 · 飞书协同发布_

![Next.js](https://img.shields.io/badge/Next.js%2016-000000?style=flat-square&logo=next.js&logoColor=white)
![React 19](https://img.shields.io/badge/React%2019-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL%2016-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker%20Compose-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## ✨ 核心特性

- 🔍 **素材搜集** — 按关键词批量搜索小红书笔记素材，快速洞察同赛道爆款内容
- ✍️ **AI 文案改写** — 基于通义千问（文本 + 视觉多模态），一键将素材改写为原创文案，支持批量并发与自动重试
- 🎨 **智能配图 / 生视频** — 内置即梦（Jimeng）API 本地代理服务，为笔记生成配图与视频
- 🗂️ **飞书协同发布** — 与飞书多维表格深度集成：素材导入、发布账号管理、一键存草稿、收藏状态同步
- 👥 **完整账号体系** — 邮箱验证码注册 / 登录、会话管理、密码找回，开箱即用
- 📦 **多种部署形态** — Docker Compose 一键拉起，或 Windows 便携包双击即用

## 🔄 工作流

```mermaid
flowchart LR
    A[🔍 关键词搜索素材] --> B[✍️ 通义千问 AI 改写]
    B --> C{🎨 需要配图?}
    C -->|是| D[即梦生成图片 / 视频]
    C -->|否| E
    D --> E[🗂️ 一键存入飞书多维表格]
    E --> F[🚀 分发到发布账号]
```

## 🧩 功能模块

| 模块 | 说明 | 关键技术 |
|------|------|----------|
| 素材搜索 | 小红书笔记关键词搜索与素材采集 | 第三方数据 API |
| AI 改写 | 文案改写、多模态理解，批量草稿生成 | DashScope · qwen-plus / qwen-vl-plus |
| 智能生成 | 笔记配图与视频生成 | Jimeng API 本地代理 · jimeng-4.6 |
| 协同发布 | 素材导入、发布账号、存草稿、收藏同步 | 飞书开放平台 · 多维表格 |
| 账号中心 | 邮箱验证码登录、会话与账户管理 | Next.js Route Handlers · SMTP |
| 数据持久化 | 用户 / 会话 / 改写结果存储 | Prisma ORM · PostgreSQL 16 |

## 🚀 快速开始

### 方式一：Docker Compose（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/Achenyiyi/xiaohongshuagent.git
cd xiaohongshuagent

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入数据库、DashScope、飞书等密钥

# 3. 一键启动（自动创建 PostgreSQL + 应用 + 即梦代理三个服务）
docker compose up -d
```

启动后访问 <http://127.0.0.1:3000>。

### 方式二：本地开发

```bash
# 依赖：Node.js 20+、PostgreSQL 16+
npm install
npx prisma generate && npx prisma migrate dev
cp .env.example .env.local   # 填写配置
npm run dev                  # http://localhost:3000
```

> 即梦生图代理需单独运行，位于 `services/jimeng-api`，默认监听 `5566` 端口，通过 `JIMENG_API_BASE_URL` 指向。

### 方式三：Windows 便携包

公司 / 内网环境免安装运行，脚本只使用相对路径，整个目录可随意拷贝：

| 操作 | 双击 |
|------|------|
| 启动（自动安装依赖 → 构建 → 拉起服务 → 打开浏览器） | `start-company.cmd` |
| 停止 | `stop-company.cmd` |
| 清理浏览器本地缓存 | `clear-local-data.cmd` |

## 🔧 环境变量

完整模板见 [.env.example](.env.example)，按模块分组：

| 模块 | 变量 | 说明 |
|------|------|------|
| 数据库 | `DATABASE_URL` | PostgreSQL 连接串 |
| 认证 | `AUTH_SECRET` / `AUTH_CODE_PEPPER` | 会话密钥与验证码加盐（**务必修改默认值**） |
| 邮件 | `SMTP_*` | 发送验证码的 SMTP 账户 |
| 飞书 | `FEISHU_*` | 多维表格凭证与文档库链接 |
| 素材搜索 | `XHS_API_BASE_URL` / `XHS_API_KEY` | 小红书数据 API 供应商 |
| AI 改写 | `DASHSCOPE_API_KEY` | 阿里云百炼（通义千问）密钥 |
| 智能生成 | `JIMENG_SESSION_ID` | 即梦服务会话凭证 |

所有请求均可通过 `XHS_REQUEST_TIMEOUT_MS`、`SAVE_DRAFT_CONCURRENCY` 等参数调节超时、重试与并发。

## 🏗️ 技术栈

**前端** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · shadcn/ui · Zustand · SWR
**后端** Next.js Route Handlers · Prisma ORM · PostgreSQL 16 · better-auth
**AI 能力** DashScope（通义千问）· 即梦 API 代理（独立 Node 服务）
**集成** 飞书开放平台（多维表格）· SMTP 邮件
**部署** Docker Compose · Windows 便携脚本

## 📁 项目结构

```text
xiaohongshuagent/
├── src/
│   ├── app/              # 页面与 API 路由（auth / xhs / ai / jimeng / feishu / workspace）
│   ├── components/       # UI 组件
│   ├── lib/              # 核心业务逻辑
│   ├── store/            # Zustand 状态
│   └── types/            # 类型定义
├── services/jimeng-api/  # 即梦生图代理服务（独立部署）
├── prisma/               # 数据模型与迁移
├── docs/                 # 设计文档
├── docker-compose.yml    # PostgreSQL + 应用 + 即梦代理
└── start-company.*       # Windows 一键启动脚本
```

## ❓ FAQ

**Q: 启动后无法访问 3000 端口？**
Docker 模式默认绑定 `127.0.0.1`，如需局域网访问请修改 `docker-compose.yml` 中的端口映射。

**Q: 登录页验证码收不到？**
检查 `.env` 中 SMTP 配置；QQ 邮箱需使用授权码而非登录密码。

**Q: 素材搜索报错或为空？**
确认 `XHS_API_KEY` 有效，并检查供应商配额。

**Q: 即梦生成超时？**
即梦为本地代理服务，需单独配置 `JIMENG_SESSION_ID`，超时可调 `JIMENG_REQUEST_TIMEOUT_MS`（默认 90s）。

## ⚠️ 免责声明

本项目仅供学习与内部效率工具使用，请遵守目标平台的服务条款，理性控制请求频率，勿用于任何违规用途。
