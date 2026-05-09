# 剽之有道登录系统与云端工作区计划方案

## 1. 最终目标

将当前 `xhs-app` 从本地单机工具升级为可部署到腾讯云的多用户 Web 应用。

目标：

- 邮箱注册。
- 邮箱验证码。
- 邮箱 + 密码登录。
- 忘记密码。
- 邮箱验证码重置密码。
- 修改昵称。
- 修改密码。
- 登录设备管理。
- 退出登录。
- 登录态保持 30 天。
- 同账号最多 2 台设备在线，第三台登录自动挤掉最早设备。
- 密码连续错误 5 次后锁定 5 分钟。
- 所有业务 API 必须登录后才能调用。
- 当前所有本地持久化数据尽量改为按账号云端同步。
- 使用 Docker 自建 PostgreSQL。
- 部署到腾讯云服务器。

不做目标之外的多于功能


## 2. 技术选型

推荐选型：

- 认证框架：Better Auth。
- 数据库：PostgreSQL（Docker Compose 自建）。
- ORM：Prisma。
- 邮件：QQ 邮箱 SMTP。
- Session：HttpOnly Cookie + 数据库 Session。
- 部署：Docker Compose + Nginx + 腾讯云服务器。

选型理由：

- Better Auth 适合 Next.js App Router，能承担登录态、Session、密码体系和后续扩展。
- Prisma 成熟、类型友好，适合维护 PostgreSQL 表结构。
- PostgreSQL 能稳定承载用户、工作区、日志、设备、验证码等数据。
- HttpOnly Cookie 比把 token 存在 `localStorage` 更安全。
- Docker Compose 与当前腾讯云服务器部署 SOP 匹配，便于部署、重启、备份和迁移。

安全注意：

- QQ 邮箱 SMTP 授权码只允许放入 `.env` 或服务器环境变量。
- 授权码不得写入源码。
- 授权码不得提交到 Git。

## 3. 页面设计与路由

新增认证页面：

- `/login`：登录页。
- `/register`：注册页。
- `/forgot-password`：忘记密码，输入邮箱并发送验证码。
- `/reset-password`：重置密码，输入验证码、新密码、确认密码。

登录页字段：

- 品牌名：剽之有道。
- 邮箱。
- 密码。
- 登录。
- 忘记密码。
- 注册账号。

注册页字段：

- 昵称。
- 邮箱。
- 邮箱验证码。
- 密码。
- 同意用户协议。
- 注册。
- 返回登录。

主工作台访问规则：

- 未登录访问 `/`：跳转 `/login`。
- 已登录访问 `/`：进入工作台。

左下角账号入口：

- 头像。
- 昵称。
- `>` 展开符号。

点击 `>` 后，向上展开菜单：

- 修改昵称。
- 修改密码。
- 登录设备。
- 退出登录。

点击菜单外空白区域时关闭菜单。点击退出登录后撤销当前 Session，并跳转回 `/login`。

## 4. 数据库设计

### 4.1 用户表

`users`

- `id`
- `email`
- `emailVerifiedAt`
- `nickname`
- `avatarColor`
- `avatarInitial`
- `passwordHash`
- `status`
- `lockedUntil`
- `failedLoginCount`
- `lastLoginAt`
- `createdAt`
- `updatedAt`

`status` 建议值：

- `active`
- `locked`
- `disabled`

虽然不做管理员后台，也建议保留账号状态字段，方便后续处理异常账号。

### 4.2 Session 表

`sessions`

- `id`
- `userId`
- `tokenHash`
- `deviceName`
- `userAgent`
- `ip`
- `lastSeenAt`
- `expiresAt`
- `revokedAt`
- `createdAt`

设备限制规则：

- 同一 `userId` 最多保留 2 个未过期、未撤销的有效 Session。
- 第三台设备登录成功后，自动撤销最早的有效 Session。

### 4.3 邮箱验证码表

`email_verification_codes`

- `id`
- `email`
- `scene`
- `codeHash`
- `expiresAt`
- `consumedAt`
- `attemptCount`
- `createdAt`

`scene` 建议值：

- `register`
- `reset_password`

验证码只保存哈希，不保存明文。

### 4.4 登录日志表

`login_logs`

- `id`
- `userId`
- `email`
- `ip`
- `userAgent`
- `success`
- `reason`
- `createdAt`

该表用于排查登录问题、观察异常行为和后续做安全审计。

### 4.5 云端工作区表

第一版建议优先使用统一快照表，减少对现有 Zustand / IndexedDB 结构的破坏。

`workspace_snapshots`

- `id`
- `userId`
- `key`
- `payload`
- `updatedAt`

字段说明：

- `userId`：归属用户。
- `key`：工作区数据类型。
- `payload`：JSONB 数据。
- `updatedAt`：最后更新时间。

建议保存的 `key`：

- `app-store`
- `workspace-snapshot`
- `rewrite-settings`
- `prompts-settings`
- `cover-template-library`

第一版先用 JSONB 快速承接现有本地持久化数据。后续如果需要更强检索、统计、恢复能力，再逐步拆为业务细表：

- `search_histories`
- `crawl_results`
- `rewrite_results`
- `draft_records`
- `user_prompt_settings`
- `cover_template_settings`

## 5. API 保护方案

新增服务端认证工具：

- `getCurrentUser()`
- `requireUser()`
- `requireActiveUser()`

所有业务 API 开头统一检查登录态。

需要保护的接口包括：

- `/api/xhs/search`
- `/api/ai/rewrite`
- `/api/feishu/*`
- `/api/jimeng/generate`
- `/api/proxy-image`
- `/api/workspace/*`

请求流程：

1. 浏览器自动携带 HttpOnly Cookie。
2. 服务端读取 Cookie 中的 Session 标识。
3. 服务端查询数据库，确认 Session 有效、未过期、未撤销。
4. 服务端查询用户状态，确认用户为 `active`。
5. 校验通过后继续执行业务逻辑。
6. 校验失败时返回 `401` 或 `403`。

前端处理规则：

- 收到 `401`：跳转 `/login`，提示登录已过期。
- 收到 `403`：提示账号不可用或状态异常。

API 保护必须在服务端实现，不能只依赖前端隐藏按钮。

## 6. 基础安全阀

建议规则：

- 邮箱验证码 60 秒内只能发送一次。
- 同一邮箱每天限制验证码发送次数。
- 同一 IP 每小时限制注册次数。
- 验证码 10 分钟有效。
- 验证码最多尝试 5 次，超过后失效。
- 同一账号密码错误 5 次后锁定 5 分钟。
- 登录接口加 IP 限流。
- 注册接口加 IP 限流。
- 忘记密码接口加 IP 限流。
- Session 使用 HttpOnly Cookie。
- 生产环境 Cookie 设置 `Secure`。
- Cookie 设置 `SameSite=Lax`。
- 生产环境强制 HTTPS。
- PostgreSQL 端口不暴露公网。

目的：挡住基础的刷注册、刷邮件、撞库和接口滥用。

## 7. 云端工作区同步方案

最终目标：

- 用户在任意设备登录后，之前的工作记录、设置和产物都可以恢复。
- 不使用浏览器本地缓存作为唯一数据源，而是将PostgreSQL 中的用户工作区数据作为真实数据源。

需要改造的现有模块：

- `src/store/appStore.ts`
- `src/store/rewriteSettingsStore.ts`
- `src/store/promptsSettingsStore.ts`
- `src/store/coverTemplateLibraryStore.ts`
- `src/hooks/useWorkspacePersistence.ts`
- `src/hooks/useCoverTemplateLibraryPersistence.ts`
- `src/lib/indexedDb.ts`

新的数据流：

1. 用户登录成功。
2. 前端调用 `/api/workspace` 拉取当前用户云端工作区。
3. Zustand 初始化为云端数据。
4. 用户操作时，本地状态立即更新。
5. 使用 debounce 自动保存到 `/api/workspace`。
6. 用户换设备登录后，从数据库恢复同一份工作区。

旧本地数据处理：

- 不迁移。
- 不导入。
- 上线后直接使用新的云端工作区数据结构。

## 8. 邮件流程

### 8.1 注册流程

1. 用户输入昵称、邮箱、密码。
2. 点击发送验证码。
3. 服务端检查邮箱是否已注册。
4. 服务端生成 6 位验证码。
5. 服务端哈希验证码并写入数据库。
6. 服务端通过 QQ SMTP 发送邮件。
7. 用户输入验证码并提交注册。
8. 服务端校验验证码。
9. 服务端创建用户。
10. 注册成功后跳转登录页。

### 8.2 忘记密码流程

1. 用户输入邮箱。
2. 服务端发送重置密码验证码。
3. 用户输入验证码、新密码、确认密码。
4. 服务端校验验证码。
5. 服务端更新 `passwordHash`。
6. 服务端撤销该用户已有 Sessions。
7. 用户返回登录页重新登录。

### 8.3 修改密码流程

1. 登录用户输入旧密码、新密码、确认密码。
2. 服务端验证旧密码。
3. 服务端更新 `passwordHash`。
4. 保留当前 Session。
5. 撤销其他设备 Session。

## 9. 开发实施步骤
*按顺序依次执行即可，中途不需要停下来*
### 阶段 1：认证基础设施

- 安装 Better Auth、Prisma、PostgreSQL 相关依赖。
- 新增 Prisma schema。
- 配置数据库连接。
- 新增认证服务端工具。
- 新增 `.env.example` 认证、数据库和 SMTP 配置。

### 阶段 2：邮箱注册与登录

- 实现 `/register`。
- 实现 `/login`。
- 实现邮箱验证码发送接口。
- 实现注册接口。
- 实现登录接口。
- 实现退出登录接口。
- 实现登录失败锁定。
- 实现 30 天 Session。
- 实现 2 设备在线限制。

### 阶段 3：忘记密码与账号菜单

- 实现 `/forgot-password`。
- 实现 `/reset-password`。
- 实现邮箱验证码重置密码。
- 实现修改昵称。
- 实现修改密码。
- 实现登录设备列表。
- 实现退出指定设备。
- 接入左下角账号菜单。

### 阶段 4：页面和 API 鉴权

- 未登录访问 `/` 自动跳转 `/login`。
- 所有业务 API 加 `requireUser()`。
- 前端统一处理 `401`。
- 前端统一处理用户状态异常。

### 阶段 5：云端工作区同步

- 新增 `/api/workspace` GET / PUT。
- 将 `localStorage` / IndexedDB 持久化迁移为云端同步。
- 按 `userId` 保存 workspace payload。
- 处理加载状态。
- 处理保存状态。
- 处理保存失败提示。
- 放弃旧本地数据迁移。

### 阶段 6：测试与稳定性

- 注册流程测试。
- 登录流程测试。
- 忘记密码测试。
- 重置密码测试。
- 修改昵称测试。
- 修改密码测试。
- 2 设备限制测试。
- 错误密码锁定测试。
- 未登录 API 访问测试。
- 云端工作区跨设备恢复测试。
- 刷新页面恢复测试。
- 退出登录测试。

### 阶段 7：腾讯云部署

- 按 skills：`tencent-cloud-server-sop` 检查服务器现状。
- 确认不影响 `/opt/live-agent`。
- 创建 `/opt/xhs-app`。
- 编写 Dockerfile。
- 编写 `docker-compose.yml`。
- 启动 app + postgres。
- 配置生产 `.env`。
- 配置 Nginx 反向代理。
- 绑定域名。
- 配置 HTTPS。
- 配置 PostgreSQL volume。
- 配置每日备份。
- 验证公网访问。

## 10. 部署结构

推荐服务器目录：

```text
/opt/xhs-app
  docker-compose.yml
  .env
  app/
  backups/
  postgres-data/
```

推荐服务：

- `xhs-app`：Next.js 应用。
- `postgres`：PostgreSQL 数据库。
- `jimeng-api`：如果仍需独立服务，可一起纳入 Compose。
- `nginx`：服务器已有 Nginx，作为公网反向代理。

公网只开放：

- `80`
- `443`

不要将 PostgreSQL 端口暴露到公网。


## 11. 主要风险与处理

### 11.1 工作区全量云同步扩大改造范围

风险：

- 当前项目大量使用本地持久化。
- 全部云端同步会比单纯登录页复杂。

处理：

- 第一版使用 `workspace_snapshots` JSONB 快速承接现有 Zustand 数据。
- 优先保证跨设备恢复体验。
- 后续再逐步拆成细业务表。

### 11.2 QQ 邮箱 SMTP 有频率和风控限制

风险：

- 用户增长后，QQ 邮箱可能触发频率限制。
- 邮件可能进入垃圾箱。

处理：

- 第一版先用 QQ 邮箱 SMTP。
- 用户量增长后迁移企业邮箱或专业邮件服务。

### 11.3 Docker 自建 PostgreSQL 需要运维

风险：

- 误删 volume 会导致数据丢失。
- 服务器磁盘问题会影响数据库。
- 没有自动备份会增加恢复风险。

处理：

- 使用持久化 volume。
- 配置每日自动备份。
- 设计备份保留策略。
- 保留恢复说明。

### 11.4 API 漏保护

风险：

- 如果某个业务 API 漏掉 `requireUser()`，未登录用户可能直接调用接口。

处理：

- 所有 `src/app/api` 路由统一检查。
- 上线前用 `rg` 扫描 API 路由。
- 加入未登录访问测试清单。

## 12. 最终结论

目标不是简单登录页，而是一套完整的供用户免费使用的开放账号体系：

```text
邮箱认证
安全登录态
API 服务端鉴权
2 设备限制
云端工作区同步
Docker PostgreSQL
腾讯云部署
```
当你看到这的时候，可以开始进行开发了。
