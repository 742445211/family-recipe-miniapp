# 通知设置 `pages/notification-settings`

继承 [`docs/DESIGN-MASTER.md`](../../docs/DESIGN-MASTER.md)

## 职责

配置微信订阅、企微、Server酱、Bark、ntfy 等通知通道。

## 布局

每通道一张 `.gradient-border` 卡片：

```
.section-title
.hint（可选）
.channel-form
  .channel-input  ← 固定 height: 88rpx
  .btn-primary.channel-btn  ← width: 100%
```

## 输入框规范（修复压缩）

- `.channel-input`：`display: block; width: 100%; height: 88rpx; line-height: 88rpx`
- `.channel-form`：纵向 flex，`gap: 16rpx`
- `.channel-label`：`word-break: break-all` 防长密钥撑破布局

## 验收

- [ ] 各通道 input 高度一致、可完整显示 placeholder
- [ ] 保存按钮不被挤扁
- [ ] 已配置列表删除可点
