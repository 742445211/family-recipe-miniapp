/**
 * pages/recipe-detail/recipe-detail.js - 菜谱详情页
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')
const { todayYMD } = require('../../utils/date')
const { safeParse } = require('../../utils/json')
const { resolveFavoriteState } = require('../../utils/favorite')
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
    const id = options && options.id
    if (!id) {
      wx.showToast({ title: '菜谱不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.setData({ recipeId: id })
    this._skipShowOnce = true
    this._loadToken = 0
    this.loadRecipe(id)
  },

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
    const token = ++this._loadToken
    try {
      const r = await api.getRecipe(id)
      if (token !== this._loadToken) return
      const isFav = await resolveFavoriteState(id, r)
      if (token !== this._loadToken) return
      this.setData({
        recipe: r,
        ingredients: safeParse(r.ingredients),
        seasonings: safeParse(r.seasonings),
        steps: safeParse(r.steps),
        isFav
      })
    } catch (e) {
      if (token !== this._loadToken) return
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async toggleFavorite() {
    if (!requireLogin()) return
    if (this._favBusy) return
    const id = this.data.recipe.id
    if (!id) return
    this._favBusy = true
    try {
      if (this.data.isFav) await api.removeFavorite(id)
      else await api.addFavorite(id)
      this.setData({ isFav: !this.data.isFav })
      markIndexNeedRefresh()
    } catch (e) {
      wx.showToast({ title: (e && e.msg) || '操作失败', icon: 'none' })
    } finally {
      this._favBusy = false
    }
  },

  async markCooked() {
    if (!requireLogin()) return
    if (this._markingBusy) return
    this._markingBusy = true
    try {
      await api.markCooked(this.data.recipe.id)
      wx.showToast({ title: '已标记', icon: 'success' })
      const r = this.data.recipe
      this.setData({
        recipe: Object.assign({}, r, { cook_count: (r.cook_count || 0) + 1 })
      })
      markIndexNeedRefresh()
    } catch (e) {
      wx.showToast({ title: (e && e.msg) || '操作失败', icon: 'none' })
    } finally {
      this._markingBusy = false
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
    if (this._ordering) return
    const recipeId = this.data.recipe.id
    if (!recipeId) return
    this._ordering = true
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
    } finally {
      this._ordering = false
    }
  }
})
