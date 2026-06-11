# 我的 `pages/mine`

继承 [`docs/DESIGN-MASTER.md`](../../docs/DESIGN-MASTER.md)

## 职责

用户资料、厨师开关、AI/家庭/收藏/通知入口、退出登录。

## 布局

- 用户卡片（渐变边框，整卡可点编辑）
- 厨师身份 switch + hint
- 菜单项：`.menu-icon` 色块 + 文字 + `›`
- 退出登录单独卡片，危险色居中

## 菜单图标色

| 类 | 渐变 |
|----|------|
| menu-icon-ai | 紫 |
| menu-icon-family | 暖橙 |
| menu-icon-fav | 红橙 |
| menu-icon-notify | 金橙 |
| menu-icon-chef | 绿 |

## 弹窗

编辑资料：昵称 input + 头像上传；`.modal-btns` 内两按钮等高（`.btn-outline` | `.btn-primary`），均需 `hover-class="btn-hover"`。

## 验收

- [ ] 弹窗「算了 / 保存」等高、描边/渐变样式正确
- [ ] 未登录 requireLogin 跳转
