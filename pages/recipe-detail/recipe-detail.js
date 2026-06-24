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
const { safeParse, resolveFavoriteFlag } = require('../../utils/json')
const { markIndexNeedRefresh } = require('../../utils/index-refresh')

Page({
  data: {
    recipe: {},
    ingredients: [],
    seasonings: [],
    steps: [],
    isFav: false,
    showOrderModal: false,
    orderMeal: 'dinner',
    orderDate: '',
    orderNote: ''
  },

  onLoad(options) {
    this.setData({ recipeId: options.id })
    // onLoad 与 onShow 在首次进入时都会触发，跳过第一次 onShow 避免重复请求
    this._skipShowOnce = true
    this.loadRecipe(options.id)
  },

  /** 从编辑页返回时需刷新；首次进入已在 onLoad 加载 */
  onShow() {
    if (this._skipShowOnce) {
      this._skipShowOnce = false
      return
    }
    if (this.data.recipeId) {
      this.loadRecipe(this.data.recipeId)
    }
  },

  async loadRecipe(id) {
    try {
      const r = await api.getRecipe(id)
      this.setData({
        recipe: r,
        ingredients: safeParse(r.ingredients),
        seasonings: safeParse(r.seasonings),
        steps: safeParse(r.steps),
        isFav: resolveFavoriteFlag(r)
      })
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async toggleFavorite() {
    if (!requireLogin()) return
    const id = this.data.recipe.id
    try {
      if (this.data.isFav) await api.removeFavorite(id)
      else await api.addFavorite(id)
      this.setData({ isFav: !this.data.isFav })
      // 收藏列表/首页可能需要同步，返回 Tab 时刷新
      markIndexNeedRefresh()
    } catch (e) {
      wx.showToast({ title: (e && e.msg) || '操作失败', icon: 'none' })
    }
  },

  /**
   * markCooked - 标记「做过一次」
   * 调用 POST /recipes/:id/cooked，后端 cook_count +1；与「加入点菜」无关（点菜是计划吃什么）。
   */
  async markCooked() {
    if (!requireLogin()) return
    try {
      await api.markCooked(this.data.recipe.id)
      wx.showToast({ title: '已标记', icon: 'success' })
      const r = this.data.recipe
      // 本地 +1 避免再拉详情；用新对象避免直接 mutate data
      this.setData({
        recipe: Object.assign({}, r, { cook_count: (r.cook_count || 0) + 1 })
      })
    } catch (e) {
      wx.showToast({ title: (e && e.msg) || '操作失败', icon: 'none' })
    }
  },

  editRecipe() {
    if (!requireLogin()) return
    wx.navigateTo({ url: '/pages/recipe-edit/recipe-edit?id=' + this.data.recipe.id })
  },

  showOrder() {
    if (!requireLogin()) return
    const recipeId = this.data.recipe.id
    if (!recipeId) {
      wx.showToast({ title: '菜谱信息未加载', icon: 'none' })
      return
    }
    this.setData({ showOrderModal: true, orderMeal: 'dinner', orderDate: todayYMD(), orderNote: '' })
  },

  hideOrderModal() {
    this.setData({ showOrderModal: false })
  },

  onOrderMealChange(e) {
    this.setData({ orderMeal: e.currentTarget.dataset.val })
  },

  onOrderNoteInput(e) {
    this.setData({ orderNote: e.detail.value })
  },

  onOrderDateChange(e) {
    this.setData({ orderDate: e.detail.value })
  },

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
