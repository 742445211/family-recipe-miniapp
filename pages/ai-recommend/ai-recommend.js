/**
 * pages/ai-recommend/ai-recommend.js - AI 智能推荐
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')
const { loadAppFeatures } = require('../../utils/features')

function getAppSafe() {
  try {
    return getApp()
  } catch (e) {
    return null
  }
}

function formatRetryHint(sec) {
  if (!sec || sec <= 0) return '稍后再喊我'
  const h = Math.ceil(sec / 3600)
  if (h <= 1) return '约 1 小时后再喊'
  return '约 ' + h + ' 小时后再喊'
}

const RECOMMEND_COUNT = 5
const RATE_WINDOW_HOURS = 2
const RATE_LIMIT_MAX = 5

const LOADING_TIPS = [
  '正在翻你的收藏...',
  '回忆上次点的啥...',
  '瞅眼窗外天气...',
  '大脑正在下锅...'
]

Page({
  data: {
    ready: false,
    enabled: false,
    loading: false,
    items: [],
    weatherText: '',
    rateLimit: null,
    recommendCount: RECOMMEND_COUNT,
    rateWindowHours: RATE_WINDOW_HOURS,
    rateLimitMax: RATE_LIMIT_MAX,
    skeletonSlots: [1, 2, 3, 4, 5],
    btnText: '开饭！给我推荐',
    loadingTip: LOADING_TIPS[0]
  },

  onLoad() {
    if (!requireLogin()) return
    this._weatherLoaded = false
    this._leftForDisabled = false
    this._checkEnabled()
  },

  onShow() {
    if (!requireLogin()) return
    this._checkEnabled()
  },

  onHide() {
    if (!this.data.enabled) {
      this._clearPageData()
    }
  },

  _clearPageData() {
    this.setData({
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
    this.setData({ ready: true, enabled: false })
    this._clearPageData()
    if (!this._leftForDisabled) {
      this._leftForDisabled = true
      wx.showToast({ title: 'AI推荐功能未开启', icon: 'none' })
      this._goBack()
    }
  },

  _checkEnabled() {
    return loadAppFeatures().then((features) => {
      const app = getAppSafe()
      if (app && app.globalData) {
        app.globalData.features = features
      }
      if (!features.ai_recommend) {
        this._applyDisabled()
        return false
      }
      this._leftForDisabled = false
      this.setData({ ready: true, enabled: true })
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
    let btnText = '开饭！给我推荐'
    if (loading) {
      btnText = '大脑正在下锅...'
    } else if (items.length) {
      btnText = '不满意？再来一桌'
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
        wx.showToast({ title: '大厨挠头了，没想出菜', icon: 'none' })
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
          title: '每 3 小时就 3 次啦，' + hint,
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
