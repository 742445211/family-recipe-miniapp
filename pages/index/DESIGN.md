# 菜谱首页 `pages/index`

继承 [`docs/DESIGN-MASTER.md`](../../docs/DESIGN-MASTER.md)

## 职责

菜谱列表、搜索筛选、收藏模式、瀑布流/列表切换、跳转详情/新增。

## 布局

```
toolbar（搜索 + 分类 + 视图切换）
  → waterfall（双列）| list（横向卡片）
float-btn（`.gradient-border` 同系：渐变环 + 白底橙 +，`.page-with-fab` 留白）
```

## 瀑布流（紧凑）

- 图片 `mode="widthFix"`，信息区 `padding: 10/12/12rpx`
- 标题最多 2 行省略（26rpx）
- 分类/难度用 `.tag-sm`，时长 inline `N′`
- 卡片使用 `.gradient-border-inner.is-flush`

## 列表模式

- 左图 128rpx + 右信息，完整 tag 文案

## 视图切换

- `▦` 瀑布流 / `☰` 列表
- 持久化：`wx.setStorageSync('indexViewMode')`

## 空状态文案

| 场景 | 标题 | 副文案 |
|------|------|--------|
| 加载 | 锅还没热... | 正在捞菜谱 |
| 错误 | 网络开小差了 | 下拉刷新... |
| 无菜谱 | 厨房还缺一道菜 | 点右下角 + ... |
| 无收藏 | 收藏夹空空如也 | 看到喜欢的... |

## 验收

- [ ] 瀑布流底部信息区不过厚（单行 meta）
- [ ] 切换视图后布局不错乱
- [ ] 收藏模式无 toolbar，列表仍可用
- [ ] 底部留白不被 float-btn 遮挡
