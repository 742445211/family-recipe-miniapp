/**
 * pages/ai-recommend/ai-recommend.js - AI 智能推荐
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')
const { refreshAppFeatures, getCachedFeatures } = require('../../utils/features')

function getAppSafe() {
  try {
    return getApp()
  } catch (e) {
    return null
  }
}

function formatRetryHint(sec) {
  if (!sec || sec <= 0) return '请稍后再试'
  const h = Math.ceil(sec / 3600)
  if (h <= 1) return '约 1 小时后再试'
  return '约 ' + h + ' 小时后再试'
}

const RECOMMEND_COUNT = 5
const RATE_WINDOW_HOURS = 2
const RATE_LIMIT_MAX = 5

const LOADING_TIPS = [
  '翻翻你的收藏...',
  '回忆最近点过的...',
  '看看外面天气...',
  '正在组合推荐...'
]

Page({
  data: {
    enabled: false,
    loading: false,
    items: [],
    weatherText: '',
    rateLimit: null,
    recommendCount: RECOMMEND_COUNT,
    rateWindowHours: RATE_WINDOW_HOURS,
    rateLimitMax: RATE_LIMIT_MAX,
    skeletonSlots: [1, 2, 3, 4, 5],
    btnText: '开始推荐',
    loadingTip: LOADING_TIPS[0]
  },

  onLoad() {
    if (!requireLogin()) return
    this._weatherLoaded = false
    this._leftForDisabled = false
    const cached = getCachedFeatures(getAppSafe())
    if (!cached.ai_recommend) {
      this._applyDisabled()
      return
    }
    this._checkEnabled()
  },

  onShow() {
    if (!requireLogin()) return
    if (!this.data.enabled && this._leftForDisabled) return
    this._checkEnabled()
  },

  onHide() {
    if (!this.data.enabled) {
      this._clearPageData()
    }
  },

  _clearPageData() {
    this.setData({
      enabled: false,
      items: [],
      weatherText: '',
      rateLimit: null,
      loading: false
    })
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
    this._clearPageData()
    if (!this._leftForDisabled) {
      this._leftForDisabled = true
      wx.showToast({ title: 'AI推荐功能未开启', icon: 'none' })
      this._goBack()
    }
  },

  _checkEnabled() {
    const app = getAppSafe()
    return refreshAppFeatures(app).then((features) => {
      if (!features.ai_recommend) {
        this._applyDisabled()
        return false
      }
      this._leftForDisabled = false
      this.setData({ enabled: true })
      if (!this._weatherLoaded) {
        this._weatherLoaded = true
        this.loadWeather()
      }
      return true
    }).catch(() => {
      this._applyDisabled()
      return false
    })
  },

  async loadWeather() {
    if (!this.data.enabled) return
    try {
      const w = await api.getWeather()
      if (!this.data.enabled) return
      if (w && w.city) {
        this.setData({
          weatherText: w.city + ' ' + Math.round(w.temp_c) + '°C ' + (w.weather_text || '')
        })
      }
    } catch (e) { /* 天气可选 */ }
  },

  _syncBtnText() {
    const { loading, items } = this.data
    let btnText = '开始推荐'
    if (loading) {
      btnText = '正在挑选...'
    } else if (items.length) {
      btnText = '换一批推荐'
    }
    this.setData({ btnText })
  },

  async getRecommend() {
    if (!this.data.enabled || this.data.loading) return
    const loadingTip = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]
    this.setData({ loading: true, items: [], loadingTip })
    this._syncBtnText()
    try {
      const data = await api.getAIRecommend()
      if (!this.data.enabled) return
      const items = (data && data.items) ? data.items : []
      this.setData({
        items,
        rateLimit: data.rate_limit || null
      })
      if (!items.length) {
        wx.showToast({ title: '这次没想出合适的菜', icon: 'none' })
      }
    } catch (e) {
      if (!this.data.enabled) return
      if (e && e.code === 403) {
        this._applyDisabled()
        return
      }
      if (e && e.code === 429) {
        const hint = formatRetryHint(e.data && e.data.retry_after_sec)
        wx.showToast({
          title: '推荐次数用完了，' + hint,
          icon: 'none',
          duration: 3000
        })
        if (e.data) {
          this.setData({ rateLimit: e.data })
        }
      }
    } finally {
      if (this.data.enabled) {
        this.setData({ loading: false })
        this._syncBtnText()
      }
    }
  },

  toAIRecipeDetail(e) {
    if (!this.data.enabled) return
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/ai-recipe-detail/ai-recipe-detail?item_id=' + id })
  }
})
