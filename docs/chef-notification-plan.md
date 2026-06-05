# 厨师点菜通知方案 Plan

## 1. 背景与目标

当前项目由两个仓库组成：

- 小程序前端：`742445211/family-recipe-miniapp`
- Go 后端：`742445211/family-recipe-server`

后端技术栈为 Go + Gin + Gorm + MySQL。点菜统一通过：

```http
POST /api/orders
```

创建 `daily_orders` 记录。小程序是个人主体小程序，未企业认证，因此不能把企业级消息能力、长期订阅消息或公众号模板消息作为必达能力。

本方案目标：

1. 每次点菜成功后，后端必须生成通知记录。
2. 厨师在线时，必须通过 WebSocket 实时收到通知。
3. 厨师离线时，通过可用的外部通道尽力通知，包括：
   - 微信小程序一次性订阅消息
   - Server 酱
   - Bark
   - ntfy
4. 即使所有外部推送失败，通知也不能丢失，厨师进入小程序后必须能看到未读通知。
5. 实现过程必须采用 TDD：先写失败测试，再实现功能，再重构。

## 2. 个人小程序限制说明

个人小程序可用能力：

| 通道 | 可用性 | 说明 |
| --- | --- | --- |
| WebSocket | 可用 | 厨师打开小程序时可实时推送 |
| 一次性订阅消息 | 可用 | 用户每授权一次通常只能发送一次 |
| 长期订阅消息 | 基本不可用 | 通常仅向特定公共服务类目开放 |
| 服务号/公众号模板消息 | 不适用 | 需要额外主体和账号体系 |
| 企业微信应用消息 | 不适用 | 需要企业微信主体 |
| Server 酱 | 可用 | 通过个人微信服务号推送，需绑定 SendKey |
| Bark | 可用 | iOS App 推送，需用户提供 Device Key |
| ntfy | 可用 | 可使用公共服务或自建服务 |

因此产品口径应明确：

> 厨师在线时实时通知；厨师配置了离线通道时可收到离线推送；未在线且未配置离线通道时，通知会保存在小程序内，进入后立即提醒。

## 3. 总体架构

```text
用户点菜
  |
  v
POST /api/orders
  |
  v
后端创建 daily_orders
  |
  v
后端查询当前家庭的厨师 family_members.is_chef = true
  |
  v
为每个厨师创建 notifications 记录
  |
  +--> WebSocket 在线实时推送
  |
  +--> 微信一次性订阅消息
  |
  +--> Server 酱
  |
  +--> Bark
  |
  +--> ntfy
  |
  v
记录每个通道的发送结果，失败可重试
```

核心原则：

- 点菜成功与通知外发解耦。
- 通知记录入库是强一致要求。
- 外部通道发送是异步行为，不阻塞点菜响应。
- WebSocket 是在线实时通知主通道。
- 外部推送是离线通知补充通道。

## 4. 后端数据模型设计

### 4.1 notifications 表

用于保存每次点菜产生的厨师通知。

```sql
CREATE TABLE notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  family_id BIGINT UNSIGNED NOT NULL,
  receiver_user_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  content VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unread',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME DEFAULT NULL,
  deleted_at DATETIME DEFAULT NULL,
  INDEX idx_receiver_status (receiver_user_id, status),
  INDEX idx_family_created (family_id, created_at),
  INDEX idx_order_receiver (order_id, receiver_user_id)
);
```

字段说明：

- `type`：例如 `ORDER_CREATED`
- `status`：`unread` / `read`
- `receiver_user_id`：厨师用户 ID
- `order_id`：关联 `daily_orders.id`

### 4.2 notification_deliveries 表

用于记录每条通知在各通道的发送结果。

```sql
CREATE TABLE notification_deliveries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  notification_id BIGINT UNSIGNED NOT NULL,
  channel VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  target VARCHAR(255) DEFAULT '',
  request_id VARCHAR(100) DEFAULT '',
  error_code VARCHAR(50) DEFAULT '',
  error_message VARCHAR(500) DEFAULT '',
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at DATETIME DEFAULT NULL,
  sent_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_notification_channel (notification_id, channel),
  INDEX idx_status_retry (status, next_retry_at)
);
```

字段说明：

- `channel`：
  - `websocket`
  - `wechat_subscribe`
  - `server_chan`
  - `bark`
  - `ntfy`
- `status`：
  - `pending`
  - `sent`
  - `failed`
  - `skipped`
- `target`：
  - Server 酱：SendKey 脱敏标识
  - Bark：Device Key 脱敏标识
  - ntfy：Topic 脱敏标识

### 4.3 notification_channels 表

用于保存厨师配置的外部通知通道。

```sql
CREATE TABLE notification_channels (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  channel VARCHAR(30) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  endpoint VARCHAR(500) DEFAULT '',
  secret VARCHAR(500) DEFAULT '',
  topic VARCHAR(200) DEFAULT '',
  extra JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  INDEX idx_user_channel (user_id, channel)
);
```

安全要求：

- `secret` 不返回给前端。
- `secret` 建议加密存储，至少不能写入日志。
- 返回配置列表时只返回脱敏后的 `masked_target`。

## 5. 后端服务拆分

建议新增服务：

```text
internal/service/notification.go
internal/service/notification_channel.go
internal/service/notifier/
  websocket.go
  wechat_subscribe.go
  server_chan.go
  bark.go
  ntfy.go
```

### 5.1 NotificationService

职责：

1. 根据订单创建通知。
2. 查询接收人，即当前家庭的厨师。
3. 写入 `notifications`。
4. 调度各通知通道。
5. 保存通道发送结果。

建议接口：

```go
type NotificationService struct {
    db *gorm.DB
}

func (s *NotificationService) NotifyOrderCreated(orderID uint64) error
func (s *NotificationService) ListUnread(userID uint64) ([]model.Notification, error)
func (s *NotificationService) MarkRead(userID, notificationID uint64) error
```

### 5.2 Notifier 接口

各通道统一实现：

```go
type Notifier interface {
    Channel() string
    Send(ctx context.Context, message NotificationMessage, target NotificationTarget) (*SendResult, error)
}
```

消息结构：

```go
type NotificationMessage struct {
    Title      string
    Content    string
    OrderID    uint64
    RecipeName string
    AdderName  string
    MealType   string
    Date       string
    Page       string
}
```

## 6. 点菜链路改造

当前后端 `internal/handler/order.go` 在 `Add` 方法里直接启动 goroutine 做订阅消息和动态消息更新。建议改成：

```go
order, err := h.svc.Add(...)
if err != nil {
    // 返回错误
}

c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "ok", "data": order})

go func(orderID uint64) {
    if err := notificationService.NotifyOrderCreated(orderID); err != nil {
        log.Printf("[通知] 创建点菜通知失败 orderID=%d: %v", orderID, err)
    }
}(order.ID)
```

更进一步，可使用队列或数据库 pending 状态异步任务，但第一阶段可以先用 goroutine 加发送结果入库。

## 7. 小程序接口设计

### 7.1 获取未读通知

```http
GET /api/notifications/unread
Authorization: Bearer <token>
```

响应：

```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "type": "ORDER_CREATED",
      "title": "有新的点菜",
      "content": "晚餐新增：红烧肉 1份，点菜人：张三",
      "order_id": 123,
      "created_at": "2026-06-05T08:56:00Z"
    }
  ]
}
```

### 7.2 标记通知已读

```http
POST /api/notifications/:id/read
Authorization: Bearer <token>
```

### 7.3 配置通知通道

```http
GET /api/notification-channels
POST /api/notification-channels
PUT /api/notification-channels/:id
DELETE /api/notification-channels/:id
```

创建 Server 酱通道：

```json
{
  "channel": "server_chan",
  "secret": "SCTxxxxxxxxxxxxxxxx"
}
```

创建 Bark 通道：

```json
{
  "channel": "bark",
  "endpoint": "https://api.day.app",
  "secret": "device_key_xxx"
}
```

创建 ntfy 通道：

```json
{
  "channel": "ntfy",
  "endpoint": "https://ntfy.sh",
  "topic": "family-recipe-xxx",
  "secret": "optional_access_token"
}
```

## 8. 小程序端改造

### 8.1 厨师打开小程序后连接 WebSocket

在 `app.js` 或独立工具模块中增加连接管理：

```js
wx.connectSocket({
  url: 'wss://www.zzzjc.xin/api/ws?token=' + wx.getStorageSync('token')
})
```

收到消息：

```js
wx.onSocketMessage((res) => {
  const msg = JSON.parse(res.data)
  if (msg.type === 'ORDER_CREATED') {
    wx.showToast({ title: msg.title, icon: 'none' })
    wx.vibrateShort({ type: 'medium' })
    // 如果当前在点菜页，刷新列表
    // 同时更新全局未读通知数量
  }
})
```

### 8.2 点菜页展示未读提醒

`pages/order/order` 增加：

- 未读通知红点
- 最近通知条
- 点击后标记已读并跳转对应日期/餐次

### 8.3 我的页增加通知通道设置

在 `pages/mine/mine` 增加入口：

```text
通知设置
  - 微信订阅消息授权
  - Server 酱 SendKey
  - Bark Device Key
  - ntfy Topic
```

## 9. 微信一次性订阅消息方案

保留现有 `service.SendOrderNotify`，但调整定位：

- 只作为离线辅助通道。
- 发送失败必须记录到 `notification_deliveries`。
- 不要认为开启厨师身份后可以永久推送。

### 授权入口

厨师开启身份时请求一次：

```js
wx.requestSubscribeMessage({
  tmplIds: ['<template_id>']
})
```

通知设置页也提供按钮：

```text
开启下一次点菜微信提醒
```

说明文案：

```text
个人小程序仅支持一次性订阅消息。每授权一次，可用于后续一次点菜提醒。
```

## 10. Server 酱方案

Server 酱适合需要通过微信收到离线通知的个人用户。

### 10.1 配置方式

厨师在通知设置页填入 SendKey：

```text
SCTxxxxxxxxxxxxxxxxxxxxxxxx
```

后端保存到 `notification_channels.secret`。

### 10.2 发送接口

```http
POST https://sctapi.ftqq.com/{sendkey}.send
Content-Type: application/x-www-form-urlencoded
```

请求参数：

```text
title=有新的点菜
desp=晚餐新增：红烧肉 1份\n点菜人：张三\n日期：2026-06-05\n备注：少放辣
```

可选参数：

```text
tags=家庭点菜|晚餐
short=晚餐新增：红烧肉
```

### 10.3 后端实现要点

```go
func (n *ServerChanNotifier) Send(ctx context.Context, msg NotificationMessage, target NotificationTarget) (*SendResult, error) {
    // POST https://sctapi.ftqq.com/{sendkey}.send
}
```

注意事项：

- SendKey 不得返回前端明文。
- 失败响应要记录 `error_code` 和 `error_message`。
- Server 酱存在免费额度和频率限制，连续失败时应退避重试。

## 11. Bark 方案

Bark 适合 iOS 用户离线推送。

### 11.1 配置方式

厨师安装 Bark App 后获取 Device Key，在小程序通知设置页填入：

```text
https://api.day.app/<device_key>
```

或拆分保存：

```text
endpoint=https://api.day.app
secret=<device_key>
```

### 11.2 发送接口

推荐 POST JSON：

```http
POST https://api.day.app/push
Content-Type: application/json
```

请求体：

```json
{
  "device_key": "<device_key>",
  "title": "有新的点菜",
  "body": "晚餐新增：红烧肉 1份，点菜人：张三",
  "group": "家庭点菜",
  "sound": "bell",
  "url": "weixin://"
}
```

也可以使用 URL 形式：

```text
https://api.day.app/<device_key>/有新的点菜/晚餐新增：红烧肉
```

### 11.3 后端实现要点

```go
func (n *BarkNotifier) Send(ctx context.Context, msg NotificationMessage, target NotificationTarget) (*SendResult, error) {
    // POST endpoint + "/push"
}
```

注意事项：

- Bark 主要面向 iOS。
- `device_key` 属于敏感信息。
- 如果使用自建 Bark 服务，`endpoint` 允许用户配置。

## 12. ntfy 方案

ntfy 适合跨平台推送，可使用公共服务，也可自建。

### 12.1 配置方式

厨师配置：

```text
endpoint=https://ntfy.sh
topic=family-recipe-xxxx
secret=<optional token>
```

更推荐自建 ntfy，避免公共 topic 被猜测。

### 12.2 发送接口

```http
POST https://ntfy.sh/<topic>
Title: 有新的点菜
Priority: high
Tags: cooking,food
Click: weixin://
Authorization: Bearer <token>    # 可选，自建服务推荐开启

晚餐新增：红烧肉 1份，点菜人：张三，日期：2026-06-05
```

### 12.3 后端实现要点

```go
func (n *NtfyNotifier) Send(ctx context.Context, msg NotificationMessage, target NotificationTarget) (*SendResult, error) {
    // POST endpoint + "/" + topic
}
```

注意事项：

- 公共 `ntfy.sh` 的 topic 如果过于简单，可能被他人订阅。
- topic 应由后端生成随机值，例如 `family-recipe-<uuid>`。
- 自建 ntfy 应开启访问控制。

## 13. 通知优先级与重试策略

### 13.1 发送顺序

建议顺序：

1. 写入 `notifications`
2. WebSocket 在线推送
3. 微信一次性订阅消息
4. Server 酱
5. Bark
6. ntfy

外部通道可以并发发送，但每个通道必须独立记录结果。

### 13.2 重试策略

适合重试：

- 网络超时
- 5xx 响应
- 临时限流

不适合重试：

- SendKey 无效
- Bark Device Key 无效
- ntfy 认证失败
- 微信无订阅权限

建议退避：

```text
第 1 次失败：1 分钟后重试
第 2 次失败：5 分钟后重试
第 3 次失败：15 分钟后重试
超过 3 次：标记 failed
```

## 14. TDD 测试计划

实现前必须先写测试用例。推荐按以下顺序推进。

### 14.1 后端单元测试

#### NotificationService 测试

文件建议：

```text
internal/service/notification_test.go
```

测试用例：

1. `NotifyOrderCreated` 为每个厨师创建一条 notification。
2. 非厨师家庭成员不会收到 notification。
3. 没有厨师时不报错，但不创建 notification。
4. 重复调用同一个 `order_id` 不应重复创建同一厨师通知。
5. notification 内容包含菜名、餐次、点菜人、日期。
6. 创建 notification 后会调用已启用的通知通道。
7. 通道发送失败时，点菜通知流程不返回失败。
8. 通道发送失败会写入 `notification_deliveries.failed`。
9. 通道发送成功会写入 `notification_deliveries.sent`。

#### Notifier 测试

文件建议：

```text
internal/service/notifier/server_chan_test.go
internal/service/notifier/bark_test.go
internal/service/notifier/ntfy_test.go
```

测试用例：

Server 酱：

1. 正确拼接 `https://sctapi.ftqq.com/{sendkey}.send`。
2. 正确发送 `title`、`desp`、`short`。
3. SendKey 缺失时返回配置错误。
4. HTTP 5xx 返回可重试错误。

Bark：

1. 正确 POST 到 `/push`。
2. 请求体包含 `device_key`、`title`、`body`、`group`。
3. Device Key 缺失时返回配置错误。
4. 非 2xx 响应记录错误信息。

ntfy：

1. 正确 POST 到 `{endpoint}/{topic}`。
2. 设置 `Title`、`Priority`、`Tags`、`Click` header。
3. 配置 token 时带 `Authorization: Bearer <token>`。
4. Topic 缺失时返回配置错误。

#### WebSocket Hub 测试

文件建议：

```text
internal/service/websocket_hub_test.go
```

测试用例：

1. 用户连接后注册到 Hub。
2. 同一用户支持多端连接。
3. 用户断开后连接被清理。
4. 推送给在线厨师时，在线连接收到消息。
5. 推送给离线厨师时，不报错并记录 skipped。

### 14.2 后端 Handler 测试

文件建议：

```text
internal/handler/notification_test.go
internal/handler/notification_channel_test.go
```

测试用例：

1. `GET /api/notifications/unread` 只返回当前用户未读通知。
2. `POST /api/notifications/:id/read` 只能标记自己的通知。
3. 创建通知通道时不在响应中返回 secret 明文。
4. 删除通知通道后不再发送该通道。
5. 未登录访问通知接口返回 401。

### 14.3 点菜集成测试

文件建议：

```text
internal/service/order_notification_test.go
```

测试用例：

1. 调用点菜创建成功后，厨师收到 notification。
2. 点菜创建失败时，不创建 notification。
3. 重复点菜被拒绝时，不发送通知。
4. 多个厨师均收到通知。
5. 点菜人本人如果也是厨师，也收到通知。

### 14.4 小程序端测试建议

微信小程序原生测试能力有限，建议至少做以下可测拆分：

1. 把 WebSocket 消息处理抽到 `utils/notification.js`。
2. 把未读通知拉取封装到 `utils/api.js`。
3. 对纯函数逻辑做测试，例如：
   - 餐次英文转中文
   - 通知消息格式化
   - WebSocket 消息 JSON 解析
   - 未读数量更新逻辑

建议测试用例：

1. 收到 `ORDER_CREATED` 消息后调用刷新回调。
2. 收到非法 JSON 不应导致页面崩溃。
3. 收到未知消息类型时忽略。
4. 未读通知数量正确累加。

## 15. 实施阶段

### 阶段一：通知入库与未读列表

目标：

- 新增通知表。
- 点菜成功后创建 notification。
- 小程序可拉取未读通知。

验收：

- 测试覆盖通知创建、未读查询、标记已读。
- 点菜成功后数据库有通知记录。

### 阶段二：WebSocket 实时通知

目标：

- 后端支持 WebSocket 连接。
- 厨师在线时实时收到 `ORDER_CREATED`。
- 小程序收到后 toast、震动、刷新列表。

验收：

- WebSocket Hub 测试通过。
- 真机打开厨师小程序后，家人点菜可实时提示。

### 阶段三：外部离线通道

目标：

- 支持 Server 酱。
- 支持 Bark。
- 支持 ntfy。
- 支持发送结果记录与重试。

验收：

- 三个通道 notifier 单元测试通过。
- 配置有效通道后，点菜能收到外部推送。
- 配置无效通道时，不影响点菜成功和站内通知。

### 阶段四：微信一次性订阅消息调整

目标：

- 保留一次性订阅消息。
- 明确授权次数和失败记录。
- 不把它作为必达能力。

验收：

- 未授权时记录 skipped 或 failed。
- 已授权时可收到微信服务通知。

## 16. 风险与注意事项

1. 个人小程序不能保证无授权离线微信推送。
2. 外部通道依赖用户自行配置，配置错误时必须给出可理解的失败提示。
3. Server 酱、Bark、ntfy 均可能有服务可用性和频率限制。
4. 外部通道密钥必须只存后端，不能放在小程序本地或日志中。
5. WebSocket 需要处理断线重连、心跳、token 过期。
6. 通知内容不要包含过多隐私信息。
7. 公共 ntfy topic 可能被猜测，推荐自建或随机 topic。

## 17. 最终推荐

推荐落地组合：

```text
必做：
  - notifications 入库
  - WebSocket 在线通知
  - 未读通知列表
  - TDD 测试覆盖

建议做：
  - Server 酱
  - Bark
  - ntfy
  - 微信一次性订阅消息保留为辅助

不建议依赖：
  - 长期订阅消息
  - 动态分享卡片
  - 服务卡片作为必达通知
```

最终能力边界：

> 每次点菜后，系统必定生成站内通知；厨师在线时实时收到；厨师配置外部通道后可收到离线推送；外部推送失败也可在进入小程序后查看未读通知。
