/**
 * pages/recipe-detail/recipe-detail.js - 菜谱详情页
 * 职责：
 *   1. 展示单个菜谱的完整信息（食材、调料、步骤、贴士）
 *   2. 收藏 / 取消收藏
 *   3. 标记已做过（cook_count +1）
 *   4. 加入今日点菜（弹出模态框选择餐次和备注）
 *   5. 跳转编辑菜谱
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')
const { todayYMD } = require('../../utils/date')

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
    recipe: {},           // 菜谱详情对象
    ingredients: [],      // 食材列表（从 JSON 解析）
    seasonings: [],       // 调料列表（从 JSON 解析）
    steps: [],            // 步骤列表（从 JSON 解析）
    isFav: false,         // 是否已收藏
    showOrderModal: false,// 点菜模态框是否显示
    orderMeal: 'dinner',  // 点菜选择的餐次（默认晚餐）
    orderDate: '',        // 点菜选择的日期（默认今天）
    orderNote: ''         // 点菜备注
  },

  /**
   * onLoad - 页面加载，获取菜谱 ID 并加载详情
   * @param {Object} options - 页面参数，options.id 为菜谱 ID
   */
  onLoad(options) {
    this.setData({ recipeId: options.id })
    this.loadRecipe(options.id)
  },

  /**
   * onShow - 页面显示时刷新数据（编辑返回后可看到最新信息）
   */
  onShow() {
    if (this.data.recipeId) {
      this.loadRecipe(this.data.recipeId)
    }
  },

  /**
   * loadRecipe - 加载菜谱详情
   * 请求 API 获取详情后，将 ingredients/seasonings/steps 等 JSON 字段解析为数组
   *
   * @param {number|string} id - 菜谱 ID
   * @returns {Promise<void>}
   */
  async loadRecipe(id) {
    try {
      const r = await api.getRecipe(id)
      // 更新页面数据：菜谱信息 + 解析 JSON 字段
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
   * 当前已收藏则取消收藏，未收藏则添加收藏
   * @returns {Promise<void>}
   */
  async toggleFavorite() {
    if (!requireLogin()) return
    const id = this.data.recipe.id
    try {
      // 根据当前状态决定调用添加或取消收藏接口
      if (this.data.isFav) await api.removeFavorite(id)
      else await api.addFavorite(id)
      // 切换前端状态
      this.setData({ isFav: !this.data.isFav })
    } catch (e) {}
  },

  /**
   * markCooked - 标记已做过这道菜
   * 调用 API 后本地 cook_count +1
   * @returns {Promise<void>}
   */
  async markCooked() {
    if (!requireLogin()) return
    try {
      await api.markCooked(this.data.recipe.id)
      wx.showToast({ title: '已标记', icon: 'success' })
      // 本地自增 cook_count，避免重新请求接口
      const r = this.data.recipe
      r.cook_count++
      this.setData({ recipe: r })
    } catch (e) {}
  },

  /**
   * editRecipe - 跳转到菜谱编辑页
   */
  editRecipe() {
    if (!requireLogin()) return
    wx.navigateTo({ url: '/pages/recipe-edit/recipe-edit?id=' + this.data.recipe.id })
  },

  /**
   * showOrder - 点击"加入点菜"按钮
   * 弹出模态框让用户选择餐次（早餐/午餐/晚餐）+ 输入备注
   * 需要先校验菜谱是否已加载
   */
  showOrder() {
    if (!requireLogin()) return
    const recipeId = this.data.recipe.id
    if (!recipeId) {
      wx.showToast({ title: '菜谱信息未加载', icon: 'none' })
      return
    }
    // 默认日期为今天，用户可自行修改
    this.setData({ showOrderModal: true, orderMeal: 'dinner', orderDate: todayYMD(), orderNote: '' })
  },

  /**
   * hideOrderModal - 关闭点菜模态框
   */
  hideOrderModal() {
    this.setData({ showOrderModal: false })
  },

  /**
   * onOrderMealChange - 切换餐次选择
   * @param {Object} e - 点击事件，e.currentTarget.dataset.val 为餐次值
   */
  onOrderMealChange(e) {
    this.setData({ orderMeal: e.currentTarget.dataset.val })
  },

  /**
   * onOrderNoteInput - 点菜备注输入
   * @param {Object} e - 输入事件，e.detail.value 为备注内容
   */
  onOrderNoteInput(e) {
    this.setData({ orderNote: e.detail.value })
  },

  /**
   * onOrderDateChange - 点菜日期选择
   * @param {Object} e - 日期选择器 change 事件，e.detail.value 为 'YYYY-MM-DD'
   */
  onOrderDateChange(e) {
    this.setData({ orderDate: e.detail.value })
  },

  /**
   * confirmOrder - 确认加入点菜
   * 调用 API 将菜谱加入今日指定餐次的点菜列表
   * @returns {Promise<void>}
   */
  async confirmOrder() {
    const recipeId = this.data.recipe.id
    try {
      await api.addOrder({
        recipe_id: recipeId,
        meal_type: this.data.orderMeal,
        date: this.data.orderDate,
        quantity: 1,
        note: this.data.orderNote.trim()
      })
      const mealNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }
      wx.showToast({ title: '已加入' + (mealNames[this.data.orderMeal] || ''), icon: 'success' })
      this.setData({ showOrderModal: false })
    } catch (e) {
      wx.showToast({ title: e.msg || '添加失败', icon: 'none' })
    }
  }
})
