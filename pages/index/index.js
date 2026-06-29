/**
 * pages/index/index.js - 菜谱首页
 * 职责：
 *   1. 菜谱列表展示（单列信息流 + 分页触底加载）
 *   2. 关键词搜索 + 分类筛选
 *   3. 收藏模式切换（从"我的"页面跳转过来查看收藏）
 *   4. 跳转到菜谱详情 / 新增菜谱
 */

const api = require('../../utils/api')
const { requireLogin, isLoggedIn } = require('../../utils/auth')
const {
  DEFAULT_CATEGORY_NAMES,
  mergeCategoryNames,
  buildIndexPickerCategories,
  categoriesFromPublicAPI
} = require('../../utils/category')

const PAGE_SIZE = 10

function getAppSafe() {
  try {
    return getApp()
  } catch (e) {
    return null
  }
}

/** 难度映射为 5 星制（与示意图一致：简 2 / 中 3 / 难 5） */
function difficultyToStars(difficulty) {
  const map = { easy: 2, medium: 3, hard: 5 }
  const n = map[difficulty] || 3
  return Array.from({ length: 5 }, (_, i) => ({ filled: i < n }))
}

function enrichRecipe(r) {
  const tips = r.tips && String(r.tips).trim()
  return {
    ...r,
    starList: difficultyToStars(r.difficulty),
    summary: tips || ''
  }
}

function resolveHasMore(data, loadedCount) {
  if (data && typeof data.has_more === 'boolean') return data.has_more
  const total = data && data.total
  if (typeof total === 'number') return loadedCount < total
  return false
}

Page({
  data: {
    recipes: [],
    keyword: '',
    category: '',
    categoryIndex: -1,
    categories: buildIndexPickerCategories(DEFAULT_CATEGORY_NAMES),
    mode: 'recipes',
    page: 1,
    hasMore: true,
    loading: false,
    loadingMore: false,
    loadError: false,
    categorySheetVisible: false,
    categoryOptions: []
  },

  onLoad(options) {
    this._searchTimer = null
    this._loadToken = 0       // 递增序号，用于丢弃过期的列表请求（快速搜索/切换分类）
    this._hasShown = false    // 是否已展示过，区分「首次进入」与「从详情返回」
    this._categoriesLoaded = false
    if (options.mode === 'favorites') {
      this.setData({ mode: 'favorites' })
      wx.setNavigationBarTitle({ title: '我的收藏' })
    }
  },

  onUnload() {
    if (this._searchTimer) clearTimeout(this._searchTimer)
  },

  /**
   * onShow - Tab 页每次可见时触发
   * 从详情 navigateBack 回来也会触发，因此不能无条件 loadRecipes(true)，否则会重置分页。
   * 仅在：首次进入、切换收藏模式、或 globalData.indexNeedRefresh 时刷新列表。
   */
  onShow() {
    wx.showTabBar()
    const app = getAppSafe()
    const gd = (app && app.globalData) || {}

    let needRefresh = !this._hasShown
    this._hasShown = true

    // 从「我的」进入收藏模式
    if (gd.indexMode === 'favorites') {
      if (app && app.globalData) app.globalData.indexMode = null
      if (!isLoggedIn()) {
        wx.showToast({ title: '请先登录', icon: 'none' })
      } else {
        this.setData({ mode: 'favorites' })
        wx.setNavigationBarTitle({ title: '我的收藏' })
        needRefresh = true
      }
    }
    // 编辑/收藏等操作后由 markIndexNeedRefresh() 置位
    if (gd.indexNeedRefresh) {
      needRefresh = true
      if (app && app.globalData) app.globalData.indexNeedRefresh = false
    }
    if (needRefresh || !this._categoriesLoaded) {
      this.loadCategories()
      this._categoriesLoaded = true
    }
    if (needRefresh) {
      this.loadRecipes(true)
    }
  },

  onReachBottom() {
    this.loadRecipes(false)
  },

  onPullDownRefresh() {
    this.loadCategories()
    this.loadRecipes(true)
      .then(() => wx.stopPullDownRefresh())
      .catch(() => wx.stopPullDownRefresh())
  },

  /** 未登录拉公开分类；已登录拉家庭分类；401 时清 token 后回退公开接口 */
  async loadCategories() {
    let names = DEFAULT_CATEGORY_NAMES.slice()
    const loadPublic = async () => {
      const data = await api.getPublicCategories()
      return categoriesFromPublicAPI(data)
    }
    try {
      if (isLoggedIn()) {
        const data = await api.getCategories()
        names = mergeCategoryNames(data)
      } else {
        names = await loadPublic()
      }
    } catch (e) {
      if (e && e.code === 401) {
        try {
          names = await loadPublic()
        } catch (err) { /* 保留默认分类 */ }
      }
    }
    const categories = buildIndexPickerCategories(names)
    let category = this.data.category
    let categoryIndex = -1
    if (category) {
      categoryIndex = categories.indexOf(category)
      if (categoryIndex < 0) {
        category = ''
        categoryIndex = -1
      }
    }
    const categoryOptions = categories.map((c, i) => ({
      value: i === 0 ? '' : c,
      label: c
    }))
    this.setData({ categories, category, categoryIndex, categoryOptions })
  },

  backToRecipes() {
    this.setData({ mode: 'recipes', keyword: '', category: '', categoryIndex: -1 })
    wx.setNavigationBarTitle({ title: '家庭菜谱' })
    this.loadRecipes(true)
  },

  /**
   * _finishLoad - 仅在 token 仍为最新请求时更新 UI，避免并发请求互相覆盖或 loading 卡死
   * @param {number} token - 发起请求时绑定的 _loadToken
   */
  _finishLoad(token, patch) {
    if (token !== this._loadToken) return false
    this.setData(Object.assign({
      loading: false,
      loadingMore: false
    }, patch))
    return true
  },

  /**
   * loadRecipes - 加载菜谱/收藏列表
   * @param {boolean} reset - true 从第一页刷新；false 触底加载下一页
   */
  async loadRecipes(reset = true) {
    if (!reset) {
      if (!this.data.hasMore || this.data.loadingMore || this.data.loading) return
    }

    if (reset) {
      this.setData({ loading: true, loadError: false, page: 1, hasMore: true, loadingMore: false })
    } else {
      this.setData({ loadingMore: true })
    }

    const token = reset ? ++this._loadToken : this._loadToken
    const requestPage = reset ? 1 : this.data.page

    try {
      let recipes = []
      let hasMore = false

      if (this.data.mode === 'favorites') {
        if (!isLoggedIn()) {
          if (token !== this._loadToken) return
          this._finishLoad(token, { recipes: [], hasMore: false, loadError: false })
          return
        }
        const data = await api.getFavorites({ page: requestPage, page_size: PAGE_SIZE })
        if (token !== this._loadToken) return // 已有更新的请求发出，丢弃本结果
        const list = (data && data.list) ? data.list : []
        const batch = list.map(f => enrichRecipe(f.recipe || f))
        recipes = reset ? batch : this.data.recipes.concat(batch)
        hasMore = resolveHasMore(data, recipes.length)
      } else {
        const data = await api.getRecipes({
          keyword: this.data.keyword,
          category: this.data.category,
          page: requestPage,
          page_size: PAGE_SIZE
        })
        if (token !== this._loadToken) return
        const list = (data && data.list) ? data.list : []
        const batch = list.map(enrichRecipe)
        recipes = reset ? batch : this.data.recipes.concat(batch)
        hasMore = resolveHasMore(data, recipes.length)
      }

      this._finishLoad(token, {
        recipes,
        page: requestPage + 1,
        hasMore,
        loadError: false
      })
    } catch (e) {
      if (token !== this._loadToken) return
      if (reset && e && e.code === 401 && this.data.mode === 'recipes') {
        try {
          const data = await api.getRecipes({
            keyword: this.data.keyword,
            category: this.data.category,
            page: requestPage,
            page_size: PAGE_SIZE
          })
          if (token !== this._loadToken) return
          const list = (data && data.list) ? data.list : []
          const batch = list.map(enrichRecipe)
          const recipes = batch
          this._finishLoad(token, {
            recipes,
            page: requestPage + 1,
            hasMore: resolveHasMore(data, recipes.length),
            loadError: false
          })
          return
        } catch (retryErr) { /* fall through */ }
      }
      if (reset) {
        this._finishLoad(token, { recipes: [], loadError: true })
      } else {
        this._finishLoad(token, {})
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    }
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value })
    if (this._searchTimer) clearTimeout(this._searchTimer)
    this._searchTimer = setTimeout(() => this.loadRecipes(true), 300)
  },

  openCategorySheet() {
    this.setData({ categorySheetVisible: true })
  },

  closeCategorySheet() {
    this.setData({ categorySheetVisible: false })
  },

  onCategorySelect(e) {
    const { value } = e.detail
    const idx = value === '' ? 0 : this.data.categories.indexOf(value)
    this.setData({
      category: value,
      categoryIndex: idx >= 0 ? idx : -1,
      categorySheetVisible: false
    })
    this.loadRecipes(true)
  },

  toDetail(e) {
    wx.navigateTo({ url: '/pages/recipe-detail/recipe-detail?id=' + e.currentTarget.dataset.id })
  },

  addRecipe() {
    if (!requireLogin()) return
    wx.navigateTo({ url: '/pages/recipe-edit/recipe-edit' })
  }
})
