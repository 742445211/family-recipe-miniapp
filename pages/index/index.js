/**
 * pages/index/index.js - 菜谱首页
 * 职责：
 *   1. 菜谱列表展示（Grid 视图）
 *   2. 关键词搜索 + 分类筛选
 *   3. 收藏模式切换（从"我的"页面跳转过来查看收藏）
 *   4. 跳转到菜谱详情 / 新增菜谱
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')

function getAppSafe() {
  try {
    return getApp()
  } catch (e) {
    return null
  }
}

Page({
  data: {
    recipes: [],           // 菜谱列表数据
    keyword: '',           // 搜索关键词
    category: '',          // 当前分类（空字符串 = 全部）
    categoryIndex: -1,     // 分类选择器当前索引（-1 = 全部，pick mode 用）
    categories: ['全部', '荤菜', '素菜', '汤', '主食', '凉菜', '其他'],
    mode: 'recipes',       // 当前模式：'recipes'（菜谱）或 'favorites'（收藏）
    loading: false,
    loadError: false
  },

  onLoad(options) {
    this._searchTimer = null
    this._loadToken = 0
    if (options.mode === 'favorites') {
      this.setData({ mode: 'favorites' })
      wx.setNavigationBarTitle({ title: '我的收藏' })
    }
  },

  onUnload() {
    if (this._searchTimer) clearTimeout(this._searchTimer)
  },

  onShow() {
    wx.showTabBar()
    const app = getAppSafe()
    const gd = (app && app.globalData) || {}

    if (gd.indexMode === 'favorites') {
      this.setData({ mode: 'favorites' })
      wx.setNavigationBarTitle({ title: '我的收藏' })
      if (app && app.globalData) app.globalData.indexMode = null
    } else if (this.data.mode !== 'recipes') {
      this.setData({ mode: 'recipes', keyword: '', category: '', categoryIndex: -1 })
      wx.setNavigationBarTitle({ title: '家庭菜谱' })
    }
    this.loadRecipes()
  },

  backToRecipes() {
    this.setData({ mode: 'recipes', keyword: '', category: '', categoryIndex: -1 })
    wx.setNavigationBarTitle({ title: '家庭菜谱' })
    this.loadRecipes()
  },

  async loadRecipes() {
    const token = ++this._loadToken
    this.setData({ loading: true, loadError: false })
    try {
      let recipes = []
      if (this.data.mode === 'favorites') {
        const data = await api.getFavorites()
        recipes = (data || []).map(f => f.recipe || f)
      } else {
        const data = await api.getRecipes({
          keyword: this.data.keyword,
          category: this.data.category
        })
        recipes = (data && data.list) ? data.list : []
      }
      if (token !== this._loadToken) return
      this.setData({ recipes, loading: false })
    } catch (e) {
      if (token !== this._loadToken) return
      this.setData({ recipes: [], loading: false, loadError: true })
    }
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value })
    if (this._searchTimer) clearTimeout(this._searchTimer)
    this._searchTimer = setTimeout(() => this.loadRecipes(), 300)
  },

  onCategory(e) {
    const idx = parseInt(e.detail.value, 10)
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
