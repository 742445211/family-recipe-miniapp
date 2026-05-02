const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')

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
    if (options.mode === 'favorites') {
      this.setData({ mode: 'favorites' })
      wx.setNavigationBarTitle({ title: '我的收藏' })
    }
  },

  onShow() {
    wx.showTabBar()
    const app = getApp()
    if (app.globalData.indexMode === 'favorites') {
      this.setData({ mode: 'favorites' })
      wx.setNavigationBarTitle({ title: '我的收藏' })
      app.globalData.indexMode = null
    } else {
      // 正常进入时恢复菜谱模式（防止上次收藏模式残留）
      if (this.data.mode !== 'recipes') {
        this.setData({ mode: 'recipes', keyword: '', category: '', categoryIndex: -1 })
        wx.setNavigationBarTitle({ title: '家庭菜谱' })
      }
    }
    this.loadRecipes()
  },

  backToRecipes() {
    this.setData({ mode: 'recipes', keyword: '', category: '', categoryIndex: -1 })
    wx.setNavigationBarTitle({ title: '家庭菜谱' })
    this.loadRecipes()
  },

  async loadRecipes() {
    try {
      if (this.data.mode === 'favorites') {
        const data = await api.getFavorites()
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
    if (!requireLogin()) return
    wx.navigateTo({ url: '/pages/recipe-edit/recipe-edit' })
  }
})
