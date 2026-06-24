/**
 * utils/index-refresh.js - 首页列表刷新标记
 *
 * Tab 页从详情/编辑返回时 onShow 会触发，但不能每次都全量刷新（会丢失分页）。
 * 仅在编辑菜谱、切换收藏等会改变列表内容的操作后调用 markIndexNeedRefresh()，
 * 由 index.onShow 读取 globalData.indexNeedRefresh 决定是否 loadRecipes(true)。
 */

function markIndexNeedRefresh() {
  try {
    const app = getApp()
    if (app && app.globalData) {
      app.globalData.indexNeedRefresh = true
    }
  } catch (e) { /* 非小程序页面上下文（如 Node 测试）忽略 */ }
}

module.exports = { markIndexNeedRefresh }
