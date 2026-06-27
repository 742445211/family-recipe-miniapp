/**
 * pages/ai-recipe-detail/ai-recipe-detail.js - AI 推荐菜品详情
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')
const { todayYMD } = require('../../utils/date')
const { safeParse } = require('../../utils/json')
const { refreshAppFeatures, getCachedFeatures } = require('../../utils/features')

function getAppSafe() {
  try {
    return getApp()
  } catch (e) {
    return null
  }
}

function difficultyLabel(d) {
  if (d === 'easy') return '简单'
  if (d === 'hard') return '困难'
  return '中等'
}

Page({
  data: {
    enabled: false,
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
    this._draftLoaded = false
    this._leftForDisabled = false
    const cached = getCachedFeatures(getAppSafe())
    if (!cached.ai_recommend) {
      this._applyDisabled()
      return
    }
    this._checkEnabled(itemId)
  },

  onShow() {
    if (!requireLogin()) return
    if (!this.data.itemId) return
    if (!this.data.enabled && this._leftForDisabled) return
    this._checkEnabled(this.data.itemId)
  },

  _goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/mine/mine' })
    }
  },

  _applyDisabled() {
    this._draftLoaded = false
    this.setData({
      enabled: false,
      draft: {},
      ingredients: [],
      seasonings: [],
      steps: [],
      difficultyText: '中等',
      inLibrary: false,
      showOrderModal: false
    })
    if (!this._leftForDisabled) {
      this._leftForDisabled = true
      wx.showToast({ title: 'AI推荐功能未开启', icon: 'none' })
      this._goBack()
    }
  },

  _checkEnabled(itemId) {
    const app = getAppSafe()
    return refreshAppFeatures(app).then((features) => {
      if (!features.ai_recommend) {
        this._applyDisabled()
        return false
      }
      this._leftForDisabled = false
      this.setData({ enabled: true })
      if (itemId && !this._draftLoaded) {
        this._draftLoaded = true
        this.loadDraft(itemId)
      }
      return true
    }).catch(() => {
      this._applyDisabled()
      return false
    })
  },

  async loadDraft(itemId) {
    if (!this.data.enabled) return
    try {
      const draft = await api.getAIRecipeItem(itemId)
      if (!this.data.enabled) return
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
