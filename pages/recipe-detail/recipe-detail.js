const api = require('../../utils/api')

function safeParse(str) {
  if (!str || typeof str !== 'string') return []
  try { return JSON.parse(str) } catch (e) { return [] }
}

Page({
  data: { recipe: {}, ingredients: [], seasonings: [], steps: [], isFav: false, orderNote: '' },

  onLoad(options) {
    this.setData({ recipeId: options.id, orderNote: '' })
    this.loadRecipe(options.id)
  },

  onShow() {
    // 编辑返回后刷新
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
    const id = this.data.recipe.id
    try {
      if (this.data.isFav) await api.removeFavorite(id)
      else await api.addFavorite(id)
      this.setData({ isFav: !this.data.isFav })
    } catch (e) {}
  },

  async markCooked() {
    try {
      await api.markCooked(this.data.recipe.id)
      wx.showToast({ title: '已标记', icon: 'success' })
      const r = this.data.recipe
      r.cook_count++
      this.setData({ recipe: r })
    } catch (e) {}
  },

  editRecipe() {
    wx.navigateTo({ url: '/pages/recipe-edit/recipe-edit?id=' + this.data.recipe.id })
  },

  onNoteInput(e) {
    this.setData({ orderNote: e.detail.value })
  },

  async addToMenu() {
    const recipeId = this.data.recipe.id
    if (!recipeId) {
      wx.showToast({ title: '菜谱信息未加载', icon: 'none' })
      return
    }
    try {
      await api.addOrder({ recipe_id: recipeId, quantity: 1, note: this.data.orderNote.trim() })
      wx.showToast({ title: '已加入今日点菜', icon: 'success' })
      this.setData({ orderNote: '' })
    } catch (e) {
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  }
})
