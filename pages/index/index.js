const api = require('../../utils/api')

Page({
  data: {
    recipes: [],
    keyword: '',
    category: '',
    categoryIndex: -1,
    categories: ['全部', '荤菜', '素菜', '汤', '主食', '凉菜', '其他'],
    mode: 'recipes'  // 'recipes' | 'favorites'
  },

  onLoad(options) {
    // 保留兼容 URL 参数方式
    if (options.mode === 'favorites') {
      this.setData({ mode: 'favorites' })
      wx.setNavigationBarTitle({ title: '我的收藏' })
    }
  },

  onShow() {
    // globalData 方式（来自 mine 页 switchTab）
    const app = getApp()
    if (app.globalData.indexMode === 'favorites') {
      this.setData({ mode: 'favorites' })
      wx.setNavigationBarTitle({ title: '我的收藏' })
      app.globalData.indexMode = null  // 用完清除
    } else if (app.globalData.indexMode === 'recipes') {
      this.setData({ mode: 'recipes' })
      wx.setNavigationBarTitle({ title: '家庭菜谱' })
      app.globalData.indexMode = null
    }
    this.loadRecipes()
  },

  async loadRecipes() {
    try {
      if (this.data.mode === 'favorites') {
        const data = await api.getFavorites()
        // favorites returns list of {recipe: {...}}
        const recipes = (data || []).map(f => f.recipe || f)
        this.setData({ recipes })
      } else {
        const data = await api.getRecipes({ keyword: this.data.keyword, category: this.data.category })
        this.setData({ recipes: data.list || [] })
      }
    } catch (e) {
      this.setData({ recipes: [] })
    }
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
