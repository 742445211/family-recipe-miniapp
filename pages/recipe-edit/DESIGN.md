# 菜谱编辑 `pages/recipe-edit`

继承 [`docs/DESIGN-MASTER.md`](../../docs/DESIGN-MASTER.md)

## 职责

新增/编辑菜谱：基础信息、封面、食材、步骤、小贴士。

## 布局

- 基础信息单卡（gradient-border）
- 食材 / 步骤 / 小贴士分卡
- 难度用 `.segment-bar`
- 封面上传区 220rpx 渐变边框

## 文案

- 提交：「出锅！添加菜谱」/「保存修改」
- placeholder 偏幽默但不挡 label

## 验收

- [ ] 所有 input/textarea 可点可输入
- [ ] 步骤 auto-height 正常
- [ ] 提交 loading 态
