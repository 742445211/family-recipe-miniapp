/**
 * app.js - 微信小程序应用入口
 * 职责：
 *   1. 注册小程序应用实例
 *   2. 定义全局共享数据（globalData）
 *   3. 处理应用生命周期（onLaunch 等）
 */

App({
  /**
   * onLaunch - 小程序启动时触发
   * 当前策略：不自动跳转登录页，让用户先自由浏览菜谱
   */
  onLaunch() {
    // 不自动跳登录，让用户先浏览菜谱
  },

  /**
   * globalData - 全局共享数据
   * @property {Object|null} userInfo       - 当前登录用户信息
   * @property {Object|null} currentFamily  - 当前选中的家庭
   * @property {string|null} indexMode      - 首页模式标识
   *    'favorites' → 收藏模式
   *    'recipes'   → 菜谱模式
   *    null        → 默认
   */
  globalData: {
    userInfo: null,
    currentFamily: null,
    indexMode: null  // 'favorites' | 'recipes' | null
  }
})
