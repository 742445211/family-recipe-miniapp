/**
 * pages/ai-recommend/ai-recommend.js - AI 智能推荐
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

function formatRetryHint(sec) {
  if (!sec || sec <= 0) return '请稍后再试'
  const h = Math.ceil(sec / 3600)
  if (h <= 1) return '请约 1 小时后再试'
  return '请约 ' + h + ' 小时后再试'
}

Page({
  data: {
    loading: false,
    items: [],
    weatherText: '',
    rateLimit: null
  },

  onLoad() {
    if (!requireLogin()) return
    const app = getAppSafe()
    const start = () => {
      const features = (app && app.globalData && app.globalData.features) || {}
      if (!features.ai_recommend) {
        wx.showToast({ title: 'AI推荐功能未开启', icon: 'none' })
        wx.navigateBack()
        return
      }
      this.loadWeather()
    }
    if (app && app._featuresPromise) {
      app._featuresPromise.then(start).catch(start)
      return
    }
    start()
  },

  async loadWeather() {
    try {
      const w = await api.getWeather()
      if (w && w.city) {
        this.setData({
          weatherText: w.city + ' ' + Math.round(w.temp_c) + '°C ' + (w.weather_text || '')
        })
      }
    } catch (e) { /* 天气可选 */ }
  },

  async getRecommend() {
    if (this.data.loading) return
    this.setData({ loading: true, items: [] })
    try {
      const data = await api.getAIRecommend()
      const items = (data && data.items) ? data.items : []
      this.setData({
        items,
        rateLimit: data.rate_limit || null
      })
      if (!items.length) {
        wx.showToast({ title: '暂无推荐结果', icon: 'none' })
      }
    } catch (e) {
      if (e && e.code === 429) {
        const hint = formatRetryHint(e.data && e.data.retry_after_sec)
        wx.showToast({ title: '3小时内最多推荐3次，' + hint, icon: 'none', duration: 3000 })
        if (e.data) {
          this.setData({ rateLimit: e.data })
        }
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  toAIRecipeDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/ai-recipe-detail/ai-recipe-detail?item_id=' + id })
  }
})
