# 家庭菜谱小程序 · 设计规范

> 本文档描述 `family-recipe-miniapp` 当前 UI 实现的设计语言。样式令牌以 [`app.wxss`](app.wxss) 为唯一来源；页面级样式仅做布局与结构扩展，不重复定义品牌色与圆角体系。

**设计定位**：温暖、食欲感、家庭向 —— 「活泼食欲风」（Warm Appetite）。与通用美食类推荐（ui-ux-pro-max：Vibrant & Block-based）方向一致，但本项目采用**暖橙主色 + 奶油背景**，而非冷红或高饱和纯红。

---

## 设计哲学

### 核心原则

1. **温暖可亲近** — 背景用奶油色（`#FFF8F0`），主色用暖橙（`#FF6B35`），传递家庭厨房与烟火气，避免冷冰冰的工具感。
2. **内容优先** — 菜谱图、菜名、餐次是视觉重心；装饰（渐变描边、阴影）服务于层次，不抢内容。
3. **一屏一件事** — Tab 页（菜谱 / 点菜 / 我的）各管一类任务；二级页（详情、编辑、AI 推荐）走 `navigateTo`，不堆进 Tab。
4. **触控友好** — 主按钮最小高度 88rpx，列表项、卡片可点区域充足；底部固定栏与 FAB 预留 TabBar + 安全区。
5. **轻量动效** — 过渡 200ms 左右，以透明度 / 轻微缩放为主，不用大幅位移，避免小程序性能与布局抖动。

### 气质关键词

`温暖` · `食欲` · `家庭` · `轻快` · `圆润`

### 避免（Anti-patterns）

| 避免 | 原因 |
|------|------|
| 冷灰医疗风、纯黑白极简 | 与「家庭菜谱」情感不符 |
| 过重毛玻璃 / 低对比浅灰字 | 小程序浅色背景下可读性差 |
| 大面积 emoji 充当图标 | 风格不统一；菜单入口已逐步改为渐变方块 + 缩写文字标 |
| 无反馈的可点击区域 | 需 `hover-class` 或 `:active` 透明度变化 |
| 固定底栏遮挡内容 | 详情 / 点菜页使用 `padding-bottom` 或 `page-with-fab` |

---

## 品牌颜色

### 主色板

| 角色 | 变量 / 色值 | 用途 |
|------|-------------|------|
| Primary | `--color-primary` `#FF6B35` | 导航栏、Tab 选中、主按钮、章节标题 |
| Primary Light | `--color-primary-light` `#FF8F5C` | 渐变中间色、hover 联想 |
| Primary Dark | `--color-primary-dark` `#E85A24` | 分类标签文字、强调 |
| Secondary | `--color-secondary` `#FFB020` | 渐变、分享按钮、暖色点缀 |
| Accent | `--color-accent` `#FF4757` | 渐变末端、危险操作、收藏相关 |
| Fresh | `--color-fresh` `#52C41A` | 厨师身份、成功态联想 |

### 中性色

| 角色 | 色值 | 用途 |
|------|------|------|
| 页面背景 | `--color-bg` `#FFF8F0` | `page` 默认背景 |
| 表面 / 卡片 | `--color-surface` `#FFFFFF` | 卡片、输入框、TabBar 背景 |
| 主文字 | `--color-text` `#2D1810` | 标题、正文 |
| 次要文字 | `--color-text-secondary` `#8B5E3C` | 标签、表单 label |
| 辅助文字 | `--color-text-muted` `#B8956A` | 说明、空状态、Tab 未选中 |
| 边框 | `--color-border` `rgba(255,107,53,0.15)` | 输入框、分割线、轻边框 |
| 危险 | `--color-danger` `#FF4757` | 退出登录等 |

### 渐变

```text
--gradient-brand   : #FF6B35 → #FFB020 → #FF4757（135deg）  主按钮、FAB 描边、章节条
--gradient-warm    : #FFB020 → #FF6B35                       分享、视图切换激活
--gradient-soft    : #FFF8F0 → #FFE8D6                       可选大面积背景
```

### 功能色（标签）

| 类型 | 背景渐变 | 文字色 |
|------|----------|--------|
| 分类 `tag-category` | `#FFF3E0 → #FFE0B2` | `#E85A24` |
| 简单 `tag-easy` | `#E8F5E9 → #C8E6C9` | `#2E7D32` |
| 中等 `tag-medium` | `#FFF8E1 → #FFECB3` | `#F57C00` |
| 困难 `tag-hard` | `#FFEBEE → #FFCDD2` | `#C62828` |

### 导航与 TabBar（`app.json`）

| 项 | 色值 |
|----|------|
| `navigationBarBackgroundColor` | `#FF6B35` |
| `navigationBarTextStyle` | `white` |
| `backgroundColor` | `#FFF8F0` |
| Tab 未选中 | `#B8956A` |
| Tab 选中 | `#FF6B35` |

### 对比度说明

主文字 `#2D1810`  on 背景 `#FFF8F0` / 白卡片满足 WCAG AA。主色上的白字用于按钮与导航栏。辅助色 `#B8956A` 仅用于说明文字，不用于长段落正文。

---

## 字体规范

### 字体栈

小程序使用系统字体，**不引入 Web 字体**（包体与加载考虑）：

```css
font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
```

### 字号阶梯（8rpx 基准，单位 rpx）

| 令牌 | 大小 | 典型用途 |
|------|------|----------|
| `--text-xs` | 22 | 编辑提示、分享按钮、配额说明 |
| `--text-sm` | 24 | 标签、表单 label、日期导航 |
| `--text-base` | 28 | 正文、输入框、页面默认 |
| `--text-md` | 30 | 按钮、菜单项 |
| `--text-lg` | 32 | 小节标题、日期主显示 |
| `--text-xl` | 36 | 弹窗标题、用户昵称 |
| `--text-2xl` | 40 | 头像占位、菜谱名（详情） |
| `--text-display` | 48 | 登录页大标题 |

### 字重

| 场景 | 字重 |
|------|------|
| 展示标题、菜名、弹窗标题 | 700 |
| 按钮、菜单、标签 | 600 / 500 |
| 正文 | 400 |

### 行高

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--leading-tight` | 1.3 | 标题、按钮 |
| `--leading-normal` | 1.5 | 正文、表单 |
| `--leading-relaxed` | 1.65 | 空状态、多行说明 |

### 工具类（优先在 WXML 中使用）

`text-display` · `text-title` · `text-headline` · `text-body` · `text-label` · `text-caption` · `text-meta`

### 字间距

`page` 全局 `letter-spacing: 0.02em`，略增可读性；标题可不额外加字距。

---

## 间距规则

### 间距令牌（4/8 递进）

| 变量 | 值 | 常见用法 |
|------|-----|----------|
| `--space-1` | 8rpx | 标签间距、label 与输入间距 |
| `--space-2` | 16rpx | 卡片间距、工具栏内 gap、表单组间距 |
| `--space-3` | 24rpx | **页面水平内边距**、卡片内边距、区块间距 |
| `--space-4` | 32rpx | 弹窗内边距、用户卡纵向留白 |
| `--space-5` | 40rpx | 大区块 |
| `--space-6` | 48rpx | 空状态上下留白、登录页 padding |

### 布局约定

```text
.container / .page-index     → padding: var(--space-3)  （24rpx）
.card                       → padding: var(--space-3); margin-bottom: var(--space-2)
.section-title              → margin-bottom: var(--space-2)
.modal                      → padding: 40rpx
.bottom-bar / .modal-btns   → gap: var(--space-2)
```

### 安全区与固定元素

| 变量 | 说明 |
|------|------|
| `--tab-bar-height` | 100rpx |
| `--fab-size` | 112rpx |
| `--fab-offset-bottom` | TabBar + space-3 + safe-area |
| `--fab-scroll-padding` | 列表底部留白，避免 FAB 遮挡 |

使用 `page-with-fab` 的页面：菜谱首页、点菜页。

### 圆角

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--radius-sm` | 12rpx | 视图切换项、小控件 |
| `--radius-md` | 20rpx | 输入框、菜单图标 |
| `--radius-lg` | 28rpx | **标准卡片** |
| `--radius-xl` | 36rpx | 弹窗 |
| `--radius-full` | 999rpx | 按钮、搜索框、标签、分段器 |

---

## 卡片样式

### 标准卡片 `.card`

- 背景：`#FFFFFF`
- 圆角：`--radius-lg`（28rpx）
- 内边距：24rpx
- 下边距：16rpx（最后一张可去 margin）
- 阴影：`--shadow-card` — `0 4rpx 20rpx rgba(45,24,16,0.06)`

### 渐变描边卡片 `.gradient-border` + `.gradient-border-inner`

用于需要**强调**的区块（日期条、通知条、收藏页顶栏）：

```text
外层：3rpx padding + --gradient-brand 背景 + --radius-lg + --shadow-soft
内层：白底 + 略小圆角 + 内容 padding
```

### 朴素卡片 `.card-plain`

与白卡片相同，但无渐变外层，用于不需强调的列表容器。

### 阴影层级

| 令牌 | 场景 |
|------|------|
| `--shadow-card` | 普通卡片、搜索框 |
| `--shadow-soft` | 主按钮、渐变外框、步骤序号 |
| `--shadow-float` | 右下角 FAB 外圈 |

### 卡片内结构模式

**菜谱详情 / AI 详情**

- 头部：菜名 + 标签行（分类、难度、耗时）
- 区块：`section-title` + 列表（食材行、步骤序号）
- 底栏：双按钮 `bottom-bar`（outline + primary）

**点菜页订单卡**

- 左侧信息 + 右侧操作；餐次由顶部分段器切换，不按卡拆分。

**我的 · 菜单卡**

- 单行 `menu-item`：左侧渐变图标块 + 文案 + 可选箭头 / switch

---

## 页面结构

### 信息架构

```text
Tab 1 菜谱 (index)
  ├─ recipe-detail      菜谱详情
  ├─ recipe-edit        新建/编辑
  └─ （收藏模式为 index 内切换）

Tab 2 点菜 (order)
  └─ 日期条 + 餐次分段 + 订单列表 + FAB→首页

Tab 3 我的 (mine)
  ├─ ai-recommend       AI 推荐
  ├─ ai-recipe-detail   AI 菜品详情
  ├─ family / family-join
  └─ notification-settings

独立栈
  └─ login              登录（reLaunch 进入）
```

### 页面模板

| 类型 | 结构 | 代表页面 |
|------|------|----------|
| **Tab 列表页** | 工具栏 / 筛选 + 列表或瀑布流 + 可选 FAB | `index`, `order` |
| **Tab 枢纽页** | 用户头图 + 功能菜单卡片列表 | `mine` |
| **详情页** | 封面（可选）+ 信息卡 + 多 section 卡 + 固定底栏 | `recipe-detail`, `ai-recipe-detail` |
| **表单页** | 多 `form-group` 卡片 + 底部主按钮 | `recipe-edit`, `notification-settings` |
| **营销/登录页** | 全屏渐变背景 + 居中品牌 + 单 CTA | `login` |
| **流程页** | 单任务 + 少量输入 + 主按钮 | `family-join` |

### 通用区块

| 区块 | 类名 | 说明 |
|------|------|------|
| 页面容器 | `.container` / `.page-index` | 最小高度 100vh，水平 24rpx |
| 工具栏 | `.toolbar` + `.search-input` | 搜索 + 筛选行 |
| 分段器 | `.segment-bar` + `.segment-item` | 早餐/午餐/晚餐 |
| 空状态 | `.empty` + `.empty-title` | 居中、弱色文案 |
| 弹窗 | `.modal-mask` > `.modal` | 居中；内容区 `catchtap` 阻止冒泡 |
| 固定底栏 | `.bottom-bar` | 距底固定，页面需 `padding-bottom` |

### 导航栏

- 默认标题「家庭菜谱」；详情页 `wx.setNavigationBarTitle` 改为菜名。
- AI 推荐、通知设置等在 `*.json` 中可覆盖标题。

---

## 动效原则

### 时长与缓动

| 场景 | 时长 | 方式 |
|------|------|------|
| 按钮按压 | 200ms | `opacity` 或 `transform: scale(0.94)` |
| 分段器 / Tab 切换 | 200ms | `transition: all 0.2s ease` |
| 悬浮按钮 | 200ms | `.float-btn-wrap-hover` scale 0.94 |

**原则**：150–300ms；**禁止**超过 500ms 的 UI 过渡；**避免**动效引起布局位移（不用 hover scale 撑开列表项）。

### 交互反馈

| 元素 | 实现 |
|------|------|
| 原生 `button` | `hover-class="btn-hover"`（opacity 0.88） |
| `view` 模拟按钮 | `.btn-tap` + `catchtap`；禁用 `.btn-disabled` |
| 可点击卡片 | `tap-item` + `:active { opacity: 0.85 }` }（AI 推荐列表） |
| 加载 | 按钮 `loading` 属性；列表用文案「加载中…」 |

### 不宜使用的动效

- 页面切换自定义动画（交给微信原生）
- 复杂 Lottie 背景（登录页仅用静态圆形装饰）
- 列表项入场 stagger 动画（性能与包体）

### 无障碍

小程序能力有限：保证**色对比度**与**点击区域**；动效仅作反馈，信息不依赖动画传达。

---

## 组件速查

| 组件 | 主按钮 | 次按钮 | 输入 |
|------|--------|--------|------|
| 类名 | `.btn-primary` | `.btn-outline` | `.search-input` / `.form-group input` |
| 形状 | 全圆角 pill | 描边 pill | 圆角 md 或 full |
| 底栏场景 | 优先 `.btn-tap` | 同左 | — |

**菜单图标色**（`.menu-icon-*`）：AI 紫渐变、家庭暖橙、收藏红橙、通知金橙、厨师绿色。

---

## 实现与扩展

### 新页面 Checklist

- [ ] 使用 `app.wxss` 变量，不硬编码 `#FF6B35`
- [ ] 页面容器 `.container` 或复用已有 page 类
- [ ] 卡片用 `.card` 或 `.gradient-border`
- [ ] 主操作 `.btn-primary`，次要 `.btn-outline`
- [ ] 固定底栏页面加 `padding-bottom`（参考 `recipe-detail`）
- [ ] Tab 页 FAB 加 `page-with-fab`
- [ ] 可点击非 `button` 元素加按压反馈

### 源文件索引

| 文件 | 内容 |
|------|------|
| [`app.wxss`](app.wxss) | 设计令牌与全局组件 |
| [`app.json`](app.json) | 导航栏、TabBar 色 |
| [`pages/index/index.wxss`](pages/index/index.wxss) | 瀑布流、工具栏 |
| [`pages/order/order.wxss`](pages/order/order.wxss) | 日期条、通知、订单卡 |
| [`pages/mine/mine.wxss`](pages/mine/mine.wxss) | 用户卡、菜单 |
| [`pages/login/login.wxss`](pages/login/login.wxss) | 全屏品牌登录 |
| [`pages/recipe-detail/recipe-detail.wxss`](pages/recipe-detail/recipe-detail.wxss) | 封面、步骤、底栏、弹窗 |

### 与 ui-ux-pro-max 的差异说明

外部设计系统建议「Restaurant red `#DC2626` + Playfair/Karla 字体」；本项目已落地为**暖橙体系 + 系统字体**，更贴合微信小程序与现有代码。后续若做 H5 品牌站，可参考红金配色与展示字体，但小程序内**以本文档与 `app.wxss` 为准**。

---

*文档版本：与当前 `app.wxss` 设计系统同步 · 项目：family-recipe-miniapp*
