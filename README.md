# 练一下 / FitLog Minimal

个人自用的极简健身记录 PWA。移动端优先、无登录，本地优先保存到浏览器 `localStorage`，可选通过 Vercel + Upstash Redis 做云端同步。

## 功能

- 动作库：按部位维护动作、重量、组数、次数、备注和归档状态。
- 快速开练：选择背、胸、肩、腹、胳膊、腿、有氧或自定义，生成本次训练清单。
- 训练中记录：勾选完成、修改本次重量/组数/次数、选择难度、填写备注。
- 历史记录：按日期倒序查看、筛选、编辑、删除训练。
- 进步记录：更新动作模板重量/组数/次数时写入 `ProgressUpdate`。
- 统计：首页展示本周、本月、总训练次数、最近三次记录、身体热力图和训练建议。
- 数据管理：导出 JSON、导入 JSON、导出 Markdown、恢复初始数据、清空数据。
- iOS PWA：支持主屏幕图标、standalone 模式、iOS 安全区和离线 app shell。
- 云同步：使用同步码把整份 `AppData` 快照上传到 Vercel API 后端，存入 Upstash Redis。

## 素材授权

动作插画优先使用 Open Training exercise image collection 的本地 SVG 资源。

- Source: https://github.com/chaosbastler/opentraining-exercises
- Original author/source: Everkinetic
- License: Creative Commons Attribution-ShareAlike 3.0 Unported

无合适外部素材的动作使用项目内自绘 SVG 线稿作为 fallback。

## 技术栈

- Vite
- React
- TypeScript
- CSS
- localStorage
- Vercel Functions
- Upstash Redis

## 本地启动

```bash
npm install
npm run dev
```

普通 `npm run dev` 只启动 Vite 前端，不会启动 Vercel API。需要本地测试云同步时使用：

```bash
npm run dev:vercel
```

构建：

```bash
npm run build
```

## 数据说明

localStorage key：

```text
fitlog_minimal_v1
```

首次打开时会自动写入 seed 数据，包括动作模板和 24 条 2026 年历史训练记录。

## iPhone 使用

1. 部署到 Vercel，拿到 HTTPS 地址。
2. 在 iPhone Safari 打开地址。
3. 点击分享按钮，选择「添加到主屏幕」。
4. 从主屏幕打开「练一下」，会以独立 PWA 窗口运行。

设置页里有「iPhone 安装」提示。建议每次大改数据前仍保留一次 JSON 导出备份。

## 云同步配置

云同步使用 Upstash Redis。部署到 Vercel 后，需要在项目环境变量里配置：

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

推荐在 Vercel Marketplace 里安装 Upstash Redis 集成，它会自动把环境变量注入 Vercel 项目。配置完成后重新部署。
完整上线步骤见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

使用方式：

1. 在第一台设备设置页生成同步码。
2. 点击「保存同步码」。
3. 点击「上传本机数据到云端」。
4. 在新手机打开同一个 Vercel 地址，输入同一个同步码。
5. 点击「从云端恢复到本机」。
6. 开启「保存本机修改后自动上传」。

同步码相当于这份训练数据的钥匙，请保存到 iCloud 钥匙串或备忘录。当前版本是个人自用同步，不包含账号系统和多人权限控制。

## 目录

```text
src/
  App.tsx
  types.ts
  data/seed.ts
  lib/date.ts
  lib/stats.ts
  lib/storage.ts
  lib/workout.ts
  components/
  pages/
  styles/globals.css
```
