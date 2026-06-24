/**
 * pages/ai-recipe-detail/ai-recipe-detail.js - AI 推荐菜品详情
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')
const { todayYMD } = require('../../utils/date')
const { safeParse } = require('../../utils/json')

function difficultyLabel(d) {
  if (d === 'easy') return '简单'
  if (d === 'hard') return '困难'
  return '中等'
}

Page({
  data: {
    itemId: '',
    draft: {},
    ingredients: [],
    seasonings: [],
    steps: [],
    difficultyText: '中等',
    inLibrary: false,
    showOrderModal: false,
    orderMeal: 'dinner',
    orderDate: '',
    orderNote: ''
  },

  onLoad(options) {
    if (!requireLogin()) return
    const itemId = options.item_id || ''
    if (!itemId) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    this.setData({ itemId, orderDate: todayYMD() })
    this.loadDraft(itemId)
  },

  async loadDraft(itemId) {
    try {
      const draft = await api.getAIRecipeItem(itemId)
      this.setData({
        draft,
        ingredients: safeParse(draft.ingredients),
        seasonings: safeParse(draft.seasonings),
        steps: safeParse(draft.steps),
        difficultyText: difficultyLabel(draft.difficulty),
        inLibrary: !!draft.existing_recipe_id
      })
      wx.setNavigationBarTitle({ title: draft.name || 'AI 推荐菜' })
    } catch (e) {
      wx.showToast({ title: (e && e.msg) || '加载失败', icon: 'none' })
    }
  },

  async importRecipe() {
    if (this.data.inLibrary) {
      wx.showToast({ title: '该菜已在菜谱库中', icon: 'none' })
      return
    }
    try {
      const rec = await api.importAIRecipe(this.data.itemId)
      wx.showToast({ title: '已加入菜谱库', icon: 'success' })
      this.setData({
        inLibrary: true,
        draft: Object.assign({}, this.data.draft, { existing_recipe_id: rec.id })
      })
    } catch (e) {
      if (e && e.code === 400) {
        wx.showToast({ title: '该菜已在菜谱库中', icon: 'none' })
        this.setData({ inLibrary: true })
      }
    }
  },

  showOrder() {
    this.setData({ showOrderModal: true, orderMeal: 'dinner', orderDate: todayYMD(), orderNote: '' })
  },

  stopPropagation() {},

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
    this._ordering = true
    try {
      await api.addAIRecipeToOrder(this.data.itemId, {
        meal_type: this.data.orderMeal,
        date: this.data.orderDate,
        quantity: 1,
        note: this.data.orderNote.trim()
      })
      const mealNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }
      wx.showToast({ title: '已加入' + (mealNames[this.data.orderMeal] || ''), icon: 'success' })
      this.setData({ showOrderModal: false, inLibrary: true })
      this.loadDraft(this.data.itemId)
    } catch (e) {
      wx.showToast({ title: (e && e.msg) || '添加失败', icon: 'none' })
    } finally {
      this._ordering = false
    }
  }
})
