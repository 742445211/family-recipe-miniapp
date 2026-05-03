/**
 * pages/ai-recommend/ai-recommend.js - AI 智能推荐页面
 * 职责：
 *   1. 展示 AI 推荐的菜谱详情
 *   2. 支持收藏 / 取消收藏
 *   3. 标记已做过
 *   4. 一键加入今日点菜（带备注）
 *   5. 跳转编辑菜谱
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')

/**
 * safeParse - 安全 JSON 解析
 * 防止后端返回的 JSON 字符串解析失败导致页面崩溃
 *
 * @param {string} str - 要解析的 JSON 字符串
 * @returns {Array}    - 解析成功返回数组，失败返回空数组 []
 */
function safeParse(str) {
  if (!str || typeof str !== 'string') return []
  try { return JSON.parse(str) } catch (e) { return [] }
}

Page({
  data: {
    recipe: {},           // AI 推荐的菜谱详情
    ingredients: [],      // 食材列表（从 JSON 解析）
    seasonings: [],       // 调料列表（从 JSON 解析）
    steps: [],            // 步骤列表（从 JSON 解析）
    isFav: false,         // 是否已收藏
    orderNote: ''         // 点菜备注
  },

  /**
   * onLoad - 页面加载
   * 从 API 获取 AI 推荐的菜谱（后端根据用户偏好 / 家庭数据智能推荐）
   * @param {Object} options - 页面参数，options.id 为菜谱 ID
   */
  onLoad(options) {
    if (!requireLogin()) return
    // 存储菜谱 ID，重置备注
    this.setData({ recipeId: options.id, orderNote: '' })
    this.loadRecipe(options.id)
  },

  /**
   * onShow - 页面显示时刷新数据（编辑返回后更新）
   */
  onShow() {
    // 编辑返回后刷新
    if (this.data.recipeId) {
      this.loadRecipe(this.data.recipeId)
    }
  },

  /**
   * loadRecipe - 加载 AI 推荐的菜谱详情
   * @param {string} id - 菜谱 ID
   * @returns {Promise<void>}
   */
  async loadRecipe(id) {
    try {
      const r = await api.getRecipe(id)
      // 更新页面数据并解析 JSON 字段
      this.setData({
        recipe: r,
        ingredients: safeParse(r.ingredients),
        seasonings: safeParse(r.seasonings),
        steps: safeParse(r.steps)
      })
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  /**
   * toggleFavorite - 切换收藏状态
   * @returns {Promise<void>}
   */
  async toggleFavorite() {
    const id = this.data.recipe.id
    try {
      // 根据当前收藏状态决定调用添加或取消接口
      if (this.data.isFav) await api.removeFavorite(id)
      else await api.addFavorite(id)
      // 切换前端状态
      this.setData({ isFav: !this.data.isFav })
    } catch (e) {}
  },

  /**
   * markCooked - 标记已做过
   * 调用 API → 本地自增 cook_count
   * @returns {Promise<void>}
   */
  async markCooked() {
    try {
      await api.markCooked(this.data.recipe.id)
      wx.showToast({ title: '已标记', icon: 'success' })
      // 本地自增计数，无需重新请求
      const r = this.data.recipe
      r.cook_count++
      this.setData({ recipe: r })
    } catch (e) {}
  },

  /**
   * editRecipe - 跳转到编辑菜谱页面
   */
  editRecipe() {
    wx.navigateTo({ url: '/pages/recipe-edit/recipe-edit?id=' + this.data.recipe.id })
  },

  /**
   * onNoteInput - 点菜备注输入事件
   * @param {Object} e - 输入事件
   */
  onNoteInput(e) {
    this.setData({ orderNote: e.detail.value })
  },

  /**
   * addToMenu - 一键加入今日点菜
   * 校验菜谱已加载 → 调用 addOrder → 清空备注
   * @returns {Promise<void>}
   */
  async addToMenu() {
    const recipeId = this.data.recipe.id
    // 校验菜谱是否已加载
    if (!recipeId) {
      wx.showToast({ title: '菜谱信息未加载', icon: 'none' })
      return
    }
    try {
      await api.addOrder({ recipe_id: recipeId, quantity: 1, note: this.data.orderNote.trim() })
      wx.showToast({ title: '已加入今日点菜', icon: 'success' })
      // 清空备注输入
      this.setData({ orderNote: '' })
    } catch (e) {
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  }
})
