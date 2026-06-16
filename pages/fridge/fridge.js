/**
 * pages/fridge/fridge.js - 冰箱食材 Tab 页
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')
const { normalizeYMD, todayYMD } = require('../../utils/date')

function getAppSafe() {
  try {
    return getApp()
  } catch (e) {
    return null
  }
}

function daysUntil(expiryDate) {
  if (!expiryDate) return null
  const today = new Date(todayYMD() + 'T00:00:00')
  const exp = new Date(normalizeYMD(expiryDate) + 'T00:00:00')
  return Math.ceil((exp - today) / 86400000)
}

function decorateItem(item) {
  const days = daysUntil(item.expiry_date)
  let expiryStatus = 'none'
  if (days !== null) {
    if (days < 0) expiryStatus = 'expired'
    else if (days <= 3) expiryStatus = 'soon'
    else expiryStatus = 'normal'
  }
  const sourceLabel = item.source === 'photo' ? '拍照' : '手动'
  return Object.assign({}, item, {
    expiry_date: item.expiry_date ? normalizeYMD(item.expiry_date) : '',
    expiryStatus,
    expiryHint: days === null ? '' : (days < 0 ? '已过期' : (days === 0 ? '今天到期' : days + ' 天后到期')),
    sourceLabel
  })
}

Page({
  data: {
    enabled: true,
    loading: false,
    loadError: false,
    needFamily: false,
    items: []
  },

  async onShow() {
    wx.showTabBar()
    if (!requireLogin()) return
    await this._loadFeatureFlag()
    this.loadItems()
  },

  async _loadFeatureFlag() {
    const app = getAppSafe()
    if (app && app._featuresPromise) {
      try { await app._featuresPromise } catch (e) { /* ignore */ }
    }
    const enabled = !!(app && app.globalData && app.globalData.features && app.globalData.features.fridge)
    this.setData({ enabled })
  },

  async loadItems() {
    if (!this.data.enabled) return
    this.setData({ loading: true, loadError: false, needFamily: false })
    try {
      const list = await api.getFridgeItems()
      const items = (Array.isArray(list) ? list : []).map(decorateItem)
      this.setData({ items, loading: false })
    } catch (e) {
      const msg = (e && e.msg) || ''
      if (e && e.code === 400 && msg.indexOf('家庭') >= 0) {
        this.setData({ items: [], loading: false, needFamily: true })
        return
      }
      if (e && e.code === 403) {
        this.setData({ enabled: false, items: [], loading: false })
        return
      }
      this.setData({ items: [], loading: false, loadError: true })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  onPullDownRefresh() {
    this.loadItems()
  },

  goFamily() {
    wx.navigateTo({ url: '/pages/family/family' })
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/fridge-edit/fridge-edit' })
  },

  goEdit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/fridge-edit/fridge-edit?id=' + id })
  },

  removeItem(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name || '该食材'
    wx.showModal({
      title: '移出冰箱？',
      content: '确定删除「' + name + '」吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.deleteFridgeItem(id)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadItems()
        } catch (err) {
          wx.showToast({ title: (err && err.msg) || '删除失败', icon: 'none' })
        }
      }
    })
  },

  async scanPhoto() {
    try {
      const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] })
      wx.showLoading({ title: '上传识别中...' })
      const scan = await api.uploadFridgeScan(res.tempFilePaths[0])
      wx.hideLoading()
      wx.navigateTo({ url: '/pages/fridge-scan/fridge-scan?id=' + scan.id })
    } catch (e) {
      wx.hideLoading()
      if (e && e.code === 503) {
        const scan = e.data && e.data.scan
        wx.showModal({
          title: '识别服务离线',
          content: e.msg || '树莓派识别服务未连接，请稍后再试或手动添加',
          showCancel: false
        })
        if (scan && scan.id) {
          wx.navigateTo({ url: '/pages/fridge-scan/fridge-scan?id=' + scan.id })
        }
        return
      }
      wx.showToast({ title: (e && e.msg) || '上传失败', icon: 'none' })
    }
  }
})
