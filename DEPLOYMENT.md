# Vercel 部署清单

这个项目最终推荐部署成 Vercel 上的 iOS PWA，并使用 Upstash Redis 存储云端快照。

## 当前生产部署

- Production URL: https://fitlog-minimal.vercel.app
- Vercel project: `fitlog-minimal`
- Project ID: `prj_XIpPWV4EdGr1zfPzcfEm5ZfxhIDX`

## 1. 准备 Vercel 项目

推荐直接把 GitHub 仓库导入 Vercel：

1. Vercel Dashboard 里选择 Add New Project。
2. 选择 `fitlog-minimal` 仓库。
3. Framework Preset 选择 Vite。
4. Build Command 保持 `npm run build`。
5. Output Directory 保持 `dist`。

项目里已经有 `vercel.json`，会配置 Vite 输出目录、`api/sync.js` 函数和 PWA 相关响应头。

## 2. 配置云存储

在 Vercel Marketplace 里给这个项目安装 Upstash Redis。安装后确认项目环境变量里有：

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

如果 Marketplace 注入的是下面这组变量也可以，项目会自动识别：

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

如果是手动创建 Upstash 数据库，就把 `UPSTASH_*` 这两个值手动填到 Vercel Project Settings → Environment Variables。

## 3. 部署

配置环境变量后触发一次 Production 部署。也可以本地使用 Vercel CLI：

```bash
npm run predeploy
vercel link
vercel env pull .env.local
vercel deploy --prod
```

本地测试 Vercel Functions 时使用：

```bash
npm run dev:vercel
```

## 4. iPhone 安装

1. 在 iPhone Safari 打开 Vercel 生产地址。
2. 点击分享按钮。
3. 选择「添加到主屏幕」。
4. 从主屏幕打开「练一下」。

## 5. 云同步使用

第一台设备：

1. 进入设置页。
2. 生成同步码。
3. 保存同步码到 iCloud 钥匙串或备忘录。
4. 点击「上传本机数据到云端」。
5. 开启「保存本机修改后自动上传」。

新设备：

1. 打开同一个 Vercel 地址。
2. 输入同一个同步码。
3. 点击「从云端恢复到本机」。
4. 开启自动上传。

同步码相当于这份数据的钥匙。当前版本没有账号系统，适合个人自用，不适合共享给多人。

## 6. 验收

部署完成后检查：

- 首页可以正常加载。
- 设置页显示 iPhone 安装和云同步。
- 生成同步码后可以上传本机数据。
- 新浏览器或新手机输入同一个同步码可以恢复数据。
- iPhone Safari 可以添加到主屏幕。
- 主屏幕打开后没有浏览器地址栏。

可以用脚本检查线上云同步状态：

```bash
npm run verify:cloud
```

如果 Upstash 还没有配置，脚本会显示 `configured: false`。配置完成并重新部署后，脚本会执行一次写入/读取闭环验证。
