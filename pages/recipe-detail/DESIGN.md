# 菜谱详情 `pages/recipe-detail`

继承 [`docs/DESIGN-MASTER.md`](../../docs/DESIGN-MASTER.md)

## 职责

展示封面、元信息、食材/调料/步骤/小贴士、收藏、做过、编辑、加入点菜。

## 布局

- 封面（渐变边框或无封面占位）
- 信息卡：名称 + 收藏/做过按钮 + tags
- 各区块 `.gradient-border` + `.section-title`
- 固定底栏：编辑 | 加入点菜

## 交互

- 步骤序号 `.step-num` 渐变圆
- 点菜弹窗：segment 餐次 + 日期 picker + 备注

## 验收

- [ ] 底栏 `padding-bottom` 含 safe-area
- [ ] 内容区 `padding-bottom: 180rpx` 不被遮挡
- [ ] 收藏态「已收藏」有视觉区分
