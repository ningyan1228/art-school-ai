# 画芽 AI 点评代理

这是 GitHub Pages 前端使用的最小 API 代理：只接受 `POST /api/ai/artwork-review`，将图片 Data URL 安全转发给 SiliconFlow，再返回结构化儿童友好点评。它不保存图片、不保存学生资料、不提供账号或数据库服务。

## WinSCP 上传与服务器启动

1. 在 WinSCP 打开腾讯云服务器，进入 `~/projects/`，新建 `art-school-ai-proxy` 文件夹。
2. 上传本目录的 `Dockerfile`、`docker-compose.yml`、`package.json`、`server.js`、`.env.example`、`.gitignore`、`README.md`。
3. 在服务器上将 `.env.example` 复制为 `.env`，填写邮箱、GitHub Pages 域名、SiliconFlow API Key 和已确认可用的视觉模型。
4. 在域名 DNS 添加 A 记录：`art-school-ai-api` → `43.128.149.75`。DNS 生效后运行以下命令。

```bash
cd ~/projects/art-school-ai-proxy
docker compose up -d --build
docker compose ps
docker compose logs --tail=100
curl -i https://art-school-ai-api.gjsx.uno/health
```

停止与查看日志：

```bash
cd ~/projects/art-school-ai-proxy
docker compose down
docker compose logs -f --tail=100
```

成功的 health 响应为 `{"ok":true,"service":"art-school-ai-proxy"}`。

## 前端接入

在 `frontend/.env.production` 写入：

```env
VITE_ART_SCHOOL_API_URL=https://art-school-ai-api.gjsx.uno
```

然后重新运行 `pnpm run build`，上传 `frontend/dist/` 中的所有文件到 GitHub Pages 发布分支或由 GitHub Actions 发布。

## 安全边界

- `.env` 必须只存在腾讯云服务器，不使用 WinSCP 上传到 GitHub 仓库。
- CORS 仅允许 `ALLOWED_ORIGINS` 的 GitHub Pages 域名。
- 每 IP 15 分钟最多 12 次 AI 请求；单张图片限制为 10 MB。
- SiliconFlow 视觉接口支持使用 Base64 图像与 `/v1/chat/completions`；模型可用性会变动，部署前在 SiliconFlow 模型广场确认。
