const api = require('../../utils/api')

Page({
  data: {
    recipes: [],
    keyword: '',
    category: '',
    categoryIndex: -1,
    categories: ['全部', '荤菜', '素菜', '汤', '主食', '凉菜', '其他']
  },

  onShow() { this.loadRecipes() },

  async loadRecipes() {
    try {
      const data = await api.getRecipes({ keyword: this.data.keyword, category: this.data.category })
      this.setData({ recipes: data.list })
    } catch (e) {}
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value })
    this.loadRecipes()
  },

  onCategory(e) {
    const idx = parseInt(e.detail.value)
    const cat = idx === 0 ? '' : this.data.categories[idx]
    this.setData({ categoryIndex: idx, category: cat })
    this.loadRecipes()
  },

  toDetail(e) {
    wx.navigateTo({ url: '/pages/recipe-detail/recipe-detail?id=' + e.currentTarget.dataset.id })
  },

  addRecipe() {
    wx.navigateTo({ url: '/pages/recipe-edit/recipe-edit' })
  }
})
