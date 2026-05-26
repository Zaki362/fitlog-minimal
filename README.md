# 练一下 / FitLog Minimal

个人自用的极简健身记录 PWA。移动端优先、无后端、无登录，所有数据保存在浏览器 `localStorage`。

## 功能

- 动作库：按部位维护动作、重量、组数、次数、备注和归档状态。
- 快速开练：选择背、胸、肩、腹、胳膊、腿、有氧或自定义，生成本次训练清单。
- 训练中记录：勾选完成、修改本次重量/组数/次数、选择难度、填写备注。
- 历史记录：按日期倒序查看、筛选、编辑、删除训练。
- 进步记录：更新动作模板重量/组数/次数时写入 `ProgressUpdate`。
- 统计：首页展示本周、本月、总训练次数、最近 30 天部位分布和久未训练提醒。
- 数据管理：导出 JSON、导入 JSON、导出 Markdown、恢复初始数据、清空数据。

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

## 本地启动

```bash
npm install
npm run dev
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
