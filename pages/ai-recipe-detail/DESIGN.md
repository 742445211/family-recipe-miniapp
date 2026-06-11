# AI 菜谱详情 `pages/ai-recipe-detail`

继承 [`docs/DESIGN-MASTER.md`](../../docs/DESIGN-MASTER.md)

## 职责

展示 AI 推荐菜谱草稿、推荐理由、导入菜谱、加入点菜。

## 布局

复用 `recipe-detail.wxss`，区块结构同详情页。

- 推荐理由：浅底圆角块
- 底栏：`.btn-tap` 视图按钮（非原生 button）
- 已在库时「加入菜谱」disabled

## 验收

- [ ] 底栏两按钮等宽
- [ ] 弹窗 segment 餐次与详情页一致
