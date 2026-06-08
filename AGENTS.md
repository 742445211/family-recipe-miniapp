# AGENTS.md — family-recipe-miniapp

家庭菜谱 & 点菜微信小程序前端。配对后端仓库：`742445211/family-recipe-server`。

## 技术栈

- 微信原生小程序（WXML / WXSS / JS），无 npm 构建
- API 基地址：`https://www.zzzjc.xin/api`（见 `utils/api.js`）
- WebSocket：`wss://www.zzzjc.xin/api/ws?token=<jwt>`（见 `utils/notification.js`）
- 主题色：`#FF6B35`

## 目录结构

```
app.js / app.json / app.wxss   # 入口与全局配置
utils/
  api.js                       # 所有 HTTP API 封装
  auth.js                      # requireLogin()
  notification.js              # WebSocket + 订阅消息授权
pages/
  index/                       # Tab：菜谱列表（可切换收藏模式）
  order/                       # Tab：点菜 + 未读通知
  mine/                        # Tab：我的
  recipe-detail/ recipe-edit/  # 菜谱详情与编辑
  family/ family-join/         # 家庭管理
  notification-settings/       # 厨师通知通道配置
  login/ ai-recommend/
docs/
  chef-notification-plan.md    # 通知方案设计（与后端对齐）
  deploy-ubuntu-24.04.md       # 服务器部署命令
```

## 业务约定

- **启动不强制登录**：首页菜谱可匿名浏览；点菜、编辑、家庭、我的等需登录
- **鉴权**：`requireLogin()` 检查 `wx.storage` 中的 `token`，失败则 `reLaunch` 到登录页
- **全局状态**：`app.globalData` 含 `userInfo`、`currentFamily`、`indexMode`（收藏模式）、`unreadCount`
- **收藏入口**：`mine` → 设置 `globalData.indexMode = 'favorites'` → `switchTab` 到 index
- **厨师通知**：登录后 `app.js` 连接 WebSocket；退出时 `disconnectSocket()`

## 新增页面 checklist

1. 在 `app.json` 的 `pages` 数组注册路径
2. 需登录的页面 `onShow` 首行调用 `requireLogin()`
3. 新 API 方法加到 `utils/api.js`，保持 `code === 0` 成功约定
4. 样式复用 `app.wxss` 中的 `.container`、`.card`、`.btn-primary` 等

## API 与后端对齐

| 领域 | 小程序方法 | 后端路径 |
|------|-----------|----------|
| 登录 | `api.login` | `POST /auth/login` |
| 菜谱 | `getRecipes` / `getRecipe` | `GET /recipes` |
| 点菜 | `getOrders` / `addOrder` | `GET|POST /orders` |
| 通知 | `getUnreadNotifications` | `GET /notifications/unread` |
| 通道 | `createNotificationChannel` | `POST /notification-channels` |

完整路由以 `family-recipe-server/main.go` 为准。

## 编码规范

- 保持与现有页面一致：中文注释、`async/await` + `try/catch`、失败时 `wx.showToast`
- 菜谱 `ingredients` / `steps` 等为 JSON 字符串，展示前用 `safeParse` 防崩溃
- 订阅消息模板 ID 集中在 `utils/notification.js` 的 `TEMPLATE_ID`
- **不要**在小程序本地存储 SendKey、企微 secret 等敏感通道密钥明文（由后端 `notification_channels` 管理）
- 改动范围最小化：不重构无关页面

## 个人小程序限制

- 仅支持**一次性**订阅消息，不能作为必达离线通知
- 厨师离线推送依赖后端多通道（企微微工作台、Server酱、Bark、ntfy）；站内未读列表为兜底

## 测试与发布

**每次改动后必须测试**，未完成验证不得声称完成（详见 `.cursor/rules/mandatory-testing.mdc`）。

- 改完代码：微信开发者工具编译通过、控制台无报错、受影响页面手动点一遍（防白屏）
- 动到 API：用 `curl` 验证对应路径（例：`curl https://www.zzzjc.xin/api/app/features`）
- 动到 `app.js`：冷启动确认首页可渲染；优先避免 `app.js` 顶层 `require('./utils/api')` 引起循环依赖
- 真机调试 WebSocket 与订阅消息
- 上传前确认 `utils/api.js` 的 `BASE_URL` 指向生产环境
- 服务器部署见 `docs/deploy-ubuntu-24.04.md`（后端仓库操作）

## 相关文档

- 通知架构与验收：`docs/chef-notification-plan.md`
- 部署命令：`docs/deploy-ubuntu-24.04.md`
