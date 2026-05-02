const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')

function safeParse(str) {
  if (!str || typeof str !== 'string') return []
  try { return JSON.parse(str) } catch (e) { return [] }
}

Page({
  data: {
    recipe: {}, ingredients: [], seasonings: [], steps: [], isFav: false,
    showOrderModal: false, orderMeal: 'dinner', orderNote: ''
  },

  onLoad(options) {
    this.setData({ recipeId: options.id })
    this.loadRecipe(options.id)
  },

  onShow() {
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
        steps: safeParse(r.steps)
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
    } catch (e) {}
  },

  async markCooked() {
    if (!requireLogin()) return
    try {
      await api.markCooked(this.data.recipe.id)
      wx.showToast({ title: '已标记', icon: 'success' })
      const r = this.data.recipe
      r.cook_count++
      this.setData({ recipe: r })
    } catch (e) {}
  },

  editRecipe() {
    if (!requireLogin()) return
    wx.navigateTo({ url: '/pages/recipe-edit/recipe-edit?id=' + this.data.recipe.id })
  },

  // 点击加入点菜 → 弹出选择餐次+备注
  showOrder() {
    if (!requireLogin()) return
    const recipeId = this.data.recipe.id
    if (!recipeId) {
      wx.showToast({ title: '菜谱信息未加载', icon: 'none' })
      return
    }
    this.setData({ showOrderModal: true, orderMeal: 'dinner', orderNote: '' })
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

  async confirmOrder() {
    const recipeId = this.data.recipe.id
    try {
      await api.addOrder({
        recipe_id: recipeId,
        meal_type: this.data.orderMeal,
        quantity: 1,
        note: this.data.orderNote.trim()
      })
      const mealNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }
      wx.showToast({ title: '已加入今日' + (mealNames[this.data.orderMeal] || ''), icon: 'success' })
      this.setData({ showOrderModal: false })
    } catch (e) {
      wx.showToast({ title: e.msg || '添加失败', icon: 'none' })
    }
  }
})
