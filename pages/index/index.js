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

Page({
  data: {
    recipes: [],           // 菜谱列表数据
    keyword: '',           // 搜索关键词
    category: '',          // 当前分类（空字符串 = 全部）
    categoryIndex: -1,     // 分类选择器当前索引（-1 = 全部，pick mode 用）
    categories: ['全部', '荤菜', '素菜', '汤', '主食', '凉菜', '其他'],
    mode: 'recipes'        // 当前模式：'recipes'（菜谱）或 'favorites'（收藏）
  },

  /**
   * onLoad - 页面加载
   * @param {Object} options - 页面参数
   *   options.mode = 'favorites' 时进入收藏模式
   */
  onLoad(options) {
    // 如果从"我的收藏"入口进入，切换为收藏模式
    if (options.mode === 'favorites') {
      this.setData({ mode: 'favorites' })
      wx.setNavigationBarTitle({ title: '我的收藏' })
    }
  },

  /**
   * onShow - 页面显示（每次切换到该 Tab 都会触发）
   * 检查 globalData.indexMode 来判断是否需要切换到收藏模式
   */
  onShow() {
    wx.showTabBar()
    const app = getApp()

    if (app.globalData.indexMode === 'favorites') {
      // 从"我的"页面触发的收藏模式跳转
      this.setData({ mode: 'favorites' })
      wx.setNavigationBarTitle({ title: '我的收藏' })
      app.globalData.indexMode = null  // 消费标记
    } else {
      // 正常进入时恢复菜谱模式（防止上次收藏模式残留）
      if (this.data.mode !== 'recipes') {
        this.setData({ mode: 'recipes', keyword: '', category: '', categoryIndex: -1 })
        wx.setNavigationBarTitle({ title: '家庭菜谱' })
      }
    }
    // 每次显示时重新加载数据
    this.loadRecipes()
  },

  /**
   * backToRecipes - 从收藏模式切换回菜谱模式
   * 清空搜索和筛选条件，重新加载菜谱列表
   */
  backToRecipes() {
    this.setData({ mode: 'recipes', keyword: '', category: '', categoryIndex: -1 })
    wx.setNavigationBarTitle({ title: '家庭菜谱' })
    this.loadRecipes()
  },

  /**
   * loadRecipes - 加载菜谱数据
   * 根据当前 mode 决定调用 getRecipes 或 getFavorites 接口
   * @returns {Promise<void>}
   */
  async loadRecipes() {
    try {
      if (this.data.mode === 'favorites') {
        // 收藏模式：调收藏接口，提取其中的 recipe 字段
        const data = await api.getFavorites()
        const recipes = (data || []).map(f => f.recipe || f)
        this.setData({ recipes })
      } else {
        // 菜谱模式：传 keyword 和 category 参数
        const data = await api.getRecipes({ keyword: this.data.keyword, category: this.data.category })
        this.setData({ recipes: data.list || [] })
      }
    } catch (e) {
      // 请求失败时清空列表
      this.setData({ recipes: [] })
    }
  },

  /**
   * onSearch - 搜索输入事件
   * @param {Object} e - 输入事件对象，e.detail.value 为搜索关键词
   */
  onSearch(e) {
    this.setData({ keyword: e.detail.value })
    this.loadRecipes()
  },

  /**
   * onCategory - 分类切换事件（picker 组件）
   * @param {Object} e - picker change 事件，e.detail.value 为选中索引
   */
  onCategory(e) {
    const idx = parseInt(e.detail.value)
    // 索引 0 = "全部"，category 置空；否则取对应分类名
    const cat = idx === 0 ? '' : this.data.categories[idx]
    this.setData({ categoryIndex: idx, category: cat })
    this.loadRecipes()
  },

  /**
   * toDetail - 跳转到菜谱详情页
   * @param {Object} e - 点击事件，e.currentTarget.dataset.id 为菜谱 ID
   */
  toDetail(e) {
    wx.navigateTo({ url: '/pages/recipe-detail/recipe-detail?id=' + e.currentTarget.dataset.id })
  },

  /**
   * addRecipe - 跳转到新增菜谱页
   * 需要先检查登录状态
   */
  addRecipe() {
    if (!requireLogin()) return
    wx.navigateTo({ url: '/pages/recipe-edit/recipe-edit' })
  }
})
