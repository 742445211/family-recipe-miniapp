/**
 * app.js - 微信小程序应用入口
 */

const { loadAppFeatures } = require('./utils/features')
const notification = require('./utils/notification')

App({
  onLaunch() {
    this._featuresPromise = this._loadFeatures()
    this._ensureSocket()
  },

  onShow() {
    this._ensureSocket()
  },

  _onNotification(msg) {
    this.globalData.lastNotification = msg
    if (typeof this.notificationCallback === 'function') {
      this.notificationCallback(msg)
    }
  },

  _ensureSocket() {
    if (!wx.getStorageSync('token')) return
    notification.connectSocket(this._onNotification.bind(this))
  },

  _loadFeatures() {
    return loadAppFeatures().then((features) => {
      this.globalData.features = features
    })
  },

  globalData: {
    userInfo: null,
    currentFamily: null,
    indexMode: null,
    lastNotification: null,
    unreadCount: 0,
    features: { ai_recommend: false }
  },

  setNotificationCallback(fn) {
    this.notificationCallback = fn
    notification.updateMessageHandler((msg) => {
      this._onNotification(msg)
      if (typeof fn === 'function') fn(msg)
    })
  }
})
