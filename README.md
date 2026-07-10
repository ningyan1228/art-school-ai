# 美术机构 AI 教学管理平台（MVP v1.0）

低成本、免下载安装的 Web App + PWA，服务美术机构的教务管理、学生作品成长档案和 AI 教学辅助。

当前仓库包含可演示的 Alpha 前端：老师/学生登录、角色切换、课程与学生假数据、作品上传，以及可切换到真实 SiliconFlow 的 AI 点评。

- [完整 PRD](docs/PRD.md)
- [数据库设计](docs/DATABASE.md)
- [页面原型说明](docs/WIREFRAMES.md)
- [开发任务拆解](docs/DEVELOPMENT-PLAN.md)
- [腾讯云 AI 代理部署说明](server/art-school-ai-proxy/README.md)

## MVP 技术决策

- 前端：Vue 3、Vite、TypeScript、Tailwind CSS、Pinia、PWA
- 后端：Node.js、Fastify、SQLite
- 部署：GitHub Pages（前端）+ 自有服务器 Docker/PM2（API 与图片）
- AI：后端代理 SiliconFlow；浏览器绝不保存 SiliconFlow API Key

## Alpha 本地运行

```bash
cd frontend
pnpm install
pnpm dev
```

生产构建：`pnpm run build`。GitHub Pages 会由 `.github/workflows/deploy-pages.yml` 在推送 `main` 后自动发布，仓库名固定为 `art-school-ai`，因此 Vite 的发布基础路径是 `/art-school-ai/`。
