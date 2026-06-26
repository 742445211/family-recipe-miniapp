/**
 * app.js - 微信小程序应用入口
 */

const { refreshAppFeatures } = require('./utils/features')
const notification = require('./utils/notification')

App({
  onLaunch() {
    this._featuresPromise = this._loadFeatures()
    this._ensureSocket()
    this._refreshUnreadNotifications()
  },

  onShow() {
    this._ensureSocket()
    this._refreshUnreadNotifications()
    this.refreshFeatures()
  },

  _onNotification(msg) {
    this.globalData.lastNotification = msg
    if (msg && msg.type === 'ORDER_CREATED') {
      this._refreshUnreadNotifications()
    }
    if (typeof this.notificationCallback === 'function') {
      this.notificationCallback(msg)
    }
  },

  _refreshUnreadNotifications() {
    if (!wx.getStorageSync('token')) return
    try {
      const api = require('./utils/api')
      api.getUnreadNotifications()
        .then((list) => {
          const count = Array.isArray(list) ? list.length : 0
          this.globalData.unreadCount = count
        })
        .catch(() => {})
    } catch (e) { /* ignore */ }
  },

  _ensureSocket() {
    if (!wx.getStorageSync('token')) return
    notification.connectSocket(this._onNotification.bind(this))
  },

  _loadFeatures() {
    return refreshAppFeatures(this)
  },

  refreshFeatures() {
    this._featuresPromise = refreshAppFeatures(this)
    return this._featuresPromise
  },

  globalData: {
    userInfo: null,
    indexMode: null,           // 'favorites' 时首页切收藏模式（mine 页设置）
    indexNeedRefresh: false,   // true 时首页 onShow 会全量刷新列表
    lastNotification: null,
    unreadCount: 0,
    features: { ai_recommend: false, catalog_recipe: false, fridge: false, blind_box: false }
  },

  setNotificationCallback(fn) {
    this.notificationCallback = fn
    notification.updateMessageHandler((msg) => {
      this._onNotification(msg)
      if (typeof fn === 'function') fn(msg)
    })
  }
})
