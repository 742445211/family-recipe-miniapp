const api = require('../../utils/api')

Page({
  data: { recipe: {}, ingredients: [], seasonings: [], steps: [], isFav: false },

  onLoad(options) {
    this.loadRecipe(options.id)
  },

  async loadRecipe(id) {
    try {
      const r = await api.getRecipe(id)
      this.setData({
        recipe: r,
        ingredients: typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : (r.ingredients || []),
        seasonings: typeof r.seasonings === 'string' ? JSON.parse(r.seasonings) : (r.seasonings || []),
        steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : (r.steps || [])
      })
    } catch (e) {}
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

  async addToMenu() {
    const recipeId = this.data.recipe.id
    if (!recipeId) {
      wx.showToast({ title: '菜谱信息未加载', icon: 'none' })
      return
    }
    try {
      await api.addOrder({ recipe_id: recipeId, quantity: 1 })
      wx.showToast({ title: '已加入今日点菜', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  }
})
